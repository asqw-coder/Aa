import React from 'react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bell, CheckCheck, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Info className="h-4 w-4 text-primary" />;
  }
};

export const NotificationDropdown = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll
}: NotificationDropdownProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-trust-text">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  className="h-8 px-2"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="h-8 px-2"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-trust-text-muted" />
            <p className="text-trust-text-muted text-sm">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="p-2">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div 
                    className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-trust-surface/50 ${
                      !notification.isRead ? 'bg-primary/5 border border-primary/10' : ''
                    }`}
                    onClick={() => !notification.isRead && onMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm text-trust-text truncate">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-trust-text-muted mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-trust-text-muted mt-2">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                  {index < notifications.length - 1 && (
                    <Separator className="my-1" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
};