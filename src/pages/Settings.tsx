import { useNavigate } from "react-router-dom";
import { FinancialCard } from "@/components/FinancialCard";
import { ModernBottomNav } from "@/components/ModernBottomNav";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Palette, 
  Database, 
  User,
  Moon,
  Sun,
  Volume2,
  Smartphone,
  Mail,
  Lock,
  Trash2,
  Download,
  AlertTriangle,
  MessageSquare,
  Type
} from "lucide-react";
import { ReportIssueDialog } from "@/components/ReportIssueDialog";
import { useState } from "react";

const Settings = () => {
  const navigate = useNavigate();
  const notificationHook = useNotifications();
  const { user } = useAuth();
  const { settings, updateSetting, playNotificationSound, sendPushNotification, sendEmailAlert } = useSettingsContext();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const handleDeleteAccount = () => {
    notificationHook.addNotification({
      type: 'warning',
      title: 'Account Deletion',
      message: 'This feature is not available yet. Contact support for assistance.'
    });
  };

  const handleExportData = () => {
    notificationHook.addNotification({
      type: 'info',
      title: 'Data Export',
      message: 'Your trading data is being prepared for download.'
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-6 pb-24">
        {/* Header */}
        <FinancialCard
          title="Settings"
          value="Nova X"
          subtitle="Trading Platform Configuration"
          icon={SettingsIcon}
          variant="gradient"
          className="min-h-[200px]"
        >
          <div className="mt-6 text-white/80">
            <p className="text-sm">Logged in as:</p>
            <p className="text-lg font-medium text-white">{user?.email || 'Unknown User'}</p>
          </div>
        </FinancialCard>

        {/* Trading Configuration */}
        <FinancialCard
          title="Trading Configuration"
          value="Engine Settings"
          subtitle="Configure trading parameters and risk management"
          className="min-h-[160px]"
        >
          <div className="mt-6">
            <Button
              onClick={() => navigate('/settings/trading')}
              className="w-full"
              variant="outline"
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Configure Trading Engine
            </Button>
          </div>
        </FinancialCard>

        {/* Notifications Settings */}
        <FinancialCard
          title="Notifications"
          value="Alert Preferences"
          subtitle="Manage how you receive updates"
          icon={Bell}
          className="min-h-[280px]"
        >
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Receive alerts on this device</p>
              </div>
              <Switch 
                checked={settings.pushNotifications} 
                onCheckedChange={(checked) => {
                  updateSetting('pushNotifications', checked);
                  playNotificationSound();
                  notificationHook.addNotification({
                    type: 'info',
                    title: 'Notification Settings',
                    message: `Push notifications ${checked ? 'enabled' : 'disabled'}`
                  });
                  if (checked) {
                    sendPushNotification('Nova X Trading', 'Push notifications are now enabled!');
                  }
                }}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Email Alerts</p>
                <p className="text-xs text-muted-foreground">Get trading updates via email</p>
              </div>
              <Switch 
                checked={settings.emailAlerts} 
                onCheckedChange={(checked) => {
                  updateSetting('emailAlerts', checked);
                  playNotificationSound();
                  notificationHook.addNotification({
                    type: 'info',
                    title: 'Email Settings',
                    message: `Email alerts ${checked ? 'enabled' : 'disabled'}`
                  });
                  if (checked) {
                    sendEmailAlert('Nova X Trading', 'Email alerts are now enabled for your account.');
                  }
                }}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Sound Effects</p>
                <p className="text-xs text-muted-foreground">Play sounds for notifications</p>
              </div>
              <Switch 
                checked={settings.soundEnabled} 
                onCheckedChange={(checked) => {
                  updateSetting('soundEnabled', checked);
                  if (checked) {
                    playNotificationSound();
                  }
                  notificationHook.addNotification({
                    type: 'info',
                    title: 'Sound Settings',
                    message: `Sound effects ${checked ? 'enabled' : 'disabled'}`
                  });
                }}
              />
            </div>
          </div>
        </FinancialCard>

        {/* Appearance Settings */}
        <FinancialCard
          title="Appearance"
          value="Display Preferences"
          subtitle="Customize the look and feel"
          icon={Palette}
          className="min-h-[280px]"
        >
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {settings.darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <div className="space-y-1">
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
                </div>
              </div>
              <Switch 
                checked={settings.darkMode} 
                onCheckedChange={(checked) => {
                  updateSetting('darkMode', checked);
                  playNotificationSound();
                  notificationHook.addNotification({
                    type: 'info',
                    title: 'Theme Settings',
                    message: `${checked ? 'Dark' : 'Light'} mode enabled`
                  });
                }}
              />
            </div>
            
            <Separator />

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Type className="h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Font Size</p>
                  <p className="text-xs text-muted-foreground">Adjust text size across the app</p>
                </div>
              </div>
              <Select
                value={settings.fontSize}
                onValueChange={(value: 'small' | 'medium' | 'large') => {
                  updateSetting('fontSize', value);
                  playNotificationSound();
                  notificationHook.addNotification({
                    type: 'info',
                    title: 'Font Size Changed',
                    message: `Font size set to ${value}`
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </FinancialCard>

        {/* Data & Privacy */}
        <FinancialCard
          title="Data & Privacy"
          value="Account Management"
          subtitle="Export data and account settings"
          icon={Shield}
          className="min-h-[200px]"
        >
          <div className="mt-6 space-y-4">
            <Button
              onClick={handleExportData}
              variant="outline"
              className="w-full justify-start"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Trading Data
            </Button>
            
            <Button
              onClick={handleDeleteAccount}
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </FinancialCard>

        {/* Account Actions */}
        <FinancialCard
          title="Account"
          value="Management"
          subtitle="Additional account settings"
          className="min-h-[160px]"
        >
          <div className="mt-6 space-y-4">
            <Button
              onClick={() => navigate('/profile')}
              variant="outline"
              className="w-full"
            >
              <User className="h-4 w-4 mr-2" />
              Manage Profile
            </Button>
            <Button
              onClick={() => setIsReportDialogOpen(true)}
              variant="outline"
              className="w-full"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Report Issue to Admin
            </Button>
          </div>
        </FinancialCard>
      </div>

      <ModernBottomNav
        onHome={() => navigate('/')}
        onTrades={() => navigate('/trades')}
        onSettings={() => navigate('/settings')}
        onNotifications={() => navigate('/notifications')}
        onProfile={() => navigate('/profile')}
        onAdmin={() => navigate('/admin')}
      />

      <ReportIssueDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
      />
    </div>
  );
};

export default Settings;