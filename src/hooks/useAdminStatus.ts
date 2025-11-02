import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to check if the current user is an admin
 */
export const useAdminStatus = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminDetails, setAdminDetails] = useState<{
    adminId: string | null;
    adminName: string | null;
  }>({
    adminId: null,
    adminName: null,
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has admin role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (roleError) {
          console.error('Error checking admin status:', roleError);
          setIsAdmin(false);
        } else if (roleData) {
          setIsAdmin(true);
          
          // Get admin details from verification process
          const { data: verificationData } = await supabase
            .from('admin_verification_process')
            .select('admin_id, admin_name')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (verificationData) {
            setAdminDetails({
              adminId: verificationData.admin_id,
              adminName: verificationData.admin_name,
            });
          }
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Unexpected error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, isLoading, adminDetails };
};
