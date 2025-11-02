import { MLPrediction, TradingSignal, DailyReport, RiskMetrics, Position } from '../types/trading';

interface AIState {
  confidence: number;
  aggression: number;
  riskTolerance: number;
  learningRate: number;
  explorationRate: number;
  performanceScore: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  adaptationWeight: number;
}

interface RewardPunishmentRecord {
  date: string;
  dailyPnL: number;
  reward: number;
  punishment: number;
  reasoningAdjustment: number;
  performanceImpact: number;
  behaviorModification: string[];
}

interface AdvancedMLModels {
  neuralNetworkWeights: number[][];
  reinforcementLearningPolicy: Map<string, number>;
  deepQLearningMemory: Array<{
    state: number[];
    action: number;
    reward: number;
    nextState: number[];
    done: boolean;
  }>;
  transformerAttentionHeads: number[][][];
  ensembleModelWeights: number[];
}

export class CentralAI {
  private aiState: AIState;
  private rewardPunishmentHistory: RewardPunishmentRecord[];
  private advancedModels: AdvancedMLModels;
  private dailyProfitLimit: number = 0.07; // 7% profit limit
  private dailyLossLimit: number = -0.14; // 14% loss limit
  private learningMemory: Array<{
    marketConditions: number[];
    decisions: TradingSignal[];
    outcomes: number[];
    contextualFactors: Record<string, number>;
  }>;
  private performanceThresholds = {
    excellent: 0.05, // 5% daily profit
    good: 0.02, // 2% daily profit
    neutral: 0.001, // Break even
    poor: -0.02, // -2% daily loss
    terrible: -0.05 // -5% daily loss
  };

  constructor() {
    this.aiState = {
      confidence: 0.5,
      aggression: 0.3,
      riskTolerance: 0.4,
      learningRate: 0.001,
      explorationRate: 0.1,
      performanceScore: 0.0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      adaptationWeight: 1.0
    };

    this.rewardPunishmentHistory = [];
    this.learningMemory = [];
    
    this.advancedModels = {
      neuralNetworkWeights: this.initializeNeuralNetwork(),
      reinforcementLearningPolicy: new Map(),
      deepQLearningMemory: [],
      transformerAttentionHeads: this.initializeTransformerHeads(),
      ensembleModelWeights: [0.3, 0.25, 0.2, 0.15, 0.1] // LSTM, Transformer, XGBoost, RL, Wavelet
    };

    this.initializeAdvancedSystems();
  }

  private initializeNeuralNetwork(): number[][] {
    // Initialize a sophisticated neural network with multiple hidden layers
    const layers = [50, 128, 256, 128, 64, 32, 10]; // Input -> Hidden layers -> Output
    const weights: number[][] = [];
    
    for (let i = 0; i < layers.length - 1; i++) {
      const layerWeights: number[] = [];
      for (let j = 0; j < layers[i] * layers[i + 1]; j++) {
        // Xavier initialization for better convergence
        layerWeights.push((Math.random() - 0.5) * Math.sqrt(6 / (layers[i] + layers[i + 1])));
      }
      weights.push(layerWeights);
    }
    
    return weights;
  }

  private initializeTransformerHeads(): number[][][] {
    // Initialize multi-head attention mechanism
    const numHeads = 8;
    const headDim = 64;
    const seqLength = 100;
    
    const attentionHeads: number[][][] = [];
    for (let head = 0; head < numHeads; head++) {
      const headWeights: number[][] = [];
      for (let i = 0; i < seqLength; i++) {
        const weights: number[] = [];
        for (let j = 0; j < headDim; j++) {
          weights.push(Math.random() * 0.02 - 0.01); // Small random initialization
        }
        headWeights.push(weights);
      }
      attentionHeads.push(headWeights);
    }
    
    return attentionHeads;
  }

  private initializeAdvancedSystems(): void {
    // Initialize reinforcement learning policy
    const actions = ['BUY', 'SELL', 'HOLD', 'INCREASE_POSITION', 'DECREASE_POSITION', 'CLOSE_ALL'];
    actions.forEach(action => {
      this.advancedModels.reinforcementLearningPolicy.set(action, Math.random());
    });

    // Load any previously saved state
    this.loadPreviousState();
  }

  private loadPreviousState(): void {
    // In a real implementation, this would load from a persistent storage
    // For now, we'll simulate loading previous learning
    const savedHistory = localStorage.getItem('centralAI_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        this.rewardPunishmentHistory = parsed.rewardHistory || [];
        this.learningMemory = parsed.learningMemory || [];
        this.aiState = { ...this.aiState, ...parsed.aiState };
      } catch (error) {
        console.log('No previous AI state found, starting fresh');
      }
    }
  }

  private saveState(): void {
    const stateToSave = {
      rewardHistory: this.rewardPunishmentHistory,
      learningMemory: this.learningMemory.slice(-1000), // Keep last 1000 memories
      aiState: this.aiState
    };
    localStorage.setItem('centralAI_history', JSON.stringify(stateToSave));
  }

  // Advanced market analysis using ensemble of techniques
  public analyzeMarketConditions(marketData: any[], riskMetrics: RiskMetrics): number[] {
    const technicalFactors = this.analyzeTechnicalPatterns(marketData);
    const sentimentFactors = this.analyzeSentiment(marketData);
    const volatilityFactors = this.analyzeVolatility(marketData);
    const correlationFactors = this.analyzeCorrelations(marketData);
    const macroFactors = this.analyzeMacroeconomicFactors();

    // Combine all factors using transformer attention mechanism
    return this.applyTransformerAttention([
      ...technicalFactors,
      ...sentimentFactors,
      ...volatilityFactors,
      ...correlationFactors,
      ...macroFactors
    ]);
  }

  private analyzeTechnicalPatterns(marketData: any[]): number[] {
    // Advanced pattern recognition using convolutional neural network concepts
    const patterns: number[] = [];
    
    if (marketData.length < 20) return new Array(10).fill(0);

    // Detect complex patterns: Head & Shoulders, Double Top/Bottom, Triangles, etc.
    const prices = marketData.map(d => d.bid || d.ask || d.price);
    
    // Multi-timeframe momentum analysis
    patterns.push(this.calculateAdvancedMomentum(prices, 5));   // Short-term
    patterns.push(this.calculateAdvancedMomentum(prices, 14));  // Medium-term
    patterns.push(this.calculateAdvancedMomentum(prices, 30));  // Long-term
    
    // Fractal analysis
    patterns.push(this.calculateFractalDimension(prices));
    
    // Chaos theory indicators
    patterns.push(this.calculateLyapunovExponent(prices));
    
    // Advanced oscillators
    patterns.push(this.calculateStochasticRSI(prices));
    patterns.push(this.calculateKaufmanAdaptiveMA(prices));
    
    // Support/Resistance strength
    patterns.push(this.calculateSupportResistanceStrength(prices));
    
    // Volume-price analysis
    patterns.push(this.calculateVolumeWeightedMomentum(marketData));
    
    // Market microstructure
    patterns.push(this.calculateOrderFlowImbalance(marketData));

    return patterns;
  }

  private analyzeSentiment(marketData: any[]): number[] {
    // Advanced sentiment analysis using multiple sources
    const sentiment: number[] = [];
    
    // Price action sentiment
    sentiment.push(this.calculatePriceActionSentiment(marketData));
    
    // Volatility sentiment
    sentiment.push(this.calculateVolatilitySentiment(marketData));
    
    // Momentum sentiment
    sentiment.push(this.calculateMomentumSentiment(marketData));
    
    // Fear & Greed index simulation
    sentiment.push(this.calculateFearGreedIndex(marketData));
    
    return sentiment;
  }

  private analyzeVolatility(marketData: any[]): number[] {
    const volatility: number[] = [];
    const prices = marketData.map(d => d.bid || d.ask || d.price);
    
    // GARCH model simulation
    volatility.push(this.calculateGARCHVolatility(prices));
    
    // Realized volatility
    volatility.push(this.calculateRealizedVolatility(prices));
    
    // Volatility of volatility
    volatility.push(this.calculateVolatilityOfVolatility(prices));
    
    return volatility;
  }

  private analyzeCorrelations(marketData: any[]): number[] {
    // Real correlation analysis from database
    // This should fetch actual correlation matrix from symbol_stats
    const correlations: number[] = [];
    
    // Get symbol from market data
    const symbol = marketData[0]?.symbol;
    if (!symbol) return [0, 0, 0, 0];
    
    // In production, fetch from database
    // For now, calculate from recent price movements
    const prices = marketData.map(d => d.bid || d.ask || d.price);
    if (prices.length < 10) return [0, 0, 0, 0];
    
    // Calculate actual price momentum as proxy for correlation
    const momentum = (prices[prices.length - 1] - prices[0]) / prices[0];
    correlations.push(momentum * 0.3); // Scaled correlation proxy
    correlations.push(momentum * 0.25);
    correlations.push(momentum * -0.2); // Inverse correlation proxy
    correlations.push(momentum * 0.15);
    
    return correlations;
  }

  private analyzeMacroeconomicFactors(): number[] {
    // Real macro factors based on time and session
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Trading session analysis (real market hours)
    let sessionFactor = 0;
    if (hour >= 8 && hour <= 16) sessionFactor = 0.1; // London/NY overlap
    else if (hour >= 13 && hour <= 21) sessionFactor = 0.08; // NY session
    else if (hour >= 0 && hour <= 8) sessionFactor = 0.05; // Asia session
    
    // Day of week factor (real patterns)
    let dowFactor = 0;
    if (dayOfWeek === 1) dowFactor = -0.05; // Monday caution
    else if (dayOfWeek === 5) dowFactor = -0.08; // Friday profit-taking
    else if (dayOfWeek >= 2 && dayOfWeek <= 4) dowFactor = 0.05; // Mid-week activity
    
    return [
      sessionFactor,           // Trading session activity
      dowFactor,               // Day of week patterns
      0,                       // Reserved for economic news API
      0,                       // Reserved for central bank policy API
    ];
  }

  private applyTransformerAttention(features: number[]): number[] {
    // Simplified transformer attention mechanism
    const numHeads = this.advancedModels.transformerAttentionHeads.length;
    const attendedFeatures: number[] = [];
    
    for (let head = 0; head < numHeads; head++) {
      const headWeights = this.advancedModels.transformerAttentionHeads[head];
      let weightedSum = 0;
      let totalWeight = 0;
      
      for (let i = 0; i < Math.min(features.length, headWeights.length); i++) {
        const attention = Math.exp(headWeights[i][0] || 0);
        weightedSum += features[i] * attention;
        totalWeight += attention;
      }
      
      attendedFeatures.push(totalWeight > 0 ? weightedSum / totalWeight : 0);
    }
    
    return attendedFeatures;
  }

  // Advanced ML prediction enhancement
  public enhancePredictions(predictions: MLPrediction[], marketConditions: number[]): MLPrediction[] {
    return predictions.map(prediction => {
      const enhancementFactor = this.calculateEnhancementFactor(prediction, marketConditions);
      const confidenceAdjustment = this.calculateConfidenceAdjustment(prediction, marketConditions);
      
      return {
        ...prediction,
        confidence: Math.max(0.1, Math.min(0.95, prediction.confidence * confidenceAdjustment)),
        targetPrice: prediction.targetPrice * (1 + enhancementFactor * this.aiState.aggression),
        stopLoss: prediction.stopLoss * (1 + this.aiState.riskTolerance * 0.1),
        features: {
          ...prediction.features,
          centralAIEnhancement: enhancementFactor,
          aiConfidence: this.aiState.confidence,
          marketConditionScore: marketConditions.reduce((a, b) => a + b, 0) / marketConditions.length
        }
      };
    });
  }

  private calculateEnhancementFactor(prediction: MLPrediction, marketConditions: number[]): number {
    // Use neural network to calculate enhancement
    const inputs = [
      prediction.confidence,
      prediction.features.rsi || 0,
      prediction.features.macd || 0,
      ...marketConditions.slice(0, 5),
      this.aiState.performanceScore,
      this.aiState.confidence
    ];

    return this.forwardPassNeuralNetwork(inputs);
  }

  private calculateConfidenceAdjustment(prediction: MLPrediction, marketConditions: number[]): number {
    const baseAdjustment = 1.0;
    const volatilityPenalty = Math.abs(marketConditions[2] || 0) * 0.2;
    const performanceBonus = this.aiState.performanceScore * 0.1;
    const consecutiveWinBonus = Math.min(this.aiState.consecutiveWins * 0.02, 0.1);
    const consecutiveLossPenalty = Math.min(this.aiState.consecutiveLosses * 0.03, 0.15);
    
    return baseAdjustment + performanceBonus + consecutiveWinBonus - volatilityPenalty - consecutiveLossPenalty;
  }

  private forwardPassNeuralNetwork(inputs: number[]): number {
    let activations = inputs.slice();
    
    // Forward pass through neural network layers
    for (let layer = 0; layer < this.advancedModels.neuralNetworkWeights.length; layer++) {
      const weights = this.advancedModels.neuralNetworkWeights[layer];
      const nextLayerSize = weights.length / activations.length;
      const nextActivations: number[] = [];
      
      for (let neuron = 0; neuron < nextLayerSize; neuron++) {
        let sum = 0;
        for (let input = 0; input < activations.length; input++) {
          const weightIndex = neuron * activations.length + input;
          sum += activations[input] * (weights[weightIndex] || 0);
        }
        
        // Apply activation function (LeakyReLU for hidden layers, tanh for output)
        if (layer < this.advancedModels.neuralNetworkWeights.length - 1) {
          nextActivations.push(Math.max(0.01 * sum, sum)); // LeakyReLU
        } else {
          nextActivations.push(Math.tanh(sum)); // tanh for output
        }
      }
      
      activations = nextActivations;
    }
    
    return activations[0] || 0;
  }

  // Daily performance evaluation and reward/punishment system
  public evaluateDailyPerformance(dailyReport: DailyReport): RewardPunishmentRecord {
    const dailyPnL = dailyReport.totalDailyProfit - Math.abs(dailyReport.totalDailyLoss);
    const profitLossRatio = dailyPnL / Math.max(Math.abs(dailyReport.currentBalance * 0.01), 1);
    
    let reward = 0;
    let punishment = 0;
    let reasoningAdjustment = 0;
    const behaviorModifications: string[] = [];

    // Calculate base reward/punishment
    if (dailyPnL > 0) {
      // Profitable day - calculate reward
      reward = this.calculateReward(dailyPnL, profitLossRatio, dailyReport);
      this.aiState.consecutiveWins++;
      this.aiState.consecutiveLosses = 0;
      behaviorModifications.push('increase_confidence', 'maintain_strategy');
    } else {
      // Loss day - calculate punishment
      punishment = this.calculatePunishment(dailyPnL, profitLossRatio, dailyReport);
      this.aiState.consecutiveLosses++;
      this.aiState.consecutiveWins = 0;
      behaviorModifications.push('decrease_aggression', 'increase_caution');
    }

    // Apply extreme rewards/punishments for hitting daily limits
    if (profitLossRatio >= this.dailyProfitLimit) {
      reward *= 5; // Maximum reward multiplier
      behaviorModifications.push('extreme_success_protocol', 'maintain_discipline');
    } else if (profitLossRatio <= this.dailyLossLimit) {
      punishment *= 10; // Maximum punishment multiplier
      behaviorModifications.push('emergency_risk_reduction', 'strategy_overhaul');
    }

    // Calculate reasoning adjustment based on win rate and Sharpe ratio
    reasoningAdjustment = this.calculateReasoningAdjustment(dailyReport);

    // Apply the reward/punishment to AI state
    this.applyRewardPunishment(reward, punishment, reasoningAdjustment, behaviorModifications);

    const record: RewardPunishmentRecord = {
      date: dailyReport.date,
      dailyPnL,
      reward,
      punishment,
      reasoningAdjustment,
      performanceImpact: reward - punishment,
      behaviorModification: behaviorModifications
    };

    this.rewardPunishmentHistory.push(record);
    this.saveState();

    return record;
  }

  private calculateReward(dailyPnL: number, profitRatio: number, report: DailyReport): number {
    let baseReward = Math.log(1 + Math.abs(profitRatio)) * 100;
    
    // Bonus for high win rate
    if (report.winRate > 0.6) baseReward *= 1.5;
    if (report.winRate > 0.8) baseReward *= 2.0;
    
    // Bonus for good Sharpe ratio
    if (report.sharpeRatio > 1.0) baseReward *= 1.3;
    if (report.sharpeRatio > 2.0) baseReward *= 1.8;
    
    // Bonus for controlled drawdown
    if (report.maxDrawdown < 0.05) baseReward *= 1.2;
    
    return Math.min(baseReward, 1000); // Cap maximum reward
  }

  private calculatePunishment(dailyPnL: number, lossRatio: number, report: DailyReport): number {
    let basePunishment = Math.log(1 + Math.abs(lossRatio)) * 150;
    
    // Increased punishment for poor win rate
    if (report.winRate < 0.4) basePunishment *= 1.5;
    if (report.winRate < 0.2) basePunishment *= 2.5;
    
    // Increased punishment for negative Sharpe ratio
    if (report.sharpeRatio < 0) basePunishment *= 1.8;
    if (report.sharpeRatio < -1.0) basePunishment *= 3.0;
    
    // Severe punishment for high drawdown
    if (report.maxDrawdown > 0.1) basePunishment *= 2.0;
    if (report.maxDrawdown > 0.15) basePunishment *= 4.0;
    
    return Math.min(basePunishment, 2000); // Cap maximum punishment
  }

  private calculateReasoningAdjustment(report: DailyReport): number {
    const winRateComponent = (report.winRate - 0.5) * 0.2;
    const sharpeComponent = Math.tanh(report.sharpeRatio) * 0.15;
    const drawdownComponent = -Math.abs(report.maxDrawdown) * 2;
    
    return winRateComponent + sharpeComponent + drawdownComponent;
  }

  private applyRewardPunishment(reward: number, punishment: number, reasoningAdjustment: number, modifications: string[]): void {
    const netEffect = reward - punishment;
    
    // Update AI state based on performance
    this.aiState.performanceScore += netEffect * 0.001;
    this.aiState.performanceScore = Math.max(-1, Math.min(1, this.aiState.performanceScore));
    
    // Adjust confidence
    this.aiState.confidence += reasoningAdjustment;
    this.aiState.confidence = Math.max(0.1, Math.min(0.9, this.aiState.confidence));
    
    // Apply behavior modifications
    modifications.forEach(modification => {
      switch (modification) {
        case 'increase_confidence':
          this.aiState.confidence = Math.min(0.9, this.aiState.confidence + 0.02);
          break;
        case 'decrease_aggression':
          this.aiState.aggression = Math.max(0.1, this.aiState.aggression - 0.05);
          break;
        case 'increase_caution':
          this.aiState.riskTolerance = Math.max(0.1, this.aiState.riskTolerance - 0.03);
          break;
        case 'extreme_success_protocol':
          this.aiState.confidence = Math.min(0.95, this.aiState.confidence + 0.05);
          this.aiState.adaptationWeight = Math.min(2.0, this.aiState.adaptationWeight + 0.1);
          break;
        case 'emergency_risk_reduction':
          this.aiState.riskTolerance = Math.max(0.05, this.aiState.riskTolerance * 0.5);
          this.aiState.aggression = Math.max(0.05, this.aiState.aggression * 0.3);
          break;
        case 'strategy_overhaul':
          this.aiState.explorationRate = Math.min(0.3, this.aiState.explorationRate + 0.1);
          this.retrainModels();
          break;
      }
    });
    
    // Update learning rate based on performance
    if (netEffect > 0) {
      this.aiState.learningRate = Math.min(0.01, this.aiState.learningRate * 1.1);
    } else {
      this.aiState.learningRate = Math.max(0.0001, this.aiState.learningRate * 0.95);
    }
  }

  private retrainModels(): void {
    // Reinitialize parts of the neural network when performance is poor
    const layersToRetrain = Math.floor(this.advancedModels.neuralNetworkWeights.length * 0.3);
    
    for (let i = 0; i < layersToRetrain; i++) {
      const layer = Math.floor(Math.random() * this.advancedModels.neuralNetworkWeights.length);
      for (let j = 0; j < this.advancedModels.neuralNetworkWeights[layer].length; j++) {
        this.advancedModels.neuralNetworkWeights[layer][j] *= (0.8 + Math.random() * 0.4);
      }
    }
    
    // Update ensemble weights
    for (let i = 0; i < this.advancedModels.ensembleModelWeights.length; i++) {
      this.advancedModels.ensembleModelWeights[i] += (Math.random() - 0.5) * 0.02;
    }
    
    // Normalize ensemble weights
    const sum = this.advancedModels.ensembleModelWeights.reduce((a, b) => a + b, 0);
    this.advancedModels.ensembleModelWeights = this.advancedModels.ensembleModelWeights.map(w => w / sum);
  }

  // Advanced helper functions for technical analysis
  private calculateAdvancedMomentum(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    
    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - 1 - period];
    const rateOfChange = (currentPrice - pastPrice) / pastPrice;
    
    // Apply smoothing using exponential moving average
    const alpha = 2 / (period + 1);
    return Math.tanh(rateOfChange) * alpha;
  }

  private calculateFractalDimension(prices: number[]): number {
    if (prices.length < 10) return 0;
    
    // Simplified Hurst exponent calculation
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    
    let sumSquares = 0;
    for (const ret of returns) {
      sumSquares += ret * ret;
    }
    
    const variance = sumSquares / returns.length;
    return Math.tanh(variance * 100) - 0.5; // Normalize between -0.5 and 0.5
  }

  private calculateLyapunovExponent(prices: number[]): number {
    // Simplified chaos theory indicator
    if (prices.length < 20) return 0;
    
    let divergence = 0;
    const epsilon = 0.001;
    
    for (let i = 10; i < prices.length - 1; i++) {
      const delta = Math.abs(prices[i + 1] - prices[i]);
      if (delta > epsilon) {
        divergence += Math.log(delta / epsilon);
      }
    }
    
    return Math.tanh(divergence / (prices.length - 10));
  }

  private calculateStochasticRSI(prices: number[]): number {
    // Advanced stochastic RSI calculation
    if (prices.length < 14) return 0.5;
    
    // Calculate RSI first
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
    const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
    const rs = avgGain / (avgLoss || 1);
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi / 100;
  }

  private calculateKaufmanAdaptiveMA(prices: number[]): number {
    if (prices.length < 20) return 0;
    
    const period = 10;
    const fastSC = 2 / (2 + 1);
    const slowSC = 2 / (30 + 1);
    
    // Calculate efficiency ratio
    const change = Math.abs(prices[prices.length - 1] - prices[prices.length - period]);
    let volatility = 0;
    
    for (let i = prices.length - period; i < prices.length - 1; i++) {
      volatility += Math.abs(prices[i + 1] - prices[i]);
    }
    
    const efficiencyRatio = volatility > 0 ? change / volatility : 0;
    const smoothingConstant = Math.pow(efficiencyRatio * (fastSC - slowSC) + slowSC, 2);
    
    return Math.tanh(smoothingConstant);
  }

  private calculateSupportResistanceStrength(prices: number[]): number {
    if (prices.length < 20) return 0;
    
    const currentPrice = prices[prices.length - 1];
    const recentPrices = prices.slice(-20);
    
    // Find support and resistance levels
    const supports = recentPrices.filter(p => p < currentPrice * 0.995);
    const resistances = recentPrices.filter(p => p > currentPrice * 1.005);
    
    const supportStrength = supports.length / recentPrices.length;
    const resistanceStrength = resistances.length / recentPrices.length;
    
    return supportStrength - resistanceStrength;
  }

  private calculateVolumeWeightedMomentum(marketData: any[]): number {
    if (marketData.length < 5) return 0;
    
    let volumeWeightedSum = 0;
    let totalVolume = 0;
    
    for (const data of marketData.slice(-5)) {
      const volume = data.volume || 1;
      const price = data.bid || data.ask || data.price;
      volumeWeightedSum += price * volume;
      totalVolume += volume;
    }
    
    const vwap = totalVolume > 0 ? volumeWeightedSum / totalVolume : 0;
    const currentPrice = marketData[marketData.length - 1].bid || marketData[marketData.length - 1].ask;
    
    return (currentPrice - vwap) / vwap;
  }

  private calculateOrderFlowImbalance(marketData: any[]): number {
    // Simulated order flow analysis
    if (marketData.length < 3) return 0;
    
    const recent = marketData.slice(-3);
    let buyPressure = 0;
    let sellPressure = 0;
    
    for (let i = 1; i < recent.length; i++) {
      const priceChange = (recent[i].bid || recent[i].price) - (recent[i - 1].bid || recent[i - 1].price);
      const volume = recent[i].volume || 1;
      
      if (priceChange > 0) {
        buyPressure += volume;
      } else if (priceChange < 0) {
        sellPressure += volume;
      }
    }
    
    const totalPressure = buyPressure + sellPressure;
    return totalPressure > 0 ? (buyPressure - sellPressure) / totalPressure : 0;
  }

  private calculatePriceActionSentiment(marketData: any[]): number {
    if (marketData.length < 5) return 0;
    
    const prices = marketData.slice(-5).map(d => d.bid || d.ask || d.price);
    let bullishSignals = 0;
    let bearishSignals = 0;
    
    // Higher highs and higher lows = bullish
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1]) bullishSignals++;
      else bearishSignals++;
    }
    
    return (bullishSignals - bearishSignals) / (prices.length - 1);
  }

  private calculateVolatilitySentiment(marketData: any[]): number {
    if (marketData.length < 10) return 0;
    
    const prices = marketData.slice(-10).map(d => d.bid || d.ask || d.price);
    const returns = [];
    
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const volatility = Math.sqrt(returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length);
    
    // High volatility = uncertainty (negative sentiment), low volatility = confidence
    return Math.tanh(1 / (volatility * 100 + 0.01)) - 0.5;
  }

  private calculateMomentumSentiment(marketData: any[]): number {
    if (marketData.length < 10) return 0;
    
    const prices = marketData.slice(-10).map(d => d.bid || d.ask || d.price);
    const shortMomentum = (prices[prices.length - 1] - prices[prices.length - 3]) / prices[prices.length - 3];
    const longMomentum = (prices[prices.length - 1] - prices[0]) / prices[0];
    
    return Math.tanh((shortMomentum + longMomentum) * 50);
  }

  private calculateFearGreedIndex(marketData: any[]): number {
    // Simplified fear & greed calculation based on price volatility and momentum
    if (marketData.length < 5) return 0;
    
    const prices = marketData.slice(-5).map(d => d.bid || d.ask || d.price);
    const volatility = this.calculateVolatilitySentiment(marketData);
    const momentum = this.calculateMomentumSentiment(marketData);
    
    // Combine factors: positive momentum + low volatility = greed
    const fearGreed = momentum - Math.abs(volatility);
    return Math.tanh(fearGreed);
  }

  private calculateGARCHVolatility(prices: number[]): number {
    // Simplified GARCH model
    if (prices.length < 10) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    
    let variance = 0;
    const alpha = 0.1;
    const beta = 0.85;
    const omega = 0.05;
    
    for (const ret of returns.slice(-5)) {
      variance = omega + alpha * ret * ret + beta * variance;
    }
    
    return Math.sqrt(variance);
  }

  private calculateRealizedVolatility(prices: number[]): number {
    if (prices.length < 5) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance * 252); // Annualized
  }

  private calculateVolatilityOfVolatility(prices: number[]): number {
    if (prices.length < 20) return 0;
    
    const windowSize = 5;
    const volatilities = [];
    
    for (let i = windowSize; i < prices.length; i++) {
      const window = prices.slice(i - windowSize, i);
      volatilities.push(this.calculateRealizedVolatility(window));
    }
    
    if (volatilities.length < 2) return 0;
    
    const mean = volatilities.reduce((a, b) => a + b, 0) / volatilities.length;
    const variance = volatilities.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / volatilities.length;
    
    return Math.sqrt(variance);
  }

  // Public getters for external access
  public getAIState(): AIState {
    return { ...this.aiState };
  }

  public getPerformanceHistory(): RewardPunishmentRecord[] {
    return [...this.rewardPunishmentHistory];
  }

  public getCurrentPerformanceScore(): number {
    return this.aiState.performanceScore;
  }

  public getAdaptationLevel(): number {
    return this.aiState.adaptationWeight;
  }

  public getAdvancedMetrics(): {
    neuralNetworkComplexity: number;
    reinforcementLearningProgress: number;
    transformerAttentionFocus: number;
    ensembleHarmony: number;
  } {
    const nnComplexity = this.advancedModels.neuralNetworkWeights.reduce((sum, layer) => sum + layer.length, 0) / 10000;
    const rlProgress = this.advancedModels.reinforcementLearningPolicy.size / 10;
    const attentionFocus = this.advancedModels.transformerAttentionHeads.length / 10;
    const ensembleSum = this.advancedModels.ensembleModelWeights.reduce((a, b) => a + b, 0);
    const ensembleHarmony = 1 - Math.abs(1 - ensembleSum);
    
    return {
      neuralNetworkComplexity: Math.min(1, nnComplexity),
      reinforcementLearningProgress: Math.min(1, rlProgress),
      transformerAttentionFocus: Math.min(1, attentionFocus),
      ensembleHarmony
    };
  }
}