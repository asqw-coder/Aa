/**
 * ARK Sentiment Analysis Engine
 * Independent market sentiment analysis without external dependencies
 */

import { MarketData } from '../types/trading';
import { supabase } from '@/integrations/supabase/client';

interface SentimentAnalysis {
  symbol: string;
  timestamp: string;
  price_action_sentiment: number;
  volume_sentiment: number;
  volatility_sentiment: number;
  correlation_sentiment: number;
  overall_sentiment: number;
  fear_greed_index: number;
  market_strength: number;
  confidence_score: number;
}

export class ARKSentimentEngine {
  private static instance: ARKSentimentEngine;

  private constructor() {}

  static getInstance(): ARKSentimentEngine {
    if (!ARKSentimentEngine.instance) {
      ARKSentimentEngine.instance = new ARKSentimentEngine();
    }
    return ARKSentimentEngine.instance;
  }

  /**
   * Perform comprehensive sentiment analysis
   */
  async analyzeSentiment(symbol: string, marketData: MarketData[]): Promise<SentimentAnalysis> {
    if (marketData.length < 20) {
      return this.getDefaultSentiment(symbol);
    }

    const priceActionSentiment = this.analyzePriceAction(marketData);
    const volumeSentiment = this.analyzeVolume(marketData);
    const volatilitySentiment = this.analyzeVolatility(marketData);
    const correlationSentiment = await this.analyzeCorrelations(symbol, marketData);

    // Calculate overall sentiment (weighted average)
    const overallSentiment = 
      priceActionSentiment * 0.35 +
      volumeSentiment * 0.25 +
      volatilitySentiment * 0.20 +
      correlationSentiment * 0.20;

    const fearGreedIndex = this.calculateFearGreedIndex(
      priceActionSentiment,
      volumeSentiment,
      volatilitySentiment
    );

    const marketStrength = this.calculateMarketStrength(marketData);
    const confidenceScore = this.calculateConfidence(marketData);

    const analysis: SentimentAnalysis = {
      symbol,
      timestamp: new Date().toISOString(),
      price_action_sentiment: priceActionSentiment,
      volume_sentiment: volumeSentiment,
      volatility_sentiment: volatilitySentiment,
      correlation_sentiment: correlationSentiment,
      overall_sentiment: overallSentiment,
      fear_greed_index: fearGreedIndex,
      market_strength: marketStrength,
      confidence_score: confidenceScore
    };

    // Store sentiment analysis
    await this.storeSentiment(analysis);

    return analysis;
  }

  /**
   * Analyze price action patterns
   */
  private analyzePriceAction(marketData: MarketData[]): number {
    const prices = marketData.map(d => (d.bid + d.ask) / 2);
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);

    // Calculate momentum
    const shortTermMomentum = this.calculateMomentum(prices.slice(-5));
    const mediumTermMomentum = this.calculateMomentum(prices.slice(-14));
    const longTermMomentum = this.calculateMomentum(prices.slice(-30));

    // Trend strength using linear regression
    const trendStrength = this.calculateTrendStrength(prices);

    // Price pattern detection
    const patterns = this.detectPatterns(prices);

    // Combine into sentiment score (-1 to 1)
    let sentiment = 
      shortTermMomentum * 0.4 +
      mediumTermMomentum * 0.3 +
      longTermMomentum * 0.2 +
      trendStrength * 0.1;

    // Apply pattern modifiers
    if (patterns.includes('double_top')) sentiment -= 0.2;
    if (patterns.includes('double_bottom')) sentiment += 0.2;
    if (patterns.includes('head_shoulders')) sentiment -= 0.3;
    if (patterns.includes('inverse_head_shoulders')) sentiment += 0.3;

    return Math.max(-1, Math.min(1, sentiment));
  }

  /**
   * Analyze volume patterns
   */
  private analyzeVolume(marketData: MarketData[]): number {
    const volumes = marketData.map(d => d.volume || 0).filter(v => v > 0);
    if (volumes.length < 10) return 0;

    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;

    // Volume trend
    const volumeRatio = recentVolume / avgVolume;
    
    // Price-volume correlation
    const prices = marketData.slice(-volumes.length).map(d => (d.bid + d.ask) / 2);
    const priceChanges = prices.slice(1).map((p, i) => p - prices[i]);
    const volumeChanges = volumes.slice(1).map((v, i) => v - volumes[i]);
    
    const correlation = this.calculateCorrelation(priceChanges, volumeChanges);

    // Positive correlation + increasing volume = bullish
    // Negative correlation + increasing volume = bearish
    let sentiment = correlation * (volumeRatio - 1);

    return Math.max(-1, Math.min(1, sentiment));
  }

  /**
   * Analyze market volatility
   */
  private analyzeVolatility(marketData: MarketData[]): number {
    const prices = marketData.map(d => (d.bid + d.ask) / 2);
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);

    // Calculate volatility (standard deviation of returns)
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // Historical volatility comparison
    const recentVol = Math.sqrt(
      returns.slice(-5).reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / 5
    );

    // Higher than normal volatility = uncertainty (negative sentiment)
    // Lower than normal volatility = stability (positive sentiment)
    const volRatio = recentVol / volatility;
    const sentiment = 1 - Math.min(volRatio, 2) / 2;

    return Math.max(-1, Math.min(1, sentiment * 2 - 1));
  }

  /**
   * Analyze cross-asset correlations
   */
  private async analyzeCorrelations(symbol: string, marketData: MarketData[]): Promise<number> {
    // Get related symbols data
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'GOLD', 'SILVER'];
    const relatedSymbols = symbols.filter(s => s !== symbol).slice(0, 3);

    const correlations: number[] = [];

    for (const relatedSymbol of relatedSymbols) {
      const { data: relatedData } = await supabase
        .from('market_data_cache')
        .select('*')
        .eq('symbol', relatedSymbol)
        .order('timestamp', { ascending: false })
        .limit(marketData.length);

      if (relatedData && relatedData.length >= 10) {
        const prices1 = marketData.map(d => (d.bid + d.ask) / 2);
        const prices2 = relatedData.map((d: any) => (d.bid + d.ask) / 2);
        
        const minLen = Math.min(prices1.length, prices2.length);
        const corr = this.calculateCorrelation(
          prices1.slice(-minLen),
          prices2.slice(-minLen)
        );
        
        correlations.push(corr);
      }
    }

    if (correlations.length === 0) return 0;

    // Average correlation strength
    const avgCorr = correlations.reduce((a, b) => a + b, 0) / correlations.length;
    
    // Strong positive correlation = market moving together (neutral to bullish)
    // Strong negative correlation = divergence (bearish)
    return avgCorr * 0.5; // Scale down the impact
  }

  /**
   * Calculate Fear & Greed Index (0-100)
   */
  private calculateFearGreedIndex(
    priceAction: number,
    volume: number,
    volatility: number
  ): number {
    // Convert sentiment scores to 0-100 scale
    const priceScore = (priceAction + 1) * 50;
    const volumeScore = (volume + 1) * 50;
    const volatilityScore = (1 - volatility) * 50; // Invert volatility

    const index = (priceScore * 0.5 + volumeScore * 0.3 + volatilityScore * 0.2);
    
    return Math.max(0, Math.min(100, index));
  }

  /**
   * Calculate market strength (0-1)
   */
  private calculateMarketStrength(marketData: MarketData[]): number {
    const prices = marketData.map(d => (d.bid + d.ask) / 2);
    
    // Trend consistency
    const trendStrength = Math.abs(this.calculateTrendStrength(prices));
    
    // Volume consistency
    const volumes = marketData.map(d => d.volume || 0).filter(v => v > 0);
    const volumeCV = volumes.length > 0 ? 
      this.calculateCV(volumes) : 0.5;
    
    // Price stability
    const priceCV = this.calculateCV(prices);
    
    const strength = trendStrength * 0.5 + (1 - volumeCV) * 0.3 + (1 - priceCV) * 0.2;
    
    return Math.max(0, Math.min(1, strength));
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(marketData: MarketData[]): number {
    const dataQuality = Math.min(marketData.length / 100, 1);
    const recentDataWeight = marketData.slice(-20).length / 20;
    
    return dataQuality * 0.6 + recentDataWeight * 0.4;
  }

  // Helper methods

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 2) return 0;
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    return Math.max(-1, Math.min(1, avgReturn * 100)); // Scale by 100
  }

  private calculateTrendStrength(prices: number[]): number {
    if (prices.length < 3) return 0;
    
    // Linear regression
    const n = prices.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = prices;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgPrice = sumY / n;
    
    // Normalize slope by average price
    return Math.max(-1, Math.min(1, slope / avgPrice * 100));
  }

  private detectPatterns(prices: number[]): string[] {
    const patterns: string[] = [];
    
    if (prices.length < 10) return patterns;
    
    // Simple pattern detection
    const recent = prices.slice(-10);
    const max1 = Math.max(...recent.slice(0, 5));
    const max2 = Math.max(...recent.slice(5));
    const min1 = Math.min(...recent.slice(0, 5));
    const min2 = Math.min(...recent.slice(5));
    
    // Double top
    if (Math.abs(max1 - max2) / max1 < 0.02 && recent[recent.length - 1] < max2) {
      patterns.push('double_top');
    }
    
    // Double bottom
    if (Math.abs(min1 - min2) / min1 < 0.02 && recent[recent.length - 1] > min2) {
      patterns.push('double_bottom');
    }
    
    return patterns;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateCV(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 0;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return stdDev / mean;
  }

  private getDefaultSentiment(symbol: string): SentimentAnalysis {
    return {
      symbol,
      timestamp: new Date().toISOString(),
      price_action_sentiment: 0,
      volume_sentiment: 0,
      volatility_sentiment: 0,
      correlation_sentiment: 0,
      overall_sentiment: 0,
      fear_greed_index: 50,
      market_strength: 0.5,
      confidence_score: 0.1
    };
  }

  private async storeSentiment(analysis: SentimentAnalysis): Promise<void> {
    try {
      await supabase.from('ark_sentiment_analysis').insert(analysis);
    } catch (error) {
      console.error('Failed to store sentiment:', error);
    }
  }

  /**
   * Get historical sentiment for a symbol
   */
  async getHistoricalSentiment(symbol: string, days: number = 7): Promise<SentimentAnalysis[]> {
    const { data, error } = await supabase
      .from('ark_sentiment_analysis')
      .select('*')
      .eq('symbol', symbol)
      .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Failed to get historical sentiment:', error);
      return [];
    }

    return data || [];
  }
}
