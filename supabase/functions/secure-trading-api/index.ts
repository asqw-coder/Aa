import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CapitalConfig {
  apiKey: string;
  password: string;
  accountId: string;
  environment: 'demo' | 'live';
  baseUrl: string;
}

// Initialize Supabase client for secure credential storage
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getSecureCredentials(userId: string, arkId: string): Promise<CapitalConfig | null> {
  try {
    // Get credentials from user_api_credentials table with encrypted password
    const { data, error } = await supabase
      .from('user_api_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('ark_id', arkId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch credentials:', error);
      return null;
    }

    if (!data) {
      console.error('No credentials found for user');
      return null;
    }

    // Get encryption key from secrets
    const encryptionKey = Deno.env.get('CREDENTIAL_ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('Encryption key not configured');
      return null;
    }

    // Decrypt the password using the database function with the secure key
    const { data: decryptedData, error: decryptError } = await supabase
      .rpc('decrypt_credential_password', {
        encrypted_password: data.password,
        encryption_key: encryptionKey
      });

    if (decryptError || !decryptedData) {
      console.error('Failed to decrypt password:', decryptError);
      return null;
    }

    // Build the config from database with decrypted password
    const config: CapitalConfig = {
      apiKey: data.api_key,
      password: decryptedData, // Use decrypted password
      accountId: data.account_id,
      environment: data.is_demo ? 'demo' : 'live',
      baseUrl: data.is_demo 
        ? 'https://demo-api-capital.backend-capital.com/api/v1'
        : 'https://api-capital.backend-capital.com/api/v1'
    };

    return config;
  } catch (error) {
    console.error('Error getting secure credentials:', error);
    return null;
  }
}

async function makeSecureApiCall(config: CapitalConfig, endpoint: string, method: string, body?: any) {
  try {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-CAP-API-KEY': config.apiKey,
        'Authorization': `Bearer ${config.password}` // This would be a proper token in production
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Secure API call failed:', error);
    throw error;
  }
}

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

    const { action, ...params } = await req.json();

    // Get secure credentials for this user
    const config = await getSecureCredentials(user.id, profile.ark_id);
    if (!config) {
      throw new Error('Trading credentials not configured');
    }

    let result;

    switch (action) {
      case 'fetchHistoricalPrices':
        result = await makeSecureApiCall(config, `/api/v1/prices/${params.epic}`, 'GET');
        break;
      
      case 'getPositions':
        result = await makeSecureApiCall(config, '/api/v1/positions', 'GET');
        break;
      
      case 'placeLimitOrder':
        result = await makeSecureApiCall(config, '/api/v1/workingorders/otc', 'POST', params.order);
        break;
      
      case 'getWorkingOrders':
        result = await makeSecureApiCall(config, '/api/v1/workingorders', 'GET');
        break;
      
      case 'cancelWorkingOrder':
        result = await makeSecureApiCall(config, `/api/v1/workingorders/otc/${params.dealId}`, 'DELETE');
        break;
      
      case 'openPosition':
        result = await makeSecureApiCall(config, '/api/v1/positions/otc', 'POST', params.signal);
        break;
      
      case 'closePosition':
        result = await makeSecureApiCall(config, `/api/v1/positions/otc/${params.dealId}`, 'DELETE');
        break;
      
      case 'updateStopLoss':
        result = await makeSecureApiCall(config, `/api/v1/positions/otc/${params.dealId}`, 'PUT', { stopLoss: params.stopLoss });
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Secure trading API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});