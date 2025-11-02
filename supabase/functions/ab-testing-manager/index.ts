import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const selectModelSchema = z.object({
  action: z.literal('select_model'),
  symbol: z.string()
});

const recordOutcomeSchema = z.object({
  action: z.literal('record_outcome'),
  testId: z.string().uuid(),
  isModelA: z.boolean(),
  success: z.boolean(),
  pnl: z.number()
});

const evaluateTestsSchema = z.object({
  action: z.literal('evaluate_tests')
});

const inputSchema = z.union([selectModelSchema, recordOutcomeSchema, evaluateTestsSchema]);

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

    const body = await req.json();
    
    // Validate input
    const validationResult = inputSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid request data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = validationResult.data as any;

    switch (action) {
      case 'select_model':
        return await selectModelForPrediction(supabase, params);
      case 'record_outcome':
        return await recordOutcome(supabase, params);
      case 'evaluate_tests':
        return await evaluateTests(supabase);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in AB testing manager:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'An error occurred in AB testing manager' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function selectModelForPrediction(supabase: any, params: any) {
  const { symbol } = params;

  // Check for active A/B test
  const { data: activeTest } = await supabase
    .from('model_ab_tests')
    .select('*')
    .eq('symbol', symbol)
    .eq('status', 'active')
    .single();

  if (!activeTest) {
    // No active test, use standard model selection
    return new Response(
      JSON.stringify({ useABTest: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Determine which model to use based on split ratio
  const useModelA = Math.random() < activeTest.split_ratio;
  const selectedModelId = useModelA ? activeTest.model_a_id : activeTest.model_b_id;

  // Get model details
  const { data: model } = await supabase
    .from('ml_models')
    .select('*')
    .eq('id', selectedModelId)
    .single();

  return new Response(
    JSON.stringify({
      useABTest: true,
      testId: activeTest.id,
      modelId: selectedModelId,
      modelName: model?.model_name,
      modelType: model?.model_type,
      isModelA: useModelA
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function recordOutcome(supabase: any, params: any) {
  const { testId, isModelA, success, pnl } = params;

  // Get current test
  const { data: test } = await supabase
    .from('model_ab_tests')
    .select('*')
    .eq('id', testId)
    .single();

  if (!test) {
    throw new Error('Test not found');
  }

  // Update test metrics
  const updates: any = {};
  if (isModelA) {
    updates.model_a_trades = test.model_a_trades + 1;
    updates.model_a_win_rate = ((test.model_a_win_rate * test.model_a_trades) + (success ? 1 : 0)) / (test.model_a_trades + 1);
    updates.model_a_pnl = test.model_a_pnl + pnl;
  } else {
    updates.model_b_trades = test.model_b_trades + 1;
    updates.model_b_win_rate = ((test.model_b_win_rate * test.model_b_trades) + (success ? 1 : 0)) / (test.model_b_trades + 1);
    updates.model_b_pnl = test.model_b_pnl + pnl;
  }

  await supabase
    .from('model_ab_tests')
    .update(updates)
    .eq('id', testId);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function evaluateTests(supabase: any) {
  // Get all active tests
  const { data: tests } = await supabase
    .from('model_ab_tests')
    .select('*')
    .eq('status', 'active');

  const results = [];

  for (const test of tests || []) {
    // Need at least 30 trades per model for statistical significance
    if (test.model_a_trades < 30 || test.model_b_trades < 30) {
      continue;
    }

    // Calculate statistical significance (simple z-test)
    const n1 = test.model_a_trades;
    const n2 = test.model_b_trades;
    const p1 = test.model_a_win_rate;
    const p2 = test.model_b_win_rate;

    const pooledP = (n1 * p1 + n2 * p2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
    const zScore = Math.abs(p1 - p2) / se;
    
    // 95% confidence level (z-score > 1.96)
    const isSignificant = zScore > 1.96;
    const confidenceLevel = isSignificant ? 0.95 : zScore / 1.96 * 0.95;

    if (isSignificant) {
      // Determine winner based on multiple criteria
      const modelAScore = (test.model_a_win_rate * 0.5) + (test.model_a_pnl / Math.max(Math.abs(test.model_a_pnl), Math.abs(test.model_b_pnl)) * 0.5);
      const modelBScore = (test.model_b_win_rate * 0.5) + (test.model_b_pnl / Math.max(Math.abs(test.model_a_pnl), Math.abs(test.model_b_pnl)) * 0.5);

      const winner = modelAScore > modelBScore ? 'model_a' : 'model_b';
      const winnerModelId = winner === 'model_a' ? test.model_a_id : test.model_b_id;

      // Update test status
      await supabase
        .from('model_ab_tests')
        .update({
          status: 'completed',
          winner,
          confidence_level: confidenceLevel,
          end_date: new Date().toISOString()
        })
        .eq('id', test.id);

      // Activate winning model
      await supabase
        .from('ml_models')
        .update({ status: 'active' })
        .eq('id', winnerModelId);

      results.push({
        test_id: test.id,
        test_name: test.test_name,
        winner,
        confidence_level: confidenceLevel,
        metrics: {
          model_a: { trades: n1, win_rate: p1, pnl: test.model_a_pnl },
          model_b: { trades: n2, win_rate: p2, pnl: test.model_b_pnl }
        }
      });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      evaluated_tests: results.length,
      results
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
