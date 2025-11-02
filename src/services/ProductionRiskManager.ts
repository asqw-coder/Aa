import { supabase } from '@/integrations/supabase/client';
import { TradingSignal, Position, MLPrediction, RiskMetrics } from '@/types/trading';

export class ProductionRiskManager {
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async validateTrade(signal: TradingSignal): Promise<{
    allowed: boolean;
    adjustedSize: number;
    reason?: string;
  }> {
    try {
      // Call the risk management edge function
      const { data, error } = await supabase.functions.invoke('risk-management', {
        body: {
          sessionId: this.sessionId,
          action: 'validate_trade',
          tradeSignal: {
            symbol: signal.symbol,
            direction: signal.direction,
            size: signal.size,
            price: signal.price,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            confidence: signal.confidence,
            model: 'Production-Model'
          }
        }
      });

      if (error) {
        console.error('Risk validation error:', error);
        return {
          allowed: false,
          adjustedSize: 0,
          reason: `Risk validation failed: ${error.message}`
        };
      }

      if (data.success && data.validation) {
        return {
          allowed: data.validation.allowed,
          adjustedSize: data.validation.adjustedSize,
          reason: data.validation.reason
        };
      }

      return {
        allowed: false,
        adjustedSize: 0,
        reason: 'Invalid response from risk management'
      };
    } catch (error) {
      console.error('Error validating trade:', error);
      return {
        allowed: false,
        adjustedSize: 0,
        reason: `Risk validation error: ${error}`
      };
    }
  }

  async assessPositionHealth(): Promise<Array<{
    dealId: string;
    action: 'HOLD' | 'CLOSE' | 'ADJUST_SL' | 'PARTIAL_CLOSE';
    reason: string;
  }>> {
    try {
      const { data, error } = await supabase.functions.invoke('risk-management', {
        body: {
          sessionId: this.sessionId,
          action: 'assess_positions'
        }
      });

      if (error) {
        console.error('Position assessment error:', error);
        return [];
      }

      return data.assessment || [];
    } catch (error) {
      console.error('Error assessing position health:', error);
      return [];
    }
  }

  async getKillSwitchStatus(): Promise<{ active: boolean; level?: number; reason?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('risk-management', {
        body: {
          sessionId: this.sessionId,
          action: 'kill_switch_status'
        }
      });

      if (error) {
        console.error('Kill switch status error:', error);
        return { active: true, reason: 'Unable to check kill switch status' };
      }

      return data.killSwitch || { active: false };
    } catch (error) {
      console.error('Error checking kill switch:', error);
      return { active: true, reason: 'Kill switch status check failed' };
    }
  }

  async updatePosition(position: Position): Promise<void> {
    try {
      // Store position in database
      const { error } = await supabase
        .from('positions')
        .upsert({
          deal_id: position.dealId,
          session_id: this.sessionId,
          symbol: position.symbol,
          direction: position.direction,
          size: position.size,
          entry_price: position.entryPrice,
          current_price: position.currentPrice,
          pnl: position.pnl,
          stop_loss: position.stopLoss,
          take_profit: position.takeProfit,
          status: 'open'
        }, {
          onConflict: 'deal_id'
        });

      if (error) {
        console.error('Error updating position:', error);
      }
    } catch (error) {
      console.error('Error in updatePosition:', error);
    }
  }

  async removePosition(dealId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('positions')
        .update({ status: 'closed' })
        .eq('deal_id', dealId)
        .eq('session_id', this.sessionId);

      if (error) {
        console.error('Error removing position:', error);
      }
    } catch (error) {
      console.error('Error in removePosition:', error);
    }
  }

  async getRiskMetrics(): Promise<RiskMetrics> {
    try {
      const { data, error } = await supabase
        .from('risk_metrics')
        .select('*')
        .eq('session_id', this.sessionId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        // Return default metrics if none found
        return {
          currentDrawdown: 0,
          dailyPnL: 0,
          totalRisk: 0,
          maxPositionSize: 2.0,
          allowedRisk: 0.07,
          portfolioValue: 10000
        };
      }

      return {
        currentDrawdown: data.current_drawdown || 0,
        dailyPnL: data.daily_pnl || 0,
        totalRisk: data.risk_utilization || 0,
        maxPositionSize: 2.0,
        allowedRisk: 0.07,
        portfolioValue: data.account_balance || 10000
      };
    } catch (error) {
      console.error('Error getting risk metrics:', error);
      return {
        currentDrawdown: 0,
        dailyPnL: 0,
        totalRisk: 0,
        maxPositionSize: 2.0,
        allowedRisk: 0.07,
        portfolioValue: 10000
      };
    }
  }

  calculateDynamicStopLoss(signal: TradingSignal, prediction: MLPrediction): number {
    // Use prediction stop loss if available, otherwise calculate based on price
    if (prediction.stopLoss && prediction.stopLoss > 0) {
      return prediction.stopLoss;
    }

    // Fallback: 1% stop loss
    const stopPercent = 0.01;
    return signal.direction === 'BUY' 
      ? signal.price * (1 - stopPercent)
      : signal.price * (1 + stopPercent);
  }

  calculateDynamicTakeProfit(signal: TradingSignal, prediction: MLPrediction): number {
    // Use prediction take profit if available, otherwise calculate based on price
    if (prediction.takeProfit && prediction.takeProfit > 0) {
      return prediction.takeProfit;
    }

    // Fallback: 2:1 risk-reward ratio
    const stopDistance = Math.abs(signal.price - signal.stopLoss);
    return signal.direction === 'BUY'
      ? signal.price + (stopDistance * 2)
      : signal.price - (stopDistance * 2);
  }
}