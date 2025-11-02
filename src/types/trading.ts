export interface CapitalConfig {
  apiUrl: string;
  dataUrl: string;
  streamingUrl: string;
  apiKey: string;
  secretKey: string;
  environment: 'paper' | 'live';
}

export interface Position {
  dealId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: string;
}

export interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: string;
  volume?: number;
}

export interface MLPrediction {
  symbol: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  takeProfit: number;
  timeframe: string;
  model?: string;
  features: Record<string, any>; // Changed from number to any to support various feature types
}

export interface RiskMetrics {
  currentDrawdown: number;
  dailyPnL: number;
  totalRisk: number;
  maxPositionSize: number;
  allowedRisk: number;
  portfolioValue: number;
}

export interface TradingSignal {
  symbol: string;
  action: 'BUY' | 'SELL';
  direction: 'BUY' | 'SELL';
  size: number;
  price: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  reasoning: string;
  timestamp: string;
}

export interface DailyReport {
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
}