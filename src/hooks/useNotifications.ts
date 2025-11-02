import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useArkId } from '@/hooks/useArkId';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface DatabaseNotification {
  id: string;
  user_id: string;
  ark_id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { arkId } = useArkId();

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

  // Load notifications from database when user changes
  useEffect(() => {
    if (userId) {
      loadNotifications();
    } else {
      setNotifications([]);
    }
  }, [userId]);

  const loadNotifications = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100); // Limit to last 100 notifications

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      const formattedNotifications: Notification[] = (data || []).map((dbNotif: DatabaseNotification) => ({
        id: dbNotif.id,
        type: dbNotif.type,
        title: dbNotif.title,
        message: dbNotif.message,
        timestamp: new Date(dbNotif.created_at),
        isRead: dbNotif.is_read
      }));

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addNotification = useCallback(async (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    if (!userId || !arkId) {
      // If user is not logged in or arkId not available, show in-memory notification only
      const inMemoryNotification: Notification = {
        ...notification,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        isRead: false,
      };
      setNotifications(prev => [inMemoryNotification, ...prev].slice(0, 50));
      return;
    }

    try {
      // Save to database with ark_id
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          ark_id: arkId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          is_read: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving notification:', error);
        // Fallback to in-memory notification
        const fallbackNotification: Notification = {
          ...notification,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          isRead: false,
        };
        setNotifications(prev => [fallbackNotification, ...prev].slice(0, 50));
        return;
      }

      // Add to local state immediately
      const newNotification: Notification = {
        id: data.id,
        type: data.type as 'success' | 'warning' | 'error' | 'info',
        title: data.title,
        message: data.message,
        timestamp: new Date(data.created_at),
        isRead: data.is_read
      };

      setNotifications(prev => [newNotification, ...prev]);
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  }, [userId, arkId]);

  const markAsRead = useCallback(async (id: string) => {
    if (!userId) {
      // Update local state only
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, isRead: true }
            : notification
        )
      );
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [userId]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) {
      // Update local state only
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [userId]);

  const clearNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing notifications:', error);
        return;
      }

      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, [userId]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!userId) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting notification:', error);
        return;
      }

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    deleteNotification,
    unreadCount,
    isLoading,
    refreshNotifications: loadNotifications,
  };
};