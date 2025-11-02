import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Risk Manager Implementation
class ProductionRiskManager {
  private sessionId: string;
  private config: Map<string, number> = new Map();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async loadConfig(): Promise<void> {
    const { data, error } = await supabase
      .from('config_settings')
      .select('key, value')
      .in('key', [
        'MAX_DRAWDOWN_PCT',
        'RISK_PER_TRADE_PCT', 
        'DAILY_LOSS_LIMIT',
        'MAX_POSITIONS',
        'MAX_TRADES_PER_SYMBOL_HOUR'
      ]);

    if (error) throw new Error(`Failed to load risk config: ${error.message}`);

    for (const setting of data) {
      this.config.set(setting.key, parseFloat(setting.value));
    }

    console.log('Risk configuration loaded:', Object.fromEntries(this.config));
  }

  async validateTrade(tradeSignal: any): Promise<{
    allowed: boolean;
    adjustedSize: number;
    reason?: string;
  }> {
    try {
      await this.loadConfig();

      // 1. Check maximum drawdown
      const currentDrawdown = await this.calculateCurrentDrawdown();
      const maxDrawdown = this.config.get('MAX_DRAWDOWN_PCT') || 0.14;
      
      if (currentDrawdown > maxDrawdown) {
        return {
          allowed: false,
          adjustedSize: 0,
          reason: `Maximum drawdown exceeded: ${(currentDrawdown * 100).toFixed(2)}%`
        };
      }

      // 2. Check daily profit/loss limits
      const dailyPnL = await this.getDailyPnL();
      const dailyProfitCap = await this.calculateDailyProfitCap();
      const dailyLossLimit = this.config.get('DAILY_LOSS_LIMIT') || 0.05;
      const accountBalance = await this.getAccountBalance();
      
      // Daily profit cap check
      if (dailyPnL > dailyProfitCap) {
        return {
          allowed: false,
          adjustedSize: 0,
          reason: `Daily profit cap reached: $${dailyPnL.toFixed(2)}`
        };
      }

      // Daily loss limit check
      if (dailyPnL < -(dailyLossLimit * accountBalance)) {
        return {
          allowed: false,
          adjustedSize: 0,
          reason: `Daily loss limit reached: $${Math.abs(dailyPnL).toFixed(2)}`
        };
      }

      // 3. Check maximum positions
      const openPositions = await this.getOpenPositionsCount();
      const maxPositions = this.config.get('MAX_POSITIONS') || 10;
      
      if (openPositions >= maxPositions) {
        return {
          allowed: false,
          adjustedSize: 0,
          reason: `Maximum positions limit reached: ${openPositions}`
        };
      }

      // 4. Check symbol-specific limits
      const symbolPositions = await this.getSymbolPositions(tradeSignal.symbol);
      if (symbolPositions >= 3) { // Max 3 positions per symbol
        return {
          allowed: false,
          adjustedSize: 0,
          reason: `Too many positions in ${tradeSignal.symbol}: ${symbolPositions}`
        };
      }

      // 5. Check hourly trade rate for symbol
      const hourlyTrades = await this.getHourlyTradeCount(tradeSignal.symbol);
      const maxTradesPerHour = this.config.get('MAX_TRADES_PER_SYMBOL_HOUR') || 5;
      
      if (hourlyTrades >= maxTradesPerHour) {
        return {
          allowed: false,
          adjustedSize: 0,
          reason: `Hourly trade limit exceeded for ${tradeSignal.symbol}: ${hourlyTrades}`
        };
      }

      // 6. Check correlation risk
      const correlationRisk = await this.assessCorrelationRisk(tradeSignal.symbol);
      if (correlationRisk > 0.7) {
        return {
          allowed: false,
          adjustedSize: 0,
          reason: `High correlation risk: ${(correlationRisk * 100).toFixed(1)}%`
        };
      }

      // 7. Calculate optimal position size
      const optimalSize = await this.calculateOptimalPositionSize(tradeSignal);
      const maxPositionSize = 2.0; // Max 2 lots
      const finalSize = Math.min(optimalSize, maxPositionSize);
      
      if (finalSize < 0.01) {
        return {
          allowed: false,
          adjustedSize: 0,
          reason: 'Position size too small after risk adjustments'
        };
      }

      // Log risk assessment
      await this.logRiskMetrics({
        symbol: tradeSignal.symbol,
        currentDrawdown,
        dailyPnL,
        openPositions,
        correlationRisk,
        finalSize
      });

      return {
        allowed: true,
        adjustedSize: finalSize
      };

    } catch (error: unknown) {
      console.error('Risk validation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        allowed: false,
        adjustedSize: 0,
        reason: `Risk validation failed: ${errorMessage}`
      };
    }
  }

  async calculateDynamicStopLoss(tradeSignal: any): Promise<number> {
    const currentPrice = tradeSignal.price;
    const atr = await this.getATR(tradeSignal.symbol);
    const volatility = await this.getVolatility(tradeSignal.symbol);
    
    // ATR-based stop loss with confidence adjustment
    const confidenceMultiplier = 1 + (1 - tradeSignal.confidence); // Lower confidence = wider stop
    const atrMultiplier = 2.5 * confidenceMultiplier;
    
    const atrStopLoss = tradeSignal.direction === 'BUY' 
      ? currentPrice - (atr * atrMultiplier)
      : currentPrice + (atr * atrMultiplier);
    
    // Percentage-based stop loss
    const percentageStop = tradeSignal.direction === 'BUY'
      ? currentPrice * (1 - (0.01 + volatility))
      : currentPrice * (1 + (0.01 + volatility));
    
    // Support/resistance based stop loss
    const technicalStop = tradeSignal.direction === 'BUY'
      ? await this.getNearestSupport(tradeSignal.symbol, currentPrice)
      : await this.getNearestResistance(tradeSignal.symbol, currentPrice);
    
    // Choose the most conservative (closest to current price for protection)
    if (tradeSignal.direction === 'BUY') {
      return Math.max(atrStopLoss, percentageStop, technicalStop);
    } else {
      return Math.min(atrStopLoss, percentageStop, technicalStop);
    }
  }

  async calculateDynamicTakeProfit(tradeSignal: any, stopLoss: number): Promise<number> {
    const currentPrice = tradeSignal.price;
    const stopDistance = Math.abs(currentPrice - stopLoss);
    
    // Base risk-reward ratio based on confidence and market conditions
    let riskRewardRatio = 1.5 + (tradeSignal.confidence * 2); // 1.5 to 3.5
    
    // Market volatility adjustment
    const volatility = await this.getVolatility(tradeSignal.symbol);
    if (volatility > 0.02) riskRewardRatio *= 1.2;
    
    // Model performance adjustment
    const modelMultiplier = await this.getModelPerformanceMultiplier(tradeSignal.model);
    riskRewardRatio *= modelMultiplier;
    
    // Market condition adjustment
    const marketCondition = await this.getMarketCondition();
    if (marketCondition < 0.5) riskRewardRatio *= 0.8; // Reduce targets in poor conditions
    
    // Calculate take profit
    const takeProfit = tradeSignal.direction === 'BUY'
      ? currentPrice + (stopDistance * riskRewardRatio)
      : currentPrice - (stopDistance * riskRewardRatio);
    
    return takeProfit;
  }

  async assessPositionHealth(): Promise<Array<{
    dealId: string;
    action: 'HOLD' | 'CLOSE' | 'ADJUST_SL' | 'PARTIAL_CLOSE';
    reason: string;
  }>> {
    const actions: Array<{
      dealId: string;
      action: 'HOLD' | 'CLOSE' | 'ADJUST_SL' | 'PARTIAL_CLOSE';
      reason: string;
    }> = [];
    
    const { data: positions, error } = await supabase
      .from('positions')
      .select('*')
      .eq('session_id', this.sessionId)
      .eq('status', 'open');

    if (error || !positions) return actions;

    for (const position of positions) {
      const positionDrawdown = await this.calculatePositionDrawdown(position);
      const timeInPosition = Date.now() - new Date(position.opened_at).getTime();
      const marketCondition = await this.getMarketCondition();
      
      // Emergency exit conditions
      if (positionDrawdown > 0.05) { // 5% loss on single position
        actions.push({ 
          dealId: position.deal_id, 
          action: 'CLOSE',
          reason: `Emergency stop: ${(positionDrawdown * 100).toFixed(2)}% loss`
        });
        continue;
      }
      
      // Trailing stop logic
      const accountBalance = await this.getAccountBalance();
      if (position.pnl > 0.02 * accountBalance) { // 2% account profit
        actions.push({ 
          dealId: position.deal_id, 
          action: 'ADJUST_SL',
          reason: 'Trailing stop activation'
        });
        continue;
      }
      
      // Time-based exit (positions held too long)
      if (timeInPosition > 24 * 60 * 60 * 1000) { // 24 hours
        actions.push({ 
          dealId: position.deal_id, 
          action: 'PARTIAL_CLOSE',
          reason: 'Time-based partial exit'
        });
        continue;
      }
      
      // Market condition deterioration
      if (marketCondition < 0.3) {
        actions.push({ 
          dealId: position.deal_id, 
          action: 'CLOSE',
          reason: 'Poor market conditions'
        });
        continue;
      }
      
      actions.push({ 
        dealId: position.deal_id, 
        action: 'HOLD',
        reason: 'Position within acceptable risk parameters'
      });
    }
    
    return actions;
  }

  async getKillSwitchStatus(): Promise<{ active: boolean; level?: number; reason?: string }> {
    // Multi-tier kill switch system (Phase 4)
    const currentDrawdown = await this.calculateCurrentDrawdown();
    const dailyPnL = await this.getDailyPnL();
    const accountBalance = await this.getAccountBalance();
    const dailyLossPct = Math.abs(dailyPnL) / accountBalance;

    // Get consecutive losses for Level 1 and 2 checks
    const consecutiveLosses = await this.getConsecutiveLosses();
    
    // Check Level 3: Emergency - Close ALL positions
    if (currentDrawdown > 0.14 || dailyLossPct > 0.05 || consecutiveLosses >= 5) {
      return { 
        active: true,
        level: 3,
        reason: `Level 3 EMERGENCY: Drawdown ${(currentDrawdown * 100).toFixed(2)}%, Daily Loss ${(dailyLossPct * 100).toFixed(2)}%, Consecutive Losses: ${consecutiveLosses}` 
      };
    }

    // Check Level 2: Caution - Halt new trades
    if (currentDrawdown > 0.12 || dailyLossPct > 0.045 || consecutiveLosses >= 3) {
      return {
        active: true,
        level: 2,
        reason: `Level 2 CAUTION: Drawdown ${(currentDrawdown * 100).toFixed(2)}%, Daily Loss ${(dailyLossPct * 100).toFixed(2)}%, Consecutive Losses: ${consecutiveLosses}`
      };
    }

    // Check Level 1: Warning - Reduce position sizes
    if (currentDrawdown > 0.08 || dailyLossPct > 0.03 || consecutiveLosses >= 2) {
      return {
        active: true,
        level: 1,
        reason: `Level 1 WARNING: Drawdown ${(currentDrawdown * 100).toFixed(2)}%, Daily Loss ${(dailyLossPct * 100).toFixed(2)}%, Consecutive Losses: ${consecutiveLosses}`
      };
    }

    return { active: false, level: 0 };
  }

  private async getConsecutiveLosses(): Promise<number> {
    const { data: recentPositions } = await supabase
      .from('positions')
      .select('pnl, closed_at')
      .eq('session_id', this.sessionId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(10);

    if (!recentPositions || recentPositions.length === 0) return 0;

    let consecutive = 0;
    for (const pos of recentPositions) {
      if (pos.pnl < 0) {
        consecutive++;
      } else {
        break; // Stop counting at first win
      }
    }
    
    return consecutive;
  }

  // Private helper methods
  private async calculateCurrentDrawdown(): Promise<number> {
    const { data: session } = await supabase
      .from('trading_sessions')
      .select('initial_balance')
      .eq('id', this.sessionId)
      .single();

    const currentBalance = await this.getAccountBalance();
    const peakBalance = Math.max(session?.initial_balance || 10000, currentBalance);
    
    return Math.max(0, (peakBalance - currentBalance) / peakBalance);
  }

  private async getDailyPnL(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: positions } = await supabase
      .from('positions')
      .select('pnl')
      .eq('session_id', this.sessionId)
      .gte('opened_at', today)
      .lt('opened_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    return positions?.reduce((sum, p) => sum + (p.pnl || 0), 0) || 0;
  }

  private async calculateDailyProfitCap(): Promise<number> {
    const currentBalance = await this.getAccountBalance();
    const prevDayProfit = await this.getPreviousDayProfit();
    
    // 40% of current balance + previous day profit
    return (currentBalance * 0.40) + prevDayProfit;
  }

  private async getPreviousDayProfit(): Promise<number> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('daily_reports')
      .select('total_daily_profit')
      .eq('date', yesterday)
      .single();

    return data?.total_daily_profit || 0;
  }

  private async getAccountBalance(): Promise<number> {
    // In production, this would fetch from Capital.com API
    // For now, calculate from session + PnL
    const { data: session } = await supabase
      .from('trading_sessions')
      .select('initial_balance')
      .eq('id', this.sessionId)
      .single();

    const totalPnL = await this.getTotalPnL();
    return (session?.initial_balance || 10000) + totalPnL;
  }

  private async getTotalPnL(): Promise<number> {
    const { data: positions } = await supabase
      .from('positions')
      .select('pnl')
      .eq('session_id', this.sessionId);

    return positions?.reduce((sum, p) => sum + (p.pnl || 0), 0) || 0;
  }

  private async getOpenPositionsCount(): Promise<number> {
    const { count } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', this.sessionId)
      .eq('status', 'open');

    return count || 0;
  }

  private async getSymbolPositions(symbol: string): Promise<number> {
    const { count } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', this.sessionId)
      .eq('symbol', symbol)
      .eq('status', 'open');

    return count || 0;
  }

  private async getHourlyTradeCount(symbol: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', this.sessionId)
      .eq('symbol', symbol)
      .gte('opened_at', oneHourAgo);

    return count || 0;
  }

  private async calculateOptimalPositionSize(tradeSignal: any): Promise<number> {
    const riskPerTrade = this.config.get('RISK_PER_TRADE_PCT') || 0.07;
    const accountBalance = await this.getAccountBalance();
    const stopLossDistance = Math.abs(tradeSignal.price - tradeSignal.stopLoss) / tradeSignal.price;
    
    // Phase 7: Enhanced Kelly Criterion with historical performance
    const { data: perfData } = await supabase
      .from('model_symbol_performance')
      .select('win_rate, avg_win, avg_loss, total_trades')
      .eq('symbol', tradeSignal.symbol)
      .single();

    let kellyFraction = 0;
    if (perfData && perfData.total_trades >= 10) {
      // Use historical data for Kelly Criterion
      const p = perfData.win_rate; // Win probability from history
      const b = perfData.avg_loss > 0 ? perfData.avg_win / perfData.avg_loss : 2.0; // Win/Loss ratio
      const q = 1 - p; // Loss probability
      
      // Kelly Formula: f = (bp - q) / b
      kellyFraction = (b * p - q) / b;
      kellyFraction = Math.max(0, kellyFraction * 0.25); // Conservative 25% Kelly
      
      console.log(`Kelly Criterion for ${tradeSignal.symbol}: p=${p.toFixed(3)}, b=${b.toFixed(2)}, f=${kellyFraction.toFixed(4)}`);
    } else {
      // Fallback to confidence-based Kelly
      const winProbability = tradeSignal.confidence * 0.8;
      const riskRewardRatio = Math.abs(tradeSignal.takeProfit - tradeSignal.price) / Math.abs(tradeSignal.price - tradeSignal.stopLoss);
      kellyFraction = Math.max(0, ((riskRewardRatio * winProbability) - (1 - winProbability)) / riskRewardRatio * 0.25);
    }
    
    // Risk-based position size
    const riskBasedSize = (riskPerTrade * accountBalance) / (stopLossDistance * tradeSignal.price * 100000);
    
    // Volatility adjustment
    const volatility = await this.getVolatility(tradeSignal.symbol);
    const volAdjustment = volatility > 0.03 ? 0.5 : volatility > 0.02 ? 0.7 : 1.0;
    
    // Confidence scaling
    const confidenceScaling = Math.pow(tradeSignal.confidence, 2);
    
    // Final calculation with Kelly
    let optimalSize = Math.min(
      kellyFraction * accountBalance / tradeSignal.price,
      riskBasedSize
    ) * volAdjustment * confidenceScaling;
    
    // Additional safety: never risk more than 2% on any single trade
    const maxRiskDollars = accountBalance * 0.02;
    const positionRisk = optimalSize * tradeSignal.price * stopLossDistance;
    if (positionRisk > maxRiskDollars) {
      optimalSize = maxRiskDollars / (tradeSignal.price * stopLossDistance);
    }
    
    return Math.min(optimalSize, 2.0); // Max 2 lots
  }

  private async assessCorrelationRisk(symbol: string): Promise<number> {
    try {
      // Get current open positions with sizes
      const { data: positions, error: posError } = await supabase
        .from('positions')
        .select('symbol, size')
        .eq('session_id', this.sessionId)
        .eq('status', 'open');

      if (posError || !positions || positions.length === 0) {
        return 0; // No positions, no correlation risk
      }

      // Get correlation data from symbol_stats
      const today = new Date().toISOString().split('T')[0];
      const { data: stats, error: statsError } = await supabase
        .from('symbol_stats')
        .select('symbol, correlation_matrix')
        .eq('date', today)
        .in('symbol', [symbol, ...positions.map(p => p.symbol)]);

      if (statsError || !stats || stats.length === 0) {
        console.log('No correlation data available, using fallback');
        return Math.max(...this.getSymbolCorrelations(symbol, positions.map(p => p.symbol)));
      }

      // Calculate weighted correlation risk
      let totalCorrelation = 0;
      let totalWeight = 0;

      for (const position of positions) {
        if (position.symbol === symbol) continue; // Skip same symbol

        // Find correlation between new symbol and existing position
        const correlationKey1 = `${symbol}_${position.symbol}`;
        const correlationKey2 = `${position.symbol}_${symbol}`;

        let correlation = 0;
        
        // Check both possible key formats in all stats
        for (const stat of stats) {
          if (stat.correlation_matrix) {
            correlation = stat.correlation_matrix[correlationKey1] || 
                         stat.correlation_matrix[correlationKey2] || 
                         0;
            if (correlation !== 0) break;
          }
        }

        // If no correlation found, use fallback
        if (correlation === 0) {
          const fallbacks = this.getSymbolCorrelations(symbol, [position.symbol]);
          correlation = fallbacks[0] || 0.1;
        }

        // Weight by position size
        const weight = position.size || 1;
        totalCorrelation += Math.abs(correlation) * weight;
        totalWeight += weight;
      }

      const avgCorrelation = totalWeight > 0 ? totalCorrelation / totalWeight : 0;
      
      console.log(`Correlation risk for ${symbol}: ${(avgCorrelation * 100).toFixed(2)}%`);
      return avgCorrelation;
      
    } catch (error) {
      console.error('Error assessing correlation risk:', error);
      return 0.5; // Conservative fallback
    }
  }

  private getSymbolCorrelations(symbol: string, existingSymbols: string[]): number[] {
    // Simplified correlation matrix
    const correlationMatrix: Record<string, Record<string, number>> = {
      'EURUSD': { 'GBPUSD': 0.8, 'AUDUSD': 0.7, 'NZDUSD': 0.6 },
      'GBPUSD': { 'EURUSD': 0.8, 'AUDUSD': 0.6, 'NZDUSD': 0.5 },
      'XAUUSD': { 'XAGUSD': 0.7, 'USOIL': 0.4 },
      'NVDA': { 'AAPL': 0.6, 'MSFT': 0.7, 'GOOGL': 0.8 },
    };

    return existingSymbols.map(existing => 
      correlationMatrix[symbol]?.[existing] || 
      correlationMatrix[existing]?.[symbol] || 
      0.1
    );
  }

  private async logRiskMetrics(metrics: any): Promise<void> {
    const { error } = await supabase
      .from('risk_metrics')
      .insert({
        session_id: this.sessionId,
        account_balance: await this.getAccountBalance(),
        daily_pnl: await this.getDailyPnL(),
        current_drawdown: await this.calculateCurrentDrawdown(),
        risk_utilization: metrics.correlationRisk,
        correlation_risk: metrics.correlationRisk,
        open_positions: await this.getOpenPositionsCount(),
        daily_trades_count: await this.getHourlyTradeCount(metrics.symbol) // Simplified
      });

    if (error) {
      console.error('Error logging risk metrics:', error);
    }
  }

  // Market data helpers (would be real in production)
  private async getATR(symbol: string): Promise<number> {
    const atrMap: Record<string, number> = {
      'EURUSD': 0.0012, 'GBPUSD': 0.0015, 'USDJPY': 0.8,
      'XAUUSD': 12.5, 'NVDA': 8.5, 'BTCUSD': 1200
    };
    return atrMap[symbol] || 0.001;
  }

  private async getVolatility(symbol: string): Promise<number> {
    const volMap: Record<string, number> = {
      'EURUSD': 0.015, 'GBPUSD': 0.018, 'BTCUSD': 0.045,
      'NVDA': 0.035, 'XAUUSD': 0.022
    };
    return volMap[symbol] || 0.02;
  }

  private async getNearestSupport(symbol: string, currentPrice: number): Promise<number> {
    return currentPrice * 0.995;
  }

  private async getNearestResistance(symbol: string, currentPrice: number): Promise<number> {
    return currentPrice * 1.005;
  }

  private async getModelPerformanceMultiplier(model: string): Promise<number> {
    const performance: Record<string, number> = {
      'LSTM-Attention': 1.1, 'Transformer-MultiHead': 1.2,
      'XGBoost-Ensemble': 1.0, 'Deep-Q-Network': 1.15,
      'Advanced-Ensemble': 1.25
    };
    return performance[model] || 1.0;
  }

  private async getMarketCondition(): Promise<number> {
    // Simplified market condition (0-1, where 1 is best)
    return 0.7 + (Math.random() * 0.3);
  }

  private calculatePositionDrawdown(position: any): number {
    const entryValue = position.size * position.entry_price;
    const currentValue = position.size * (position.current_price || position.entry_price);
    
    if (position.direction === 'BUY') {
      return Math.max(0, (entryValue - currentValue) / entryValue);
    } else {
      return Math.max(0, (currentValue - entryValue) / entryValue);
    }
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, action, tradeSignal, dealId } = await req.json();

    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    const riskManager = new ProductionRiskManager(sessionId);

    switch (action) {
      case 'validate_trade':
        if (!tradeSignal) {
          throw new Error('tradeSignal is required for validation');
        }

        const validation = await riskManager.validateTrade(tradeSignal);
        
        // If trade is allowed, also calculate dynamic SL/TP
        let enhancedSignal = tradeSignal;
        if (validation.allowed) {
          const dynamicStopLoss = await riskManager.calculateDynamicStopLoss(tradeSignal);
          const dynamicTakeProfit = await riskManager.calculateDynamicTakeProfit(tradeSignal, dynamicStopLoss);
          
          enhancedSignal = {
            ...tradeSignal,
            size: validation.adjustedSize,
            stopLoss: dynamicStopLoss,
            takeProfit: dynamicTakeProfit
          };
        }

        return new Response(JSON.stringify({
          success: true,
          validation,
          enhancedSignal: validation.allowed ? enhancedSignal : null
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

      case 'assess_positions':
        const healthAssessment = await riskManager.assessPositionHealth();
        
        return new Response(JSON.stringify({
          success: true,
          assessment: healthAssessment
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

      case 'kill_switch_status':
        const killSwitchStatus = await riskManager.getKillSwitchStatus();
        
        return new Response(JSON.stringify({
          success: true,
          killSwitch: killSwitchStatus
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

      default:
        throw new Error('Invalid action. Use: validate_trade, assess_positions, or kill_switch_status');
    }
  } catch (error: unknown) {
    console.error('Risk Management Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return new Response(JSON.stringify({
      error: errorMessage,
      success: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});