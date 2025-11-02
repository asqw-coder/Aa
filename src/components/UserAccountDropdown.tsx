import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, Settings, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ReportIssueDialog } from '@/components/ReportIssueDialog';

interface UserAccountDropdownProps {
  onOpenSettings: () => void;
}

export const UserAccountDropdown: React.FC<UserAccountDropdownProps> = ({ onOpenSettings }) => {
  const { user, signOut } = useAuth();
  const [showReportDialog, setShowReportDialog] = React.useState(false);

  const getInitials = (email: string) => {
    const parts = email.split('@')[0];
    return parts.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-sm text-muted-foreground">
          {user?.email}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenSettings}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>Report Issue</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ReportIssueDialog open={showReportDialog} onOpenChange={setShowReportDialog} />
    </DropdownMenu>
  );
};