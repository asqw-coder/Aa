import { supabase } from '@/integrations/supabase/client';
import { MLPrediction, MarketData } from '@/types/trading';

interface PredictionCache {
  prediction: MLPrediction;
  timestamp: number;
}

export class ProductionMLPredictor {
  private sessionId: string;
  private cache: Map<string, PredictionCache> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  private getCacheKey(symbol: string): string {
    return `${symbol}-${Math.floor(Date.now() / this.CACHE_TTL)}`;
  }

  private getCachedPrediction(symbol: string): MLPrediction | null {
    const key = this.getCacheKey(symbol);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`Using cached prediction for ${symbol}`);
      return cached.prediction;
    }
    
    // Clean up old cache entries
    this.cache.delete(key);
    return null;
  }

  private cachePrediction(symbol: string, prediction: MLPrediction): void {
    const key = this.getCacheKey(symbol);
    this.cache.set(key, { prediction, timestamp: Date.now() });
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generatePrediction(symbol: string, marketData?: MarketData): Promise<MLPrediction | null> {
    // Check cache first
    const cached = this.getCachedPrediction(symbol);
    if (cached) return cached;

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`Generating ML prediction for ${symbol} (attempt ${attempt}/${this.MAX_RETRIES})...`);
        
        const { data, error } = await supabase.functions.invoke('ml-prediction-engine', {
          body: {
            action: 'generate_prediction',
            symbol,
            sessionId: this.sessionId,
            marketData
          }
        });

        if (error) {
          throw new Error(`ML prediction error: ${error.message || JSON.stringify(error)}`);
        }

        if (!data || !data.success || !data.prediction) {
          throw new Error('No valid prediction returned from ML engine');
        }

        const prediction: MLPrediction = {
          symbol: data.prediction.symbol,
          direction: data.prediction.direction,
          confidence: data.prediction.confidence,
          targetPrice: data.prediction.target_price,
          stopLoss: data.prediction.stop_loss,
          takeProfit: data.prediction.take_profit,
          timeframe: data.prediction.timeframe || '30min',
          model: data.prediction.model,
          features: data.prediction.features || {}
        };

        // Cache successful prediction
        this.cachePrediction(symbol, prediction);
        
        console.log(`ML prediction generated successfully for ${symbol}`);
        return prediction;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`ML prediction attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < this.MAX_RETRIES) {
          await this.sleep(this.RETRY_DELAY * attempt);
        }
      }
    }

    // All retries failed - return fallback
    console.error(`All ML prediction attempts failed for ${symbol}, using fallback`);
    return this.getFallbackPrediction(symbol, lastError);
  }

  private getFallbackPrediction(symbol: string, error: Error | null): MLPrediction {
    console.warn(`Generating fallback prediction for ${symbol}`);
    
    return {
      model: 'fallback',
      symbol,
      direction: 'HOLD' as const,
      confidence: 0.3,
      targetPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      timeframe: '1h',
      features: {
        fallback: true,
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }

  private validateMarketData(marketData: MarketData): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for required fields
    if (!marketData.symbol) issues.push('Missing symbol');
    if (!marketData.bid || marketData.bid <= 0) issues.push('Invalid bid price');
    if (!marketData.ask || marketData.ask <= 0) issues.push('Invalid ask price');
    if (marketData.bid > marketData.ask) issues.push('Bid > Ask (crossed market)');
    
    // Check for outliers (bid/ask spread > 5%)
    const spread = ((marketData.ask - marketData.bid) / marketData.bid) * 100;
    if (spread > 5) issues.push(`Unusual spread: ${spread.toFixed(2)}%`);
    
    // Check timestamp
    const now = new Date();
    const dataTime = new Date(marketData.timestamp);
    const ageMinutes = (now.getTime() - dataTime.getTime()) / 60000;
    if (ageMinutes > 5) issues.push(`Stale data: ${ageMinutes.toFixed(1)} minutes old`);

    return { valid: issues.length === 0, issues };
  }

  async updatePriceData(marketData: MarketData): Promise<void> {
    try {
      // Validate data quality
      const validation = this.validateMarketData(marketData);
      
      // Store market data for ML training
      const { error } = await supabase
        .from('market_data_cache')
        .insert({
          symbol: marketData.symbol,
          bid: marketData.bid,
          ask: marketData.ask,
          volume: marketData.volume,
          timestamp: marketData.timestamp
        });

      if (error && !error.message.includes('duplicate')) {
        console.error('Error storing market data:', error);
      }

      // Log data quality metrics
      if (!validation.valid) {
        console.warn(`Data quality issues for ${marketData.symbol}:`, validation.issues);
        
        await supabase.from('data_quality_metrics').insert({
          source: 'market_data',
          total_records: 1,
          valid_records: 0,
          invalid_records: 1,
          quality_score: 0,
          issues: { symbol: marketData.symbol, problems: validation.issues }
        }).then(result => {
          if (result.error) console.error('Error logging data quality:', result.error);
        });
      }
    } catch (error) {
      console.error('Error updating price data:', error);
    }
  }

  async trainModels(): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('ml-prediction-engine', {
        body: {
          action: 'train_models',
          sessionId: this.sessionId
        }
      });

      if (error) {
        console.error('Model training error:', error);
        return;
      }

      console.log('Model training completed:', data);
    } catch (error) {
      console.error('Error training models:', error);
    }
  }

  async getModelPerformance(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ml_models')
        .select('*')
        .order('accuracy', { ascending: false });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching model performance:', error);
      return [];
    }
  }
}