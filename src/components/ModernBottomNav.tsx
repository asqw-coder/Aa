import { Home, Settings, Bell, User, BarChart3, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useNotifications } from "@/hooks/useNotifications";

interface ModernBottomNavProps {
  onHome: () => void;
  onTrades: () => void;
  onSettings: () => void;
  onNotifications: () => void;
  onProfile: () => void;
  onAdmin?: () => void;
}

export const ModernBottomNav = ({
  onHome,
  onTrades,
  onSettings,
  onNotifications,
  onProfile,
  onAdmin
}: ModernBottomNavProps) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { isAdmin } = useAdminStatus();
  const { notifications } = useNotifications();
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNavButtonClass = (path: string) => {
    const isActive = currentPath === path;
    return `h-10 w-10 sm:h-12 sm:w-12 rounded-full ${
      isActive 
        ? 'bg-primary text-primary-foreground' 
        : 'hover:bg-primary/10'
    }`;
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-2">
      {/* Navigation */}
      <div className="bg-card/90 backdrop-blur-lg border border-border rounded-full p-1.5 sm:p-2 shadow-2xl">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={getNavButtonClass('/')}
            onClick={onHome}
          >
            <Home className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className={getNavButtonClass('/trades')}
            onClick={onTrades}
          >
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon" 
            className={getNavButtonClass('/settings')}
            onClick={onSettings}
          >
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className={`${getNavButtonClass('/notifications')} relative`}
            onClick={onNotifications}
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className={getNavButtonClass('/profile')}
            onClick={onProfile}
          >
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          
          {isAdmin && onAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className={getNavButtonClass('/admin')}
              onClick={onAdmin}
            >
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};