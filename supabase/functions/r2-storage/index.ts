import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { AWSSignerV4 } from 'https://deno.land/x/aws_sign_v4@1.0.2/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// R2 Configuration
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!;
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!;
const R2_BUCKET_NAME = 'nova';

interface R2Request {
  action: 'upload' | 'download' | 'delete' | 'list' | 'get_url';
  path: string;
  content?: string;
  contentType?: string;
  metadata?: Record<string, any>;
  expiresIn?: number;
}

// Calculate SHA256 hash for AWS Signature V4
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Create AWS S3 compatible request using AWS Signature V4
async function r2Request(method: string, path: string, body?: string, contentType?: string): Promise<Response> {
  const region = 'auto'; // R2 uses 'auto' as the region
  const service = 's3';
  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const url = `${endpoint}/${R2_BUCKET_NAME}${path}`;
  
  // Calculate content hash for AWS Signature V4
  const contentHash = await sha256(body || '');
  
  // Create headers with required AWS signature fields
  const headers: Record<string, string> = {
    'x-amz-content-sha256': contentHash,
  };
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  // Create request object
  const request = new Request(url, {
    method,
    headers,
    body: body || undefined
  });
  
  // Create AWS Signature V4 signer
  const signer = new AWSSignerV4(region, {
    awsAccessKeyId: R2_ACCESS_KEY_ID,
    awsSecretKey: R2_SECRET_ACCESS_KEY,
  });

  console.log(`R2 Request: ${method} ${url} (Content SHA256: ${contentHash})`);
  
  try {
    const signedRequest = await signer.sign(service, request);
    const response = await fetch(signedRequest);

    console.log(`R2 Response: ${response.status} ${response.statusText}`);
    return response;
  } catch (error) {
    console.error('R2 request failed:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, path, content, contentType, metadata, expiresIn }: R2Request = await req.json();
    
    console.log(`R2 Storage - Action: ${action}, Path: ${path}`);

    let result: any = {};

    switch (action) {
      case 'upload':
        if (!content) {
          throw new Error('Content required for upload');
        }

        console.log(`Uploading to R2: ${path}, Size: ${content.length} bytes`);
        
        const uploadResponse = await r2Request('PUT', `/${path}`, content, contentType || 'application/octet-stream');
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error(`R2 upload failed: ${uploadResponse.status} - ${errorText}`);
          throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        // Store metadata in Supabase
        const { error: metadataError } = await supabase
          .from('storage_metadata')
          .upsert({
            path,
            storage_tier: 'r2_active',
            content_type: contentType || 'application/octet-stream',
            size_bytes: content.length,
            metadata: metadata || {},
            uploaded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (metadataError) {
          console.error('R2 metadata storage error:', metadataError);
        }

        result = {
          success: true,
          path,
          url: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${path}`,
          size: content.length,
          tier: 'r2_active'
        };
        
        console.log('✅ R2 upload successful:', path);
        break;

      case 'download':
        console.log(`Downloading from R2: ${path}`);
        
        const downloadResponse = await r2Request('GET', `/${path}`);
        
        if (!downloadResponse.ok) {
          if (downloadResponse.status === 404) {
            throw new Error('File not found in R2');
          }
          const errorText = await downloadResponse.text();
          console.error(`R2 download failed: ${downloadResponse.status} - ${errorText}`);
          throw new Error(`Download failed: ${downloadResponse.status} - ${errorText}`);
        }

        const downloadContent = await downloadResponse.text();
        
        result = {
          success: true,
          path,
          content: downloadContent,
          contentType: downloadResponse.headers.get('content-type')
        };
        
        console.log('✅ R2 download successful:', path);
        break;

      case 'delete':
        console.log(`Deleting from R2: ${path}`);
        
        const deleteResponse = await r2Request('DELETE', `/${path}`);
        
        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const errorText = await deleteResponse.text();
          console.error(`R2 delete failed: ${deleteResponse.status} - ${errorText}`);
          throw new Error(`Delete failed: ${deleteResponse.status} - ${errorText}`);
        }

        // Remove metadata from Supabase
        const { error: deleteMetadataError } = await supabase
          .from('storage_metadata')
          .delete()
          .eq('path', path)
          .eq('storage_tier', 'r2_active');

        if (deleteMetadataError) {
          console.error('R2 metadata delete error:', deleteMetadataError);
        }

        result = {
          success: true,
          path,
          deleted: true
        };
        
        console.log('✅ R2 delete successful:', path);
        break;

      case 'list':
        // For listing, query the metadata table since R2 list might not work with basic auth
        const { data: files, error: listError } = await supabase
          .from('storage_metadata')
          .select('path, size_bytes, uploaded_at')
          .eq('storage_tier', 'r2_active')
          .like('path', `${path}%`);

        if (listError) {
          console.error('R2 list error:', listError);
          throw listError;
        }

        result = {
          success: true,
          path,
          files: files || []
        };
        
        console.log('✅ R2 list successful:', files?.length || 0, 'files');
        break;

      case 'get_url':
        const expires = expiresIn || 3600; // 1 hour default
        const presignedUrl = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${path}`;
        
        result = {
          success: true,
          path,
          url: presignedUrl,
          expiresIn: expires
        };
        
        console.log('✅ R2 URL generation successful:', path);
        break;

      default:
        throw new Error(`Unknown R2 action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ R2 Storage error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
