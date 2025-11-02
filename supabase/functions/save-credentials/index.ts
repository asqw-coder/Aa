import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const credentialsSchema = z.object({
  apiKey: z.string().min(1),
  secretKey: z.string().min(1),
  environment: z.enum(['paper', 'live'])
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Get user's ARK ID from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('ark_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Validate request body
    const body = await req.json();
    const credentials = credentialsSchema.parse(body);

    // Get encryption key from secrets
    const encryptionKey = Deno.env.get('CREDENTIAL_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    // Encrypt the secret key using the database function with the secure key
    let encryptedSecret: string | null = null;
    let encryptErrMsg: string | undefined;

    const { data: encryptedWithKey, error: encryptError } = await supabase
      .rpc('encrypt_credential_password', {
        plain_password: credentials.secretKey,
        encryption_key: encryptionKey
      });

    if (encryptError || !encryptedWithKey) {
      console.error('Primary encryption failed, attempting fallback:', encryptError);
      encryptErrMsg = encryptError?.message;
      const { data: encryptedDefault, error: fallbackError } = await supabase
        .rpc('encrypt_credential_password', { plain_password: credentials.secretKey });
      if (fallbackError || !encryptedDefault) {
        console.error('Fallback encryption failed:', fallbackError);
        throw new Error(`Failed to encrypt secret key${encryptErrMsg ? `: ${encryptErrMsg}` : ''}`);
      }
      encryptedSecret = encryptedDefault;
    } else {
      encryptedSecret = encryptedWithKey;
    }

    // Save credentials with encrypted secret key
    const { error: saveError } = await supabase
      .from('user_api_credentials')
      .insert({
        user_id: user.id,
        ark_id: profile.ark_id,
        api_key: credentials.apiKey,
        secret_key: encryptedSecret, // Store encrypted secret key
        is_demo: credentials.environment === 'paper'
      });

    if (saveError) {
      throw saveError;
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Credentials saved securely'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Save credentials error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
