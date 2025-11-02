import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Settings, Database, Cloud, HardDrive } from 'lucide-react';
import { CapitalConfig } from '@/types/trading';
import { GoogleDriveService, GoogleDriveConfig } from '@/services/GoogleDriveService';

interface TradingConfigurationProps {
  onConfigSave: (config: CapitalConfig) => void;
  onClose: () => void;
}

const DEFAULT_SYMBOLS = ['USDNGN', 'GBPUSD', 'USDJPY', 'EURNGN', 'XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'BLCO', 'XPTUSD', 'NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'EURUSD', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'WTI', 'NAS100', 'SPX500', 'GER40', 'UK100', 'BTCUSD', 'ETHUSD', 'BNBUSD'];

export const TradingConfiguration = ({ onConfigSave, onClose }: TradingConfigurationProps) => {
  const [config, setConfig] = useState<CapitalConfig>({
    apiUrl: '',
    dataUrl: 'https://data.alpaca.markets',
    streamingUrl: 'wss://stream.data.alpaca.markets/v2/sip',
    apiKey: '',
    secretKey: '',
    environment: 'paper'
  });

  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [customSymbol, setCustomSymbol] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Google Drive configuration
  const [driveConfig, setDriveConfig] = useState<GoogleDriveConfig>(GoogleDriveService.getDefaultConfig());
  const [isTestingDriveConnection, setIsTestingDriveConnection] = useState(false);
  const [driveConnectionResult, setDriveConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Load saved configuration from localStorage
    const savedConfig = localStorage.getItem('tradingConfig');
    const savedSymbols = localStorage.getItem('tradingSymbols');
    const savedDriveConfig = GoogleDriveService.loadConfig();
    
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
    if (savedSymbols) {
      setSelectedSymbols(JSON.parse(savedSymbols));
    }
    setDriveConfig(savedDriveConfig);
  }, []);

  useEffect(() => {
    // Update API URL based on environment
    const baseUrl = config.environment === 'paper' 
      ? 'https://paper-api.alpaca.markets'
      : 'https://api.alpaca.markets';
    
    setConfig(prev => ({ ...prev, apiUrl: baseUrl }));
  }, [config.environment]);

  const handleConfigChange = (field: keyof CapitalConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const addSymbol = () => {
    if (customSymbol && !selectedSymbols.includes(customSymbol)) {
      setSelectedSymbols(prev => [...prev, customSymbol]);
      setCustomSymbol('');
    }
  };

  const removeSymbol = (symbol: string) => {
    setSelectedSymbols(prev => prev.filter(s => s !== symbol));
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);

    try {
      const response = await fetch(`${config.apiUrl}/v2/account`, {
        method: 'GET',
        headers: {
          'APCA-API-KEY-ID': config.apiKey,
          'APCA-API-SECRET-KEY': config.secretKey,
        },
      });

      if (response.ok) {
        setConnectionResult({ success: true, message: 'Connection successful!' });
      } else {
        const error = await response.text();
        setConnectionResult({ success: false, message: `Connection failed: ${error}` });
      }
    } catch (error) {
      setConnectionResult({ success: false, message: `Connection error: ${error}` });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDriveConfigChange = (field: keyof GoogleDriveConfig, value: string | boolean) => {
    setDriveConfig(prev => ({ ...prev, [field]: value }));
  };

  const testDriveConnection = async () => {
    setIsTestingDriveConnection(true);
    setDriveConnectionResult(null);

    try {
      const driveService = new GoogleDriveService(driveConfig);
      const result = await driveService.testConnection();
      setDriveConnectionResult(result);
    } catch (error: any) {
      setDriveConnectionResult({ success: false, message: `Connection error: ${error.message}` });
    } finally {
      setIsTestingDriveConnection(false);
    }
  };

  const saveConfiguration = () => {
    // Remove localStorage credential storage
    localStorage.setItem('tradingSymbols', JSON.stringify(selectedSymbols));
    GoogleDriveService.saveConfig(driveConfig);
    
    // Pass configuration to parent
    onConfigSave(config);
    onClose();
  };

  const isConfigValid = config.apiKey && config.secretKey;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Trading Configuration
              </CardTitle>
              <CardDescription>
                Configure your Alpaca API credentials and trading parameters
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="credentials" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="credentials">Credentials</TabsTrigger>
              <TabsTrigger value="symbols">Trading Symbols</TabsTrigger>
              <TabsTrigger value="storage">Google Drive</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="credentials" className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="environment">Account Type:</Label>
                  <Select 
                    value={config.environment} 
                    onValueChange={(value: 'demo' | 'live') => handleConfigChange('environment', value)}
                  >
                    <SelectTrigger className="w-[180px]">
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
                  <Badge variant={config.environment === 'paper' ? 'secondary' : 'destructive'}>
                    {config.environment === 'paper' ? 'Safe Testing' : 'Real Money'}
                  </Badge>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Your Alpaca API Key ID"
                    value={config.apiKey}
                    onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    placeholder="Your Alpaca Secret Key"
                    value={config.secretKey}
                    onChange={(e) => handleConfigChange('secretKey', e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>API Endpoint</Label>
                  <Input
                    value={config.apiUrl}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Automatically set based on account type
                  </p>
                </div>

                {connectionResult && (
                  <Alert variant={connectionResult.success ? 'default' : 'destructive'}>
                    <AlertDescription>{connectionResult.message}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={testConnection} 
                    disabled={!isConfigValid || isTestingConnection}
                    variant="outline"
                  >
                    {isTestingConnection ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="symbols" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label>Selected Trading Symbols</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedSymbols.map(symbol => (
                      <Badge 
                        key={symbol} 
                        variant="secondary" 
                        className="cursor-pointer"
                        onClick={() => removeSymbol(symbol)}
                      >
                        {symbol} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom symbol (e.g., AUD_USD)"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
                  />
                  <Button onClick={addSymbol} disabled={!customSymbol}>
                    Add Symbol
                  </Button>
                </div>

                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertDescription>
                    The bot will use historical data for these symbols to train ML models and execute trades.
                    Common symbols: EUR_USD, GBP_USD, USD_JPY, BTC_USD, ETH_USD, XAU_USD
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="storage" className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center gap-2 mb-4">
                  <Cloud className="h-5 w-5 text-trust-primary" />
                  <h3 className="text-lg font-semibold">Google Drive Storage Configuration</h3>
                </div>

                <Alert>
                  <HardDrive className="h-4 w-4" />
                  <AlertDescription>
                    Configure Google Drive integration for storing ML models, trading reports, and backups.
                    You'll need to create a Google Cloud project and enable the Drive API.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="useServiceAccount"
                    checked={driveConfig.useServiceAccount}
                    onCheckedChange={(checked) => handleDriveConfigChange('useServiceAccount', checked)}
                  />
                  <Label htmlFor="useServiceAccount">Use Service Account (Recommended)</Label>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="apiKey">Google Drive API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Your Google Drive API Key"
                    value={driveConfig.apiKey}
                    onChange={(e) => handleDriveConfigChange('apiKey', e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    {driveConfig.useServiceAccount 
                      ? 'Service Account JSON will be used from Supabase secrets' 
                      : 'API key for Google Drive access'
                    }
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="modelsFolderId">ML Models Folder ID</Label>
                  <Input
                    id="modelsFolderId"
                    placeholder="Google Drive folder ID for ML models"
                    value={driveConfig.modelsFolderId}
                    onChange={(e) => handleDriveConfigChange('modelsFolderId', e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Create a folder in Google Drive and copy its ID from the URL
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reportsFolderId">Reports Folder ID</Label>
                  <Input
                    id="reportsFolderId"
                    placeholder="Google Drive folder ID for trading reports"
                    value={driveConfig.reportsFolderId}
                    onChange={(e) => handleDriveConfigChange('reportsFolderId', e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="backupsFolderId">Backups Folder ID</Label>
                  <Input
                    id="backupsFolderId"
                    placeholder="Google Drive folder ID for backups"
                    value={driveConfig.backupsFolderId}
                    onChange={(e) => handleDriveConfigChange('backupsFolderId', e.target.value)}
                  />
                </div>

                {driveConnectionResult && (
                  <Alert variant={driveConnectionResult.success ? 'default' : 'destructive'}>
                    <AlertDescription>{driveConnectionResult.message}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={testDriveConnection} 
                    disabled={!driveConfig.apiKey || isTestingDriveConnection}
                    variant="outline"
                  >
                    {isTestingDriveConnection ? 'Testing...' : 'Test Google Drive Connection'}
                  </Button>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Setup Instructions:</strong>
                    <br />1. Go to Google Cloud Console → APIs & Services → Credentials
                    <br />2. Create an API Key or Service Account JSON
                    <br />3. Enable Google Drive API for your project
                    <br />4. Create folders in Google Drive and note their IDs
                    <br />5. Share folders with your service account email (if using service account)
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="streamingUrl">WebSocket URL</Label>
                  <Input
                    id="streamingUrl"
                    value={config.streamingUrl}
                    onChange={(e) => handleConfigChange('streamingUrl', e.target.value)}
                  />
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Advanced settings should only be modified if you know what you're doing.
                    Incorrect settings may prevent the bot from functioning properly.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={saveConfiguration} 
              disabled={!isConfigValid}
              className="bg-primary hover:bg-primary/90"
            >
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};