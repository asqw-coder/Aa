import { Home, Settings, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CurvedBottomNavProps {
  onOpenSettings: () => void;
  onNotifications: () => void;
  onProfile: () => void;
  onHome: () => void;
}

export const CurvedBottomNav = ({ 
  onOpenSettings, 
  onNotifications, 
  onProfile, 
  onHome 
}: CurvedBottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Curved Navigation Panel */}
      <div className="relative">
        {/* Main curved background */}
        <svg
          viewBox="0 0 390 120"
          className="w-full h-auto text-card drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 -4px 20px rgba(0, 0, 0, 0.3))' }}
        >
          <path
            d="M0,40 C50,10 100,0 130,0 C150,0 170,5 195,20 C220,5 240,0 260,0 C290,0 340,10 390,40 L390,120 L0,120 Z"
            fill="currentColor"
            className="text-card/95 backdrop-blur-xl"
          />
        </svg>
        
        {/* Content overlay */}
        <div className="absolute inset-0 flex items-center justify-between px-8 pb-8">
          {/* Left side navigation icons */}
          <div className="flex items-center space-x-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={onHome}
              className="w-12 h-12 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary"
            >
              <Home className="h-6 w-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              className="w-12 h-12 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary"
            >
              <Settings className="h-6 w-6" />
            </Button>
          </div>

          {/* Center Logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-4">
            <div className="w-16 h-16 rounded-full bg-background border-2 border-border flex items-center justify-center shadow-lg">
              <img 
                src="/logo.jpg" 
                alt="Nova Trading Logo" 
                className="w-14 h-14 rounded-full object-cover"
              />
            </div>
          </div>

          {/* Right side navigation icons */}
          <div className="flex items-center space-x-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNotifications}
              className="w-12 h-12 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary"
            >
              <Bell className="h-6 w-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onProfile}
              className="w-12 h-12 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary"
            >
              <User className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};