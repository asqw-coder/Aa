import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemBroadcast {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'maintenance' | 'update' | 'terms_change' | 'urgent';
  priority: 'low' | 'normal' | 'high' | 'critical';
  created_at: string;
  expires_at: string | null;
  max_views_per_user: number;
}

export const useSystemBroadcasts = () => {
  const [broadcasts, setBroadcasts] = useState<SystemBroadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch existing broadcasts
    const fetchBroadcasts = async () => {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        setIsLoading(false);
        return;
      }

      // Get all active broadcasts that haven't expired
      const { data: broadcastsData, error: broadcastsError } = await supabase
        .from('system_broadcasts')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      if (broadcastsError) {
        console.error('Error fetching broadcasts:', broadcastsError);
        setIsLoading(false);
        return;
      }

      // Get user's view counts for these broadcasts
      const { data: viewsData, error: viewsError } = await supabase
        .from('broadcast_views')
        .select('broadcast_id, view_count')
        .eq('user_id', user.user.id);

      if (viewsError) {
        console.error('Error fetching views:', viewsError);
      }

      // Filter broadcasts based on view count
      const viewsMap = new Map(
        (viewsData || []).map(v => [v.broadcast_id, v.view_count])
      );

      const filteredBroadcasts = (broadcastsData || []).filter(broadcast => {
        const viewCount = viewsMap.get(broadcast.id) || 0;
        return viewCount < (broadcast.max_views_per_user || 1);
      });

      setBroadcasts(filteredBroadcasts as SystemBroadcast[]);
      setIsLoading(false);
    };

    fetchBroadcasts();

    // Subscribe to real-time broadcasts
    const channel = supabase
      .channel('system-broadcasts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_broadcasts',
          filter: 'is_active=eq.true'
        },
        (payload) => {
          const newBroadcast = payload.new as SystemBroadcast;
          setBroadcasts((prev) => [newBroadcast, ...prev]);
          
          // Show toast notification for new broadcast
          toast({
            title: newBroadcast.title,
            description: newBroadcast.message,
            variant: newBroadcast.priority === 'critical' ? 'destructive' : 'default',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const dismissBroadcast = async (id: string) => {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) return;

    // Track the view
    const { data: existingView } = await supabase
      .from('broadcast_views')
      .select('*')
      .eq('broadcast_id', id)
      .eq('user_id', user.user.id)
      .single();

    if (existingView) {
      // Increment view count
      await supabase
        .from('broadcast_views')
        .update({
          view_count: existingView.view_count + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', existingView.id);
    } else {
      // Create new view record
      await supabase
        .from('broadcast_views')
        .insert({
          broadcast_id: id,
          user_id: user.user.id,
          view_count: 1
        });
    }

    // Remove from local state
    setBroadcasts((prev) => prev.filter((b) => b.id !== id));
  };

  return { broadcasts, isLoading, dismissBroadcast };
};
