import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { generateDeviceFingerprint, getDeviceName } from '@/utils/deviceFingerprint';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  needs2FA: boolean;
  signIn: (emailOrUsername: string, password: string) => Promise<{ error: any; needs2FA?: boolean }>;
  verify2FA: (code: string, trustDevice: boolean) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: {
    username: string;
    date_of_birth: string;
    gender: string;
    first_name?: string;
    last_name?: string;
  }) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [pendingChallengeId, setPendingChallengeId] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkIfDeviceTrusted = async (userId: string): Promise<boolean> => {
    const deviceFingerprint = generateDeviceFingerprint();
    
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('id, last_used')
      .eq('user_id', userId)
      .eq('device_fingerprint', deviceFingerprint)
      .maybeSingle();

    if (error || !data) return false;

    // Update last used time
    await supabase
      .from('trusted_devices')
      .update({ last_used: new Date().toISOString() })
      .eq('id', data.id);

    return true;
  };

  const signIn = async (emailOrUsername: string, password: string) => {
    // Check if input contains @ to determine if it's an email or username
    const isEmail = emailOrUsername.includes('@');
    let emailToUse = emailOrUsername;

    if (!isEmail) {
      // Look up email by username using database function
      try {
        const { data: email, error: lookupError } = await supabase.rpc('get_user_email_by_username', {
          _username: emailOrUsername
        });

        if (lookupError || !email) {
          return { error: { message: 'Invalid username or password' } };
        }

        emailToUse = email;
      } catch (error) {
        return { error: { message: 'Invalid username or password' } };
      }
    }

    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (error) return { error };

    // Proceed without blocking suspended users; UI will gate access
    if (data.user) {
      try {
        await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', data.user.id)
          .single();
      } catch {}
    }

    // Check if user has 2FA enabled
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const has2FA = factors?.totp && factors.totp.length > 0;

    if (has2FA && data.user) {
      // Check if device is trusted
      const isTrusted = await checkIfDeviceTrusted(data.user.id);

      if (!isTrusted) {
        // Need 2FA verification
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: factors!.totp[0].id,
        });

        if (challengeError) {
          return { error: challengeError };
        }

        setPendingFactorId(factors!.totp[0].id);
        setPendingChallengeId(challengeData.id);
        setNeeds2FA(true);
        
        // Sign out the user until 2FA is verified
        await supabase.auth.signOut();
        
        return { error: null, needs2FA: true };
      }
    }

    return { error: null, needs2FA: false };
  };

  const verify2FA = async (code: string, trustDevice: boolean) => {
    if (!pendingFactorId || !pendingChallengeId) {
      return { error: { message: 'No pending 2FA challenge' } };
    }

    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: pendingFactorId,
        challengeId: pendingChallengeId,
        code,
      });

      if (error) throw error;

      // If verification successful, add device to trusted devices if requested
      if (trustDevice) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const deviceFingerprint = generateDeviceFingerprint();
          const deviceName = getDeviceName();

          await supabase.from('trusted_devices').insert({
            user_id: user.id,
            device_fingerprint: deviceFingerprint,
            device_name: deviceName,
          });
        }
      }

      setNeeds2FA(false);
      setPendingFactorId(null);
      setPendingChallengeId(null);

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: {
    username: string;
    date_of_birth: string;
    gender: string;
    first_name?: string;
    last_name?: string;
  }) => {
    const redirectUrl = `${window.location.origin}/`;
    
    // Detect user's country using stored value first, then edge function
    let countryCode = 'XX'; // Default fallback
    try {
      const stored = localStorage.getItem('country_code');
      if (stored && stored !== 'XX') {
        countryCode = stored;
      } else {
        const { data: countryData, error: countryError } = await supabase.functions.invoke('detect-country');
        if (!countryError && countryData?.country_code) {
          countryCode = countryData.country_code;
        }
      }
    } catch (geoError) {
      console.error('Failed to detect country, using default:', geoError);
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          ...userData,
          country_code: countryCode
        }
      }
    });

    if (error) return { error };
    
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });
      
      if (error) {
        console.error('Google OAuth error:', error);
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { error: { message: 'Failed to initiate Google sign-in' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    session,
    loading,
    needs2FA,
    signIn,
    verify2FA,
    signUp,
    signInWithGoogle,
    signOut,
  };
};