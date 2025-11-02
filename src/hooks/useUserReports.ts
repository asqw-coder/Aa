import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useArkId } from './useArkId';

export interface UserReport {
  id: string;
  user_id: string;
  ark_id: string;
  title: string;
  description: string;
  category: 'bug' | 'feature_request' | 'technical_issue' | 'account_issue' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'critical';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserReports = () => {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { arkId } = useArkId();

  useEffect(() => {
    if (!arkId) {
      setIsLoading(false);
      return;
    }

    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('user_reports')
        .select('*')
        .eq('ark_id', arkId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reports:', error);
      } else {
        setReports((data || []) as UserReport[]);
      }
      setIsLoading(false);
    };

    fetchReports();

    // Subscribe to updates on user's reports
    const channel = supabase
      .channel('user-reports')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_reports',
          filter: `ark_id=eq.${arkId}`
        },
        (payload) => {
          const updatedReport = payload.new as UserReport;
          setReports((prev) =>
            prev.map((r) => (r.id === updatedReport.id ? updatedReport : r))
          );
          
          // Notify user of status change
          if (payload.old && (payload.old as UserReport).status !== updatedReport.status) {
            toast({
              title: 'Report Updated',
              description: `Your report "${updatedReport.title}" status changed to ${updatedReport.status}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [arkId, toast]);

  const submitReport = async (
    title: string,
    description: string,
    category: UserReport['category']
  ) => {
    if (!arkId) return { error: new Error('ARK ID not available') };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('User not authenticated') };

    const { data, error } = await supabase
      .from('user_reports')
      .insert({
        user_id: user.id,
        ark_id: arkId,
        title,
        description,
        category,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
      return { error };
    }

    setReports((prev) => [data as UserReport, ...prev]);
    toast({
      title: 'Report Submitted',
      description: 'Your report has been submitted successfully.',
    });
    return { data };
  };

  return { reports, isLoading, submitReport };
};
