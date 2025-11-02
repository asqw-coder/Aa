import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FinancialCard } from "@/components/FinancialCard";
import { ModernBottomNav } from "@/components/ModernBottomNav";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Calendar, 
  Edit, 
  LogOut,
  Shield,
  Camera,
  Save,
  X
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { TwoFactorEnrollDialog } from "@/components/TwoFactorEnrollDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [is2FADialogOpen, setIs2FADialogOpen] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isChecking2FA, setIsChecking2FA] = useState(true);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    phoneNumber: '',
    bio: ''
  });
  const navigate = useNavigate();
  const notificationHook = useNotifications();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
      check2FAStatus();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (profile) {
        setProfileData({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          username: profile.username || '',
          email: user.email || '',
          dateOfBirth: profile.date_of_birth || '',
          gender: profile.gender || '',
          phoneNumber: '',
          bio: ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const check2FAStatus = async () => {
    try {
      setIsChecking2FA(true);
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const hasActiveFactor = data.totp.some(factor => factor.status === 'verified');
      setIs2FAEnabled(hasActiveFactor);
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    } finally {
      setIsChecking2FA(false);
    }
  };

  const handle2FAToggle = async () => {
    if (is2FAEnabled) {
      // Disable 2FA
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;

        for (const factor of data.totp) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }

        setIs2FAEnabled(false);
        notificationHook.addNotification({
          type: 'success',
          title: '2FA Disabled',
          message: 'Two-factor authentication has been disabled.'
        });
      } catch (error: any) {
        notificationHook.addNotification({
          type: 'error',
          title: 'Error',
          message: error.message || 'Failed to disable 2FA'
        });
      }
    } else {
      // Enable 2FA - open enrollment dialog
      setIs2FADialogOpen(true);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          username: profileData.username,
          date_of_birth: profileData.dateOfBirth || null,
          gender: profileData.gender || null,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to update profile. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      setIsEditing(false);
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved successfully.',
      });
      
      // Refresh profile data
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original data
    fetchProfile();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
      notificationHook.addNotification({
        type: 'info',
        title: 'Logged Out',
        message: 'You have been successfully logged out.'
      });
    } catch (error) {
      notificationHook.addNotification({
        type: 'error',
        title: 'Logout Error',
        message: 'Failed to logout. Please try again.'
      });
    }
  };

  const getInitials = () => {
    const first = profileData.firstName || '';
    const last = profileData.lastName || '';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'U';
  };

  const formatJoinDate = () => {
    if (user?.created_at) {
      return new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return 'Unknown';
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-6 pb-24">
        {/* Profile Header */}
        <FinancialCard
          title="Profile"
          value={`${profileData.firstName} ${profileData.lastName}`.trim() || 'User'}
          subtitle={`@${profileData.username || 'username'}`}
          icon={User}
          variant="gradient"
          className="min-h-[240px]"
        >
          <div className="mt-6 flex items-center space-x-4 text-white">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-white/20">
                <AvatarImage src="" />
                <AvatarFallback className="text-lg font-bold bg-white/20 text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center">
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm opacity-80">Member since</p>
              <p className="text-lg font-medium">{formatJoinDate()}</p>
            </div>
          </div>
        </FinancialCard>

        {/* Personal Information */}
        <FinancialCard
          title="Personal Information"
          value={isEditing ? "Editing" : "View Details"}
          subtitle="Your account information"
          className="min-h-[400px]"
        >
          <div className="mt-6 space-y-4">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <Button onClick={handleSave} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button onClick={handleCancel} variant="outline" className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{`${profileData.firstName} ${profileData.lastName}`.trim() || 'Not set'}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium">@{profileData.username || 'Not set'}</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{profileData.email || 'Not set'}</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">
                      {profileData.dateOfBirth ? 
                        new Date(profileData.dateOfBirth).toLocaleDateString() : 
                        'Not set'
                      }
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium">{profileData.gender || 'Not set'}</p>
                  </div>
                </div>

                <Button onClick={() => setIsEditing(true)} className="w-full mt-6">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </>
            )}
          </div>
        </FinancialCard>

        {/* Account Security */}
        <FinancialCard
          title="Account Security"
          value="Protected"
          subtitle="Manage your account security"
          icon={Shield}
          className="min-h-[180px]"
        >
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">
                  {is2FAEnabled ? 'Active - Protecting your account' : 'Add an extra layer of security'}
                </p>
              </div>
              <Button 
                variant={is2FAEnabled ? "destructive" : "outline"} 
                size="sm"
                onClick={handle2FAToggle}
                disabled={isChecking2FA}
              >
                {isChecking2FA ? '...' : is2FAEnabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Change Password</p>
                <p className="text-xs text-muted-foreground">Update your password</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsPasswordDialogOpen(true)}
              >
                Update
              </Button>
            </div>
          </div>
        </FinancialCard>

        {/* Session Management */}
        <FinancialCard
          title="Session Management"
          value="Active Session"
          subtitle="Manage your account sessions"
          className="min-h-[160px]"
        >
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">Current Device</p>
                <p className="text-xs text-muted-foreground">Logged in on this device</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </FinancialCard>

        {/* Account Stats */}
        <div className="grid grid-cols-2 gap-6">
          <FinancialCard
            title="Account Age"
            value={user?.created_at ? 
              Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) + ' days' :
              'Unknown'
            }
            trend={{ 
              value: 'Active member', 
              isPositive: true 
            }}
            icon={Calendar}
            className="min-h-[140px]"
          />
          <FinancialCard
            title="Profile Status"
            value="Complete"
            trend={{ 
              value: '100%', 
              isPositive: true 
            }}
            icon={User}
            className="min-h-[140px]"
          />
        </div>

        {/* Password Change Dialog */}
        <PasswordChangeDialog
          isOpen={isPasswordDialogOpen}
          onClose={() => setIsPasswordDialogOpen(false)}
        />

        {/* 2FA Enrollment Dialog */}
        <TwoFactorEnrollDialog
          isOpen={is2FADialogOpen}
          onClose={() => setIs2FADialogOpen(false)}
          onSuccess={() => {
            setIs2FAEnabled(true);
            check2FAStatus();
          }}
        />
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

export default Profile;