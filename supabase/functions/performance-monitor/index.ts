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
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    console.log('Starting performance degradation check...');

    // Get all active models
    const { data: models, error: modelsError } = await supabase
      .from('ml_models')
      .select('*')
      .eq('status', 'active');

    if (modelsError) throw modelsError;

    const alerts = [];

    for (const model of models || []) {
      // Get recent performance history
      const { data: history, error: historyError } = await supabase
        .from('model_performance_history')
        .select('*')
        .eq('model_id', model.id)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (historyError) {
        console.error(`Error fetching history for model ${model.id}:`, historyError);
        continue;
      }

      // Calculate current metrics
      const currentMetrics = {
        accuracy: model.accuracy || 0,
        win_rate: model.winning_trades / Math.max(model.total_trades, 1),
        sharpe_ratio: model.sharpe_ratio || 0,
        max_drawdown: model.max_drawdown || 0,
        total_trades: model.total_trades || 0
      };

      // Calculate baseline from history (average of last 10 records)
      const baseline = history && history.length >= 5 ? {
        accuracy: history.slice(0, 10).reduce((sum, h) => sum + (h.accuracy || 0), 0) / Math.min(10, history.length),
        win_rate: history.slice(0, 10).reduce((sum, h) => sum + (h.win_rate || 0), 0) / Math.min(10, history.length),
        sharpe_ratio: history.slice(0, 10).reduce((sum, h) => sum + (h.sharpe_ratio || 0), 0) / Math.min(10, history.length)
      } : null;

      // Calculate degradation score
      let degradationScore = 0;
      const degradationReasons = [];

      if (baseline) {
        // Accuracy degradation (weight: 0.3)
        const accuracyDegradation = Math.max(0, (baseline.accuracy - currentMetrics.accuracy) / baseline.accuracy);
        degradationScore += accuracyDegradation * 0.3;
        if (accuracyDegradation > 0.1) {
          degradationReasons.push(`Accuracy dropped ${(accuracyDegradation * 100).toFixed(1)}%`);
        }

        // Win rate degradation (weight: 0.4)
        const winRateDegradation = Math.max(0, (baseline.win_rate - currentMetrics.win_rate) / Math.max(baseline.win_rate, 0.01));
        degradationScore += winRateDegradation * 0.4;
        if (winRateDegradation > 0.15) {
          degradationReasons.push(`Win rate dropped ${(winRateDegradation * 100).toFixed(1)}%`);
        }

        // Sharpe ratio degradation (weight: 0.3)
        const sharpeDegradation = Math.max(0, (baseline.sharpe_ratio - currentMetrics.sharpe_ratio) / Math.max(Math.abs(baseline.sharpe_ratio), 0.01));
        degradationScore += sharpeDegradation * 0.3;
        if (sharpeDegradation > 0.2) {
          degradationReasons.push(`Sharpe ratio dropped ${(sharpeDegradation * 100).toFixed(1)}%`);
        }
      }

      // Store performance history
      await supabase.from('model_performance_history').insert({
        model_id: model.id,
        accuracy: currentMetrics.accuracy,
        win_rate: currentMetrics.win_rate,
        sharpe_ratio: currentMetrics.sharpe_ratio,
        max_drawdown: currentMetrics.max_drawdown,
        total_trades: currentMetrics.total_trades,
        degradation_score: degradationScore,
        alert_triggered: degradationScore > 0.3
      });

      // Update model performance degradation
      await supabase
        .from('ml_models')
        .update({ performance_degradation: degradationScore })
        .eq('id', model.id);

      // Trigger alert if degradation is significant
      if (degradationScore > 0.3 && degradationReasons.length > 0) {
        alerts.push({
          model_id: model.id,
          model_name: model.model_name,
          degradation_score: degradationScore,
          reasons: degradationReasons,
          action: degradationScore > 0.5 ? 'RETRAIN_IMMEDIATELY' : 'SCHEDULE_RETRAIN'
        });

        console.warn(`Performance degradation detected for ${model.model_name}:`, {
          score: degradationScore,
          reasons: degradationReasons
        });
      }
    }

    console.log('Performance monitoring completed:', {
      models_checked: models?.length || 0,
      alerts_triggered: alerts.length
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        models_checked: models?.length || 0,
        alerts 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in performance monitor:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'An error occurred during performance monitoring' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
