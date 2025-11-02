import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { CapitalConfig } from '@/types/trading';
import { useToast } from '@/hooks/use-toast';

interface CredentialsCardProps {
  config: CapitalConfig;
  onConfigChange: (field: keyof CapitalConfig, value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const CredentialsCard = ({ config, onConfigChange, onValidationChange }: CredentialsCardProps) => {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [validationMessage, setValidationMessage] = useState<string>('');

  const validateCredentials = async () => {
    if (!config.apiKey || !config.secretKey || !config.apiUrl) {
      return;
    }

    setIsValidating(true);
    setValidationStatus('validating');
    setValidationMessage('');

    try {
      const response = await fetch(`${config.apiUrl}/v2/account`, {
        method: 'GET',
        headers: {
          'APCA-API-KEY-ID': config.apiKey,
          'APCA-API-SECRET-KEY': config.secretKey,
        },
      });

      if (response.ok) {
        setValidationStatus('success');
        setValidationMessage('API credentials validated successfully!');
        onValidationChange?.(true);
        toast({
          title: "Credentials Validated",
          description: "Your Alpaca API credentials are correct.",
        });
      } else {
        const error = await response.text();
        setValidationStatus('error');
        setValidationMessage(`Validation failed: ${error || 'Invalid credentials'}`);
        onValidationChange?.(false);
        toast({
          variant: "destructive",
          title: "Invalid Credentials",
          description: "The API credentials you entered are incorrect. Please check and try again.",
        });
      }
    } catch (error) {
      setValidationStatus('error');
      setValidationMessage(`Connection error: ${error}`);
      onValidationChange?.(false);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect to Alpaca API. Please check your internet connection.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Auto-validate when all credentials are filled
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (config.apiKey && config.secretKey && config.apiUrl) {
        validateCredentials();
      } else {
        setValidationStatus('idle');
        onValidationChange?.(false);
      }
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [config.apiKey, config.secretKey, config.apiUrl]);

  const isConfigComplete = config.apiKey && config.secretKey;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Label htmlFor="environment">Account Type:</Label>
        <Select 
          value={config.environment} 
          onValueChange={(value: 'paper' | 'live') => onConfigChange('environment', value)}
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
          onChange={(e) => onConfigChange('apiKey', e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Get your API keys from Alpaca dashboard
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="secretKey">Secret Key</Label>
        <Input
          id="secretKey"
          type="password"
          placeholder="Your Alpaca Secret Key"
          value={config.secretKey}
          onChange={(e) => onConfigChange('secretKey', e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Keep your secret key safe and never share it
        </p>
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

      {validationMessage && (
        <Alert variant={validationStatus === 'success' ? 'default' : 'destructive'}>
          <AlertDescription className="flex items-center gap-2">
            {validationStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {validationStatus === 'error' && <XCircle className="h-4 w-4" />}
            {validationMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Status Indicator */}
      {isConfigComplete && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
          {validationStatus === 'validating' && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Validating credentials...</span>
            </>
          )}
          {validationStatus === 'success' && (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">Credentials validated</span>
            </>
          )}
          {validationStatus === 'error' && (
            <>
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">Validation failed - credentials are incorrect</span>
            </>
          )}
        </div>
      )}

      <Alert>
        <AlertDescription>
          <strong>How to get Alpaca API keys:</strong>
          <br />1. Sign up or log in to <a href="https://alpaca.markets" target="_blank" rel="noopener noreferrer" className="underline">Alpaca Markets</a>
          <br />2. Navigate to your account dashboard
          <br />3. Go to API Keys section
          <br />4. Generate new keys (Paper or Live trading)
          <br />5. Copy and paste both the API Key ID and Secret Key here
        </AlertDescription>
      </Alert>
    </div>
  );
};
