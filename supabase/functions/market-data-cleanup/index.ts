import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    console.log('Starting market data cleanup...');

    // Delete market data older than 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: deletedData, error: deleteError } = await supabase
      .from('market_data_cache')
      .delete()
      .lt('created_at', threeDaysAgo.toISOString());

    if (deleteError) {
      console.error('Error deleting old market data:', deleteError);
      throw deleteError;
    }

    console.log('Market data cleanup completed');

    // Also cleanup old model weights (keep only last 5 versions per model/symbol)
    const { data: models, error: modelsError } = await supabase
      .from('model_weights')
      .select('model_type, symbol')
      .order('created_at', { ascending: false });

    if (modelsError) {
      console.error('Error fetching models:', modelsError);
    } else if (models) {
      const modelKeys = new Map<string, boolean>();
      
      for (const model of models) {
        const key = `${model.model_type}-${model.symbol}`;
        if (!modelKeys.has(key)) {
          modelKeys.set(key, true);
          
          // Keep only the 5 most recent versions
          const { error: cleanupError } = await supabase
            .from('model_weights')
            .delete()
            .eq('model_type', model.model_type)
            .eq('symbol', model.symbol)
            .not('id', 'in', `(
              SELECT id FROM model_weights 
              WHERE model_type = '${model.model_type}' 
              AND symbol = '${model.symbol}' 
              ORDER BY created_at DESC 
              LIMIT 5
            )`);

          if (cleanupError) {
            console.error(`Error cleaning up ${key}:`, cleanupError);
          }
        }
      }
      
      console.log('Model weights cleanup completed');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Cleanup completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An error occurred during cleanup' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

