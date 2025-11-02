import { AlpacaAPI } from './AlpacaAPI';
import { ProductionMLPredictor } from './ProductionMLPredictor';
import { ProductionRiskManager } from './ProductionRiskManager';
import { ARKCore } from './ARKCore';
import { CentralAI } from './CentralAI';
import { supabase } from '@/integrations/supabase/client';
import { 
  CapitalConfig, 
  MarketData, 
  TradingSignal, 
  Position, 
  MLPrediction,
  DailyReport,
  RiskMetrics
} from '@/types/trading';

export class ProductionTradingEngine {
  private alpacaAPI: AlpacaAPI;
  private mlPredictor: ProductionMLPredictor;
  private riskManager: ProductionRiskManager;
  private arkCore: ARKCore | null = null;
  private centralAI: CentralAI;
  private isRunning: boolean = false;
  private tradingSymbols: string[];
  private marketData: Map<string, MarketData> = new Map();
  private positions: Map<string, Position> = new Map();
  private sessionId: string = '';
  private config: CapitalConfig;
  private userId?: string;
  private killSwitchLevel: number = 0;
  
  // Production trading symbols with real market data
  private readonly PRODUCTION_SYMBOLS = [
    'USDNGN', 'GBPUSD', 'USDJPY', 'EURNGN', 'XAUUSD', 'XAGUSD', 
    'USOIL', 'UKOIL', 'NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOOGL', 
    'AMZN', 'EURUSD', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 
    'WTI', 'NAS100', 'SPX500', 'GER40', 'UK100', 'BTCUSD', 'ETHUSD'
  ];

  constructor(config: CapitalConfig, userId?: string) {
    this.config = config;
    this.userId = userId;
    this.alpacaAPI = new AlpacaAPI(config);
    this.tradingSymbols = this.PRODUCTION_SYMBOLS; // Will be overridden if user symbols exist
    this.centralAI = new CentralAI();
    
    // Initialize with session ID - will be set after session creation
    this.mlPredictor = new ProductionMLPredictor('');
    this.riskManager = new ProductionRiskManager('');
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing production trading engine...');
      
      // Load user symbols if userId is provided
      await this.loadUserSymbols();
      console.log(`Trading symbols: ${this.tradingSymbols.join(', ')}`);
      
      // Create trading session
      await this.createTradingSession();
      
      // Initialize ML and Risk managers with session ID
      this.mlPredictor = new ProductionMLPredictor(this.sessionId);
      this.riskManager = new ProductionRiskManager(this.sessionId);
      
      // Initialize ARK Core
      this.arkCore = ARKCore.getInstance(this.sessionId);
      await this.arkCore.initialize(this.userId);
      
      // Authenticate with Alpaca
      const authenticated = await this.alpacaAPI.authenticate();
      if (!authenticated) {
        throw new Error('Failed to authenticate with Alpaca');
      }

      // Initialize edge functions
      await this.initializeTradingEngineEdgeFunction();

      // Load existing positions
      await this.loadExistingPositions();

      // Start WebSocket for real-time data
      this.alpacaAPI.connectWebSocket(this.tradingSymbols, this.handleMarketData.bind(this));

      console.log('Production trading engine initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize trading engine:', error);
      return false;
    }
  }

  private async loadUserSymbols(): Promise<void> {
    if (!this.userId) {
      console.log('No userId provided, using production symbols');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_trading_symbols')
        .select('symbols')
        .eq('user_id', this.userId)
        .single();

      if (error) {
        console.log('No user symbols found, using production symbols:', error.message);
        return;
      }

      if (data && data.symbols && data.symbols.length > 0) {
        this.tradingSymbols = data.symbols;
        console.log(`Loaded ${data.symbols.length} user-selected symbols`);
      } else {
        console.log('User has no symbols configured, using production symbols');
      }
    } catch (error) {
      console.error('Error loading user symbols:', error);
      console.log('Falling back to production symbols');
    }
  }

  private async createTradingSession(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('trading_sessions')
        .insert({
          user_id: this.userId,
          mode: this.config.environment,
          status: 'active',
          initial_balance: 10000
        })
        .select()
        .single();

      if (error) throw error;
      
      this.sessionId = data.id;
      console.log(`Production trading session created: ${this.sessionId}`);
    } catch (error) {
      console.error('Error creating trading session:', error);
      throw error;
    }
  }

  private async initializeTradingEngineEdgeFunction(): Promise<void> {
    try {
      // Initialize the trading engine edge function
      const { data, error } = await supabase.functions.invoke('trading-engine', {
        body: {
          action: 'initialize',
          sessionId: this.sessionId,
          config: {
            environment: this.config.environment,
            symbols: this.tradingSymbols
          }
        }
      });

      if (error) {
        console.error('Edge function initialization error:', error);
      } else {
        console.log('Trading engine edge function initialized:', data);
      }
    } catch (error) {
      console.error('Error initializing edge function:', error);
    }
  }

  start(): void {
    if (this.isRunning) {
      console.log('Production trading engine is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting production automated trading...');

    // Main trading loop - every 30 seconds for production
    setInterval(() => {
      if (this.isRunning) {
        this.executeTradingCycle();
      }
    }, 30000);

    // Position monitoring - every minute
    setInterval(() => {
      if (this.isRunning) {
        this.monitorPositions();
      }
    }, 60000);

    // Risk assessment - every 2 minutes
    setInterval(() => {
      if (this.isRunning) {
        this.assessRisk();
      }
    }, 120000);

    // Kill switch check - every 30 seconds
    setInterval(() => {
      if (this.isRunning) {
        this.checkKillSwitch();
      }
    }, 30000);
  }

  stop(): void {
    this.isRunning = false;
    this.alpacaAPI.disconnect();
    console.log('Production trading engine stopped');
  }

  private async loadExistingPositions(): Promise<void> {
    try {
      const positions = await this.alpacaAPI.getPositions();
      positions.forEach(position => {
        this.positions.set(position.dealId, position);
      });
      console.log(`Loaded ${positions.length} existing positions`);
    } catch (error) {
      console.error('Error loading existing positions:', error);
    }
  }

  private handleMarketData(data: MarketData): void {
    this.marketData.set(data.symbol, data);
    
    // Update ML predictor with new price data
    this.mlPredictor.updatePriceData(data);
    
    // Update position P&L
    this.updatePositionPnL(data);
  }

  private async executeTradingCycle(): Promise<void> {
    try {
      // Check kill switch first
      const killSwitch = await this.riskManager.getKillSwitchStatus();
      if (killSwitch.active) {
        console.log(`Trading halted by kill switch (Level ${this.killSwitchLevel}): ${killSwitch.reason}`);
        this.killSwitchLevel = killSwitch.level || 3;
        
        // Handle different kill switch levels
        if (this.killSwitchLevel === 3) {
          // Level 3: Emergency - close all positions
          for (const [dealId] of this.positions) {
            await this.closePosition(dealId, 'Kill switch Level 3 activation');
          }
          this.stop();
        }
        return;
      }

      console.log('Executing production trading cycle...');

      // Get current risk metrics for ARK
      const riskMetrics = await this.riskManager.getRiskMetrics();

      // Generate predictions for all symbols with ARK integration
      for (const symbol of this.tradingSymbols) {
        try {
          const marketData = this.marketData.get(symbol);
          if (!marketData) continue;

          // Get market data history for ARK analysis
          const marketDataArray = Array.from(this.marketData.values())
            .filter(md => md.symbol === symbol)
            .slice(-100); // Last 100 data points

          // ARK Decision Analysis (Phase 2)
          let arkDecision = null;
          if (this.arkCore && marketDataArray.length >= 20) {
            arkDecision = await this.arkCore.analyzeMarket(symbol, marketDataArray, riskMetrics);
            
            // Only proceed if ARK approves with sufficient confidence
            if (arkDecision.action === 'HOLD' || arkDecision.confidence < 0.6) {
              console.log(`ARK recommends ${arkDecision.action} for ${symbol} (confidence: ${arkDecision.confidence.toFixed(2)})`);
              continue;
            }
          }

          const prediction = await this.mlPredictor.generatePrediction(symbol, marketData);
          if (prediction && prediction.direction !== 'HOLD' && prediction.confidence > 0.75) {
            // Use ARK decision if available, otherwise use ML prediction
            const finalPrediction = arkDecision ? {
              ...prediction,
              confidence: arkDecision.confidence,
              model: 'ARK-Enhanced-ML'
            } : prediction;
            
            await this.evaluateAndExecuteTrade(finalPrediction, marketData, arkDecision);
          }
        } catch (error) {
          console.error(`Error processing ${symbol}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in trading cycle:', error);
    }
  }

  private async evaluateAndExecuteTrade(prediction: MLPrediction, marketData: MarketData, arkDecision?: any): Promise<void> {
    try {
      const currentPrice = (marketData.bid + marketData.ask) / 2;
      
      // Create trading signal
      const signal: TradingSignal = {
        symbol: prediction.symbol,
        action: prediction.direction as 'BUY' | 'SELL',
        direction: prediction.direction as 'BUY' | 'SELL',
        size: 1.0, // Base size, will be adjusted by risk manager
        price: currentPrice,
        stopLoss: prediction.stopLoss,
        takeProfit: prediction.takeProfit,
        confidence: prediction.confidence,
        reasoning: `${prediction.model} prediction with ${(prediction.confidence * 100).toFixed(1)}% confidence`,
        timestamp: new Date().toISOString()
      };

      // Validate with risk manager
      const validation = await this.riskManager.validateTrade(signal);
      
      if (!validation.allowed) {
        console.log(`Trade rejected for ${signal.symbol}: ${validation.reason}`);
        return;
      }

      // Adjust position size based on kill switch level
      let adjustedSize = validation.adjustedSize;
      if (this.killSwitchLevel === 1) {
        // Level 1: Warning - reduce position size by 50%
        adjustedSize *= 0.5;
        console.log(`Kill switch Level 1: Reducing position size to ${adjustedSize}`);
      } else if (this.killSwitchLevel === 2) {
        // Level 2: Caution - halt new trades
        console.log(`Kill switch Level 2: New trades halted`);
        return;
      }
      
      signal.size = adjustedSize;

      // Execute trade
      console.log(`Executing: ${signal.action} ${signal.size} ${signal.symbol} at ${signal.price}`);
      const dealId = await this.alpacaAPI.openPosition(signal);
      
      if (dealId) {
        const position: Position = {
          dealId,
          symbol: signal.symbol,
          direction: signal.action,
          size: signal.size,
          entryPrice: signal.price,
          currentPrice: signal.price,
          pnl: 0,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          timestamp: signal.timestamp
        };

        this.positions.set(dealId, position);
        await this.riskManager.updatePosition(position);
        
        // Store ARK decision metadata if available
        if (arkDecision) {
          await supabase.from('ark_decision_audit').update({
            executed: true,
            outcome: { dealId, status: 'opened' }
          }).eq('symbol', signal.symbol).order('timestamp', { ascending: false }).limit(1);
        }
        
        console.log(`Trade executed successfully: ${dealId}`);
      }
    } catch (error) {
      console.error(`Error executing trade for ${prediction.symbol}:`, error);
    }
  }

  private async monitorPositions(): Promise<void> {
    try {
      const actions = await this.riskManager.assessPositionHealth();
      
      for (const action of actions) {
        const position = this.positions.get(action.dealId);
        if (!position) continue;

        switch (action.action) {
          case 'CLOSE':
            await this.closePosition(action.dealId, action.reason);
            break;
          case 'ADJUST_SL':
            await this.adjustStopLoss(position);
            break;
          default:
            break;
        }
      }
    } catch (error) {
      console.error('Error monitoring positions:', error);
    }
  }

  private async closePosition(dealId: string, reason: string): Promise<void> {
    try {
      const position = this.positions.get(dealId);
      const success = await this.alpacaAPI.closePosition(dealId);
      if (success) {
        console.log(`Position closed: ${dealId} - ${reason}`);
        
        // Learn from outcome (Phase 2: ARK Integration)
        if (this.arkCore && position) {
          const outcome = {
            pnl: position.pnl,
            success: position.pnl > 0
          };
          
          await this.arkCore.learnFromOutcome(position.symbol, {
            symbol: position.symbol,
            direction: position.direction,
            confidence: 0.75, // Default if not stored
            targetPrice: position.entryPrice,
            stopLoss: position.stopLoss || 0,
            takeProfit: position.takeProfit || 0,
            timeframe: '30min',
            model: 'Production',
            features: {}
          }, outcome);
        }
        
        this.positions.delete(dealId);
        await this.riskManager.removePosition(dealId);
      }
    } catch (error) {
      console.error(`Error closing position ${dealId}:`, error);
    }
  }

  private async adjustStopLoss(position: Position): Promise<void> {
    try {
      // Calculate trailing stop
      const currentPrice = position.currentPrice;
      const profitPercent = position.direction === 'BUY' 
        ? (currentPrice - position.entryPrice) / position.entryPrice
        : (position.entryPrice - currentPrice) / position.entryPrice;

      if (profitPercent > 0.02) { // 2% profit threshold
        const newStopLoss = position.direction === 'BUY'
          ? currentPrice * 0.99 // 1% trailing stop
          : currentPrice * 1.01;

        const shouldUpdate = position.direction === 'BUY' 
          ? newStopLoss > (position.stopLoss || 0)
          : newStopLoss < (position.stopLoss || Infinity);

        if (shouldUpdate) {
          const success = await this.alpacaAPI.updateStopLoss(position.dealId, newStopLoss);
          if (success) {
            position.stopLoss = newStopLoss;
            console.log(`Stop loss updated for ${position.dealId}: ${newStopLoss}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error adjusting stop loss for ${position.dealId}:`, error);
    }
  }

  private updatePositionPnL(marketData: MarketData): void {
    this.positions.forEach((position, dealId) => {
      if (position.symbol === marketData.symbol) {
        position.currentPrice = (marketData.bid + marketData.ask) / 2;
        
        const priceChange = position.direction === 'BUY'
          ? position.currentPrice - position.entryPrice
          : position.entryPrice - position.currentPrice;
        
        position.pnl = priceChange * position.size;
        
        // Update in risk manager
        this.riskManager.updatePosition(position);
      }
    });
  }

  private async assessRisk(): Promise<void> {
    try {
      const riskMetrics = await this.riskManager.getRiskMetrics();
      
      console.log('Production Risk Assessment:', {
        currentDrawdown: `${(riskMetrics.currentDrawdown * 100).toFixed(2)}%`,
        dailyPnL: riskMetrics.dailyPnL.toFixed(2),
        totalRisk: `${(riskMetrics.totalRisk * 100).toFixed(1)}%`,
        portfolioValue: riskMetrics.portfolioValue.toFixed(2)
      });
    } catch (error) {
      console.error('Error assessing risk:', error);
    }
  }

  private async checkKillSwitch(): Promise<void> {
    try {
      const killSwitch = await this.riskManager.getKillSwitchStatus();
      
      if (killSwitch.active) {
        const newLevel = killSwitch.level || 3;
        
        // Only log if level changed
        if (newLevel !== this.killSwitchLevel) {
          console.log(`Kill switch activated - Level ${newLevel}: ${killSwitch.reason}`);
          this.killSwitchLevel = newLevel;
        }
        
        // Handle kill switch levels
        switch (this.killSwitchLevel) {
          case 1:
            // Level 1: Warning - reduce position sizes (handled in evaluateAndExecuteTrade)
            console.log('Kill Switch Level 1: Position sizes reduced by 50%');
            break;
            
          case 2:
            // Level 2: Caution - halt all new trades (handled in evaluateAndExecuteTrade)
            console.log('Kill Switch Level 2: New trades halted');
            break;
            
          case 3:
            // Level 3: Emergency - close all positions and stop trading
            console.log('Kill Switch Level 3: Emergency shutdown - closing all positions');
            await this.emergencyShutdown(killSwitch.reason || 'Level 3 kill switch');
            break;
        }
      } else if (this.killSwitchLevel > 0) {
        // Kill switch deactivated - reset level
        console.log('Kill switch deactivated - resuming normal operations');
        this.killSwitchLevel = 0;
      }
    } catch (error) {
      console.error('Error checking kill switch:', error);
    }
  }

  private async emergencyShutdown(reason: string): Promise<void> {
    try {
      console.log(`EMERGENCY SHUTDOWN: ${reason}`);
      
      // Close all open positions
      const closePromises = Array.from(this.positions.keys()).map(dealId =>
        this.closePosition(dealId, `Emergency shutdown: ${reason}`)
      );
      
      await Promise.all(closePromises);
      
      // Stop the trading engine
      this.stop();
      
      // Log emergency shutdown
      await supabase.from('system_logs').insert({
        session_id: this.sessionId,
        level: 'CRITICAL',
        module: 'TradingEngine',
        message: `Emergency shutdown executed: ${reason}`,
        details: {
          positions_closed: closePromises.length,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('Emergency shutdown completed');
    } catch (error) {
      console.error('Error during emergency shutdown:', error);
    }
  }

  // Public methods for UI
  getCurrentPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  getMarketData(): MarketData[] {
    return Array.from(this.marketData.values());
  }

  getSessionId(): string {
    return this.sessionId;
  }

  isEngineRunning(): boolean {
    return this.isRunning;
  }

  async generateDailyReport(): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('daily-report-generator', {
        body: {
          sessionId: this.sessionId,
          date: new Date().toISOString().split('T')[0]
        }
      });

      if (error) {
        console.error('Daily report generation error:', error);
      } else {
        console.log('Daily report generated:', data);
        
        // Phase 5: Trigger CentralAI reward calculation and ARK feedback
        if (data.report) {
          await this.triggerARKFeedbackLoop(data.report);
        }
      }
    } catch (error) {
      console.error('Error generating daily report:', error);
    }
  }

  private async triggerARKFeedbackLoop(dailyReport: any): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('ark-feedback-loop', {
        body: {
          sessionId: this.sessionId,
          dailyReport
        }
      });

      if (error) {
        console.error('ARK feedback loop error:', error);
      } else {
        console.log('ARK feedback loop completed:', data);
      }
    } catch (error) {
      console.error('Error in ARK feedback loop:', error);
    }
  }
}