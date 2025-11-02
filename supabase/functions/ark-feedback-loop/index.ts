// Phase 5: ARK Feedback Loop - Integrate CentralAI Reward System
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const inputSchema = z.object({
  sessionId: z.string().uuid(),
  dailyReport: z.object({
    date: z.string(),
    currentBalance: z.number().positive(),
    totalTrades: z.number().int().min(0),
    winningTrades: z.number().int().min(0),
    totalProfit: z.number(),
    totalLoss: z.number(),
    maxSingleLoss: z.number(),
  })
});

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
    
    const { sessionId, dailyReport } = validationResult.data;

    console.log('ARK Feedback Loop: Processing daily report for session:', sessionId);

    // Step 1: Calculate RL daily reward (from ml-prediction-engine logic)
    const date = new Date(dailyReport.date);
    
    const { data: sessionData } = await supabase
      .from('trading_sessions')
      .select('initial_balance, user_id')
      .eq('id', sessionId)
      .single();

    if (!sessionData) {
      throw new Error('Session not found');
    }

    const initialBalance = sessionData.initial_balance || 10000;
    const currentBalance = dailyReport.currentBalance || initialBalance;
    
    // Fetch positions for the day
    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('session_id', sessionId)
      .gte('opened_at', date.toISOString())
      .lt('opened_at', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString());

    const totalTrades = positions?.length || 0;
    const winningTrades = positions?.filter((p: any) => p.pnl > 0).length || 0;
    const totalProfit = positions?.filter((p: any) => p.pnl > 0)
      .reduce((sum: number, p: any) => sum + p.pnl, 0) || 0;
    const totalLoss = Math.abs(positions?.filter((p: any) => p.pnl < 0)
      .reduce((sum: number, p: any) => sum + p.pnl, 0) || 0);
    const netPnl = totalProfit - totalLoss;
    
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0.5;
    const tradeEfficiency = totalTrades > 0 ? winningTrades / totalTrades : 0;
    
    const maxSingleLoss = positions && positions.length > 0 
      ? Math.min(...positions.map((p: any) => p.pnl)) 
      : 0;

    // Calculate reward components
    const profitComponent = netPnl > 0 ? Math.min(netPnl / initialBalance, 0.5) : 0;
    const lossComponent = netPnl < 0 ? Math.max(netPnl / initialBalance, -0.5) : 0;
    const winRateComponent = (winRate - 0.5) * 0.3;
    const efficiencyComponent = tradeEfficiency * 0.2;
    const lossSeverityComponent = maxSingleLoss < 0 ? (maxSingleLoss / initialBalance) * 0.5 : 0;

    const finalReward = profitComponent + lossComponent + winRateComponent + 
                       efficiencyComponent - lossSeverityComponent;

    // Store RL reward
    const { error: rewardError } = await supabase.from('rl_rewards').insert({
      session_id: sessionId,
      date: date.toISOString().split('T')[0],
      total_profit: totalProfit,
      total_loss: totalLoss,
      net_pnl: netPnl,
      total_trades: totalTrades,
      winning_trades: winningTrades,
      win_rate: winRate,
      trade_efficiency: tradeEfficiency,
      loss_severity: Math.abs(lossSeverityComponent),
      max_single_loss: maxSingleLoss,
      final_reward: finalReward,
      reward_components: {
        profit: profitComponent,
        loss: lossComponent,
        winRate: winRateComponent,
        efficiency: efficiencyComponent,
        lossSeverity: lossSeverityComponent
      }
    });

    if (rewardError) {
      console.error('Error storing RL reward:', rewardError);
    }

    // Step 2: Apply reward to ARK state (stored in storage)
    // This would update arkState parameters based on the reward
    const arkStateAdjustments = {
      performanceScore: finalReward,
      confidence: winRate > 0.6 ? 0.05 : (winRate < 0.4 ? -0.05 : 0),
      riskTolerance: maxSingleLoss < -0.05 ? -0.05 : 0,
      aggression: netPnl > 0 ? 0.02 : -0.02,
      timestamp: new Date().toISOString()
    };

    // Step 3: Adjust ensemble weights based on model performance
    const { data: modelPerformance } = await supabase
      .from('ark_model_performance')
      .select('model_id, accuracy, win_rate, sharpe_ratio')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(100);

    const modelWeights: Record<string, number> = {};
    if (modelPerformance && modelPerformance.length > 0) {
      // Calculate new weights based on recent performance
      modelPerformance.forEach((perf: any) => {
        const score = (perf.accuracy || 0.5) * 0.4 + 
                     (perf.sharpe_ratio || 0) * 0.3 + 
                     (perf.win_rate || 0.5) * 0.3;
        modelWeights[perf.model_id] = score;
      });
    }

    // Step 4: Update model symbol performance for Kelly Criterion
    if (positions && positions.length > 0) {
      for (const position of positions) {
        const symbol = position.symbol;
        
        // Get or create model performance record
        const { data: existingPerf } = await supabase
          .from('model_symbol_performance')
          .select('*')
          .eq('symbol', symbol)
          .limit(1)
          .single();

        const isWin = position.pnl > 0;
        const newTotalTrades = (existingPerf?.total_trades || 0) + 1;
        const newWinRate = existingPerf 
          ? ((existingPerf.win_rate * existingPerf.total_trades) + (isWin ? 1 : 0)) / newTotalTrades
          : (isWin ? 1 : 0);
        
        const avgWin = isWin
          ? ((existingPerf?.avg_win || 0) * (existingPerf?.total_trades || 0) + position.pnl) / 
            (newTotalTrades)
          : (existingPerf?.avg_win || 0);
        
        const avgLoss = !isWin
          ? ((existingPerf?.avg_loss || 0) * (existingPerf?.total_trades || 0) + Math.abs(position.pnl)) / 
            (newTotalTrades)
          : (existingPerf?.avg_loss || 0);

        await supabase.from('model_symbol_performance').upsert({
          symbol,
          win_rate: newWinRate,
          avg_win: avgWin,
          avg_loss: avgLoss,
          total_trades: newTotalTrades,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'symbol'
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reward: finalReward,
        arkStateAdjustments,
        modelWeights,
        message: 'ARK feedback loop completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('ARK feedback loop error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An error occurred processing the feedback loop' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
