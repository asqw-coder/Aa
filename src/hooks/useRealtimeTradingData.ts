import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Position, DailyReport } from '@/types/trading';

interface TradingData {
  positions: Position[];
  dailyReport: DailyReport | null;
  sessionId: string | null;
  riskMetrics: any;
  isLoading: boolean;
  error: string | null;
}

export const useRealtimeTradingData = () => {
  const [data, setData] = useState<TradingData>({
    positions: [],
    dailyReport: null,
    sessionId: null,
    riskMetrics: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    // Get current session
    const getCurrentSession = async () => {
      try {
        const { data: sessions, error } = await supabase
          .from('trading_sessions')
          .select('*')
          .eq('status', 'active')
          .order('session_start', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (sessions && sessions.length > 0) {
          const sessionId = sessions[0].id;
          setData(prev => ({ ...prev, sessionId, isLoading: false }));
          
          // Load initial data
          await Promise.all([
            loadPositions(sessionId),
            loadDailyReport(sessionId),
            loadRiskMetrics(sessionId)
          ]);
        } else {
          setData(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error loading session:', error);
        setData(prev => ({ ...prev, error: error.message, isLoading: false }));
      }
    };

    const loadPositions = async (sessionId: string) => {
      try {
        const { data: positions, error } = await supabase
          .from('positions')
          .select('*')
          .eq('session_id', sessionId)
          .eq('status', 'open');

        if (error) throw error;

        const formattedPositions: Position[] = positions?.map(p => ({
          dealId: p.deal_id,
          symbol: p.symbol,
          direction: p.direction as 'BUY' | 'SELL',
          size: p.size,
          entryPrice: p.entry_price,
          currentPrice: p.current_price || p.entry_price,
          pnl: p.pnl || 0,
          stopLoss: p.stop_loss,
          takeProfit: p.take_profit,
          timestamp: p.opened_at
        })) || [];

        setData(prev => ({ ...prev, positions: formattedPositions }));
      } catch (error) {
        console.error('Error loading positions:', error);
      }
    };

    const loadDailyReport = async (sessionId: string) => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: report, error } = await supabase
          .from('daily_reports')
          .select('*')
          .eq('session_id', sessionId)
          .eq('date', today)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (report) {
          const dailyReport: DailyReport = {
            date: report.date,
            totalDailyProfit: report.total_daily_profit || 0,
            totalDailyLoss: report.total_daily_loss || 0,
            currentBalance: report.current_balance || 0,
            profitPerSymbol: (report.profit_per_symbol as Record<string, number>) || {},
            lossPerSymbol: (report.loss_per_symbol as Record<string, number>) || {},
            topProfitSymbols: (report.top_profit_symbols as Array<{ symbol: string; profit: number }>) || [],
            topLossSymbols: (report.top_loss_symbols as Array<{ symbol: string; loss: number }>) || [],
            todayVsYesterday: (report.today_vs_yesterday as { profitChange: number; lossChange: number }) || { profitChange: 0, lossChange: 0 },
            totalTrades: report.total_trades || 0,
            winRate: report.win_rate || 0,
            maxDrawdown: report.max_drawdown || 0,
            sharpeRatio: report.sharpe_ratio || 0
          };
          setData(prev => ({ ...prev, dailyReport }));
        }
      } catch (error) {
        console.error('Error loading daily report:', error);
      }
    };

    const loadRiskMetrics = async (sessionId: string) => {
      try {
        const { data: metrics, error } = await supabase
          .from('risk_metrics')
          .select('*')
          .eq('session_id', sessionId)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (metrics) {
          setData(prev => ({ 
            ...prev, 
            riskMetrics: {
              currentDrawdown: metrics.current_drawdown || 0,
              dailyPnL: metrics.daily_pnl || 0,
              riskUtilization: metrics.risk_utilization || 0,
              correlationRisk: metrics.correlation_risk || 0,
              openPositions: metrics.open_positions || 0
            }
          }));
        }
      } catch (error) {
        console.error('Error loading risk metrics:', error);
      }
    };

    getCurrentSession();

    // Set up real-time subscriptions
    const positionsChannel = supabase
      .channel('positions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions'
        },
        (payload) => {
          console.log('Position update:', payload);
          if (data.sessionId) {
            loadPositions(data.sessionId);
          }
        }
      )
      .subscribe();

    const reportsChannel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_reports'
        },
        (payload) => {
          console.log('Report update:', payload);
          if (data.sessionId) {
            loadDailyReport(data.sessionId);
          }
        }
      )
      .subscribe();

    const riskChannel = supabase
      .channel('risk-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'risk_metrics'
        },
        (payload) => {
          console.log('Risk metrics update:', payload);
          if (data.sessionId) {
            loadRiskMetrics(data.sessionId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(positionsChannel);
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(riskChannel);
    };
  }, []);

  return data;
};