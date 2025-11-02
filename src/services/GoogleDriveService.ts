import { supabase } from '@/integrations/supabase/client';

export interface GoogleDriveConfig {
  apiKey: string;
  modelsFolderId: string;
  reportsFolderId: string;
  backupsFolderId: string;
  useServiceAccount: boolean;
}

export class GoogleDriveService {
  private config: GoogleDriveConfig;

  constructor(config: GoogleDriveConfig) {
    this.config = config;
  }

  static getDefaultConfig(): GoogleDriveConfig {
    return {
      apiKey: '',
      modelsFolderId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlWo',
      reportsFolderId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlWo',
      backupsFolderId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlWo',
      useServiceAccount: false
    };
  }

  static saveConfig(config: GoogleDriveConfig): void {
    localStorage.setItem('googleDriveConfig', JSON.stringify(config));
  }

  static loadConfig(): GoogleDriveConfig {
    const saved = localStorage.getItem('googleDriveConfig');
    return saved ? JSON.parse(saved) : GoogleDriveService.getDefaultConfig();
  }

  async uploadMLModel(modelName: string, modelData: Uint8Array, metadata: any): Promise<string> {
    try {
      const response = await supabase.functions.invoke('google-drive-storage', {
        body: {
          action: 'upload_model',
          modelName,
          modelData: Array.from(modelData),
          metadata,
          config: this.config
        }
      });

      if (response.error) throw response.error;
      return response.data.fileId;
    } catch (error) {
      console.error('Error uploading ML model:', error);
      throw error;
    }
  }

  async downloadMLModel(fileId: string): Promise<Uint8Array> {
    try {
      const response = await supabase.functions.invoke('google-drive-storage', {
        body: {
          action: 'download_model',
          fileId,
          config: this.config
        }
      });

      if (response.error) throw response.error;
      
      // Convert from base64 back to Uint8Array
      const base64Data = response.data.modelData;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      console.error('Error downloading ML model:', error);
      throw error;
    }
  }

  async listMLModels(modelType?: string): Promise<any[]> {
    try {
      const response = await supabase.functions.invoke('google-drive-storage', {
        body: {
          action: 'list_models',
          modelType,
          config: this.config
        }
      });

      if (response.error) throw response.error;
      return response.data.models;
    } catch (error) {
      console.error('Error listing ML models:', error);
      throw error;
    }
  }

  async deleteMLModel(fileId: string): Promise<boolean> {
    try {
      const response = await supabase.functions.invoke('google-drive-storage', {
        body: {
          action: 'delete_model',
          fileId,
          config: this.config
        }
      });

      if (response.error) throw response.error;
      return response.data.success;
    } catch (error) {
      console.error('Error deleting ML model:', error);
      return false;
    }
  }

  async uploadTradingReport(reportData: any, date: string): Promise<string> {
    try {
      const response = await supabase.functions.invoke('google-drive-storage', {
        body: {
          action: 'upload_report',
          reportData,
          date,
          config: this.config
        }
      });

      if (response.error) throw response.error;
      return response.data.reportId;
    } catch (error) {
      console.error('Error uploading trading report:', error);
      throw error;
    }
  }

  async createBackup(): Promise<string> {
    try {
      const response = await supabase.functions.invoke('google-drive-storage', {
        body: {
          action: 'create_backup',
          config: this.config
        }
      });

      if (response.error) throw response.error;
      return response.data.backupId;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await supabase.functions.invoke('google-drive-storage', {
        body: {
          action: 'test_connection',
          config: this.config
        }
      });

      if (response.error) {
        return { success: false, message: response.error.message };
      }

      return { success: true, message: 'Google Drive connection successful!' };
    } catch (error: any) {
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }
}