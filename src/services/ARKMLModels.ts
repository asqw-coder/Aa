/**
 * ARK ML Models - Real machine learning model implementations
 */

import { MLPrediction, MarketData } from '../types/trading';
import { supabase } from '@/integrations/supabase/client';

export class ARKMLModels {
  private static instance: ARKMLModels;
  private sessionId: string;

  private constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  static getInstance(sessionId: string): ARKMLModels {
    if (!ARKMLModels.instance || ARKMLModels.instance.sessionId !== sessionId) {
      ARKMLModels.instance = new ARKMLModels(sessionId);
    }
    return ARKMLModels.instance;
  }

  /**
   * Get LSTM prediction via edge function
   */
  async getLSTMPrediction(symbol: string, marketData: MarketData[]): Promise<MLPrediction | null> {
    try {
      const { data, error } = await supabase.functions.invoke('ml-prediction-engine', {
        body: {
          action: 'predict',
          model_type: 'lstm',
          symbol,
          market_data: marketData.slice(-100), // Last 100 data points
          session_id: this.sessionId
        }
      });

      if (error) throw error;
      return data.prediction;
    } catch (error) {
      console.error('LSTM prediction failed:', error);
      return null;
    }
  }

  /**
   * Get Transformer prediction via edge function
   */
  async getTransformerPrediction(symbol: string, marketData: MarketData[]): Promise<MLPrediction | null> {
    try {
      const { data, error } = await supabase.functions.invoke('ml-prediction-engine', {
        body: {
          action: 'predict',
          model_type: 'transformer',
          symbol,
          market_data: marketData.slice(-100),
          session_id: this.sessionId
        }
      });

      if (error) throw error;
      return data.prediction;
    } catch (error) {
      console.error('Transformer prediction failed:', error);
      return null;
    }
  }

  /**
   * Get XGBoost prediction via edge function
   */
  async getXGBoostPrediction(symbol: string, marketData: MarketData[]): Promise<MLPrediction | null> {
    try {
      const { data, error } = await supabase.functions.invoke('ml-prediction-engine', {
        body: {
          action: 'predict',
          model_type: 'xgboost',
          symbol,
          market_data: marketData.slice(-100),
          session_id: this.sessionId
        }
      });

      if (error) throw error;
      return data.prediction;
    } catch (error) {
      console.error('XGBoost prediction failed:', error);
      return null;
    }
  }

  /**
   * Get Reinforcement Learning prediction via edge function
   */
  async getRLPrediction(symbol: string, marketData: MarketData[], sessionId: string): Promise<MLPrediction | null> {
    try {
      const { data, error } = await supabase.functions.invoke('ml-prediction-engine', {
        body: {
          action: 'predict',
          model_type: 'reinforcement_learning',
          symbol,
          market_data: marketData.slice(-100),
          session_id: sessionId
        }
      });

      if (error) throw error;
      return data.prediction;
    } catch (error) {
      console.error('RL prediction failed:', error);
      return null;
    }
  }

  /**
   * Train all models using user's selected symbols
   */
  async trainAllModels(userId?: string): Promise<void> {
    console.log('ARK ML: Starting training for all models');

    // Fetch user's trading symbols from database
    let symbols: string[] = [];
    
    if (userId) {
      try {
        const { data } = await supabase
          .from('user_trading_symbols')
          .select('symbols')
          .eq('user_id', userId)
          .single();

        symbols = data?.symbols || [];
      } catch (error) {
        console.error('Failed to fetch user symbols:', error);
      }
    }

    // Fallback to default symbols if none found
    if (symbols.length === 0) {
      symbols = ['EUR_USD', 'GBP_USD', 'USD_JPY', 'BTC_USD', 'ETH_USD', 'XAU_USD'];
    }

    console.log(`ARK ML: Training models for ${symbols.length} symbols:`, symbols);

    for (const symbol of symbols) {
      await this.trainModel('lstm', symbol);
      await this.trainModel('transformer', symbol);
      await this.trainModel('xgboost', symbol);
      await this.trainModel('reinforcement_learning', symbol);
    }

    console.log('ARK ML: Training completed for all models');
  }

  /**
   * Retrain model with transfer learning
   */
  async retrainModelWithTransferLearning(
    modelType: string,
    symbol: string,
    mode: 'full' | 'fine_tune' | 'incremental' = 'fine_tune'
  ): Promise<void> {
    console.log(`ARK ML: Initiating transfer learning [${mode}] for ${modelType} ${symbol}`);
    
    // Get current active model
    const { data: currentModel } = await supabase
      .from('ml_models')
      .select('id')
      .eq('model_type', modelType)
      .eq('status', 'active')
      .single();
    
    if (!currentModel) {
      console.warn('No active model found, training from scratch');
      mode = 'full';
    }
    
    // Get active weights
    const { data: activeWeights } = await supabase
      .from('model_weights')
      .select('id')
      .eq('model_id', currentModel?.id)
      .eq('is_active', true)
      .single();
    
    // Fetch historical data
    const { data: historicalData } = await supabase
      .from('market_data_cache')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: true })
      .limit(10000);
    
    if (!historicalData || historicalData.length < 100) {
      throw new Error(`Insufficient data for training ${symbol}`);
    }
    
    // Invoke training with transfer learning
    const { data, error } = await supabase.functions.invoke('ark-model-training', {
      body: {
        model_type: modelType,
        symbol,
        model_id: currentModel?.id,
        training_mode: mode,
        previous_weights_id: activeWeights?.id,
        historical_data: historicalData,
        hyperparameters: {
          epochs: mode === 'full' ? 100 : mode === 'fine_tune' ? 30 : 20,
          learning_rate: mode === 'full' ? 0.001 : 0.0001,
          batch_size: 32,
          sequence_length: 60
        }
      }
    });
    
    if (error) throw error;
    console.log(`ARK ML: Transfer learning initiated: ${modelType} ${symbol} [${mode}]`);
  }

  /**
   * Train individual model
   */
  private async trainModel(modelType: string, symbol: string): Promise<void> {
    try {
      // Fetch historical market data
      const { data: historicalData } = await supabase
        .from('market_data_cache')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: true })
        .limit(10000);

      if (!historicalData || historicalData.length < 100) {
        console.warn(`Insufficient data for ${modelType} training on ${symbol}`);
        return;
      }

      // Create model record
      const { data: modelRecord } = await supabase
        .from('ml_models')
        .insert({
          model_name: `${modelType}_${symbol}`,
          model_type: modelType,
          version: `v${Date.now()}`,
          status: 'training'
        })
        .select()
        .single();

      if (!modelRecord) throw new Error('Failed to create model record');

      // Create training history record
      const { data: trainingHistory } = await supabase
        .from('ark_training_history')
        .insert({
          model_id: modelRecord.id,
          status: 'training',
          hyperparameters: {
            epochs: 100,
            batch_size: 32,
            learning_rate: 0.001
          }
        })
        .select()
        .single();

      // Invoke training edge function
      const { data, error } = await supabase.functions.invoke('ark-model-training', {
        body: {
          model_type: modelType,
          symbol,
          model_id: modelRecord.id,
          training_history_id: trainingHistory?.id,
          historical_data: historicalData,
          hyperparameters: {
            epochs: 100,
            batch_size: 32,
            learning_rate: 0.001,
            sequence_length: 60
          }
        }
      });

      if (error) throw error;

      console.log(`ARK ML: ${modelType} training initiated for ${symbol}`);
    } catch (error) {
      console.error(`ARK ML: Failed to train ${modelType}:`, error);
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelPerformance(modelType?: string): Promise<any[]> {
    let query = supabase
      .from('ark_model_performance')
      .select(`
        *,
        ml_models (
          model_name,
          model_type,
          version
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (modelType) {
      query = query.eq('ml_models.model_type', modelType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get model performance:', error);
      return [];
    }

    return data || [];
  }
}
