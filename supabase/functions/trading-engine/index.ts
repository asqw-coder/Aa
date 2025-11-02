import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Configuration Manager
class ConfigManager {
  private config: Map<string, string> = new Map();
  private credentials: any = null;
  private symbols: string[] = [];

  async loadConfig(credentials?: any, symbols?: string[]): Promise<void> {
    console.log('Loading configuration...');
    
    // Store credentials and symbols from request
    if (credentials) {
      this.credentials = credentials;
      console.log('Using credentials from request');
    }
    
    if (symbols && symbols.length > 0) {
      this.symbols = symbols;
      console.log(`Using ${symbols.length} symbols from request`);
    } else {
      // Fallback to defaults if no symbols provided
      this.symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'];
      console.log('Using default symbols');
    }
    
    console.log('Configuration loaded successfully');
  }

  get(key: string, defaultValue?: string): string {
    return this.config.get(key) ?? defaultValue ?? '';
  }

  getCredentials(): any {
    return this.credentials;
  }

  getSymbols(): string[] {
    return this.symbols;
  }

  async updateConfig(key: string, value: string): Promise<void> {
    this.config.set(key, value);
  }
}

// System Logger
class SystemLogger {
  async log(level: string, module: string, message: string, details?: any, sessionId?: string): Promise<void> {
    const { error } = await supabase
      .from('system_logs')
      .insert({
        level,
        module,
        message,
        details,
        session_id: sessionId
      });

    if (error) {
      console.error('Failed to log to database:', error);
    }
    
    // Also log to console
    console.log(`[${level}] ${module}: ${message}`, details || '');
  }
}

// Alpaca WebSocket Manager
class AlpacaWebSocketManager {
  private ws: WebSocket | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private config: ConfigManager;
  private logger: SystemLogger;
  private onPriceUpdate: (data: any) => void;
  private authenticated: boolean = false;

  constructor(config: ConfigManager, logger: SystemLogger, onPriceUpdate: (data: any) => void) {
    this.config = config;
    this.logger = logger;
    this.onPriceUpdate = onPriceUpdate;
  }

  async connect(symbols: string[]): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    
    const credentials = this.config.getCredentials();
    if (!credentials?.apiKey || !credentials?.apiSecret) {
      throw new Error('Alpaca credentials are required');
    }
    
    const wsUrl = 'wss://stream.data.alpaca.markets/v2/iex';
    await this.logger.log('INFO', 'WebSocket', `Connecting to Alpaca at ${wsUrl}...`);
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      this.logger.log('INFO', 'WebSocket', 'Connected to Alpaca successfully');
      this.reconnectAttempts = 0;
      this.authenticateAndSubscribe(symbols, credentials);
    };

    this.ws.onmessage = (event) => {
      try {
        const messages = JSON.parse(event.data);
        if (Array.isArray(messages)) {
          messages.forEach(msg => this.handleMessage(msg));
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.log('ERROR', 'WebSocket', 'Failed to parse message', { error: errorMessage });
      }
    };

    this.ws.onclose = (event) => {
      this.logger.log('WARNING', 'WebSocket', `Disconnected: ${event.code} ${event.reason}`);
      this.authenticated = false;
      this.handleReconnect(symbols);
    };

    this.ws.onerror = (error) => {
      this.logger.log('ERROR', 'WebSocket', 'WebSocket error', { error });
    };
  }

  private authenticateAndSubscribe(symbols: string[], credentials: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    // Authenticate with Alpaca
    const authMessage = {
      action: 'auth',
      key: credentials.apiKey,
      secret: credentials.apiSecret
    };
    
    this.ws.send(JSON.stringify(authMessage));
    this.logger.log('INFO', 'WebSocket', 'Sent authentication message');
    
    // Subscribe to symbols after authentication
    setTimeout(() => {
      if (this.authenticated) {
        this.subscribeToSymbols(symbols);
      }
    }, 1000);
  }

  private subscribeToSymbols(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const subscribeMessage = {
      action: 'subscribe',
      trades: symbols,
      quotes: symbols,
      bars: symbols
    };
    
    this.ws.send(JSON.stringify(subscribeMessage));
    symbols.forEach(symbol => this.subscribedSymbols.add(symbol));
    
    this.logger.log('INFO', 'WebSocket', 'Subscribed to symbols', { 
      symbols,
      count: symbols.length 
    });
  }

  private handleMessage(msg: any): void {
    if (msg.T === 'success' && msg.msg === 'authenticated') {
      this.authenticated = true;
      this.logger.log('INFO', 'WebSocket', 'Successfully authenticated with Alpaca');
      return;
    }

    if (msg.T === 'error') {
      this.logger.log('ERROR', 'WebSocket', 'Alpaca error', { error: msg.msg, code: msg.code });
      return;
    }

    // Handle quote updates (bid/ask)
    if (msg.T === 'q') {
      const marketData = {
        symbol: msg.S,
        bid: msg.bp,
        ask: msg.ap,
        timestamp: msg.t,
        bidSize: msg.bs,
        askSize: msg.as
      };
      
      this.cacheMarketData(marketData);
      this.onPriceUpdate(marketData);
    }

    // Handle trade updates
    if (msg.T === 't') {
      const marketData = {
        symbol: msg.S,
        price: msg.p,
        size: msg.s,
        timestamp: msg.t
      };
      
      this.cacheMarketData(marketData);
      this.onPriceUpdate(marketData);
    }
  }

  private async cacheMarketData(data: any): Promise<void> {
    const { error } = await supabase
      .from('market_data_cache')
      .insert({
        symbol: data.symbol,
        bid: data.bid,
        ask: data.ask,
        volume: data.size || data.bidSize,
        timestamp: data.timestamp
      });

    if (error) {
      await this.logger.log('ERROR', 'MarketDataCache', 'Failed to cache market data', { error: error.message });
    }
  }

  private handleReconnect(symbols: string[]): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      this.reconnectAttempts++;
      
      this.logger.log('INFO', 'WebSocket', `Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        this.connect(symbols);
      }, delay);
    } else {
      this.logger.log('CRITICAL', 'WebSocket', 'Max reconnection attempts reached');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribedSymbols.clear();
  }
}

// Trading Session Manager
class TradingSessionManager {
  private sessionId: string | null = null;
  private config: ConfigManager;
  private logger: SystemLogger;

  constructor(config: ConfigManager, logger: SystemLogger) {
    this.config = config;
    this.logger = logger;
  }

  async startSession(): Promise<string> {
    const mode = this.config.get('ACCOUNT_MODE', 'demo');
    const initialBalance = 10000; // Default balance

    const { data, error } = await supabase
      .from('trading_sessions')
      .insert({
        mode,
        initial_balance: initialBalance,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to start session: ${error.message}`);
    
    this.sessionId = data.id;
    await this.logger.log('INFO', 'TradingSession', 'New trading session started', { 
      sessionId: this.sessionId, 
      mode, 
      initialBalance 
    });

    return this.sessionId || '';
  }

  async stopSession(): Promise<void> {
    if (!this.sessionId) return;

    const { error } = await supabase
      .from('trading_sessions')
      .update({ 
        status: 'stopped',
        session_end: new Date().toISOString()
      })
      .eq('id', this.sessionId);

    if (error) {
      await this.logger.log('ERROR', 'TradingSession', 'Failed to stop session', { error: error.message });
    } else {
      await this.logger.log('INFO', 'TradingSession', 'Trading session stopped', { sessionId: this.sessionId });
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}

// Main Trading Engine
class TradingEngine {
  private config: ConfigManager = new ConfigManager();
  private logger: SystemLogger = new SystemLogger();
  private wsManager: AlpacaWebSocketManager;
  private sessionManager: TradingSessionManager;
  private isRunning: boolean = false;

  constructor() {
    this.sessionManager = new TradingSessionManager(this.config, this.logger);
    this.wsManager = new AlpacaWebSocketManager(
      this.config,
      this.logger,
      this.handlePriceUpdate.bind(this)
    );
  }

  async initialize(credentials?: any, symbols?: string[]): Promise<void> {
    try {
      await this.logger.log('INFO', 'TradingEngine', 'Initializing Alpaca trading system...');
      
      if (!credentials?.apiKey || !credentials?.apiSecret) {
        throw new Error('Alpaca API credentials are required');
      }
      
      // Load configuration with credentials and symbols
      await this.config.loadConfig(credentials, symbols);
      
      await this.logger.log('INFO', 'TradingEngine', 'Trading engine initialized successfully', {
        symbolCount: symbols?.length || 0,
        hasCredentials: true
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.log('CRITICAL', 'TradingEngine', 'Failed to initialize', { error: errorMessage });
      throw error;
    }
  }

  async start(): Promise<{ sessionId: string }> {
    if (this.isRunning) {
      throw new Error('Trading engine is already running');
    }

    try {
      // Start new trading session
      const sessionId = await this.sessionManager.startSession();
      
      // Connect to WebSocket with symbols
      const symbols = this.config.getSymbols();
      await this.wsManager.connect(symbols);
      
      // Start market data cleanup routine
      this.scheduleMarketDataCleanup();
      
      this.isRunning = true;
      
      await this.logger.log('INFO', 'TradingEngine', 'Trading engine started', { 
        sessionId,
        symbols: symbols.length 
      });

      return { sessionId };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.log('CRITICAL', 'TradingEngine', 'Failed to start trading engine', { error: errorMessage });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Disconnect WebSocket
      this.wsManager.disconnect();
      
      // Stop trading session
      await this.sessionManager.stopSession();
      
      this.isRunning = false;
      
      await this.logger.log('INFO', 'TradingEngine', 'Trading engine stopped');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.log('ERROR', 'TradingEngine', 'Error during shutdown', { error: errorMessage });
    }
  }

  private handlePriceUpdate(marketData: any): void {
    // This will be called by WebSocket manager for each price update
    // Here we would trigger ML predictions, risk assessments, and trading decisions
    
    // For now, just log the update (in production this would trigger the full trading pipeline)
    console.log(`Price update: ${marketData.symbol} - Bid: ${marketData.bid}, Ask: ${marketData.ask}`);
  }

  private isMarketDay(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // 0 = Sunday, 6 = Saturday
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday only
  }

  private scheduleMarketDataCleanup(): void {
    // Run cleanup every hour to remove market data older than 3 days
    setInterval(async () => {
      try {
        await supabase.rpc('cleanup_old_market_data');
        await this.logger.log('DEBUG', 'MarketDataCleanup', 'Market data cleanup completed');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.logger.log('ERROR', 'MarketDataCleanup', 'Failed to cleanup market data', { error: errorMessage });
      }
    }, 60 * 60 * 1000); // Every hour
  }

  getStatus(): { isRunning: boolean; sessionId: string | null } {
    return {
      isRunning: this.isRunning,
      sessionId: this.sessionManager.getSessionId()
    };
  }
}

// Global trading engine instance
const tradingEngine = new TradingEngine();

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let action = url.searchParams.get('action');
    let body: any = null;
    try {
      body = await req.json();
      if (!action && body?.action) action = body.action;
    } catch (_) {
      // no-op: not all requests have JSON body
    }

    switch (action) {
      case 'initialize':
      case 'start':
        // Extract credentials and symbols from request body
        const credentials = body?.credentials;
        const symbols = body?.symbols;
        
        if (!credentials) {
          return new Response(JSON.stringify({
            error: 'Credentials are required to start the trading engine',
            success: false
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        
        // Initialize and start the trading engine with credentials and symbols
        await tradingEngine.initialize(credentials, symbols);
        const result = await tradingEngine.start();
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Trading engine started successfully',
          ...result
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

      case 'stop':
        await tradingEngine.stop();
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Trading engine stopped successfully'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

      case 'status':
        const status = tradingEngine.getStatus();
        
        return new Response(JSON.stringify({
          success: true,
          ...status
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

      default:
        return new Response(JSON.stringify({
          error: 'Invalid action. Use: start, stop, initialize, or status'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
  } catch (error: unknown) {
    console.error('Trading Engine Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(JSON.stringify({
      error: errorMessage,
      success: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
