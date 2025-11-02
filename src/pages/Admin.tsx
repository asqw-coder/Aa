import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Shield, 
  UserPlus, 
  Activity, 
  Ban, 
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Users,
  Terminal,
  BarChart3,
  Brain,
  RefreshCw,
  TrendingUp,
  History,
  Megaphone,
  MessageSquare,
  Database,
  Menu
} from 'lucide-react';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { useArkId } from '@/hooks/useArkId';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ModernBottomNav } from '@/components/ModernBottomNav';
import { AdminBroadcastManager } from '@/components/AdminBroadcastManager';
import { AdminReportsManager } from '@/components/AdminReportsManager';
import { MarketstackDataManager } from '@/components/MarketstackDataManager';
import { useMobile } from '@/hooks/use-mobile';

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isLoading, adminDetails } = useAdminStatus();
  const { arkId } = useArkId();
  const { isMobile } = useMobile();
  
  const [targetUserId, setTargetUserId] = useState('');
  const [isStartingProcess, setIsStartingProcess] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [verificationProcesses, setVerificationProcesses] = useState<any[]>([]);
  const [blockedEntities, setBlockedEntities] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [apiUsage, setApiUsage] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [mlModels, setMlModels] = useState<any[]>([]);
  const [modelWeights, setModelWeights] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [retrainingModel, setRetrainingModel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('broadcast');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You must be an admin to access this page.",
      });
      navigate('/');
    }
  }, [isAdmin, isLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
      loadUsers();
      loadMLModels();
    }
  }, [isAdmin]);

  const loadAdminData = async () => {
    setLoadingLogs(true);
    try {
      // Load activity logs
      const { data: logs } = await supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (logs) setActivityLogs(logs);

      // Load verification processes
      const { data: processes } = await supabase
        .from('admin_verification_process')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (processes) setVerificationProcesses(processes);

      // Load blocked entities
      const { data: blocked } = await supabase
        .from('blocked_entities')
        .select('*')
        .order('blocked_at', { ascending: false })
        .limit(50);
      
      if (blocked) setBlockedEntities(blocked);

      // Load system logs
      const { data: sysLogs } = await supabase
        .from('system_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (sysLogs) setSystemLogs(sysLogs);

      // Load API usage
      const { data: apiData } = await supabase
        .from('api_usage')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (apiData) setApiUsage(apiData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { action: 'listUsers' }
      });

      if (error) throw error;
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load users",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { 
          action: suspend ? 'suspendUser' : 'unsuspendUser',
          targetUserId: userId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: suspend ? "User Suspended" : "User Unsuspended",
          description: `User has been ${suspend ? 'suspended' : 'unsuspended'} successfully`,
        });
        loadUsers();
        loadAdminData();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update user status",
      });
    }
  };

  const loadMLModels = async () => {
    setLoadingModels(true);
    try {
      // Load ML models
      const { data: models } = await supabase
        .from('ml_models')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (models) setMlModels(models);

      // Load model weights with their versions
      const { data: weights } = await supabase
        .from('model_weights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (weights) setModelWeights(weights);
    } catch (error) {
      console.error('Error loading ML models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleRetrainModel = async (modelType: string, symbol: string, mode: 'full' | 'fine_tune' | 'incremental') => {
    const modelKey = `${modelType}_${symbol}`;
    setRetrainingModel(modelKey);
    
    try {
      // Get current active model
      const model = mlModels.find(m => m.model_type === modelType && m.status === 'active');
      
      // Get active weights
      const activeWeight = modelWeights.find(w => 
        w.model_id === model?.id && 
        w.is_active === true
      );
      
      // Fetch historical data
      const { data: historicalData } = await supabase
        .from('market_data_cache')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: true })
        .limit(10000);
      
      // Invoke training with transfer learning
      const { error } = await supabase.functions.invoke('ark-model-training', {
        body: {
          model_type: modelType,
          symbol,
          model_id: model?.id,
          training_mode: mode,
          previous_weights_id: activeWeight?.id,
          historical_data: historicalData,
          hyperparameters: {
            epochs: mode === 'full' ? 100 : mode === 'fine_tune' ? 30 : 20,
            learning_rate: mode === 'full' ? 0.001 : 0.0001,
            batch_size: 32,
            sequence_length: 60
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Training Initiated",
        description: `${modelType.toUpperCase()} model retraining started in ${mode} mode for ${symbol}`,
      });
      
      // Refresh models after a short delay
      setTimeout(() => {
        loadMLModels();
      }, 2000);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Training Failed",
        description: error.message || "Failed to initiate model training",
      });
    } finally {
      setRetrainingModel(null);
    }
  };

  const handleActivateVersion = async (weightId: string, modelType: string, symbol: string) => {
    try {
      const { error } = await supabase.rpc('activate_model_version', {
        p_model_type: modelType,
        p_symbol: symbol,
        p_version: modelWeights.find(w => w.id === weightId)?.version || 1
      });
      
      if (error) throw error;
      
      toast({
        title: "Version Activated",
        description: `Model version has been activated successfully`,
      });
      
      loadMLModels();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Activation Failed",
        description: error.message || "Failed to activate model version",
      });
    }
  };

  const startAdminVerification = async () => {
    if (!targetUserId.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a user ID",
      });
      return;
    }

    setIsStartingProcess(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-verification-start', {
        body: { targetUserId: targetUserId.trim() }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Verification Code Generated",
          description: (
            <div className="space-y-2">
              <p>Code for user {targetUserId}:</p>
              <code className="block bg-muted p-2 rounded font-mono text-lg font-bold">
                {data.verificationCode}
              </code>
              <p className="text-xs text-muted-foreground">
                Expires: {new Date(data.expiresAt).toLocaleString()}
              </p>
            </div>
          ),
          duration: 10000,
        });
        setTargetUserId('');
        loadAdminData(); // Refresh the data
      } else {
        throw new Error(data.error || 'Failed to start verification process');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to start admin verification process",
      });
    } finally {
      setIsStartingProcess(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 space-y-6">
        {/* Admin Header */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
                  <CardDescription>System administration and user management</CardDescription>
                </div>
              </div>
              <Badge variant="default" className="text-sm">
                <Shield className="h-3 w-3 mr-1" />
                Admin Access
              </Badge>
            </div>
            {adminDetails.adminId && (
              <div className="mt-4 flex gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Admin ID: </span>
                  <span className="font-mono font-semibold">{adminDetails.adminId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Admin Name: </span>
                  <span className="font-mono font-semibold">{adminDetails.adminName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">ARK ID: </span>
                  <span className="font-mono font-semibold">{arkId}</span>
                </div>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Admin Navigation */}
        {isMobile ? (
          <div className="flex items-center gap-2 mb-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4 mr-2" />
                  Menu
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Admin Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  {[
                    { value: 'broadcast', icon: Megaphone, label: 'Broadcast' },
                    { value: 'reports', icon: MessageSquare, label: 'Reports' },
                    { value: 'marketstack', icon: Database, label: 'Market Data' },
                    { value: 'users', icon: Users, label: 'Users' },
                    { value: 'create', icon: UserPlus, label: 'Create Admin' },
                    { value: 'processes', icon: Clock, label: 'Processes' },
                    { value: 'activity', icon: Activity, label: 'Activity' },
                    { value: 'logs', icon: Terminal, label: 'Logs' },
                    { value: 'api', icon: BarChart3, label: 'API' },
                    { value: 'blocked', icon: Ban, label: 'Blocked' },
                    { value: 'models', icon: Brain, label: 'ML Models' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.value}
                        variant={activeTab === item.value ? 'default' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveTab(item.value);
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
            <Badge variant="secondary" className="text-xs">
              {[
                { value: 'broadcast', label: 'Broadcast' },
                { value: 'reports', label: 'Reports' },
                { value: 'marketstack', label: 'Market Data' },
                { value: 'users', label: 'Users' },
                { value: 'create', label: 'Create Admin' },
                { value: 'processes', label: 'Processes' },
                { value: 'activity', label: 'Activity' },
                { value: 'logs', label: 'Logs' },
                { value: 'api', label: 'API' },
                { value: 'blocked', label: 'Blocked' },
                { value: 'models', label: 'ML Models' },
              ].find(item => item.value === activeTab)?.label}
            </Badge>
          </div>
        ) : null}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {!isMobile && (
            <TabsList className="grid w-full grid-cols-11 gap-1">
              <TabsTrigger value="broadcast" className="text-xs">
                <Megaphone className="h-3 w-3 mr-1" />
                Broadcast
              </TabsTrigger>
              <TabsTrigger value="reports" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="marketstack" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                Market Data
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Users
              </TabsTrigger>
              <TabsTrigger value="create" className="text-xs">
                <UserPlus className="h-3 w-3 mr-1" />
                Create Admin
              </TabsTrigger>
              <TabsTrigger value="processes" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Processes
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs">
                <Terminal className="h-3 w-3 mr-1" />
                Logs
              </TabsTrigger>
              <TabsTrigger value="api" className="text-xs">
                <BarChart3 className="h-3 w-3 mr-1" />
                API
              </TabsTrigger>
              <TabsTrigger value="blocked" className="text-xs">
                <Ban className="h-3 w-3 mr-1" />
                Blocked
              </TabsTrigger>
              <TabsTrigger value="models" className="text-xs">
                <Brain className="h-3 w-3 mr-1" />
                ML Models
              </TabsTrigger>
            </TabsList>
          )}

          {/* Broadcast Tab */}
          <TabsContent value="broadcast" className="space-y-4">
            <AdminBroadcastManager />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <AdminReportsManager />
          </TabsContent>

          {/* Marketstack Data Tab */}
          <TabsContent value="marketstack" className="space-y-4">
            <MarketstackDataManager />
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View and manage all users in the system</CardDescription>
                  </div>
                  <Button onClick={loadUsers} disabled={loadingUsers} size="sm">
                    {loadingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No users found</p>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {users.map((user) => (
                        <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{user.username}</span>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                {user.role}
                              </Badge>
                              {user.isBlocked && (
                                <Badge variant="destructive" className="text-xs">
                                  Suspended
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div>{user.email}</div>
                              <div className="flex gap-2 text-xs">
                                <span>ARK ID: {user.ark_id}</span>
                                <span>•</span>
                                <span>User ID: {user.user_id.slice(0, 8)}...</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {user.isBlocked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSuspendUser(user.user_id, false)}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Unsuspend
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleSuspendUser(user.user_id, true)}
                                disabled={user.role === 'admin'}
                              >
                                <Ban className="h-3 w-3 mr-1" />
                                Suspend
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Admin Tab */}
          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Initiate Admin Verification
                </CardTitle>
                <CardDescription>
                  Start the admin verification process for a user account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This will generate a unique verification code and start the admin verification process for the specified user.
                    The user must complete all steps within 10 minutes or the process will expire.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="targetUserId">Target User ID (UUID)</Label>
                  <Input
                    id="targetUserId"
                    placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the UUID of the user account that should become an admin
                  </p>
                </div>

                <Button 
                  onClick={startAdminVerification}
                  disabled={isStartingProcess || !targetUserId.trim()}
                  className="w-full"
                >
                  {isStartingProcess ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting Process...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Start Admin Verification
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verification Processes Tab */}
          <TabsContent value="processes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Admin Verification Processes</CardTitle>
                <CardDescription>All admin verification processes in the system</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : verificationProcesses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No verification processes found</p>
                ) : (
                  <div className="space-y-3">
                    {verificationProcesses.map((process) => (
                      <div key={process.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{process.user_id}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(process.created_at).toLocaleString()}</span>
                          </div>
                          {process.admin_id && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Admin ID: </span>
                              <span className="font-mono">{process.admin_id}</span>
                            </div>
                          )}
                        </div>
                        <Badge variant={
                          process.status === 'completed' ? 'default' :
                          process.status === 'expired' ? 'destructive' :
                          process.status === 'code_validated' ? 'secondary' :
                          'outline'
                        }>
                          {process.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {process.status === 'expired' && <XCircle className="h-3 w-3 mr-1" />}
                          {process.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Admin Activity Logs</CardTitle>
                <CardDescription>Recent administrative actions</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : activityLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No activity logs found</p>
                ) : (
                  <div className="space-y-2">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg text-sm">
                        <div className="space-y-1">
                          <div className="font-medium">{log.action}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{log.admin_id}</span>
                            <span>•</span>
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                          {log.details && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {JSON.stringify(log.details)}
                            </div>
                          )}
                        </div>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>Server-side system logs and debugging information</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : systemLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No system logs found</p>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {systemLogs.map((log) => (
                        <div key={log.id} className="p-3 border rounded-lg font-mono text-xs">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={
                              log.level === 'error' ? 'destructive' :
                              log.level === 'warning' ? 'secondary' :
                              'outline'
                            }>
                              {log.level}
                            </Badge>
                            <span className="text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs mb-1">
                            <span className="text-primary font-semibold">{log.module}</span>
                          </div>
                          <div className="text-foreground">{log.message}</div>
                          {log.details && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-muted-foreground">Details</summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Usage Tab */}
          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Usage Metrics</CardTitle>
                <CardDescription>Monitor API performance and usage statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : apiUsage.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No API usage data found</p>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {apiUsage.map((usage) => (
                        <div key={usage.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{usage.method}</Badge>
                              <span className="font-mono">{usage.endpoint}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(usage.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Status: </span>
                              <Badge variant={usage.status_code < 400 ? 'default' : 'destructive'}>
                                {usage.status_code}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Time: </span>
                              <span className="font-mono">{usage.response_time_ms}ms</span>
                            </div>
                            {usage.requests_per_second && (
                              <div>
                                <span className="text-muted-foreground">RPS: </span>
                                <span className="font-mono">{usage.requests_per_second.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blocked Entities Tab */}
          <TabsContent value="blocked" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Blocked Entities</CardTitle>
                <CardDescription>Users, IPs, and devices blocked from the system</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : blockedEntities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No blocked entities found</p>
                ) : (
                  <div className="space-y-2">
                    {blockedEntities.map((entity) => (
                      <div key={entity.id} className="flex items-start justify-between p-3 border border-destructive/20 rounded-lg text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">
                              {entity.entity_type}
                            </Badge>
                            <span className="font-mono">{entity.entity_value}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Reason: {entity.reason}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Blocked by: {entity.blocked_by}</span>
                            <span>•</span>
                            <span>{new Date(entity.blocked_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <Ban className="h-4 w-4 text-destructive" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ML Models Tab */}
          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Machine Learning Models
                    </CardTitle>
                    <CardDescription>Manage model training, deployment, and transfer learning</CardDescription>
                  </div>
                  <Button onClick={loadMLModels} disabled={loadingModels} size="sm">
                    {loadingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingModels ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : mlModels.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No ML models found</p>
                    <p className="text-sm text-muted-foreground mt-1">Models will appear here once training begins</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {mlModels.map((model) => {
                        const activeWeight = modelWeights.find(w => w.model_id === model.id && w.is_active);
                        const allVersions = modelWeights.filter(w => w.model_id === model.id).sort((a, b) => b.version - a.version);
                        const isRetraining = retrainingModel === `${model.model_type}_${model.model_name.split('_').pop()}`;
                        
                        return (
                          <div key={model.id} className="border rounded-lg p-4 space-y-3">
                            {/* Model Header */}
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-lg">{model.model_name}</h3>
                                  <Badge variant={model.status === 'active' ? 'default' : model.status === 'training' ? 'secondary' : 'outline'}>
                                    {model.status}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">v{model.version}</Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="uppercase font-mono">{model.model_type}</span>
                                  <span>•</span>
                                  <span>Retrained {model.retrain_count || 0} times</span>
                                </div>
                              </div>
                              <TrendingUp className={`h-5 w-5 ${model.accuracy && model.accuracy > 0.75 ? 'text-green-500' : 'text-yellow-500'}`} />
                            </div>

                            {/* Performance Metrics */}
                            <div className="grid grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
                              <div>
                                <div className="text-xs text-muted-foreground">Accuracy</div>
                                <div className="text-sm font-semibold">{model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Win Rate</div>
                                <div className="text-sm font-semibold">
                                  {model.winning_trades && model.total_trades 
                                    ? `${((model.winning_trades / model.total_trades) * 100).toFixed(1)}%`
                                    : 'N/A'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                                <div className="text-sm font-semibold">{model.sharpe_ratio?.toFixed(2) || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Degradation</div>
                                <div className="text-sm font-semibold">{model.performance_degradation?.toFixed(1)}%</div>
                              </div>
                            </div>

                            {/* Active Version Info */}
                            {activeWeight && (
                              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-xs font-semibold text-primary">Active Version {activeWeight.version}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Training Acc: {activeWeight.training_accuracy ? `${(activeWeight.training_accuracy * 100).toFixed(1)}%` : 'N/A'} • 
                                      Val Acc: {activeWeight.validation_accuracy ? `${(activeWeight.validation_accuracy * 100).toFixed(1)}%` : 'N/A'}
                                    </div>
                                  </div>
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                </div>
                              </div>
                            )}

                            {/* Training Controls */}
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRetrainModel(model.model_type, model.model_name.split('_').pop(), 'incremental')}
                                disabled={isRetraining || model.status === 'training'}
                              >
                                {isRetraining ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                                Incremental
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRetrainModel(model.model_type, model.model_name.split('_').pop(), 'fine_tune')}
                                disabled={isRetraining || model.status === 'training'}
                              >
                                {isRetraining ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                                Fine-tune
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRetrainModel(model.model_type, model.model_name.split('_').pop(), 'full')}
                                disabled={isRetraining || model.status === 'training'}
                              >
                                {isRetraining ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Brain className="h-3 w-3 mr-1" />}
                                Full Retrain
                              </Button>
                            </div>

                            {/* Version History */}
                            {allVersions.length > 1 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
                                  <History className="h-3 w-3" />
                                  Version History ({allVersions.length} versions)
                                </summary>
                                <div className="mt-2 space-y-2 pl-4">
                                  {allVersions.slice(0, 5).map((weight) => (
                                    <div key={weight.id} className="flex items-center justify-between p-2 border rounded text-xs">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono">v{weight.version}</span>
                                          {weight.is_active && <Badge variant="default" className="text-[10px] px-1">Active</Badge>}
                                        </div>
                                        <div className="text-muted-foreground mt-1">
                                          Train: {weight.training_accuracy ? `${(weight.training_accuracy * 100).toFixed(1)}%` : 'N/A'} • 
                                          Val: {weight.validation_accuracy ? `${(weight.validation_accuracy * 100).toFixed(1)}%` : 'N/A'}
                                        </div>
                                        <div className="text-muted-foreground text-[10px]">
                                          {new Date(weight.created_at).toLocaleString()}
                                        </div>
                                      </div>
                                      {!weight.is_active && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleActivateVersion(weight.id, weight.model_type, weight.symbol)}
                                          className="h-7 text-xs"
                                        >
                                          Activate
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ModernBottomNav 
        onHome={() => navigate('/')}
        onTrades={() => navigate('/trades')}
        onProfile={() => navigate('/profile')}
        onSettings={() => navigate('/settings')}
        onNotifications={() => navigate('/notifications')}
        onAdmin={() => navigate('/admin')}
      />
    </div>
  );
};

export default Admin;
