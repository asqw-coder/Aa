import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  username: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  user_id: string;
  ark_id: string;
  suspended?: boolean;
  country_code?: string;
}

export const useProfileCompletion = () => {
  const { user } = useAuth();
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkProfileCompletion = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, first_name, last_name, date_of_birth, gender, user_id, ark_id, suspended, country_code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setIsLoading(false);
        return;
      }

      if (profile) {
        setCurrentProfile(profile);
        
        // Check if profile needs completion (missing date_of_birth or gender)
        const needsCompletion = !profile.date_of_birth || !profile.gender;
        setNeedsProfileCompletion(needsCompletion);
      }
    } catch (error) {
      console.error('Unexpected error checking profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markProfileComplete = () => {
    setNeedsProfileCompletion(false);
  };

  useEffect(() => {
    checkProfileCompletion();

    if (!user) return;

    // Subscribe to real-time profile updates for immediate suspension gating
    const channel = supabase
      .channel(`realtime-profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new ?? payload.old) as any;
          if (next) {
            setCurrentProfile((prev) => ({ ...(prev || {} as any), ...next }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    needsProfileCompletion,
    currentProfile,
    isLoading,
    markProfileComplete,
    refetchProfile: checkProfileCompletion,
  };
};