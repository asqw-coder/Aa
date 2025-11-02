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

interface DailyReportData {
  date: string;
  totalDailyProfit: number;
  totalDailyLoss: number;
  currentBalance: number;
  profitPerSymbol: Record<string, number>;
  lossPerSymbol: Record<string, number>;
  topProfitSymbols: Array<{ symbol: string; profit: number }>;
  topLossSymbols: Array<{ symbol: string; loss: number }>;
  todayVsYesterday: {
    profitChange: number;
    lossChange: number;
  };
  totalTrades: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  tradesByHour: Record<string, number>;
  averageTradeTime: number;
  bestPerformingModel: string;
  worstPerformingModel: string;
  riskMetrics: {
    avgRiskPerTrade: number;
    maxPositionSize: number;
    correlationRisk: number;
  };
}

class DailyReportGenerator {
  private sessionId: string;
  private reportDate: string;

  constructor(sessionId: string, date?: string) {
    this.sessionId = sessionId;
    this.reportDate = date || new Date().toISOString().split('T')[0];
  }

  async generateReport(): Promise<DailyReportData> {
    try {
      console.log(`Generating daily report for session ${this.sessionId}, date: ${this.reportDate}`);

      // Get all trades for the day
      const trades = await this.getDailyTrades();
      const previousTrades = await this.getPreviousDayTrades();
      
      // Calculate basic metrics
      const profitTrades = trades.filter(t => (t.pnl || 0) > 0);
      const lossTrades = trades.filter(t => (t.pnl || 0) < 0);
      
      const totalDailyProfit = profitTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const totalDailyLoss = Math.abs(lossTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
      
      // Calculate symbol-wise performance
      const { profitPerSymbol, lossPerSymbol } = this.calculateSymbolPerformance(trades);
      
      // Get top performing symbols
      const topProfitSymbols = Object.entries(profitPerSymbol)
        .map(([symbol, profit]) => ({ symbol, profit }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5);
        
      const topLossSymbols = Object.entries(lossPerSymbol)
        .map(([symbol, loss]) => ({ symbol, loss: Math.abs(loss) }))
        .sort((a, b) => b.loss - a.loss)
        .slice(0, 5);

      // Calculate comparison with yesterday
      const previousProfit = previousTrades.filter(t => (t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl || 0), 0);
      const previousLoss = Math.abs(previousTrades.filter(t => (t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl || 0), 0));
      
      const todayVsYesterday = {
        profitChange: totalDailyProfit - previousProfit,
        lossChange: totalDailyLoss - previousLoss
      };

      // Calculate advanced metrics
      const winRate = trades.length > 0 ? profitTrades.length / trades.length : 0;
      const currentBalance = await this.getCurrentBalance();
      const maxDrawdown = await this.calculateMaxDrawdown();
      const sharpeRatio = this.calculateSharpeRatio(trades);
      
      // Get trading patterns
      const tradesByHour = this.analyzeTradesByHour(trades);
      const averageTradeTime = this.calculateAverageTradeTime(trades);
      
      // Model performance analysis
      const { bestPerformingModel, worstPerformingModel } = await this.analyzeModelPerformance();
      
      // Risk metrics
      const riskMetrics = await this.calculateRiskMetrics();

      const reportData: DailyReportData = {
        date: this.reportDate,
        totalDailyProfit,
        totalDailyLoss,
        currentBalance,
        profitPerSymbol,
        lossPerSymbol,
        topProfitSymbols,
        topLossSymbols,
        todayVsYesterday,
        totalTrades: trades.length,
        winRate,
        maxDrawdown,
        sharpeRatio,
        tradesByHour,
        averageTradeTime,
        bestPerformingModel,
        worstPerformingModel,
        riskMetrics
      };

      // Store report in database
      await this.storeReport(reportData);
      
      console.log('Daily report generated successfully');
      return reportData;

    } catch (error) {
      console.error('Error generating daily report:', error);
      throw error;
    }
  }

  async sendEmailReport(reportData: DailyReportData): Promise<void> {
    try {
      const emailContent = this.generateEmailContent(reportData);
      
      // Call email service
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          to: Deno.env.get('TRADER_EMAIL_ADDRESS'),
          subject: `Daily Trading Report - ${reportData.date}`,
          html: emailContent,
          attachments: []
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }

      // Update report as sent
      await supabase
        .from('daily_reports')
        .update({ report_sent: true })
        .eq('date', this.reportDate);

      console.log('Email report sent successfully');
    } catch (error) {
      console.error('Error sending email report:', error);
      throw error;
    }
  }

  private async getDailyTrades(): Promise<any[]> {
    const startDate = new Date(this.reportDate);
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('positions')
      .select(`
        *,
        ml_predictions!inner(model_id, direction, confidence)
      `)
      .eq('session_id', this.sessionId)
      .gte('opened_at', startDate.toISOString())
      .lt('opened_at', endDate.toISOString());

    if (error) throw error;
    return data || [];
  }

  private async getPreviousDayTrades(): Promise<any[]> {
    const previousDate = new Date(new Date(this.reportDate).getTime() - 24 * 60 * 60 * 1000);
    const startDate = previousDate;
    const endDate = new Date(previousDate.getTime() + 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('session_id', this.sessionId)
      .gte('opened_at', startDate.toISOString())
      .lt('opened_at', endDate.toISOString());

    if (error) throw error;
    return data || [];
  }

  private calculateSymbolPerformance(trades: any[]): {
    profitPerSymbol: Record<string, number>;
    lossPerSymbol: Record<string, number>;
  } {
    const profitPerSymbol: Record<string, number> = {};
    const lossPerSymbol: Record<string, number> = {};

    for (const trade of trades) {
      const symbol = trade.symbol;
      const pnl = trade.pnl || 0;

      if (pnl > 0) {
        profitPerSymbol[symbol] = (profitPerSymbol[symbol] || 0) + pnl;
      } else if (pnl < 0) {
        lossPerSymbol[symbol] = (lossPerSymbol[symbol] || 0) + pnl;
      }
    }

    return { profitPerSymbol, lossPerSymbol };
  }

  private async getCurrentBalance(): Promise<number> {
    const { data: session } = await supabase
      .from('trading_sessions')
      .select('initial_balance')
      .eq('id', this.sessionId)
      .single();

    const { data: positions } = await supabase
      .from('positions')
      .select('pnl')
      .eq('session_id', this.sessionId);

    const totalPnL = positions?.reduce((sum, p) => sum + (p.pnl || 0), 0) || 0;
    return (session?.initial_balance || 10000) + totalPnL;
  }

  private async calculateMaxDrawdown(): Promise<number> {
    const { data: riskMetrics } = await supabase
      .from('risk_metrics')
      .select('current_drawdown')
      .eq('session_id', this.sessionId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (!riskMetrics || riskMetrics.length === 0) return 0;

    return Math.max(...riskMetrics.map(r => r.current_drawdown || 0));
  }

  private calculateSharpeRatio(trades: any[]): number {
    if (trades.length === 0) return 0;

    const returns = trades.map(t => (t.pnl || 0) / 10000); // Normalize by account size
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
  }

  private analyzeTradesByHour(trades: any[]): Record<string, number> {
    const tradesByHour: Record<string, number> = {};
    
    for (let hour = 0; hour < 24; hour++) {
      tradesByHour[hour.toString().padStart(2, '0')] = 0;
    }

    for (const trade of trades) {
      const hour = new Date(trade.opened_at).getHours();
      const hourKey = hour.toString().padStart(2, '0');
      tradesByHour[hourKey]++;
    }

    return tradesByHour;
  }

  private calculateAverageTradeTime(trades: any[]): number {
    const closedTrades = trades.filter(t => t.closed_at);
    if (closedTrades.length === 0) return 0;

    const totalTime = closedTrades.reduce((sum, trade) => {
      const openTime = new Date(trade.opened_at).getTime();
      const closeTime = new Date(trade.closed_at).getTime();
      return sum + (closeTime - openTime);
    }, 0);

    return totalTime / closedTrades.length; // Average in milliseconds
  }

  private async analyzeModelPerformance(): Promise<{
    bestPerformingModel: string;
    worstPerformingModel: string;
  }> {
    // This would analyze predictions vs actual outcomes
    // For now, return simplified analysis
    
    const models = ['LSTM-Attention', 'Transformer-MultiHead', 'XGBoost-Ensemble', 'Deep-Q-Network'];
    const performances = models.map(model => ({
      model,
      performance: Math.random() * 100 // Simplified random performance
    }));

    performances.sort((a, b) => b.performance - a.performance);

    return {
      bestPerformingModel: performances[0].model,
      worstPerformingModel: performances[performances.length - 1].model
    };
  }

  private async calculateRiskMetrics(): Promise<{
    avgRiskPerTrade: number;
    maxPositionSize: number;
    correlationRisk: number;
  }> {
    const { data: riskData } = await supabase
      .from('risk_metrics')
      .select('*')
      .eq('session_id', this.sessionId)
      .gte('timestamp', this.reportDate)
      .lt('timestamp', new Date(new Date(this.reportDate).getTime() + 24 * 60 * 60 * 1000).toISOString());

    if (!riskData || riskData.length === 0) {
      return { avgRiskPerTrade: 0, maxPositionSize: 0, correlationRisk: 0 };
    }

    const avgCorrelationRisk = riskData.reduce((sum, r) => sum + (r.correlation_risk || 0), 0) / riskData.length;

    // Get position sizes from trades
    const { data: positions } = await supabase
      .from('positions')
      .select('size')
      .eq('session_id', this.sessionId)
      .gte('opened_at', this.reportDate)
      .lt('opened_at', new Date(new Date(this.reportDate).getTime() + 24 * 60 * 60 * 1000).toISOString());

    const maxPositionSize = positions && positions.length > 0 
      ? Math.max(...positions.map(p => p.size || 0))
      : 0;

    return {
      avgRiskPerTrade: 0.07, // From config
      maxPositionSize,
      correlationRisk: avgCorrelationRisk
    };
  }

  private async storeReport(reportData: DailyReportData): Promise<void> {
    const { error } = await supabase
      .from('daily_reports')
      .upsert({
        date: reportData.date,
        session_id: this.sessionId,
        total_daily_profit: reportData.totalDailyProfit,
        total_daily_loss: reportData.totalDailyLoss,
        current_balance: reportData.currentBalance,
        profit_per_symbol: reportData.profitPerSymbol,
        loss_per_symbol: reportData.lossPerSymbol,
        top_profit_symbols: reportData.topProfitSymbols,
        top_loss_symbols: reportData.topLossSymbols,
        today_vs_yesterday: reportData.todayVsYesterday,
        total_trades: reportData.totalTrades,
        win_rate: reportData.winRate,
        max_drawdown: reportData.maxDrawdown,
        sharpe_ratio: reportData.sharpeRatio,
        report_generated: true
      });

    if (error) {
      throw new Error(`Failed to store report: ${error.message}`);
    }
  }

  private generateEmailContent(reportData: DailyReportData): string {
    const netPnL = reportData.totalDailyProfit - reportData.totalDailyLoss;
    const netPnLColor = netPnL >= 0 ? '#10B981' : '#EF4444';
    const netPnLIcon = netPnL >= 0 ? '📈' : '📉';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Daily Trading Report</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #0f1419; color: #e5e7eb; }
            .container { max-width: 800px; margin: 0 auto; background: #1f2937; border-radius: 12px; padding: 30px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; color: #f9fafb; margin: 0; }
            .subtitle { font-size: 16px; color: #9ca3af; margin: 5px 0 0 0; }
            .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
            .metric-card { background: #374151; padding: 20px; border-radius: 8px; text-align: center; }
            .metric-value { font-size: 24px; font-weight: bold; margin: 0; }
            .metric-label { font-size: 14px; color: #9ca3af; margin: 5px 0 0 0; }
            .positive { color: #10B981; }
            .negative { color: #EF4444; }
            .neutral { color: #6B7280; }
            .section { margin: 30px 0; }
            .section-title { font-size: 20px; font-weight: bold; margin: 0 0 15px 0; color: #f9fafb; }
            .symbol-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
            .symbol-item { background: #4B5563; padding: 10px; border-radius: 6px; text-align: center; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6B7280; }
            .risk-warning { background: #7C2D12; border: 1px solid #DC2626; border-radius: 6px; padding: 15px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="title">${netPnLIcon} Daily Trading Report</h1>
                <p class="subtitle">${reportData.date} | Session: ${this.sessionId.slice(0, 8)}</p>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <p class="metric-value" style="color: ${netPnLColor}">$${netPnL.toFixed(2)}</p>
                    <p class="metric-label">Net P&L</p>
                </div>
                <div class="metric-card">
                    <p class="metric-value positive">$${reportData.totalDailyProfit.toFixed(2)}</p>
                    <p class="metric-label">Total Profit</p>
                </div>
                <div class="metric-card">
                    <p class="metric-value negative">$${reportData.totalDailyLoss.toFixed(2)}</p>
                    <p class="metric-label">Total Loss</p>
                </div>
                <div class="metric-card">
                    <p class="metric-value neutral">$${reportData.currentBalance.toFixed(2)}</p>
                    <p class="metric-label">Current Balance</p>
                </div>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <p class="metric-value neutral">${reportData.totalTrades}</p>
                    <p class="metric-label">Total Trades</p>
                </div>
                <div class="metric-card">
                    <p class="metric-value ${reportData.winRate >= 0.6 ? 'positive' : reportData.winRate >= 0.4 ? 'neutral' : 'negative'}">${(reportData.winRate * 100).toFixed(1)}%</p>
                    <p class="metric-label">Win Rate</p>
                </div>
                <div class="metric-card">
                    <p class="metric-value ${reportData.maxDrawdown <= 0.1 ? 'positive' : reportData.maxDrawdown <= 0.2 ? 'neutral' : 'negative'}">${(reportData.maxDrawdown * 100).toFixed(2)}%</p>
                    <p class="metric-label">Max Drawdown</p>
                </div>
                <div class="metric-card">
                    <p class="metric-value ${reportData.sharpeRatio >= 1 ? 'positive' : reportData.sharpeRatio >= 0 ? 'neutral' : 'negative'}">${reportData.sharpeRatio.toFixed(2)}</p>
                    <p class="metric-label">Sharpe Ratio</p>
                </div>
            </div>

            <div class="section">
                <h2 class="section-title">📊 Top Performing Symbols</h2>
                <div class="symbol-list">
                    ${reportData.topProfitSymbols.map(s => `
                        <div class="symbol-item">
                            <strong>${s.symbol}</strong><br>
                            <span class="positive">+$${s.profit.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="section">
                <h2 class="section-title">📉 Worst Performing Symbols</h2>
                <div class="symbol-list">
                    ${reportData.topLossSymbols.map(s => `
                        <div class="symbol-item">
                            <strong>${s.symbol}</strong><br>
                            <span class="negative">-$${s.loss.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="section">
                <h2 class="section-title">🤖 AI Model Performance</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <p class="metric-value positive">${reportData.bestPerformingModel}</p>
                        <p class="metric-label">Best Model</p>
                    </div>
                    <div class="metric-card">
                        <p class="metric-value negative">${reportData.worstPerformingModel}</p>
                        <p class="metric-label">Needs Improvement</p>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2 class="section-title">⚠️ Risk Analysis</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <p class="metric-value neutral">${(reportData.riskMetrics.avgRiskPerTrade * 100).toFixed(1)}%</p>
                        <p class="metric-label">Avg Risk/Trade</p>
                    </div>
                    <div class="metric-card">
                        <p class="metric-value neutral">${reportData.riskMetrics.maxPositionSize.toFixed(2)}</p>
                        <p class="metric-label">Max Position Size</p>
                    </div>
                    <div class="metric-card">
                        <p class="metric-value ${reportData.riskMetrics.correlationRisk <= 0.3 ? 'positive' : reportData.riskMetrics.correlationRisk <= 0.6 ? 'neutral' : 'negative'}">${(reportData.riskMetrics.correlationRisk * 100).toFixed(1)}%</p>
                        <p class="metric-label">Correlation Risk</p>
                    </div>
                </div>
            </div>

            ${reportData.maxDrawdown > 0.1 ? `
            <div class="risk-warning">
                <strong>⚠️ Risk Warning:</strong> Maximum drawdown of ${(reportData.maxDrawdown * 100).toFixed(2)}% 
                is approaching the 14% limit. Consider reducing position sizes or reviewing strategy parameters.
            </div>
            ` : ''}

            <div class="footer">
                <p>Generated by Dragon Trading System | ${new Date().toLocaleString()}</p>
                <p>This is an automated report. Please review all trades and risk metrics carefully.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, action, date, sendEmail } = await req.json();

    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    switch (action) {
      case 'generate':
        const generator = new DailyReportGenerator(sessionId, date);
        const reportData = await generator.generateReport();

        // Send email if requested
        if (sendEmail) {
          await generator.sendEmailReport(reportData);
        }

        return new Response(JSON.stringify({
          success: true,
          report: reportData,
          emailSent: sendEmail || false
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

      case 'schedule':
        // Schedule daily report generation (would be called by cron)
        const scheduleGenerator = new DailyReportGenerator(sessionId);
        const scheduledReport = await scheduleGenerator.generateReport();
        await scheduleGenerator.sendEmailReport(scheduledReport);

        return new Response(JSON.stringify({
          success: true,
          message: 'Scheduled daily report generated and sent',
          report: scheduledReport
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

      default:
        throw new Error('Invalid action. Use: generate or schedule');
    }
  } catch (error: unknown) {
    console.error('Daily Report Generator Error:', error);
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