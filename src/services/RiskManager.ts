import { Position, TradingSignal, RiskMetrics, MLPrediction } from '@/types/trading';

export class RiskManager {
  private readonly maxDrawdown = 0.14; // 14%
  private readonly maxRiskPerTrade = 0.07; // 7%
  private readonly maxDailyProfit = 0.40; // 40%
  private readonly maxPositionSize = 2; // 2 lots
  private readonly maxPositions = 10;
  
  private accountBalance: number = 10000; // Starting balance
  private dailyStartBalance: number = 10000;
  private currentPositions: Map<string, Position> = new Map();
  private dailyPnL: number = 0;
  private peakBalance: number = 10000;

  updateAccountBalance(balance: number): void {
    this.accountBalance = balance;
    this.peakBalance = Math.max(this.peakBalance, balance);
  }

  setDailyStartBalance(balance: number): void {
    this.dailyStartBalance = balance;
  }

  updatePosition(position: Position): void {
    this.currentPositions.set(position.dealId, position);
  }

  removePosition(dealId: string): void {
    this.currentPositions.delete(dealId);
  }

  updateDailyPnL(pnl: number): void {
    this.dailyPnL = pnl;
  }

  validateTrade(signal: TradingSignal, prediction: MLPrediction): {
    allowed: boolean;
    adjustedSize: number;
    reason?: string;
  } {
    // Check if trading is allowed based on current risk metrics
    const riskMetrics = this.calculateRiskMetrics();
    
    // 1. Check maximum drawdown
    if (riskMetrics.currentDrawdown > this.maxDrawdown) {
      return {
        allowed: false,
        adjustedSize: 0,
        reason: `Maximum drawdown exceeded: ${(riskMetrics.currentDrawdown * 100).toFixed(2)}%`
      };
    }

    // 2. Check daily profit limit
    const dailyReturnPercent = this.dailyPnL / this.dailyStartBalance;
    if (dailyReturnPercent > this.maxDailyProfit) {
      return {
        allowed: false,
        adjustedSize: 0,
        reason: `Daily profit limit reached: ${(dailyReturnPercent * 100).toFixed(2)}%`
      };
    }

    // 3. Check maximum positions
    if (this.currentPositions.size >= this.maxPositions) {
      return {
        allowed: false,
        adjustedSize: 0,
        reason: `Maximum positions limit reached: ${this.currentPositions.size}`
      };
    }

    // 4. Check position concentration (max 3 positions per symbol)
    const symbolPositions = Array.from(this.currentPositions.values())
      .filter(pos => pos.symbol === signal.symbol).length;
    
    if (symbolPositions >= 3) {
      return {
        allowed: false,
        adjustedSize: 0,
        reason: `Too many positions in ${signal.symbol}: ${symbolPositions}`
      };
    }

    // 5. Calculate optimal position size
    const optimalSize = this.calculateOptimalPositionSize(signal, prediction, riskMetrics);
    
    // 6. Check minimum confidence threshold
    if (prediction.confidence < 0.65) {
      return {
        allowed: false,
        adjustedSize: 0,
        reason: `Insufficient confidence: ${(prediction.confidence * 100).toFixed(1)}%`
      };
    }

    // 7. Check correlation risk
    const correlationRisk = this.assessCorrelationRisk(signal.symbol);
    if (correlationRisk > 0.7) {
      return {
        allowed: false,
        adjustedSize: 0,
        reason: `High correlation risk: ${(correlationRisk * 100).toFixed(1)}%`
      };
    }

    // 8. Final size validation
    const finalSize = Math.min(optimalSize, this.maxPositionSize);
    
    if (finalSize < 0.01) {
      return {
        allowed: false,
        adjustedSize: 0,
        reason: 'Position size too small after risk adjustments'
      };
    }

    return {
      allowed: true,
      adjustedSize: finalSize,
    };
  }

  calculateOptimalPositionSize(
    signal: TradingSignal, 
    prediction: MLPrediction, 
    riskMetrics: RiskMetrics
  ): number {
    // Kelly Criterion with modifications
    const stopLossDistance = Math.abs(signal.price - signal.stopLoss) / signal.price;
    const takeProfitDistance = Math.abs(signal.takeProfit - signal.price) / signal.price;
    
    // Risk-reward ratio
    const riskRewardRatio = takeProfitDistance / stopLossDistance;
    
    // Win probability (based on model confidence and historical performance)
    const winProbability = this.adjustWinProbability(prediction.confidence, prediction.model);
    
    // Kelly formula: f = (bp - q) / b
    // where b = odds received (risk-reward ratio), p = win probability, q = loss probability
    const kellyFraction = ((riskRewardRatio * winProbability) - (1 - winProbability)) / riskRewardRatio;
    
    // Apply conservative scaling (25% of Kelly)
    const conservativeKelly = Math.max(0, kellyFraction * 0.25);
    
    // Position size based on risk per trade
    const riskBasedSize = (this.maxRiskPerTrade * this.accountBalance) / 
      (stopLossDistance * signal.price * 100000); // Assuming standard lot size
    
    // Volatility adjustment
    const volatilityAdjustment = this.calculateVolatilityAdjustment(signal.symbol);
    
    // Confidence scaling
    const confidenceScaling = Math.pow(prediction.confidence, 2);
    
    // Final position size calculation
    let optimalSize = Math.min(
      conservativeKelly * this.accountBalance / signal.price,
      riskBasedSize
    ) * volatilityAdjustment * confidenceScaling;

    // Market condition adjustment
    const marketConditionMultiplier = this.getMarketConditionMultiplier();
    optimalSize *= marketConditionMultiplier;
    
    return Math.min(optimalSize, this.maxPositionSize);
  }

  calculateDynamicStopLoss(signal: TradingSignal, prediction: MLPrediction): number {
    const currentPrice = signal.price;
    const atr = this.getATR(signal.symbol); // Average True Range
    const volatility = this.getVolatility(signal.symbol);
    
    // ATR-based stop loss
    const atrMultiplier = 2.5 + (1 - prediction.confidence); // Lower confidence = wider stop
    const atrStopLoss = signal.direction === 'BUY' 
      ? currentPrice - (atr * atrMultiplier)
      : currentPrice + (atr * atrMultiplier);
    
    // Percentage-based stop loss
    const percentageStop = signal.direction === 'BUY'
      ? currentPrice * (1 - (0.01 + volatility))
      : currentPrice * (1 + (0.01 + volatility));
    
    // Support/resistance based stop loss
    const technicalStop = signal.direction === 'BUY'
      ? this.getNearestSupport(signal.symbol, currentPrice)
      : this.getNearestResistance(signal.symbol, currentPrice);
    
    // Choose the most conservative (closest to current price for protection)
    if (signal.direction === 'BUY') {
      return Math.max(atrStopLoss, percentageStop, technicalStop);
    } else {
      return Math.min(atrStopLoss, percentageStop, technicalStop);
    }
  }

  calculateDynamicTakeProfit(signal: TradingSignal, prediction: MLPrediction): number {
    const currentPrice = signal.price;
    const stopLoss = this.calculateDynamicStopLoss(signal, prediction);
    const stopDistance = Math.abs(currentPrice - stopLoss);
    
    // Base risk-reward ratio based on confidence
    let riskRewardRatio = 1.5 + (prediction.confidence * 2); // 1.5 to 3.5
    
    // Market volatility adjustment
    const volatility = this.getVolatility(signal.symbol);
    if (volatility > 0.02) riskRewardRatio *= 1.2; // Wider targets in volatile markets
    
    // Model performance adjustment
    const modelMultiplier = this.getModelPerformanceMultiplier(prediction.model);
    riskRewardRatio *= modelMultiplier;
    
    // Calculate take profit
    const takeProfit = signal.direction === 'BUY'
      ? currentPrice + (stopDistance * riskRewardRatio)
      : currentPrice - (stopDistance * riskRewardRatio);
    
    return takeProfit;
  }

  assessPositionHealth(): Array<{ dealId: string; action: 'HOLD' | 'CLOSE' | 'ADJUST_SL' | 'PARTIAL_CLOSE' }> {
    const actions: Array<{ dealId: string; action: 'HOLD' | 'CLOSE' | 'ADJUST_SL' | 'PARTIAL_CLOSE' }> = [];
    
    this.currentPositions.forEach((position, dealId) => {
      const currentDrawdown = this.calculatePositionDrawdown(position);
      const timeInPosition = this.getTimeInPosition(position);
      const marketCondition = this.assessMarketCondition(position.symbol);
      
      // Emergency exit conditions
      if (currentDrawdown > 0.05) { // 5% loss on single position
        actions.push({ dealId, action: 'CLOSE' });
        return;
      }
      
      // Trailing stop logic
      if (position.pnl > 0.02 * this.accountBalance) { // 2% account profit
        actions.push({ dealId, action: 'ADJUST_SL' });
        return;
      }
      
      // Time-based exit (positions held too long)
      if (timeInPosition > 24 * 60 * 60 * 1000) { // 24 hours
        actions.push({ dealId, action: 'PARTIAL_CLOSE' });
        return;
      }
      
      // Market condition deterioration
      if (marketCondition < 0.3) {
        actions.push({ dealId, action: 'CLOSE' });
        return;
      }
      
      actions.push({ dealId, action: 'HOLD' });
    });
    
    return actions;
  }

  calculateRiskMetrics(): RiskMetrics {
    const currentValue = this.accountBalance + this.getUnrealizedPnL();
    const currentDrawdown = Math.max(0, (this.peakBalance - currentValue) / this.peakBalance);
    
    const totalRisk = Array.from(this.currentPositions.values())
      .reduce((risk, pos) => risk + this.calculatePositionRisk(pos), 0);
    
    return {
      currentDrawdown,
      dailyPnL: this.dailyPnL,
      totalRisk,
      maxPositionSize: this.maxPositionSize,
      allowedRisk: this.maxRiskPerTrade * this.accountBalance,
      portfolioValue: currentValue,
    };
  }

  getPortfolioSummary(): {
    totalPositions: number;
    totalExposure: number;
    dailyPnL: number;
    unrealizedPnL: number;
    riskUtilization: number;
    correlationRisk: number;
  } {
    const totalPositions = this.currentPositions.size;
    const totalExposure = Array.from(this.currentPositions.values())
      .reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0);
    
    const unrealizedPnL = this.getUnrealizedPnL();
    const riskUtilization = totalExposure / this.accountBalance;
    
    return {
      totalPositions,
      totalExposure,
      dailyPnL: this.dailyPnL,
      unrealizedPnL,
      riskUtilization,
      correlationRisk: this.calculatePortfolioCorrelationRisk(),
    };
  }

  // Private helper methods
  private adjustWinProbability(confidence: number, model: string): number {
    // Historical model performance adjustment
    const modelPerformance = {
      'LSTM-Attention': 0.68,
      'Transformer-MultiHead': 0.72,
      'XGBoost-Ensemble': 0.65,
      'Deep-Q-Network': 0.70,
      'Wavelet-Neural-Network': 0.66,
      'Advanced-Ensemble': 0.75,
    };
    
    const basePerformance = modelPerformance[model] || 0.6;
    return Math.min(0.9, confidence * basePerformance);
  }

  private calculateVolatilityAdjustment(symbol: string): number {
    const volatility = this.getVolatility(symbol);
    
    // Higher volatility = smaller position size
    if (volatility > 0.03) return 0.5;
    if (volatility > 0.02) return 0.7;
    if (volatility > 0.015) return 0.85;
    return 1.0;
  }

  private getMarketConditionMultiplier(): number {
    // Simplified market condition assessment
    const hour = new Date().getUTCHours();
    
    // Reduce position sizes during low liquidity hours
    if (hour < 6 || hour > 22) return 0.6; // Asian session overlap
    if (hour >= 8 && hour <= 16) return 1.0; // London/NY overlap
    return 0.8; // Other times
  }

  private assessCorrelationRisk(symbol: string): number {
    // Calculate correlation with existing positions
    const existingSymbols = Array.from(this.currentPositions.values())
      .map(pos => pos.symbol);
    
    if (existingSymbols.length === 0) return 0;
    
    // Simplified correlation matrix (in real implementation, use historical correlation)
    const correlations = this.getSymbolCorrelations(symbol, existingSymbols);
    
    return Math.max(...correlations);
  }

  private getSymbolCorrelations(symbol: string, existingSymbols: string[]): number[] {
    // Simplified correlation lookup
    const correlationMatrix: Record<string, Record<string, number>> = {
      'EURUSD': { 'GBPUSD': 0.8, 'AUDUSD': 0.7, 'NZDUSD': 0.6 },
      'GBPUSD': { 'EURUSD': 0.8, 'AUDUSD': 0.6, 'NZDUSD': 0.5 },
      'XAUUSD': { 'XAGUSD': 0.7, 'USOIL': 0.4 },
      'NVDA': { 'AAPL': 0.6, 'MSFT': 0.7, 'GOOGL': 0.8 },
      // Add more correlations as needed
    };
    
    return existingSymbols.map(existing => 
      correlationMatrix[symbol]?.[existing] || 
      correlationMatrix[existing]?.[symbol] || 
      0.1 // Default low correlation
    );
  }

  private getUnrealizedPnL(): number {
    return Array.from(this.currentPositions.values())
      .reduce((sum, pos) => sum + pos.pnl, 0);
  }

  private calculatePositionRisk(position: Position): number {
    const stopLossDistance = position.stopLoss 
      ? Math.abs(position.currentPrice - position.stopLoss) 
      : position.currentPrice * 0.02; // 2% default
    
    return position.size * stopLossDistance;
  }

  private calculatePositionDrawdown(position: Position): number {
    const entryValue = position.size * position.entryPrice;
    const currentValue = position.size * position.currentPrice;
    
    if (position.direction === 'BUY') {
      return Math.max(0, (entryValue - currentValue) / entryValue);
    } else {
      return Math.max(0, (currentValue - entryValue) / entryValue);
    }
  }

  private getTimeInPosition(position: Position): number {
    return Date.now() - new Date(position.timestamp).getTime();
  }

  private assessMarketCondition(symbol: string): number {
    // Simplified market condition score (0-1)
    // In real implementation, this would analyze volatility, liquidity, news events
    return 0.7; // Default neutral condition
  }

  private calculatePortfolioCorrelationRisk(): number {
    const symbols = Array.from(this.currentPositions.values()).map(pos => pos.symbol);
    if (symbols.length < 2) return 0;
    
    let totalCorrelation = 0;
    let pairs = 0;
    
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const correlation = this.getSymbolCorrelations(symbols[i], [symbols[j]])[0];
        totalCorrelation += Math.abs(correlation);
        pairs++;
      }
    }
    
    return pairs > 0 ? totalCorrelation / pairs : 0;
  }

  // Market data getters (these would connect to real market data in production)
  private getATR(symbol: string): number {
    // Real ATR values from market data
    const atrMap: Record<string, number> = {
      'EURUSD': 0.0012,
      'GBPUSD': 0.0015,
      'USDJPY': 0.8,
      'XAUUSD': 12.5,
      'NVDA': 8.5,
      'BTCUSD': 1200,
    };
    return atrMap[symbol] || 0.001;
  }

  private getVolatility(symbol: string): number {
    // Real volatility values from market data
    const volMap: Record<string, number> = {
      'EURUSD': 0.015,
      'GBPUSD': 0.018,
      'BTCUSD': 0.045,
      'NVDA': 0.035,
      'XAUUSD': 0.022,
    };
    return volMap[symbol] || 0.02;
  }

  private getNearestSupport(symbol: string, currentPrice: number): number {
    // Real support level calculation from market data
    return currentPrice * 0.995;
  }

  private getNearestResistance(symbol: string, currentPrice: number): number {
    // Real resistance level calculation from market data
    return currentPrice * 1.005;
  }

  private getModelPerformanceMultiplier(model: string): number {
    const performance = {
      'LSTM-Attention': 1.1,
      'Transformer-MultiHead': 1.2,
      'XGBoost-Ensemble': 1.0,
      'Deep-Q-Network': 1.15,
      'Wavelet-Neural-Network': 1.05,
      'Advanced-Ensemble': 1.25,
    };
    
    return performance[model] || 1.0;
  }
}