import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// Import Resend using esm.sh for Deno compatibility
const Resend = (await import("https://esm.sh/resend@2.0.0")).Resend;

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TradingReportRequest {
  email: string;
  reportData: {
    totalPnL: number;
    dailyTrades: number;
    winRate: number;
    trades: Array<{
      symbol: string;
      type: string;
      pnl: number;
      confidence: number;
      model: string;
      timestamp: string;
    }>;
    modelPerformance: Array<{
      name: string;
      accuracy: number;
      profit: number;
      trades: number;
    }>;
    dailyPnL: Array<{
      hour: string;
      pnl: number;
    }>;
    symbolAnalysis: Array<{
      symbol: string;
      trades: number;
      winRate: number;
      totalPnL: number;
    }>;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const generateHTMLReport = (reportData: TradingReportRequest['reportData']) => {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const bestPerformingModel = reportData.modelPerformance.length > 0 
    ? reportData.modelPerformance.reduce((best, model) => 
        model.profit > best.profit ? model : best
      )
    : { name: 'N/A', profit: 0, accuracy: 0, trades: 0 };

  const mostProfitableSymbol = reportData.symbolAnalysis.length > 0
    ? reportData.symbolAnalysis.reduce((best, symbol) => 
        symbol.totalPnL > best.totalPnL ? symbol : best
      )
    : { symbol: 'N/A', totalPnL: 0, trades: 0, winRate: 0 };

  const recentTrades = reportData.trades.slice(-10);
  const winningTrades = reportData.trades.filter(trade => trade.pnl > 0);
  const losingTrades = reportData.trades.filter(trade => trade.pnl < 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Red Sun Fx - Daily Trading Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; color: #ffffff; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; background: linear-gradient(135deg, #dc2626, #991b1b); padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 32px; color: white; }
        .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }
        .section { background-color: #1a1a1a; border-radius: 8px; padding: 25px; margin-bottom: 20px; border: 1px solid #333; }
        .section h2 { margin-top: 0; color: #dc2626; font-size: 20px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .metric { background-color: #262626; padding: 15px; border-radius: 6px; text-align: center; }
        .metric-label { font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 5px; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .positive { color: #22c55e; }
        .negative { color: #ef4444; }
        .neutral { color: #64748b; }
        .trades-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .trades-table th, .trades-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #333; }
        .trades-table th { background-color: #262626; color: #dc2626; font-weight: 600; }
        .model-performance { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .model-card { background-color: #262626; padding: 15px; border-radius: 6px; }
        .model-name { font-weight: bold; margin-bottom: 10px; }
        .footer { text-align: center; margin-top: 40px; padding: 20px; color: #888; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌅 Red Sun Fx</h1>
          <p>Daily Trading Report - ${date}</p>
        </div>

        <div class="section">
          <h2>📊 Daily Performance Summary</h2>
          <div class="metrics-grid">
            <div class="metric">
              <div class="metric-label">Total P&L</div>
              <div class="metric-value ${reportData.totalPnL >= 0 ? 'positive' : 'negative'}">
                ${formatCurrency(reportData.totalPnL)}
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">Trades Executed</div>
              <div class="metric-value neutral">${reportData.dailyTrades}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Win Rate</div>
              <div class="metric-value ${reportData.winRate >= 60 ? 'positive' : reportData.winRate >= 40 ? 'neutral' : 'negative'}">
                ${reportData.winRate.toFixed(1)}%
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">Best Model</div>
              <div class="metric-value neutral">${bestPerformingModel.name.split(' ')[0]}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>🤖 AI Model Performance</h2>
          <div class="model-performance">
            ${reportData.modelPerformance.map(model => `
              <div class="model-card">
                <div class="model-name">${model.name}</div>
                <div>Accuracy: <span class="${model.accuracy >= 70 ? 'positive' : model.accuracy >= 50 ? 'neutral' : 'negative'}">${model.accuracy.toFixed(1)}%</span></div>
                <div>Profit: <span class="${model.profit >= 0 ? 'positive' : 'negative'}">${formatCurrency(model.profit)}</span></div>
                <div>Trades: ${model.trades}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="section">
          <h2>📈 Symbol Performance</h2>
          <table class="trades-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th>Total P&L</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.symbolAnalysis.slice(0, 10).map(symbol => `
                <tr>
                  <td>${symbol.symbol}</td>
                  <td>${symbol.trades}</td>
                  <td class="${symbol.winRate >= 60 ? 'positive' : symbol.winRate >= 40 ? 'neutral' : 'negative'}">
                    ${symbol.winRate.toFixed(1)}%
                  </td>
                  <td class="${symbol.totalPnL >= 0 ? 'positive' : 'negative'}">
                    ${formatCurrency(symbol.totalPnL)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>⚡ Recent Trades</h2>
          <table class="trades-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Symbol</th>
                <th>Type</th>
                <th>P&L</th>
                <th>Model</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              ${recentTrades.map(trade => `
                <tr>
                  <td>${new Date(trade.timestamp).toLocaleTimeString()}</td>
                  <td>${trade.symbol}</td>
                  <td>${trade.type}</td>
                  <td class="${trade.pnl >= 0 ? 'positive' : 'negative'}">
                    ${formatCurrency(trade.pnl)}
                  </td>
                  <td>${trade.model}</td>
                  <td>${trade.confidence.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>🎯 Trading Insights</h2>
          <div style="line-height: 1.6;">
            <p><strong>Best Performing Symbol:</strong> ${mostProfitableSymbol.symbol} with ${formatCurrency(mostProfitableSymbol.totalPnL)} profit</p>
            <p><strong>Most Active Model:</strong> ${bestPerformingModel.name} executed ${bestPerformingModel.trades} trades</p>
            <p><strong>Trade Distribution:</strong> ${winningTrades.length} winning trades, ${losingTrades.length} losing trades</p>
            <p><strong>Average Win:</strong> ${winningTrades.length > 0 ? formatCurrency(winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length) : '$0.00'}</p>
            <p><strong>Average Loss:</strong> ${losingTrades.length > 0 ? formatCurrency(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length) : '$0.00'}</p>
          </div>
        </div>

        <div class="footer">
          <p>Generated by Red Sun Fx AI Trading System</p>
          <p>This report contains confidential trading data. Please keep it secure.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, reportData }: TradingReportRequest = await req.json();

    if (!email || !reportData) {
      return new Response(
        JSON.stringify({ error: "Email and report data are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const htmlContent = generateHTMLReport(reportData);

    const emailResponse = await resend.emails.send({
      from: "Red Sun Fx <reports@resend.dev>",
      to: [email],
      subject: `Red Sun Fx Daily Trading Report - ${new Date().toLocaleDateString()}`,
      html: htmlContent,
    });

    console.log("Trading report sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.data?.id,
        message: "Daily trading report sent successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-trading-report function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);