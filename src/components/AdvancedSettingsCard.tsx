import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { CapitalConfig } from '@/types/trading';

interface AdvancedSettingsCardProps {
  config: CapitalConfig;
  onConfigChange: (field: keyof CapitalConfig, value: string) => void;
}

export const AdvancedSettingsCard = ({ config, onConfigChange }: AdvancedSettingsCardProps) => {
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="streamingUrl">WebSocket URL</Label>
        <Input
          id="streamingUrl"
          value={config.streamingUrl}
          onChange={(e) => onConfigChange('streamingUrl', e.target.value)}
          placeholder="wss://api-streaming-capital.backend-capital.com/connect"
        />
        <p className="text-sm text-muted-foreground">
          Real-time market data streaming endpoint
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Advanced settings should only be modified if you know what you're doing.
          Incorrect settings may prevent the bot from functioning properly.
        </AlertDescription>
      </Alert>
    </div>
  );
};