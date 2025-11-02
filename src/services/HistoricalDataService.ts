import { AlpacaAPI } from './AlpacaAPI';

interface HistoricalPrice {
  snapshotTimeUTC: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ProcessedCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20: number;
  ema12: number;
  ema26: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerLower: number;
  atr: number;
}

interface TechnicalIndicators {
  sma: number[];
  ema: number[];
  rsi: number[];
  macd: { macd: number[]; signal: number[]; histogram: number[] };
  bollinger: { upper: number[]; middle: number[]; lower: number[] };
  atr: number[];
}

export class HistoricalDataService {
  private alpacaAPI?: AlpacaAPI;
  private cachedData: Map<string, { [timeframe: string]: HistoricalPrice[] }> = new Map();

  constructor(alpacaAPI?: AlpacaAPI) {
    this.alpacaAPI = alpacaAPI;
  }

  async fetchAndCacheData(symbols: string[]): Promise<void> {
    console.log('Fetching historical data for ML training...');
    
    // Note: Alpaca API returns AlpacaBar[] which has different structure than HistoricalPrice
    // For now, we'll skip caching as the data structure needs conversion
    console.log('Historical data caching skipped - requires data structure conversion from Alpaca format');
  }

  getHistoricalData(symbol: string, timeframe: string = 'MINUTE_30'): HistoricalPrice[] {
    const symbolData = this.cachedData.get(symbol);
    return symbolData?.[timeframe] || [];
  }

  calculateTechnicalIndicators(prices: HistoricalPrice[], period: number = 14): TechnicalIndicators {
    if (prices.length < period) {
      // Return empty indicators if not enough data
      return {
        sma: [],
        ema: [],
        rsi: [],
        macd: { macd: [], signal: [], histogram: [] },
        bollinger: { upper: [], middle: [], lower: [] },
        atr: []
      };
    }

    const closes = prices.map(p => p.close);
    const highs = prices.map(p => p.high);
    const lows = prices.map(p => p.low);

    return {
      sma: this.calculateSMA(closes, period),
      ema: this.calculateEMA(closes, period),
      rsi: this.calculateRSI(closes, period),
      macd: this.calculateMACD(closes),
      bollinger: this.calculateBollingerBands(closes, period),
      atr: this.calculateATR(highs, lows, closes, period)
    };
  }

  private calculateSMA(values: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < values.length; i++) {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private calculateEMA(values: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    ema.push(sum / period);
    
    // Calculate remaining EMAs
    for (let i = period; i < values.length; i++) {
      ema.push((values[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier)));
    }
    
    return ema;
  }

  private calculateRSI(values: number[], period: number): number[] {
    const rsi: number[] = [];
    let gains = 0;
    let losses = 0;

    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = values[i] - values[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    rsi.push(100 - (100 / (1 + avgGain / avgLoss)));

    // Calculate RSI for remaining values
    for (let i = period + 1; i < values.length; i++) {
      const change = values[i] - values[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
    }

    return rsi;
  }

  private calculateMACD(values: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
    const ema12 = this.calculateEMA(values, 12);
    const ema26 = this.calculateEMA(values, 26);
    
    // MACD line
    const macd: number[] = [];
    const startIndex = 26 - 12; // Difference in periods
    
    for (let i = startIndex; i < ema12.length; i++) {
      macd.push(ema12[i] - ema26[i - startIndex]);
    }
    
    // Signal line (9-period EMA of MACD)
    const signal = this.calculateEMA(macd, 9);
    
    // Histogram
    const histogram: number[] = [];
    const signalStartIndex = macd.length - signal.length;
    
    for (let i = 0; i < signal.length; i++) {
      histogram.push(macd[signalStartIndex + i] - signal[i]);
    }

    return { macd, signal, histogram };
  }

  private calculateBollingerBands(values: number[], period: number): { upper: number[]; middle: number[]; lower: number[] } {
    const sma = this.calculateSMA(values, period);
    const upper: number[] = [];
    const middle = sma;
    const lower: number[] = [];

    for (let i = 0; i < sma.length; i++) {
      const dataIndex = i + period - 1;
      const slice = values.slice(dataIndex - period + 1, dataIndex + 1);
      
      // Calculate standard deviation
      const mean = sma[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      upper.push(mean + (2 * stdDev));
      lower.push(mean - (2 * stdDev));
    }

    return { upper, middle, lower };
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const trueRanges: number[] = [];
    
    // Calculate True Range for each period
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    // Calculate ATR as moving average of True Ranges
    return this.calculateSMA(trueRanges, period);
  }

  prepareMLFeatures(symbol: string, timeframe: string = 'MINUTE_30'): number[][] {
    const prices = this.getHistoricalData(symbol, timeframe);
    if (prices.length < 50) return []; // Need minimum data for meaningful features

    const indicators = this.calculateTechnicalIndicators(prices);
    const features: number[][] = [];

    // Prepare feature vectors for ML training
    const minLength = Math.min(
      indicators.sma.length,
      indicators.ema.length,
      indicators.rsi.length,
      indicators.macd.macd.length,
      indicators.bollinger.upper.length,
      indicators.atr.length
    );

    for (let i = 0; i < minLength; i++) {
      const priceIndex = prices.length - minLength + i;
      const price = prices[priceIndex];
      
      const featureVector = [
        price.open,
        price.high,
        price.low,
        price.close,
        price.volume || 0,
        indicators.sma[i],
        indicators.ema[i],
        indicators.rsi[i],
        indicators.macd.macd[i] || 0,
        indicators.macd.signal[i] || 0,
        indicators.macd.histogram[i] || 0,
        indicators.bollinger.upper[i],
        indicators.bollinger.middle[i],
        indicators.bollinger.lower[i],
        indicators.atr[i] || 0,
        // Price action features
        (price.close - price.open) / price.open, // Body percentage
        (price.high - price.low) / price.open,   // Range percentage
        (price.close - prices[Math.max(0, priceIndex - 1)].close) / prices[Math.max(0, priceIndex - 1)].close // Price change
      ];
      
      features.push(featureVector);
    }

    return features;
  }

  prepareMLTargets(symbol: string, timeframe: string = 'MINUTE_30', lookAhead: number = 5): number[] {
    const prices = this.getHistoricalData(symbol, timeframe);
    const targets: number[] = [];

    for (let i = 0; i < prices.length - lookAhead; i++) {
      const currentPrice = prices[i].close;
      const futurePrice = prices[i + lookAhead].close;
      const priceChange = (futurePrice - currentPrice) / currentPrice;
      
      // Convert to classification target: 1 (buy), 0 (hold), -1 (sell)
      if (priceChange > 0.002) targets.push(1);      // 0.2% threshold for buy
      else if (priceChange < -0.002) targets.push(-1); // -0.2% threshold for sell
      else targets.push(0);                            // Hold
    }

    return targets;
  }

  async getTrainingData(symbols: string[], maxCandles: number = 1000): Promise<Record<string, ProcessedCandle[]>> {
    // Generate simulated historical data for training since real API calls would be limited
    const result: Record<string, ProcessedCandle[]> = {};
    
    for (const symbol of symbols) {
      const candles: ProcessedCandle[] = [];
      const basePrice = this.getBasePrice(symbol);
      let currentPrice = basePrice;
      const now = Date.now();
      
      // Generate historical candles going backwards in time
      for (let i = maxCandles - 1; i >= 0; i--) {
        const timestamp = now - (i * 30 * 60 * 1000); // 30-minute intervals
        
        // Simulate realistic price movement
        const volatility = this.getSymbolVolatility(symbol);
        const trend = Math.sin(i * 0.01) * 0.0005; // Subtle trend component
        const noise = (Math.random() - 0.5) * volatility;
        const priceChange = trend + noise;
        
        currentPrice *= (1 + priceChange);
        
        const open = currentPrice;
        const high = currentPrice * (1 + Math.random() * volatility * 0.5);
        const low = currentPrice * (1 - Math.random() * volatility * 0.5);
        const close = low + (high - low) * Math.random();
        
        candles.push({
          timestamp,
          open,
          high,
          low,
          close,
          volume: 1000 + Math.random() * 5000,
          sma20: close, // Simplified for now
          ema12: close,
          ema26: close,
          rsi: 40 + Math.random() * 20,
          macd: Math.random() * 0.01 - 0.005,
          macdSignal: Math.random() * 0.01 - 0.005,
          bollingerUpper: close * 1.02,
          bollingerLower: close * 0.98,
          atr: close * volatility
        });
        
        currentPrice = close;
      }
      
      result[symbol] = candles;
    }
    
    return result;
  }

  private getBasePrice(symbol: string): number {
    const basePrices: Record<string, number> = {
      'USDNGN': 1600,
      'GBPUSD': 1.27,
      'USDJPY': 150,
      'EURNGN': 1800,
      'XAUUSD': 2650,
      'XAGUSD': 31,
      'USOIL': 75,
      'UKOIL': 78,
      'BLCO': 80,
      'XPTUSD': 950,
      'NVDA': 850,
      'AAPL': 220,
      'TSLA': 350,
      'MSFT': 420,
      'GOOGL': 170,
      'AMZN': 185,
      'EURUSD': 1.08,
      'AUDUSD': 0.65,
      'USDCAD': 1.39,
      'USDCHF': 0.87,
      'NZDUSD': 0.59,
      'WTI': 75,
      'NAS100': 19500,
      'SPX500': 5800,
      'GER40': 19000,
      'UK100': 8200,
      'BTCUSD': 95000,
      'ETHUSD': 3400,
      'BNBUSD': 650
    };
    
    return basePrices[symbol] || 100;
  }

  private getSymbolVolatility(symbol: string): number {
    const volatilities: Record<string, number> = {
      'USDNGN': 0.02,
      'GBPUSD': 0.008,
      'USDJPY': 0.006,
      'EURNGN': 0.025,
      'XAUUSD': 0.015,
      'XAGUSD': 0.025,
      'USOIL': 0.02,
      'UKOIL': 0.02,
      'BLCO': 0.02,
      'XPTUSD': 0.018,
      'NVDA': 0.03,
      'AAPL': 0.015,
      'TSLA': 0.04,
      'MSFT': 0.012,
      'GOOGL': 0.015,
      'AMZN': 0.02,
      'EURUSD': 0.005,
      'AUDUSD': 0.008,
      'USDCAD': 0.006,
      'USDCHF': 0.005,
      'NZDUSD': 0.009,
      'WTI': 0.02,
      'NAS100': 0.012,
      'SPX500': 0.01,
      'GER40': 0.012,
      'UK100': 0.011,
      'BTCUSD': 0.05,
      'ETHUSD': 0.06,
      'BNBUSD': 0.04
    };
    
    return volatilities[symbol] || 0.01;
  }

  getTrainingDataOld(symbols: string[], timeframe: string = 'MINUTE_30'): { features: number[][]; targets: number[]; symbols: string[] } {
    let allFeatures: number[][] = [];
    let allTargets: number[] = [];
    let allSymbols: string[] = [];

    for (const symbol of symbols) {
      const features = this.prepareMLFeatures(symbol, timeframe);
      const targets = this.prepareMLTargets(symbol, timeframe);
      
      // Ensure features and targets have matching lengths
      const minLength = Math.min(features.length, targets.length);
      
      if (minLength > 0) {
        allFeatures = allFeatures.concat(features.slice(0, minLength));
        allTargets = allTargets.concat(targets.slice(0, minLength));
        allSymbols = allSymbols.concat(Array(minLength).fill(symbol));
      }
    }

    console.log(`Prepared ML training data: ${allFeatures.length} samples from ${symbols.length} symbols`);
    return { features: allFeatures, targets: allTargets, symbols: allSymbols };
  }
}