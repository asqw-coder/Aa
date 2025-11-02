import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Admin verification start request');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }

    // Service role client - bypasses RLS
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      throw new Error('No authorization header');
    }

    // Regular client for auth verification
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Verify admin status using service role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('Role check error:', roleError);
      throw new Error('Failed to verify admin status');
    }

    if (!roleData) {
      console.error('User is not admin:', user.id);
      throw new Error('Admin access required');
    }

    console.log('Admin verified:', user.id);

    const { targetUserId } = await req.json();
    
    if (!targetUserId) {
      throw new Error('Target user ID required');
    }

    console.log('Starting verification process for:', targetUserId);

    // Check if user exists
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, username')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (profileError) {
      console.error('Profile check error:', profileError);
      throw new Error('Failed to verify target user');
    }

    if (!targetProfile) {
      throw new Error('Target user not found');
    }

    // Check if user is already an admin
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .eq('role', 'admin')
      .maybeSingle();

    if (existingRole) {
      throw new Error('User is already an admin');
    }

    // Check for existing pending verification
    const { data: existingVerification } = await supabaseAdmin
      .from('admin_verification_process')
      .select('id, status')
      .eq('user_id', targetUserId)
      .in('status', ['code_generated', 'pending'])
      .maybeSingle();

    if (existingVerification) {
      throw new Error('User already has a pending verification process');
    }

    // Generate a random 12-character verification code
    const verificationCode = Array.from(
      crypto.getRandomValues(new Uint8Array(12))
    ).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12).toUpperCase();

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Insert verification process
    const { data: verification, error: insertError } = await supabaseAdmin
      .from('admin_verification_process')
      .insert({
        user_id: targetUserId,
        verification_code: verificationCode,
        status: 'code_generated',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to create verification process: ${insertError.message}`);
    }

    console.log('Verification process created:', verification.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        verificationCode,
        expiresAt: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Admin verification start error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: error.message.includes('Unauthorized') || error.message.includes('Admin access') ? 403 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
