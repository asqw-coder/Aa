import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HardDrive, AlertTriangle } from 'lucide-react';
import { GoogleDriveService, GoogleDriveConfig } from '@/services/GoogleDriveService';

interface GoogleDriveCardProps {
  driveConfig: GoogleDriveConfig;
  onDriveConfigChange: (field: keyof GoogleDriveConfig, value: string | boolean) => void;
}

export const GoogleDriveCard = ({ driveConfig, onDriveConfigChange }: GoogleDriveCardProps) => {
  const [isTestingDriveConnection, setIsTestingDriveConnection] = useState(false);
  const [driveConnectionResult, setDriveConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

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

  return (
    <div className="space-y-4">
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
          onCheckedChange={(checked) => onDriveConfigChange('useServiceAccount', checked)}
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
          onChange={(e) => onDriveConfigChange('apiKey', e.target.value)}
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
          onChange={(e) => onDriveConfigChange('modelsFolderId', e.target.value)}
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
          onChange={(e) => onDriveConfigChange('reportsFolderId', e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="backupsFolderId">Backups Folder ID</Label>
        <Input
          id="backupsFolderId"
          placeholder="Google Drive folder ID for backups"
          value={driveConfig.backupsFolderId}
          onChange={(e) => onDriveConfigChange('backupsFolderId', e.target.value)}
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
  );
};