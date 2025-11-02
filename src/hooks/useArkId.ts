import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get the current user's A.R.K ID
 * A.R.K ID format: ARK-XXXXXXXX-CC
 * - ARK: Prefix
 * - XXXXXXXX: 8 randomly generated digits
 * - CC: ISO alpha-2 country code from account creation
 */
export const useArkId = () => {
  const [arkId, setArkId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchArkId = async () => {
      if (!userId) {
        setArkId(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('ark_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching ARK ID:', error);
          setArkId(null);
        } else if (data) {
          setArkId(data.ark_id);
        }
      } catch (error) {
        console.error('Unexpected error fetching ARK ID:', error);
        setArkId(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArkId();
  }, [userId]);

  return { arkId, isLoading };
};

/**
 * Format ARK ID for display
 * ARK ID format: ARK-XXXXXXXX-CC (8 random digits + ISO alpha-2 country code)
 */
export const formatArkId = (arkId: string): string => {
  // ARK IDs are already properly formatted from the database
  return arkId;
};
