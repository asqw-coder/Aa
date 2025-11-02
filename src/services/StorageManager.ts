import { supabase } from '@/integrations/supabase/client';

export type StorageTier = 'local' | 'supabase' | 'r2' | 'backblaze';

export interface StorageFile {
  path: string;
  content: string;
  contentType: string;
  metadata?: Record<string, any>;
}

export interface StorageResult {
  success: boolean;
  url?: string;
  tier?: StorageTier;
  error?: string;
  size?: number;
}

export interface RetrievalResult {
  success: boolean;
  content?: string;
  contentType?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ListResult {
  success: boolean;
  files?: Array<{
    path: string;
    storage_tier: string;
    content_type: string;
    size_bytes: number;
    metadata: any;
    uploaded_at: string;
  }>;
  error?: string;
}

export interface StorageQuota {
  used: number;
  total: number;
  percentage: number;
  byTier: Record<StorageTier, number>;
}

export class StorageManager {
  private static instance: StorageManager;
  private quotaCache: { quota: StorageQuota; timestamp: number } | null = null;
  private readonly QUOTA_CACHE_TTL = 300000; // 5 minutes
  private readonly WARNING_THRESHOLD = 0.8; // 80%
  private readonly CRITICAL_THRESHOLD = 0.95; // 95%

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async getStorageQuota(): Promise<StorageQuota> {
    // Check cache first
    if (this.quotaCache && Date.now() - this.quotaCache.timestamp < this.QUOTA_CACHE_TTL) {
      return this.quotaCache.quota;
    }

    try {
      const { data, error } = await supabase
        .from('storage_metadata')
        .select('storage_tier, size_bytes');

      if (error) throw error;

      const byTier: Record<StorageTier, number> = {
        local: 0,
        supabase: 0,
        r2: 0,
        backblaze: 0
      };

      let totalUsed = 0;

      if (data) {
        for (const file of data) {
          const tier = file.storage_tier as StorageTier;
          const size = file.size_bytes || 0;
          byTier[tier] += size;
          totalUsed += size;
        }
      }

      // Supabase free tier: 1GB = 1073741824 bytes
      // R2 free tier: 10GB = 10737418240 bytes
      // Backblaze: unlimited (pay as you go)
      const totalQuota = 11811160064; // ~11GB combined

      const quota: StorageQuota = {
        used: totalUsed,
        total: totalQuota,
        percentage: totalUsed / totalQuota,
        byTier
      };

      // Cache the result
      this.quotaCache = { quota, timestamp: Date.now() };

      // Log warnings
      if (quota.percentage > this.CRITICAL_THRESHOLD) {
        console.error(`CRITICAL: Storage usage at ${(quota.percentage * 100).toFixed(1)}%`);
      } else if (quota.percentage > this.WARNING_THRESHOLD) {
        console.warn(`WARNING: Storage usage at ${(quota.percentage * 100).toFixed(1)}%`);
      }

      return quota;
    } catch (error) {
      console.error('Error fetching storage quota:', error);
      return {
        used: 0,
        total: 0,
        percentage: 0,
        byTier: { local: 0, supabase: 0, r2: 0, backblaze: 0 }
      };
    }
  }

  async checkQuotaBeforeStore(estimatedSize: number): Promise<boolean> {
    const quota = await this.getStorageQuota();
    const projectedUsage = (quota.used + estimatedSize) / quota.total;

    if (projectedUsage > this.CRITICAL_THRESHOLD) {
      console.error('Storage quota exceeded, cannot store file');
      return false;
    }

    return true;
  }

  // Determine optimal storage tier based on file characteristics
  private determineTier(file: StorageFile, preferredTier?: StorageTier): StorageTier {
    if (preferredTier) return preferredTier;
    
    const sizeBytes = new Blob([file.content]).size;
    
    // Small files and configs go to Supabase
    if (sizeBytes < 1024 * 1024 || file.path.includes('/config/') || file.contentType.includes('image/')) {
      return 'supabase';
    }
    
    // ML models and frequently accessed data go to R2
    if (file.path.includes('/models/') || file.path.includes('/reports/') || file.path.includes('/analytics/')) {
      return 'r2';
    }
    
    // Backups and archives go to Backblaze
    if (file.path.includes('/backup') || file.path.includes('/archive') || file.path.includes('/logs/')) {
      return 'backblaze';
    }
    
    // Default to R2 for general storage
    return 'r2';
  }

  // Local Storage Operations
  async storeLocal(key: string, data: any): Promise<StorageResult> {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return {
        success: true,
        tier: 'local',
        size: JSON.stringify(data).length
      };
    } catch (error) {
      return {
        success: false,
        tier: 'local',
        error: error instanceof Error ? error.message : 'Local storage failed'
      };
    }
  }

  async retrieveLocal(key: string): Promise<RetrievalResult> {
    try {
      const data = localStorage.getItem(key);
      if (data === null) {
        return { success: false, error: 'Key not found in local storage' };
      }
      return {
        success: true,
        content: data,
        contentType: 'application/json'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Local retrieval failed'
      };
    }
  }

  async deleteLocal(key: string): Promise<boolean> {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Local delete failed:', error);
      return false;
    }
  }

  async listLocal(): Promise<string[]> {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('Local list failed:', error);
      return [];
    }
  }

  // Multi-tier Storage Operations
  private compressContent(content: string): string {
    // Simple compression: minify JSON or trim whitespace
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed);
    } catch {
      return content.trim();
    }
  }

  private decompressContent(content: string): string {
    // For now, return as-is since we're using simple minification
    return content;
  }

  async store(file: StorageFile, preferredTier?: StorageTier): Promise<StorageResult> {
    const tier = this.determineTier(file, preferredTier);
    
    try {
      switch (tier) {
        case 'local':
          return await this.storeLocal(file.path, file.content);
          
        case 'supabase':
          return await this.storeInSupabase(file);
          
        case 'r2':
          return await this.storeInR2(file);
          
        case 'backblaze':
          return await this.storeInBackblaze(file);
          
        default:
          throw new Error(`Unsupported storage tier: ${tier}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage operation failed'
      };
    }
  }

  private async storeInSupabase(file: StorageFile): Promise<StorageResult> {
    const fileName = file.path.split('/').pop() || 'file';
    // Compress content before upload
    const compressedContent = this.compressContent(file.content);
    const fileBlob = new Blob([compressedContent], { type: file.contentType });
    
    const { data, error } = await supabase.storage
      .from('darkstar-assets')
      .upload(file.path, fileBlob, {
        contentType: file.contentType,
        upsert: true
      });

    if (error) throw error;

    // Use signed URL for private bucket (expires in 1 year)
    const { data: signedUrlData } = await supabase.storage
      .from('darkstar-assets')
      .createSignedUrl(file.path, 31536000); // 1 year in seconds

    return {
      success: true,
      url: signedUrlData?.signedUrl || '',
      tier: 'supabase',
      size: fileBlob.size
    };
  }

  private async storeInR2(file: StorageFile): Promise<StorageResult> {
    const { data, error } = await supabase.functions.invoke('r2-storage', {
      body: {
        action: 'upload',
        path: file.path,
        content: file.content,
        contentType: file.contentType,
        metadata: file.metadata
      }
    });

    if (error) throw error;
    return data;
  }

  private async storeInBackblaze(file: StorageFile): Promise<StorageResult> {
    // Determine if it's archive based on path
    const isArchive = file.path.includes('/archive') || file.path.includes('/backup') || file.path.includes('/logs/');
    
    const { data, error } = await supabase.functions.invoke('backblaze-storage', {
      body: {
        action: 'upload',
        path: file.path,
        content: file.content,
        contentType: file.contentType,
        metadata: { ...file.metadata, isArchive },
        folder: isArchive ? 'archive' : 'active'
      }
    });

    if (error) throw error;
    return data;
  }

  async retrieve(path: string, tier?: StorageTier): Promise<RetrievalResult> {
    try {
      if (tier === 'local') {
        return await this.retrieveLocal(path);
      }

      // Try Supabase first for small files
      if (!tier || tier === 'supabase') {
        try {
          const { data, error } = await supabase.storage
            .from('darkstar-assets')
            .download(path);

          if (!error && data) {
            const content = await data.text();
            return {
              success: true,
              content,
              contentType: data.type
            };
          }
        } catch (e) {
          // Continue to other tiers
        }
      }

      // Try R2 for models and reports
      if (!tier || tier === 'r2') {
        try {
          const { data, error } = await supabase.functions.invoke('r2-storage', {
            body: { action: 'download', path }
          });

          if (!error && data?.success) {
            return {
              success: true,
              content: data.content,
              contentType: data.contentType
            };
          }
        } catch (e) {
          // Continue to other tiers
        }
      }

      // Try Backblaze
      if (!tier || tier === 'backblaze') {
        const { data, error } = await supabase.functions.invoke('backblaze-storage', {
          body: { action: 'download', path }
        });

        if (!error && data?.success) {
          return {
            success: true,
            content: data.content,
            contentType: data.contentType
          };
        }
      }

      return {
        success: false,
        error: 'File not found in any storage tier'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Retrieval failed'
      };
    }
  }

  async archive(path: string, type: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<boolean> {
    try {
      // First retrieve the file
      const result = await this.retrieve(path);
      if (!result.success || !result.content) {
        console.error('Cannot archive: file not found');
        return false;
      }

      // Archive to Backblaze with archive folder structure
      const archivePath = `archive/${type}/${path}`;
      const archiveResult = await supabase.functions.invoke('backblaze-storage', {
        body: {
          action: 'upload',
          path: archivePath,
          content: result.content,
          contentType: result.contentType,
          metadata: { originalPath: path, archiveType: type },
          folder: 'archive'
        }
      });

      return archiveResult.data?.success || false;
    } catch (error) {
      console.error('Archive failed:', error);
      return false;
    }
  }

  async delete(path: string, tier?: StorageTier): Promise<boolean> {
    try {
      let success = false;

      if (tier === 'local') {
        return await this.deleteLocal(path);
      }

      // Delete from all tiers if no specific tier provided
      if (!tier || tier === 'supabase') {
        try {
          const { error } = await supabase.storage
            .from('darkstar-assets')
            .remove([path]);
          if (!error) success = true;
        } catch (e) {
          // Continue
        }
      }

      if (!tier || tier === 'r2') {
        try {
          const { data } = await supabase.functions.invoke('r2-storage', {
            body: { action: 'delete', path }
          });
          if (data?.success) success = true;
        } catch (e) {
          // Continue
        }
      }

      if (!tier || tier === 'backblaze') {
        try {
          const { data } = await supabase.functions.invoke('backblaze-storage', {
            body: { action: 'delete', path }
          });
          if (data?.success) success = true;
        } catch (e) {
          // Continue
        }
      }

      return success;
    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  }

  async list(pathPrefix?: string, tier?: StorageTier): Promise<ListResult> {
    try {
      const allFiles: any[] = [];

      if (tier === 'local') {
        const keys = await this.listLocal();
        const localFiles = keys
          .filter(key => !pathPrefix || key.startsWith(pathPrefix))
          .map(key => ({
            path: key,
            storage_tier: 'local',
            content_type: 'application/json',
            size_bytes: localStorage.getItem(key)?.length || 0,
            metadata: {},
            uploaded_at: new Date().toISOString()
          }));
        return { success: true, files: localFiles };
      }

      // List from Supabase
      if (!tier || tier === 'supabase') {
        try {
          const { data, error } = await supabase.storage
            .from('darkstar-assets')
            .list(pathPrefix || '');
          
          if (!error && data) {
            const supabaseFiles = data.map(file => ({
              path: pathPrefix ? `${pathPrefix}/${file.name}` : file.name,
              storage_tier: 'supabase',
              content_type: file.metadata?.contentType || 'application/octet-stream',
              size_bytes: file.metadata?.size || 0,
              metadata: file.metadata || {},
              uploaded_at: file.created_at || new Date().toISOString()
            }));
            allFiles.push(...supabaseFiles);
          }
        } catch (e) {
          console.warn('Supabase list failed:', e);
        }
      }

      // List from other tiers via metadata table  
      if (tier === 'r2' || tier === 'backblaze') {
        const { data: metadataFiles, error } = await supabase
          .from('storage_metadata')
          .select('*')
          .like('path', `${pathPrefix || ''}%`)
          .eq('storage_tier', tier || 'r2');

        if (!error && metadataFiles) {
          allFiles.push(...metadataFiles);
        }
      }

      return {
        success: true,
        files: allFiles
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'List operation failed'
      };
    }
  }

  // Test all storage tiers
  async testAllTiers(): Promise<Record<StorageTier, boolean>> {
    const results: Record<StorageTier, boolean> = {
      local: false,
      supabase: false,
      r2: false,
      backblaze: false
    };

    const testContent = `Test file created at ${new Date().toISOString()}`;
    const testPath = `test/storage-test-${Date.now()}.txt`;

    // Test Local Storage
    try {
      const localResult = await this.storeLocal('test-key', testContent);
      if (localResult.success) {
        const retrieveResult = await this.retrieveLocal('test-key');
        results.local = retrieveResult.success;
        await this.deleteLocal('test-key');
      }
    } catch (e) {
      console.warn('Local storage test failed:', e);
    }

    // Test other tiers
    for (const tier of ['supabase', 'r2', 'backblaze'] as StorageTier[]) {
      try {
        const storeResult = await this.store({
          path: `${testPath}-${tier}`,
          content: testContent,
          contentType: 'text/plain'
        }, tier);

        if (storeResult.success) {
          const retrieveResult = await this.retrieve(`${testPath}-${tier}`, tier);
          results[tier] = retrieveResult.success;
          
          // Clean up
          await this.delete(`${testPath}-${tier}`, tier);
        }
      } catch (e) {
        console.warn(`${tier} test failed:`, e);
      }
    }

    return results;
  }
}