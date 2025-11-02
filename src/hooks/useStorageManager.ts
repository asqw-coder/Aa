import { useState, useCallback } from 'react';
import { StorageManager, StorageFile, StorageTier } from '@/services/StorageManager';
import { useToast } from './use-toast';

interface StorageOperationResult {
  success: boolean;
  url?: string;
  tier?: StorageTier;
  error?: string;
}

export function useStorageManager() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const storageManager = StorageManager.getInstance();

  const store = useCallback(async (file: StorageFile): Promise<StorageOperationResult> => {
    setIsLoading(true);
    try {
      const result = await storageManager.store(file);
      
      if (result.success) {
        toast({
          title: "File stored successfully",
          description: `File stored in ${result.tier} storage`
        });
      } else {
        toast({
          title: "Storage failed",
          description: "Failed to store file",
          variant: "destructive"
        });
      }
      
      return {
        success: result.success,
        url: result.url,
        tier: result.tier
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Storage error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const retrieve = useCallback(async (path: string): Promise<{ 
    success: boolean; 
    content?: string; 
    contentType?: string;
    error?: string;
  }> => {
    setIsLoading(true);
    try {
      const result = await storageManager.retrieve(path);
      
      if (!result.success) {
        toast({
          title: "File not found",
          description: `Could not retrieve file: ${path}`,
          variant: "destructive"
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Retrieval error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const archive = useCallback(async (
    path: string, 
    type: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const success = await storageManager.archive(path, type);
      
      if (success) {
        toast({
          title: "File archived",
          description: `File archived as ${type} backup`
        });
      } else {
        toast({
          title: "Archive failed",
          description: "Failed to archive file",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Archive error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const backup = async (path: string): Promise<boolean> => {
    return await archive(path, 'daily');
  };

  const deleteFile = useCallback(async (path: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const success = await storageManager.delete(path);
      
      if (success) {
        toast({
          title: "File deleted",
          description: "File removed from all storage tiers"
        });
      } else {
        toast({
          title: "Delete failed",
          description: "Failed to delete file",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Delete error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const listFiles = useCallback(async (
    pattern?: string,
    tier?: StorageTier
  ): Promise<Array<{
    path: string;
    storage_tier: string;
    content_type: string;
    size_bytes: number;
    metadata: any;
    uploaded_at: string;
  }>> => {
    setIsLoading(true);
    try {
      const result = await storageManager.list(pattern, tier);
      return result.success ? (result.files || []) : [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "List error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Convenience methods for specific use cases
  
  const storeMLModel = useCallback(async (modelName: string, modelData: string): Promise<StorageOperationResult> => {
    return store({
      path: `models/${modelName}`,
      content: modelData,
      contentType: 'application/json',
      metadata: {
        type: 'ml_model',
        created_at: new Date().toISOString()
      }
    });
  }, [store]);

  const storeReport = useCallback(async (reportName: string, reportData: string): Promise<StorageOperationResult> => {
    return store({
      path: `reports/${reportName}`,
      content: reportData,
      contentType: 'application/json',
      metadata: {
        type: 'trading_report',
        created_at: new Date().toISOString()
      }
    });
  }, [store]);

  const storeAnalytics = useCallback(async (analyticsName: string, data: string): Promise<StorageOperationResult> => {
    return store({
      path: `analytics/${analyticsName}`,
      content: data,
      contentType: 'application/json',
      metadata: {
        type: 'analytics_data',
        created_at: new Date().toISOString()
      }
    });
  }, [store]);

  return {
    // Core operations
    store,
    retrieve,
    archive,
    backup,
    deleteFile,
    listFiles,
    
    // Convenience methods
    storeMLModel,
    storeReport,
    storeAnalytics,
    
    // State
    isLoading
  };
}