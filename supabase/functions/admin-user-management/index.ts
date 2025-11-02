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
    console.log('Admin user management request started');

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

    const { action, targetUserId } = await req.json();
    console.log('Action:', action, 'Target:', targetUserId);

    if (action === 'listUsers') {
      console.log('Listing users...');
      
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, ark_id, username, first_name, last_name, created_at, suspended')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Profiles error:', profilesError);
        throw profilesError;
      }

      console.log('Found profiles:', profiles?.length);

      const userIds = profiles?.map(p => p.user_id) || [];
      
      // Get blocked status
      const { data: blockedUsers, error: blockedError } = await supabaseAdmin
        .from('blocked_entities')
        .select('entity_value')
        .eq('entity_type', 'user')
        .in('entity_value', userIds);

      if (blockedError) {
        console.error('Blocked users error:', blockedError);
      }

      const blockedSet = new Set(blockedUsers?.map(b => b.entity_value) || []);

      // Get user roles
      const { data: userRoles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) {
        console.error('User roles error:', rolesError);
      }

      const rolesMap = new Map(userRoles?.map(r => [r.user_id, r.role]) || []);

      // Get auth users for email
      const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        console.error('Auth users error:', authError);
      }

      const emailMap = new Map(authUsers?.map(u => [u.id, u.email]) || []);

      const enrichedUsers = profiles?.map(p => ({
        ...p,
        email: emailMap.get(p.user_id),
        isBlocked: blockedSet.has(p.user_id),
        role: rolesMap.get(p.user_id) || 'user'
      }));

      console.log('Returning users:', enrichedUsers?.length);

      return new Response(
        JSON.stringify({ success: true, users: enrichedUsers }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'suspendUser' || action === 'unsuspendUser') {
      if (!targetUserId) {
        throw new Error('Target user ID required');
      }

      console.log(`${action} for user:`, targetUserId);

      if (action === 'suspendUser') {
        // Check if already blocked
        const { data: existing } = await supabaseAdmin
          .from('blocked_entities')
          .select('id')
          .eq('entity_type', 'user')
          .eq('entity_value', targetUserId)
          .maybeSingle();

        if (existing) {
          console.log('User already suspended');
          return new Response(
            JSON.stringify({ success: false, error: 'User is already suspended' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Inserting blocked entity...');
        
        // Add to blocked_entities using service role
        const { data: insertData, error: blockError } = await supabaseAdmin
          .from('blocked_entities')
          .insert({
            entity_type: 'user',
            entity_value: targetUserId,
            reason: 'Suspended by admin',
            blocked_by: user.id
          })
          .select();

        if (blockError) {
          console.error('Block error:', blockError);
          throw new Error(`Failed to suspend user: ${blockError.message}`);
        }

        console.log('User suspended successfully:', insertData);

        // Update profile suspended status and verify affected rows
        const { data: updatedProfiles, error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ suspended: true, updated_at: new Date().toISOString() })
          .eq('user_id', targetUserId)
          .select('user_id, suspended');

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        if (!updatedProfiles || updatedProfiles.length === 0) {
          console.error('Profile not found or not updated for user:', targetUserId);
        }

        // Log the action
        const { error: logError } = await supabaseAdmin
          .from('admin_activity_log')
          .insert({
            admin_id: user.id,
            user_id: user.id,
            action: 'user_suspended',
            details: { targetUserId }
          });

        if (logError) {
          console.error('Log error:', logError);
        }

      } else {
        console.log('Removing blocked entity...');
        
        // Remove from blocked_entities
        const { error: unblockError } = await supabaseAdmin
          .from('blocked_entities')
          .delete()
          .eq('entity_type', 'user')
          .eq('entity_value', targetUserId);

        if (unblockError) {
          console.error('Unblock error:', unblockError);
          throw new Error(`Failed to unsuspend user: ${unblockError.message}`);
        }

        console.log('User unsuspended successfully');

        // Update profile suspended status and verify affected rows
        const { data: updatedProfiles, error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ suspended: false, updated_at: new Date().toISOString() })
          .eq('user_id', targetUserId)
          .select('user_id, suspended');

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        if (!updatedProfiles || updatedProfiles.length === 0) {
          console.error('Profile not found or not updated for user:', targetUserId);
        }

        // Log the action
        const { error: logError } = await supabaseAdmin
          .from('admin_activity_log')
          .insert({
            admin_id: user.id,
            user_id: user.id,
            action: 'user_unsuspended',
            details: { targetUserId }
          });

        if (logError) {
          console.error('Log error:', logError);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Admin user management error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: error.message.includes('Unauthorized') || error.message.includes('Admin access') ? 403 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
