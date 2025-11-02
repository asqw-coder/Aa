import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface GoogleDriveConfig {
  apiKey: string;
  modelsFolderId: string;
  reportsFolderId: string;
  backupsFolderId: string;
  useServiceAccount: boolean;
}

class GoogleDriveService {
  private config: GoogleDriveConfig;
  private authHeaders: Record<string, string>;

  constructor(config: GoogleDriveConfig) {
    this.config = config;
    this.authHeaders = this.getAuthHeaders();
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.config.useServiceAccount) {
      // Will use service account authentication
      return {};
    } else {
      return {};
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.config.useServiceAccount) {
      const serviceAccountJson = Deno.env.get('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON');
      if (!serviceAccountJson) {
        throw new Error('Service Account JSON not found in environment variables');
      }

      const serviceAccount = JSON.parse(serviceAccountJson);
      
      // Create JWT for Google OAuth
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/drive',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      };

      // For simplicity, we'll use the API key if service account setup is complex
      // In production, implement proper JWT signing here
      return this.config.apiKey;
    }
    
    return this.config.apiKey;
  }

  async uploadMLModel(modelName: string, modelData: Uint8Array, metadata: any): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Create a blob from the model data
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(modelData)], { type: 'application/octet-stream' });
      
      // Add metadata
      const fileMetadata = {
        name: `${modelName}_${Date.now()}.model`,
        parents: [this.config.modelsFolderId],
        description: JSON.stringify(metadata)
      };

      formData.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
      formData.append('file', blob);

      const authParam = this.config.useServiceAccount 
        ? { headers: { 'Authorization': `Bearer ${accessToken}` } }
        : {};
      
      const url = this.config.useServiceAccount
        ? 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&key=${accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        ...authParam
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Model ${modelName} uploaded to Google Drive:`, result.id);
      
      return result.id; // Return the file ID
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      throw error;
    }
  }

  async downloadMLModel(fileId: string): Promise<Uint8Array> {
    try {
      const accessToken = await this.getAccessToken();
      const authParam = this.config.useServiceAccount 
        ? { headers: { 'Authorization': `Bearer ${accessToken}` } }
        : {};
      
      const url = this.config.useServiceAccount
        ? `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
        : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${accessToken}`;

      const response = await fetch(url, authParam);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error('Error downloading from Google Drive:', error);
      throw error;
    }
  }

  async listMLModels(modelType?: string): Promise<any[]> {
    try {
      const accessToken = await this.getAccessToken();
      let query = `parents in '${this.config.modelsFolderId}' and trashed = false`;
      if (modelType) {
        query += ` and name contains '${modelType}'`;
      }

      const authParam = this.config.useServiceAccount 
        ? { headers: { 'Authorization': `Bearer ${accessToken}` } }
        : {};
      
      const url = this.config.useServiceAccount
        ? `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,modifiedTime,description,size)`
        : `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${accessToken}&fields=files(id,name,createdTime,modifiedTime,description,size)`;

      const response = await fetch(url, authParam);
      
      if (!response.ok) {
        throw new Error(`List failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.files || [];
    } catch (error) {
      console.error('Error listing models from Google Drive:', error);
      return [];
    }
  }

  async deleteMLModel(fileId: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const authParam = this.config.useServiceAccount 
        ? { headers: { 'Authorization': `Bearer ${accessToken}` } }
        : {};
      
      const url = this.config.useServiceAccount
        ? `https://www.googleapis.com/drive/v3/files/${fileId}`
        : `https://www.googleapis.com/drive/v3/files/${fileId}?key=${accessToken}`;

      const response = await fetch(url, {
        method: 'DELETE',
        ...authParam
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting model from Google Drive:', error);
      return false;
    }
  }

  async createModelBackup(models: any[]): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Create a JSON backup of all models metadata
      const backupData = {
        timestamp: new Date().toISOString(),
        models: models,
        version: '1.0'
      };

      const backupJson = JSON.stringify(backupData, null, 2);
      const backupBlob = new Blob([backupJson], { type: 'application/json' });

      const formData = new FormData();
      const fileMetadata = {
        name: `model_backup_${Date.now()}.json`,
        parents: [this.config.backupsFolderId]
      };

      formData.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
      formData.append('file', backupBlob);

      const authParam = this.config.useServiceAccount 
        ? { headers: { 'Authorization': `Bearer ${accessToken}` } }
        : {};
      
      const url = this.config.useServiceAccount
        ? 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&key=${accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        ...authParam
      });

      if (!response.ok) {
        throw new Error(`Backup failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Model backup created:', result.id);
      
      return result.id;
    } catch (error) {
      console.error('Error creating model backup:', error);
      throw error;
    }
  }

  async uploadTradingReport(reportData: any, date: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Convert report to PDF-like format (JSON for now)
      const reportJson = JSON.stringify(reportData, null, 2);
      const reportBlob = new Blob([reportJson], { type: 'application/json' });

      const formData = new FormData();
      const fileMetadata = {
        name: `trading_report_${date}.json`,
        parents: [this.config.reportsFolderId],
        description: `Trading report for ${date}`
      };

      formData.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
      formData.append('file', reportBlob);

      const authParam = this.config.useServiceAccount 
        ? { headers: { 'Authorization': `Bearer ${accessToken}` } }
        : {};
      
      const url = this.config.useServiceAccount
        ? 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&key=${accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        ...authParam
      });

      if (!response.ok) {
        throw new Error(`Report upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Trading report for ${date} uploaded:`, result.id);
      
      return result.id;
    } catch (error) {
      console.error('Error uploading trading report:', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const accessToken = await this.getAccessToken();
      const authParam = this.config.useServiceAccount 
        ? { headers: { 'Authorization': `Bearer ${accessToken}` } }
        : {};
      
      const url = this.config.useServiceAccount
        ? 'https://www.googleapis.com/drive/v3/about?fields=user'
        : `https://www.googleapis.com/drive/v3/about?fields=user&key=${accessToken}`;

      const response = await fetch(url, authParam);
      
      if (!response.ok) {
        return { success: false, message: `Connection failed: ${response.statusText}` };
      }

      const result = await response.json();
      return { success: true, message: `Connected successfully as ${result.user?.displayName || 'Unknown User'}` };
    } catch (error: any) {
      return { success: false, message: `Connection error: ${error.message}` };
    }
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, config, ...params } = await req.json();
    
    // Use provided config or fallback to environment
    const driveConfig: GoogleDriveConfig = config || {
      apiKey: Deno.env.get('GOOGLE_DRIVE_API_KEY') ?? '',
      modelsFolderId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlWo',
      reportsFolderId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlWo',
      backupsFolderId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlWo',
      useServiceAccount: false
    };
    
    const driveService = new GoogleDriveService(driveConfig);

    switch (action) {
      case 'upload_model': {
        const { modelName, modelData, metadata } = params;
        
        // Convert base64 to Uint8Array if needed
        const dataArray = typeof modelData === 'string' 
          ? new Uint8Array(atob(modelData).split('').map(c => c.charCodeAt(0)))
          : new Uint8Array(modelData);
        
        const fileId = await driveService.uploadMLModel(modelName, dataArray, metadata);
        
        // Update database with Drive path
        const { error } = await supabase
          .from('ml_models')
          .update({ drive_path: fileId })
          .eq('model_name', modelName);
        
        if (error) {
          console.error('Error updating model drive path:', error);
        }

        return new Response(JSON.stringify({
          success: true,
          fileId,
          message: 'Model uploaded successfully'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      case 'download_model': {
        const { fileId } = params;
        const modelData = await driveService.downloadMLModel(fileId);
        
        // Convert to base64 for transmission
        const base64Data = btoa(String.fromCharCode(...modelData));
        
        return new Response(JSON.stringify({
          success: true,
          modelData: base64Data,
          message: 'Model downloaded successfully'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      case 'list_models': {
        const { modelType } = params;
        const models = await driveService.listMLModels(modelType);
        
        return new Response(JSON.stringify({
          success: true,
          models,
          message: 'Models listed successfully'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      case 'delete_model': {
        const { fileId } = params;
        const success = await driveService.deleteMLModel(fileId);
        
        return new Response(JSON.stringify({
          success,
          message: success ? 'Model deleted successfully' : 'Failed to delete model'
        }), {
          status: success ? 200 : 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      case 'create_backup': {
        // Get all models from database
        const { data: models, error } = await supabase
          .from('ml_models')
          .select('*');

        if (error) throw error;

        const backupId = await driveService.createModelBackup(models);
        
        return new Response(JSON.stringify({
          success: true,
          backupId,
          message: 'Backup created successfully'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      case 'upload_report': {
        const { reportData, date } = params;
        const reportId = await driveService.uploadTradingReport(reportData, date);
        
        // Update database with Drive path
        const { error } = await supabase
          .from('daily_reports')
          .update({ drive_path: reportId })
          .eq('date', date);
        
        if (error) {
          console.error('Error updating report drive path:', error);
        }

        return new Response(JSON.stringify({
          success: true,
          reportId,
          message: 'Report uploaded successfully'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      case 'test_connection': {
        const result = await driveService.testConnection();
        
        return new Response(JSON.stringify({
          success: result.success,
          message: result.message
        }), {
          status: result.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error: unknown) {
    console.error('Google Drive Storage Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return new Response(JSON.stringify({
      error: errorMessage,
      success: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});