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

// Backblaze B2 Configuration for S3-Compatible API
const BACKBLAZE_KEY_ID = Deno.env.get('BACKBLAZE_KEY_ID')!;
const BACKBLAZE_APPLICATION_KEY = Deno.env.get('BACKBLAZE_APPLICATION_KEY')!;
const BACKBLAZE_BUCKET_NAME = 'nova-ark';
const BACKBLAZE_REGION = 'eu-central-003'; // Default B2 S3 region

interface BackblazeRequest {
  action: 'upload' | 'download' | 'delete' | 'list';
  path: string;
  content?: string;
  contentType?: string;
  metadata?: Record<string, any>;
  folder?: 'active' | 'archive';
}

// Create S3-compatible request for Backblaze B2
async function b2S3Request(method: string, path: string, body?: string, contentType?: string): Promise<Response> {
  const region = BACKBLAZE_REGION;
  const service = 's3';
  const endpoint = `https://s3.${BACKBLAZE_REGION}.backblazeb2.com`;
  const url = `${endpoint}/${BACKBLAZE_BUCKET_NAME}${path}`;
  
  // Create request object
  const request = new Request(url, {
    method,
    headers: contentType ? { 'Content-Type': contentType } : {},
    body: body || undefined
  });
  
  // Create AWS Signature V4 signer
  const signer = new AWSSignerV4(region, {
    awsAccessKeyId: BACKBLAZE_KEY_ID,
    awsSecretKey: BACKBLAZE_APPLICATION_KEY,
  });

  console.log(`B2 S3 Request: ${method} ${url}`);
  
  try {
    const signedRequest = await signer.sign(service, request);
    const response = await fetch(signedRequest);

    console.log(`B2 S3 Response: ${response.status} ${response.statusText}`);
    return response;
  } catch (error) {
    console.error(`B2 S3 Request failed:`, error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, path, content, contentType, metadata, folder }: BackblazeRequest = await req.json();
    
    console.log(`B2 Storage - Action: ${action}, Path: ${path}`);

    let result: any = {};

    switch (action) {
      case 'upload':
        if (!content) {
          throw new Error('Content required for upload');
        }

        // Organize by folder structure (active/archive)
        let finalPath = path;
        if (folder) {
          finalPath = `${folder}/${path}`;
        }

        console.log(`Uploading to B2: ${finalPath}, Size: ${content.length} bytes`);
        
        const uploadResponse = await b2S3Request('PUT', `/${finalPath}`, content, contentType || 'application/octet-stream');
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error(`B2 upload failed: ${uploadResponse.status} - ${errorText}`);
          throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        // Store metadata in Supabase
        const { error: metadataError } = await supabase
          .from('storage_metadata')
          .upsert({
            path: finalPath,
            storage_tier: 'backblaze',
            content_type: contentType || 'application/octet-stream',
            size_bytes: content.length,
            metadata: { ...metadata, folder: folder || 'active' },
            uploaded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (metadataError) {
          console.error('B2 metadata storage error:', metadataError);
        }

        result = {
          success: true,
          path: finalPath,
          url: `https://s3.${BACKBLAZE_REGION}.backblazeb2.com/${BACKBLAZE_BUCKET_NAME}/${finalPath}`,
          size: content.length,
          tier: 'backblaze'
        };
        
        console.log('✅ B2 upload successful:', finalPath);
        break;

      case 'download':
        console.log(`Downloading from B2: ${path}`);
        
        const downloadResponse = await b2S3Request('GET', `/${path}`);
        
        if (!downloadResponse.ok) {
          if (downloadResponse.status === 404) {
            throw new Error('File not found in B2');
          }
          const errorText = await downloadResponse.text();
          console.error(`B2 download failed: ${downloadResponse.status} - ${errorText}`);
          throw new Error(`Download failed: ${downloadResponse.status} - ${errorText}`);
        }

        const downloadContent = await downloadResponse.text();
        
        result = {
          success: true,
          path,
          content: downloadContent,
          contentType: downloadResponse.headers.get('content-type')
        };
        
        console.log('✅ B2 download successful:', path);
        break;

      case 'delete':
        console.log(`Deleting from B2: ${path}`);
        
        const deleteResponse = await b2S3Request('DELETE', `/${path}`);
        
        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const errorText = await deleteResponse.text();
          console.error(`B2 delete failed: ${deleteResponse.status} - ${errorText}`);
          throw new Error(`Delete failed: ${deleteResponse.status} - ${errorText}`);
        }

        // Remove metadata from Supabase
        const { error: deleteMetadataError } = await supabase
          .from('storage_metadata')
          .delete()
          .eq('path', path)
          .eq('storage_tier', 'backblaze');

        if (deleteMetadataError) {
          console.error('B2 metadata delete error:', deleteMetadataError);
        }

        result = {
          success: true,
          path,
          deleted: true
        };
        
        console.log('✅ B2 delete successful:', path);
        break;

      case 'list':
        // For listing, query the metadata table
        const { data: files, error: listError } = await supabase
          .from('storage_metadata')
          .select('path, size_bytes, uploaded_at, metadata')
          .eq('storage_tier', 'backblaze')
          .like('path', `${path}%`);

        if (listError) {
          console.error('B2 list error:', listError);
          throw listError;
        }

        result = {
          success: true,
          path,
          files: files || []
        };
        
        console.log('✅ B2 list successful:', files?.length || 0, 'files');
        break;

      default:
        throw new Error(`Unknown B2 action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ B2 Storage error:', error);
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