import React, { useEffect, useRef } from 'react';
import { AuthContext, useAuthState } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuthState();
  const { addNotification } = useNotifications();
  const previousUser = useRef(auth.user);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousUser.current = auth.user;
      return;
    }

    // Check if user just logged in (transition from null to user)
    if (!previousUser.current && auth.user && !auth.loading) {
      // Defer database operations to avoid auth callback deadlock
      setTimeout(async () => {
        // Check if user is suspended
        const { data: profile } = await supabase
          .from('profiles')
          .select('suspended, country_code')
          .eq('user_id', auth.user!.id)
          .single();

        if (profile?.suspended === true) {
          // Do not sign the user out; App will render a suspended screen
          return;
        }

        // Check if country_code needs to be detected
        if (!profile?.country_code || profile.country_code === 'XX') {
          try {
            // Prefer previously detected country from localStorage
            const stored = localStorage.getItem('country_code');
            let nextCode = stored && stored !== 'XX' ? stored : null;

            if (!nextCode) {
              const { data: countryData } = await supabase.functions.invoke('detect-country');
              if (countryData?.country_code && countryData.country_code !== 'XX') {
                nextCode = countryData.country_code;
              }
            }

            if (nextCode) {
              await supabase
                .from('profiles')
                .update({ country_code: nextCode })
                .eq('user_id', auth.user!.id);
            }
          } catch (error) {
            console.error('Failed to detect country:', error);
          }
        }

        addNotification({
          type: 'success',
          title: 'Welcome back!',
          message: 'You have successfully logged in.'
        });
      }, 0);
    }

    previousUser.current = auth.user;
  }, [auth.user, auth.loading, addNotification]);
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};