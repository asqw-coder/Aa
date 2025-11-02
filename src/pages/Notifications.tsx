import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FinancialCard } from "@/components/FinancialCard";
import { ModernBottomNav } from "@/components/ModernBottomNav";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  RefreshCw,
  Trash2,
  CheckCheck,
  AlertCircle,
  CheckCircle,
  Clock,
  Info,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Notifications = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearNotifications, 
    unreadCount, 
    isLoading,
    refreshNotifications 
  } = useNotifications();
  const { user } = useAuth();

  const getNotificationIcon = (type: 'success' | 'warning' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationBadgeVariant = (type: 'success' | 'warning' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-6 pb-24">
        {/* Header */}
        <FinancialCard
          title="Notifications"
          value={`${notifications.length} Total`}
          subtitle={`${unreadCount} unread notifications`}
          icon={Bell}
          variant="gradient"
          className="min-h-[200px]"
        >
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-white/80">
              <p className="text-sm">Notification History</p>
              <Badge variant="secondary" className="text-white bg-white/20">
                {unreadCount} New
              </Badge>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshNotifications}
                disabled={isLoading}
                className="text-white border-white/20 hover:bg-white/10"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              )}
              
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearNotifications}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </FinancialCard>

        {/* Notifications List */}
        {isLoading ? (
          <FinancialCard
            title="Loading..."
            value="Please wait"
            subtitle="Fetching your notifications"
            className="min-h-[200px] text-center"
          >
            <div className="mt-6 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
              <p>Loading notifications...</p>
            </div>
          </FinancialCard>
        ) : notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className="group cursor-pointer"
                onClick={() => markAsRead(notification.id)}
              >
                <FinancialCard
                  title={notification.title}
                  value=""
                  subtitle={notification.message}
                  className={`min-h-[140px] transition-all duration-200 ${
                    notification.isRead ? 'opacity-70' : 'ring-2 ring-primary/20'
                  } hover:scale-[1.02]`}
                >
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex items-center space-x-2">
                        <Badge variant={getNotificationBadgeVariant(notification.type)}>
                          {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                        </Badge>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatRelativeTime(notification.timestamp)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </FinancialCard>
              </div>
            ))}
          </div>
        ) : (
          <FinancialCard
            title="No Notifications"
            value="All Clear"
            subtitle={user ? "You have no notifications at this time" : "Sign in to view your notification history"}
            className="min-h-[200px] text-center"
          >
            <div className="mt-6 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{user ? "Your notifications will appear here" : "Sign in to access persistent notifications"}</p>
            </div>
          </FinancialCard>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-6">
          <FinancialCard
            title="Today's Notifications"
            value={notifications.filter(n => 
              new Date(n.timestamp).toDateString() === new Date().toDateString()
            ).length.toString()}
            trend={{ 
              value: unreadCount > 0 ? `${unreadCount} unread` : 'All read', 
              isPositive: unreadCount === 0 
            }}
            icon={Bell}
            className="min-h-[140px]"
          />
          <FinancialCard
            title="Total History"
            value={user ? notifications.length.toString() : '0'}
            trend={{ 
              value: user ? 'Persistent storage' : 'Sign in required', 
              isPositive: !!user 
            }}
            icon={Clock}
            className="min-h-[140px]"
          />
        </div>
      </div>

      <ModernBottomNav
        onHome={() => navigate('/')}
        onTrades={() => navigate('/trades')}
        onSettings={() => navigate('/settings')}
        onNotifications={() => navigate('/notifications')}
        onProfile={() => navigate('/profile')}
        onAdmin={() => navigate('/admin')}
      />
    </div>
  );
};

export default Notifications;