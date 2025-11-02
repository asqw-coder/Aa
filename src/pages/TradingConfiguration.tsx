import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  Shield, 
  Database, 
  Cloud, 
  Cog,
  ArrowLeft,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { CapitalConfig } from '@/types/trading';
import { GoogleDriveService, GoogleDriveConfig } from '@/services/GoogleDriveService';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserTradingSymbols } from '@/hooks/useUserTradingSymbols';
import { useCredentials } from '@/hooks/useCredentials';
import { TradingSymbolsCard } from '@/components/TradingSymbolsCard';
import { GoogleDriveCard } from '@/components/GoogleDriveCard';
import { AdvancedSettingsCard } from '@/components/AdvancedSettingsCard';
import { useToast } from '@/hooks/use-toast';

const TradingConfiguration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const notificationHook = useNotifications();
  const { symbols: userSymbols, saveSymbols, defaultSymbols, loading: symbolsLoading } = useUserTradingSymbols();
  const { credentials, loading: credentialsLoading, saveCredentials } = useCredentials();

  const [paperConfig, setPaperConfig] = useState<CapitalConfig>({
    apiKey: '',
    secretKey: '',
    environment: 'paper',
    apiUrl: 'https://paper-api.alpaca.markets',
    dataUrl: 'https://data.alpaca.markets',
    streamingUrl: 'wss://stream.data.alpaca.markets/v2/sip'
  });

  const [liveConfig, setLiveConfig] = useState<CapitalConfig>({
    apiKey: '',
    secretKey: '',
    environment: 'live',
    apiUrl: 'https://api.alpaca.markets',
    dataUrl: 'https://data.alpaca.markets',
    streamingUrl: 'wss://stream.data.alpaca.markets/v2/sip'
  });

  const [defaultMode, setDefaultMode] = useState<'paper' | 'live'>('paper');
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [driveConfig, setDriveConfig] = useState<GoogleDriveConfig>(GoogleDriveService.getDefaultConfig());
  const [isValidatingPaper, setIsValidatingPaper] = useState(false);
  const [isValidatingLive, setIsValidatingLive] = useState(false);
  const [paperValidation, setPaperValidation] = useState<{ valid: boolean; message: string; balance?: number } | null>(null);
  const [liveValidation, setLiveValidation] = useState<{ valid: boolean; message: string; balance?: number } | null>(null);

  // Collapsible states
  const [openSections, setOpenSections] = useState({
    symbols: false,
    storage: false,
    advanced: false
  });

  useEffect(() => {
    // Load credentials and set to appropriate config
    if (credentials) {
      if (credentials.environment === 'paper') {
        setPaperConfig(credentials);
      } else {
        setLiveConfig(credentials);
      }
    }
    
    // Load drive config from localStorage
    const savedDriveConfig = GoogleDriveService.loadConfig();
    setDriveConfig(savedDriveConfig);
    
    // Set user symbols from hook
    if (!symbolsLoading && userSymbols.length > 0) {
      setSelectedSymbols(userSymbols);
    }

    // Load default mode from localStorage
    const savedDefault = localStorage.getItem('defaultTradingMode');
    if (savedDefault === 'paper' || savedDefault === 'live') {
      setDefaultMode(savedDefault);
    }
  }, [credentials, symbolsLoading, userSymbols]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleConfigChange = (type: 'paper' | 'live', field: keyof CapitalConfig, value: string) => {
    const setter = type === 'paper' ? setPaperConfig : setLiveConfig;
    setter(prev => ({ ...prev, [field]: value }));
  };

  const handleDefaultModeChange = (mode: 'paper' | 'live') => {
    setDefaultMode(mode);
    localStorage.setItem('defaultTradingMode', mode);
  };

  const handleDriveConfigChange = (field: keyof GoogleDriveConfig, value: string | boolean) => {
    setDriveConfig(prev => ({ ...prev, [field]: value }));
  };

  const validateCredentials = async (type: 'paper' | 'live') => {
    const config = type === 'paper' ? paperConfig : liveConfig;
    const setValidating = type === 'paper' ? setIsValidatingPaper : setIsValidatingLive;
    const setValidation = type === 'paper' ? setPaperValidation : setLiveValidation;

    if (!config.apiKey || !config.secretKey) {
      setValidation({ valid: false, message: 'Please provide both API Key and Secret Key' });
      return false;
    }

    setValidating(true);
    setValidation(null);

    try {
      const response = await fetch(`${config.apiUrl}/v2/account`, {
        headers: {
          'APCA-API-KEY-ID': config.apiKey,
          'APCA-API-SECRET-KEY': config.secretKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const balance = parseFloat(data.equity);
        setValidation({ 
          valid: true, 
          message: 'Credentials validated successfully!', 
          balance 
        });
        return true;
      } else {
        setValidation({ valid: false, message: 'Invalid credentials. Please check your API keys.' });
        return false;
      }
    } catch (error) {
      setValidation({ valid: false, message: 'Failed to validate credentials. Please try again.' });
      return false;
    } finally {
      setValidating(false);
    }
  };

  const saveConfiguration = async (type: 'paper' | 'live') => {
    const config = type === 'paper' ? paperConfig : liveConfig;
    
    if (!config.apiKey || !config.secretKey) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide both API Key and Secret Key."
      });
      return;
    }

    // Validate credentials before saving
    const isValid = await validateCredentials(type);
    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: "Please ensure your API credentials are correct before saving."
      });
      return;
    }

    try {
      // Save credentials to database
      await saveCredentials(config);
      
      // Save symbols to database
      await saveSymbols(selectedSymbols);
      
      // Save drive config to localStorage
      GoogleDriveService.saveConfig(driveConfig);
      
      // Trigger credentials refresh in other components
      window.dispatchEvent(new Event('credentialsUpdated'));
      
      // Show toast notification
      toast({
        title: "Configuration Saved",
        description: `${type === 'paper' ? 'Paper' : 'Live'} trading configuration has been saved successfully.`,
      });

      notificationHook.addNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: `${type === 'paper' ? 'Paper' : 'Live'} trading configuration has been updated successfully.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save configuration"
      });
      
      notificationHook.addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save trading configuration. Please try again.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/settings')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Trading Configuration
                </CardTitle>
                <CardDescription>
                  Configure your Alpaca API credentials for paper and live trading
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Default Mode Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              Default Trading Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={defaultMode} onValueChange={handleDefaultModeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paper">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    Paper Trading
                  </div>
                </SelectItem>
                <SelectItem value="live">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Live Trading
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              This will be used when you start trading
            </p>
          </CardContent>
        </Card>

        {/* API Credentials Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API Credentials</CardTitle>
            <CardDescription>Configure paper and live trading credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="paper" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paper">
                  <Shield className="h-4 w-4 mr-2" />
                  Paper Trading
                </TabsTrigger>
                <TabsTrigger value="live">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Live Trading
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paper" className="space-y-4 mt-4">
                <Badge variant="secondary">Safe Testing</Badge>
                
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="paper-api-key">API Key</Label>
                    <Input
                      id="paper-api-key"
                      type="password"
                      placeholder="Your Alpaca Paper API Key"
                      value={paperConfig.apiKey}
                      onChange={(e) => handleConfigChange('paper', 'apiKey', e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="paper-secret-key">Secret Key</Label>
                    <Input
                      id="paper-secret-key"
                      type="password"
                      placeholder="Your Alpaca Paper Secret Key"
                      value={paperConfig.secretKey}
                      onChange={(e) => handleConfigChange('paper', 'secretKey', e.target.value)}
                    />
                  </div>

                  <Alert>
                    <AlertDescription className="text-xs">
                      Paper trading uses virtual money. Perfect for testing strategies without risk.
                    </AlertDescription>
                  </Alert>

                  {paperValidation && (
                    <Alert variant={paperValidation.valid ? "default" : "destructive"}>
                      <AlertDescription className="text-xs">
                        {paperValidation.message}
                        {paperValidation.valid && paperValidation.balance !== undefined && (
                          <div className="mt-2 font-semibold">
                            Account Balance: ${paperValidation.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => validateCredentials('paper')} 
                      variant="outline"
                      className="flex-1"
                      disabled={isValidatingPaper || !paperConfig.apiKey || !paperConfig.secretKey}
                    >
                      {isValidatingPaper ? 'Testing...' : 'Test Connection'}
                    </Button>
                    <Button 
                      onClick={() => saveConfiguration('paper')} 
                      className="flex-1"
                      disabled={isValidatingPaper}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="live" className="space-y-4 mt-4">
                <Badge variant="destructive">Real Money</Badge>
                
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="live-api-key">API Key</Label>
                    <Input
                      id="live-api-key"
                      type="password"
                      placeholder="Your Alpaca Live API Key"
                      value={liveConfig.apiKey}
                      onChange={(e) => handleConfigChange('live', 'apiKey', e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="live-secret-key">Secret Key</Label>
                    <Input
                      id="live-secret-key"
                      type="password"
                      placeholder="Your Alpaca Live Secret Key"
                      value={liveConfig.secretKey}
                      onChange={(e) => handleConfigChange('live', 'secretKey', e.target.value)}
                    />
                  </div>

                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Live trading uses real money. Be cautious and test thoroughly with paper trading first.
                    </AlertDescription>
                  </Alert>

                  {liveValidation && (
                    <Alert variant={liveValidation.valid ? "default" : "destructive"}>
                      <AlertDescription className="text-xs">
                        {liveValidation.message}
                        {liveValidation.valid && liveValidation.balance !== undefined && (
                          <div className="mt-2 font-semibold">
                            Account Balance: ${liveValidation.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => validateCredentials('live')} 
                      variant="outline"
                      className="flex-1"
                      disabled={isValidatingLive || !liveConfig.apiKey || !liveConfig.secretKey}
                    >
                      {isValidatingLive ? 'Testing...' : 'Test Connection'}
                    </Button>
                    <Button 
                      onClick={() => saveConfiguration('live')} 
                      variant="destructive"
                      className="flex-1"
                      disabled={isValidatingLive}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Configuration Sections */}
        <div className="space-y-4">

          {/* Trading Symbols */}
          <Collapsible 
            open={openSections.symbols} 
            onOpenChange={() => toggleSection('symbols')}
          >
            <Card className="transition-all duration-200 hover:shadow-md">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <CardTitle className="text-lg">Trading Symbols</CardTitle>
                        <CardDescription>Configure instruments to trade</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {selectedSymbols.length} symbols
                      </Badge>
                      {openSections.symbols ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {!symbolsLoading && (
                    <TradingSymbolsCard 
                      selectedSymbols={selectedSymbols}
                      setSelectedSymbols={setSelectedSymbols}
                      defaultSymbols={defaultSymbols}
                    />
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Google Drive Storage */}
          <Collapsible 
            open={openSections.storage} 
            onOpenChange={() => toggleSection('storage')}
          >
            <Card className="transition-all duration-200 hover:shadow-md">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Cloud className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <CardTitle className="text-lg">Google Drive Storage</CardTitle>
                        <CardDescription>Cloud storage for models and reports</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={driveConfig.apiKey ? "default" : "secondary"} className="text-xs">
                        {driveConfig.apiKey ? "Configured" : "Optional"}
                      </Badge>
                      {openSections.storage ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <GoogleDriveCard 
                    driveConfig={driveConfig}
                    onDriveConfigChange={handleDriveConfigChange}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Advanced Settings */}
          <Collapsible 
            open={openSections.advanced} 
            onOpenChange={() => toggleSection('advanced')}
          >
            <Card className="transition-all duration-200 hover:shadow-md">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Cog className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <CardTitle className="text-lg">Advanced Settings</CardTitle>
                        <CardDescription>WebSocket and system configuration</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Advanced
                      </Badge>
                      {openSections.advanced ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <AdvancedSettingsCard 
                    config={paperConfig}
                    onConfigChange={(field, value) => handleConfigChange('paper', field, value)}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

      </div>
    </div>
  );
};

export default TradingConfiguration;