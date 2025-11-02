import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    console.log('Starting automatic model retraining check...');

    // Get all models and check their performance
    const { data: models, error: modelsError } = await supabase
      .from('ml_models')
      .select('*')
      .eq('status', 'active');

    if (modelsError) {
      throw new Error(`Failed to fetch models: ${modelsError.message}`);
    }

    if (!models || models.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active models found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const retrainingTriggers = [];
    const now = new Date();

    for (const model of models) {
      let shouldRetrain = false;
      let reason = '';
      let daysSinceTraining = 0;

      // Trigger 1: Model is old (last trained > 7 days ago)
      if (model.training_end) {
        daysSinceTraining = (now.getTime() - new Date(model.training_end).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceTraining > 7) {
          shouldRetrain = true;
          reason = `Model hasn't been trained in ${daysSinceTraining.toFixed(1)} days`;
        }
      }

      // Trigger 2: Accuracy dropped below threshold
      if (model.accuracy && model.accuracy < 0.65) {
        shouldRetrain = true;
        reason = reason ? `${reason}; Accuracy below threshold (${(model.accuracy * 100).toFixed(1)}%)` 
                       : `Accuracy below threshold (${(model.accuracy * 100).toFixed(1)}%)`;
      }

      // Trigger 3: Win rate dropped significantly
      if (model.winning_trades && model.total_trades && model.total_trades > 10) {
        const winRate = model.winning_trades / model.total_trades;
        if (winRate < 0.45) {
          shouldRetrain = true;
          reason = reason ? `${reason}; Win rate below 45% (${(winRate * 100).toFixed(1)}%)` 
                         : `Win rate below 45% (${(winRate * 100).toFixed(1)}%)`;
        }
      }

      // Trigger 4: Significant drawdown
      if (model.max_drawdown && model.max_drawdown > 0.15) {
        shouldRetrain = true;
        reason = reason ? `${reason}; High drawdown (${(model.max_drawdown * 100).toFixed(1)}%)` 
                       : `High drawdown (${(model.max_drawdown * 100).toFixed(1)}%)`;
      }

      if (shouldRetrain) {
        console.log(`Triggering retraining for ${model.model_name}: ${reason}`);
        
        // Determine training mode based on degradation severity
        let trainingMode = 'full';
        let performanceDrop = 0;
        
        // Calculate performance drop
        if (model.accuracy) {
          const expectedAccuracy = 0.80;
          performanceDrop = ((expectedAccuracy - model.accuracy) / expectedAccuracy) * 100;
        }
        
        // Decision logic
        if (performanceDrop > 30 || !model.training_end) {
          trainingMode = 'full';
          console.log(`Full retrain needed: ${performanceDrop.toFixed(1)}% performance drop`);
        } else if (performanceDrop > 10 || daysSinceTraining > 14) {
          trainingMode = 'fine_tune';
          console.log(`Fine-tuning mode: ${performanceDrop.toFixed(1)}% performance drop`);
        } else {
          trainingMode = 'incremental';
          console.log(`Incremental update: ${performanceDrop.toFixed(1)}% performance drop`);
        }
        
        // Get user symbols for training (or use defaults)
        const { data: userSymbols } = await supabase
          .from('user_trading_symbols')
          .select('symbols')
          .limit(1)
          .single();

        const symbols = userSymbols?.symbols || [
          'USDNGN', 'GBPUSD', 'USDJPY', 'EURUSD', 'XAUUSD'
        ];
        
        // Get active weights for transfer learning
        const { data: activeWeights } = await supabase
          .from('model_weights')
          .select('id')
          .eq('model_id', model.id)
          .eq('is_active', true)
          .single();

        // Trigger training for each symbol
        for (const symbol of symbols) {
          try {
            const { data: trainData, error: trainError } = await supabase.functions.invoke('ark-model-training', {
              body: {
                modelType: model.model_type,
                symbol,
                forceRetrain: true,
                training_mode: trainingMode,
                previous_weights_id: activeWeights?.id
              }
            });

            if (trainError) {
              console.error(`Training error for ${model.model_type}-${symbol}:`, trainError);
            } else {
              console.log(`Training initiated for ${model.model_type}-${symbol} [${trainingMode}]`);
            }
          } catch (error) {
            console.error(`Failed to invoke training for ${model.model_type}-${symbol}:`, error);
          }
        }

        retrainingTriggers.push({
          modelId: model.id,
          modelName: model.model_name,
          modelType: model.model_type,
          trainingMode,
          reason,
          symbols: symbols.length
        });

        // Mark model as retraining
        await supabase
          .from('ml_models')
          .update({ 
            status: 'retraining',
            training_start: now.toISOString()
          })
          .eq('id', model.id);
      }
    }

    // Log retraining events
    if (retrainingTriggers.length > 0) {
      await supabase.from('system_logs').insert({
        level: 'INFO',
        module: 'AutoRetrain',
        message: `Automatic retraining triggered for ${retrainingTriggers.length} models`,
        details: { triggers: retrainingTriggers }
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        modelsChecked: models.length,
        modelsRetrained: retrainingTriggers.length,
        triggers: retrainingTriggers,
        message: retrainingTriggers.length > 0 
          ? `Retraining initiated for ${retrainingTriggers.length} models` 
          : 'All models performing well'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-retrain error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An error occurred during auto-retrain check' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
