/**
 * ARK (Advanced Reasoning & Knowledge) Core AI System
 * Independent AI engine for trading analysis and decision-making
 */

import { MLPrediction, TradingSignal, DailyReport, RiskMetrics, MarketData } from '../types/trading';
import { supabase } from '@/integrations/supabase/client';
import { ARKSentimentEngine } from './ARKSentimentEngine';
import { ARKMLModels } from './ARKMLModels';
import { StorageManager } from './StorageManager';

interface ARKState {
  confidence: number;
  aggression: number;
  riskTolerance: number;
  learningRate: number;
  explorationRate: number;
  performanceScore: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  adaptationWeight: number;
  marketRegime: 'bullish' | 'bearish' | 'neutral' | 'volatile';
}

interface ARKDecision {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  modelPredictions: MLPrediction[];
  ensembleWeights: number[];
  sentimentAnalysis: any;
  riskAssessment: any;
  reasoning: string;
}

interface PerformanceMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
}

export class ARKCore {
  private static instance: ARKCore;
  private arkState: ARKState;
  private sentimentEngine: ARKSentimentEngine;
  private mlModels: ARKMLModels;
  private storageManager: StorageManager;
  private sessionId: string;

  private constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.arkState = {
      confidence: 0.6,
      aggression: 0.3,
      riskTolerance: 0.4,
      learningRate: 0.001,
      explorationRate: 0.1,
      performanceScore: 0.0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      adaptationWeight: 1.0,
      marketRegime: 'neutral'
    };

    this.sentimentEngine = ARKSentimentEngine.getInstance();
    this.mlModels = ARKMLModels.getInstance(sessionId);
    this.storageManager = StorageManager.getInstance();
    
    this.loadPreviousState();
  }

  static getInstance(sessionId: string): ARKCore {
    if (!ARKCore.instance || ARKCore.instance.sessionId !== sessionId) {
      ARKCore.instance = new ARKCore(sessionId);
    }
    return ARKCore.instance;
  }

  private async loadPreviousState(): Promise<void> {
    try {
      const result = await this.storageManager.retrieve(`ark/state/${this.sessionId}.json`);
      if (result.success && result.content) {
        const savedState = JSON.parse(result.content);
        this.arkState = { ...this.arkState, ...savedState };
        console.log('ARK: Loaded previous state');
      }
    } catch (error) {
      console.log('ARK: Starting with fresh state');
    }
  }

  private async saveState(): Promise<void> {
    try {
      await this.storageManager.store({
        path: `ark/state/${this.sessionId}.json`,
        content: JSON.stringify(this.arkState),
        contentType: 'application/json',
        metadata: { sessionId: this.sessionId, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('ARK: Failed to save state:', error);
    }
  }

  /**
   * Integrate with CentralAI for enhanced decision making
   */
  private async integrateWithCentralAI(
    prediction: MLPrediction,
    sentiment: any,
    riskMetrics: RiskMetrics
  ): Promise<{ adjustedConfidence: number; recommendation: string }> {
    try {
      // Get CentralAI's assessment
      const { data, error } = await supabase.functions.invoke('trading-engine', {
        body: {
          action: 'ai_assessment',
          prediction,
          sentiment,
          riskMetrics,
          arkState: this.arkState
        }
      });

      if (error || !data) {
        console.warn('CentralAI integration failed, using ARK-only decision');
        return {
          adjustedConfidence: prediction.confidence * this.arkState.confidence,
          recommendation: 'ARK_ONLY'
        };
      }

      return {
        adjustedConfidence: data.adjustedConfidence || prediction.confidence,
        recommendation: data.recommendation || 'PROCEED'
      };
    } catch (error) {
      console.error('CentralAI integration error:', error);
      return {
        adjustedConfidence: prediction.confidence * this.arkState.confidence,
        recommendation: 'ARK_ONLY'
      };
    }
  }

  /**
   * Analyze market conditions using multi-model ensemble with CentralAI integration
   */
  public async analyzeMarket(
    symbol: string,
    marketData: MarketData[],
    riskMetrics: RiskMetrics
  ): Promise<ARKDecision> {
    console.log(`ARK: Analyzing market for ${symbol}`);

    // Get sentiment analysis
    const sentiment = await this.sentimentEngine.analyzeSentiment(symbol, marketData);

    // Get predictions from all ML models
    const lstmPrediction = await this.mlModels.getLSTMPrediction(symbol, marketData);
    const transformerPrediction = await this.mlModels.getTransformerPrediction(symbol, marketData);
    const xgboostPrediction = await this.mlModels.getXGBoostPrediction(symbol, marketData);
    const rlPrediction = await this.mlModels.getRLPrediction(symbol, marketData, this.sessionId);

    const predictions = [lstmPrediction, transformerPrediction, xgboostPrediction, rlPrediction]
      .filter(p => p !== null) as MLPrediction[];

    // Detect market regime
    this.detectMarketRegime(marketData, sentiment);

    // Calculate dynamic ensemble weights based on recent performance
    const ensembleWeights = await this.calculateEnsembleWeights(predictions);

    // Make final decision using weighted ensemble
    const finalPrediction = this.makeEnsembleDecision(predictions, ensembleWeights, sentiment);

    // Risk assessment
    const riskAssessment = this.assessRisk(finalPrediction, riskMetrics, sentiment);

    // Integrate with CentralAI for final validation
    const centralAIAssessment = await this.integrateWithCentralAI(finalPrediction, sentiment, riskMetrics);

    // Create decision with CentralAI integration
    const decision: ARKDecision = {
      symbol,
      action: finalPrediction.direction === 'HOLD' ? 'HOLD' : finalPrediction.direction,
      confidence: centralAIAssessment.adjustedConfidence,
      modelPredictions: predictions,
      ensembleWeights,
      sentimentAnalysis: sentiment,
      riskAssessment: {
        ...riskAssessment,
        centralAIRecommendation: centralAIAssessment.recommendation
      },
      reasoning: this.generateReasoning(predictions, sentiment, riskAssessment) + 
                 ` [CentralAI: ${centralAIAssessment.recommendation}]`
    };

    // Log decision to audit trail
    await this.logDecision(decision);

    return decision;
  }

  private detectMarketRegime(marketData: MarketData[], sentiment: any): void {
    if (marketData.length < 20) {
      this.arkState.marketRegime = 'neutral';
      return;
    }

    const prices = marketData.slice(-20).map(d => (d.bid + d.ask) / 2);
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = Math.sqrt(
      returns.map(r => Math.pow(r - avgReturn, 2)).reduce((a, b) => a + b, 0) / returns.length
    );

    // Classify regime
    if (volatility > 0.02) {
      this.arkState.marketRegime = 'volatile';
    } else if (avgReturn > 0.001 && sentiment.overall_sentiment > 0.5) {
      this.arkState.marketRegime = 'bullish';
    } else if (avgReturn < -0.001 && sentiment.overall_sentiment < -0.5) {
      this.arkState.marketRegime = 'bearish';
    } else {
      this.arkState.marketRegime = 'neutral';
    }

    console.log(`ARK: Market regime detected as ${this.arkState.marketRegime}`);
  }

  private async calculateEnsembleWeights(predictions: MLPrediction[]): Promise<number[]> {
    // Get recent model performance
    const { data: performanceData } = await supabase
      .from('ark_model_performance')
      .select('model_id, accuracy, sharpe_ratio, win_rate')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(100);

    if (!performanceData || performanceData.length === 0) {
      // Default equal weights
      return predictions.map(() => 1.0 / predictions.length);
    }

    // Calculate performance scores for each model
    const modelScores = new Map<string, number>();
    
    performanceData.forEach(perf => {
      const score = (perf.accuracy || 0.5) * 0.4 + 
                    (perf.sharpe_ratio || 0) * 0.3 + 
                    (perf.win_rate || 0.5) * 0.3;
      
      const existing = modelScores.get(perf.model_id) || 0;
      modelScores.set(perf.model_id, existing + score);
    });

    // Normalize weights with softmax
    const weights = predictions.map(pred => {
      const score = modelScores.get(pred.model || 'unknown') || 0.5;
      return Math.exp(score);
    });

    const sumWeights = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / sumWeights);
  }

  private makeEnsembleDecision(
    predictions: MLPrediction[],
    weights: number[],
    sentiment: any
  ): MLPrediction {
    // Weighted voting for direction
    let buyScore = 0;
    let sellScore = 0;
    
    predictions.forEach((pred, i) => {
      const weight = weights[i];
      if (pred.direction === 'BUY') {
        buyScore += weight * pred.confidence;
      } else if (pred.direction === 'SELL') {
        sellScore += weight * pred.confidence;
      }
    });

    // Apply sentiment modifier
    const sentimentModifier = sentiment.overall_sentiment;
    buyScore *= (1 + sentimentModifier * 0.2);
    sellScore *= (1 - sentimentModifier * 0.2);

    // Determine final direction
    let finalDirection: 'BUY' | 'SELL' | 'HOLD';
    let finalConfidence: number;

    const threshold = 0.6; // Minimum confidence to act
    
    if (buyScore > threshold && buyScore > sellScore) {
      finalDirection = 'BUY';
      finalConfidence = buyScore;
    } else if (sellScore > threshold && sellScore > buyScore) {
      finalDirection = 'SELL';
      finalConfidence = sellScore;
    } else {
      finalDirection = 'HOLD';
      finalConfidence = Math.max(buyScore, sellScore);
    }

    // Weighted average for prices
    const targetPrice = predictions.reduce((sum, pred, i) => 
      sum + pred.targetPrice * weights[i], 0);
    const stopLoss = predictions.reduce((sum, pred, i) => 
      sum + pred.stopLoss * weights[i], 0);
    const takeProfit = predictions.reduce((sum, pred, i) => 
      sum + pred.takeProfit * weights[i], 0);

    return {
      symbol: predictions[0].symbol,
      direction: finalDirection,
      confidence: finalConfidence,
      targetPrice,
      stopLoss,
      takeProfit,
      timeframe: '1h',
      model: 'ARK-Ensemble',
      features: { 
        ensembleWeights: weights,
        sentiment: sentimentModifier,
        marketRegime: this.arkState.marketRegime
      }
    };
  }

  private assessRisk(
    prediction: MLPrediction,
    riskMetrics: RiskMetrics,
    sentiment: any
  ): any {
    const riskScore = 
      (riskMetrics.currentDrawdown / 0.2) * 0.3 +
      (1 - riskMetrics.portfolioValue / (riskMetrics.portfolioValue + riskMetrics.dailyPnL)) * 0.2 +
      Math.abs(sentiment.volatility_sentiment) * 0.3 +
      (1 - prediction.confidence) * 0.2;

    return {
      riskScore,
      maxPositionSize: this.calculateMaxPositionSize(riskScore, riskMetrics),
      stopLossDistance: Math.abs(prediction.targetPrice - prediction.stopLoss) / prediction.targetPrice,
      riskRewardRatio: Math.abs(prediction.takeProfit - prediction.targetPrice) / 
                       Math.abs(prediction.targetPrice - prediction.stopLoss),
      recommendation: riskScore > 0.7 ? 'HIGH_RISK' : riskScore > 0.4 ? 'MEDIUM_RISK' : 'LOW_RISK'
    };
  }

  private calculateMaxPositionSize(riskScore: number, riskMetrics: RiskMetrics): number {
    const baseSize = riskMetrics.maxPositionSize;
    const riskAdjustment = 1 - (riskScore * 0.5); // Reduce size as risk increases
    return baseSize * riskAdjustment * this.arkState.riskTolerance;
  }

  private generateReasoning(predictions: MLPrediction[], sentiment: any, risk: any): string {
    const modelCount = predictions.length;
    const buyCount = predictions.filter(p => p.direction === 'BUY').length;
    const sellCount = predictions.filter(p => p.direction === 'SELL').length;
    
    let reasoning = `ARK analyzed ${modelCount} ML models. `;
    reasoning += `${buyCount} models suggest BUY, ${sellCount} suggest SELL. `;
    reasoning += `Market sentiment: ${sentiment.overall_sentiment > 0 ? 'Positive' : sentiment.overall_sentiment < 0 ? 'Negative' : 'Neutral'}. `;
    reasoning += `Current regime: ${this.arkState.marketRegime}. `;
    reasoning += `Risk level: ${risk.recommendation}. `;
    reasoning += `Risk/Reward ratio: ${risk.riskRewardRatio.toFixed(2)}:1.`;
    
    return reasoning;
  }

  private async logDecision(decision: ARKDecision): Promise<void> {
    try {
      const { error } = await supabase.from('ark_decision_audit').insert({
        symbol: decision.symbol,
        decision_type: decision.action,
        model_predictions: decision.modelPredictions as any,
        ensemble_weights: decision.ensembleWeights as any,
        final_prediction: {
          action: decision.action,
          confidence: decision.confidence,
          reasoning: decision.reasoning
        } as any,
        sentiment_analysis: decision.sentimentAnalysis as any,
        risk_assessment: decision.riskAssessment as any,
        confidence_score: decision.confidence
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('ARK: Failed to log decision:', error);
    }
  }

  /**
   * Learn from trading outcomes
   */
  public async learnFromOutcome(
    symbol: string,
    prediction: MLPrediction,
    actualOutcome: { pnl: number; success: boolean }
  ): Promise<void> {
    // Update consecutive wins/losses
    if (actualOutcome.success) {
      this.arkState.consecutiveWins++;
      this.arkState.consecutiveLosses = 0;
      this.arkState.performanceScore += 0.1;
    } else {
      this.arkState.consecutiveLosses++;
      this.arkState.consecutiveWins = 0;
      this.arkState.performanceScore -= 0.1;
    }

    // Adapt based on performance
    if (this.arkState.consecutiveWins >= 5) {
      this.arkState.confidence = Math.min(0.95, this.arkState.confidence + 0.05);
      this.arkState.aggression = Math.min(0.7, this.arkState.aggression + 0.05);
    } else if (this.arkState.consecutiveLosses >= 3) {
      this.arkState.confidence = Math.max(0.3, this.arkState.confidence - 0.1);
      this.arkState.aggression = Math.max(0.1, this.arkState.aggression - 0.1);
      this.arkState.riskTolerance = Math.max(0.2, this.arkState.riskTolerance - 0.05);
    }

    // Update model performance tracking
    await this.updateModelPerformance(prediction, actualOutcome);

    // Save state
    await this.saveState();

    console.log(`ARK: Learned from outcome - Confidence: ${this.arkState.confidence.toFixed(2)}, Score: ${this.arkState.performanceScore.toFixed(2)}`);
  }

  private async updateModelPerformance(
    prediction: MLPrediction,
    outcome: { pnl: number; success: boolean }
  ): Promise<void> {
    // Find the model ID
    const { data: modelData } = await supabase
      .from('ml_models')
      .select('id')
      .eq('model_name', prediction.model)
      .single();

    if (!modelData) return;

    // Get recent performance
    const { data: recentPerf } = await supabase
      .from('ark_model_performance')
      .select('*')
      .eq('model_id', modelData.id)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const totalTrades = (recentPerf?.length || 0) + 1;
    const winningTrades = (recentPerf?.filter((p: any) => p.win_rate > 0.5).length || 0) + (outcome.success ? 1 : 0);

    // Insert new performance record
    await supabase.from('ark_model_performance').insert({
      model_id: modelData.id,
      accuracy: outcome.success ? 1 : 0,
      win_rate: winningTrades / totalTrades,
      total_trades: totalTrades,
      winning_trades: winningTrades,
      profit_factor: outcome.pnl > 0 ? outcome.pnl : 0,
      metadata: {
        prediction: prediction,
        outcome: outcome,
        timestamp: new Date().toISOString()
      } as any
    });
  }

  /**
   * Get current ARK state
   */
  public getState(): ARKState {
    return { ...this.arkState };
  }

  /**
   * Initialize ARK with user's trading symbols
   */
  public async initialize(userId?: string): Promise<void> {
    console.log('ARK Core: Initializing system');
    
    try {
      // Train ML models using user's selected symbols
      await this.mlModels.trainAllModels(userId);
      console.log('ARK Core: Initialization complete');
    } catch (error) {
      console.error('ARK Core: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  public async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const { data } = await supabase
      .from('ark_decision_audit')
      .select('*')
      .eq('executed', true)
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!data || data.length === 0) {
      return {
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        profitFactor: 0,
        totalTrades: 0
      };
    }

    const outcomes = data.map((d: any) => d.outcome).filter(Boolean);
    const totalTrades = outcomes.length;
    const winningTrades = outcomes.filter((o: any) => o.success).length;
    const winRate = winningTrades / totalTrades;

    const profits = outcomes.filter((o: any) => o.pnl > 0).reduce((sum: number, o: any) => sum + o.pnl, 0);
    const losses = Math.abs(outcomes.filter((o: any) => o.pnl < 0).reduce((sum: number, o: any) => sum + o.pnl, 0));
    const profitFactor = losses > 0 ? profits / losses : profits;

    return {
      sharpeRatio: this.arkState.performanceScore,
      maxDrawdown: 0, // Calculate from position history
      winRate,
      profitFactor,
      totalTrades
    };
  }
}
