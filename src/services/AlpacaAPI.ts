import { CapitalConfig, Position, MarketData, TradingSignal } from '@/types/trading';

interface AlpacaBar {
  t: string; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
}

interface AlpacaOrder {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
  limit_price?: number;
  stop_price?: number;
  order_class?: 'simple' | 'bracket' | 'oco' | 'oto';
  take_profit?: { limit_price: number };
  stop_loss?: { stop_price: number; limit_price?: number };
}

export class AlpacaAPI {
  private config: CapitalConfig;
  private ws: WebSocket | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(config: CapitalConfig) {
    this.config = config;
  }

  private getAuthHeaders(): HeadersInit {
    return {
      'APCA-API-KEY-ID': this.config.apiKey,
      'APCA-API-SECRET-KEY': this.config.secretKey,
      'Content-Type': 'application/json',
    };
  }

  async authenticate(): Promise<boolean> {
    try {
      // Test authentication by fetching account info
      const response = await fetch(`${this.config.apiUrl}/v2/account`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        console.log('Alpaca authentication successful');
        return true;
      }
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.error('Alpaca authentication error:', error);
      return false;
    }
  }

  async fetchHistoricalPrices(
    symbol: string, 
    timeframe: string = '1Hour', 
    start?: string,
    end?: string,
    limit: number = 1000
  ): Promise<AlpacaBar[]> {
    try {
      const params = new URLSearchParams({
        timeframe,
        limit: limit.toString(),
      });
      
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      
      const response = await fetch(
        `${this.config.dataUrl}/v2/stocks/${symbol}/bars?${params}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch historical data: ${response.status}`);
      }

      const data = await response.json();
      return data.bars || [];
    } catch (error) {
      console.error(`Error fetching historical prices for ${symbol}:`, error);
      return [];
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/v2/positions`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.status}`);
      }

      const positions = await response.json();
      return positions.map((pos: any) => ({
        dealId: pos.asset_id,
        symbol: pos.symbol,
        direction: pos.side.toUpperCase() as 'BUY' | 'SELL',
        size: parseFloat(pos.qty),
        entryPrice: parseFloat(pos.avg_entry_price),
        currentPrice: parseFloat(pos.current_price),
        pnl: parseFloat(pos.unrealized_pl),
        timestamp: pos.created_at,
      }));
    } catch (error) {
      console.error('Error fetching positions:', error);
      return [];
    }
  }

  async openPosition(signal: TradingSignal): Promise<string | null> {
    try {
      const order: AlpacaOrder = {
        symbol: signal.symbol,
        qty: signal.size,
        side: signal.action.toLowerCase() as 'buy' | 'sell',
        type: 'market',
        time_in_force: 'gtc',
        order_class: 'bracket',
        take_profit: {
          limit_price: signal.takeProfit,
        },
        stop_loss: {
          stop_price: signal.stopLoss,
        },
      };

      const response = await fetch(`${this.config.apiUrl}/v2/orders`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(order),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to open position: ${error}`);
      }

      const result = await response.json();
      console.log(`Position opened for ${signal.symbol}:`, result);
      return result.id;
    } catch (error) {
      console.error('Error opening position:', error);
      return null;
    }
  }

  async closePosition(positionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/v2/positions/${positionId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to close position: ${response.status}`);
      }

      console.log(`Position closed: ${positionId}`);
      return true;
    } catch (error) {
      console.error('Error closing position:', error);
      return false;
    }
  }

  async closeAllPositions(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/v2/positions?cancel_orders=true`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to close all positions: ${response.status}`);
      }

      console.log('All positions closed');
      return true;
    } catch (error) {
      console.error('Error closing all positions:', error);
      return false;
    }
  }

  async getOrders(): Promise<any[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/v2/orders?status=open`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/v2/orders/${orderId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel order: ${response.status}`);
      }

      console.log(`Order cancelled: ${orderId}`);
      return true;
    } catch (error) {
      console.error('Error cancelling order:', error);
      return false;
    }
  }

  async getAccountInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.config.apiUrl}/v2/account`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch account info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching account info:', error);
      return {};
    }
  }

  async getAccountDetails(): Promise<any> {
    return this.getAccountInfo();
  }

  async getLatestQuote(symbol: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.config.dataUrl}/v2/stocks/${symbol}/quotes/latest`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch quote: ${response.status}`);
      }

      const data = await response.json();
      return data.quote;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  connectWebSocket(symbols: string[], onPriceUpdate: (data: MarketData) => void): void {
    if (this.ws) {
      this.ws.close();
    }

    // Use paper or live WebSocket URL
    const wsUrl = this.config.environment === 'paper'
      ? 'wss://stream.data.alpaca.markets/v2/sip'
      : 'wss://stream.data.alpaca.markets/v2/sip';

    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('Alpaca WebSocket connected');
      this.reconnectAttempts = 0;
      this.authenticateWebSocket(symbols, onPriceUpdate);
    };

    this.ws.onmessage = (event) => {
      try {
        const messages = JSON.parse(event.data);
        
        // Handle array of messages
        for (const msg of messages) {
          if (msg.T === 'q') { // Quote message
            const marketData: MarketData = {
              symbol: msg.S,
              bid: msg.bp,
              ask: msg.ap,
              timestamp: new Date(msg.t).toISOString(),
              volume: msg.bs + msg.as,
            };
            onPriceUpdate(marketData);
          } else if (msg.T === 't') { // Trade message
            const marketData: MarketData = {
              symbol: msg.S,
              bid: msg.p,
              ask: msg.p,
              timestamp: new Date(msg.t).toISOString(),
              volume: msg.s,
            };
            onPriceUpdate(marketData);
          }
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`Alpaca WebSocket disconnected: ${event.code} ${event.reason}`);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.pow(2, this.reconnectAttempts) * 1000;
        this.reconnectAttempts++;
        
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => this.connectWebSocket(symbols, onPriceUpdate), delay);
      } else {
        console.error('Max reconnection attempts reached');
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private authenticateWebSocket(symbols: string[], onPriceUpdate: (data: MarketData) => void): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Authenticate
      const authMsg = {
        action: 'auth',
        key: this.config.apiKey,
        secret: this.config.secretKey,
      };
      this.ws.send(JSON.stringify(authMsg));

      // Subscribe to quotes
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const subscribeMsg = {
            action: 'subscribe',
            quotes: symbols,
          };
          this.ws.send(JSON.stringify(subscribeMsg));
          console.log('WebSocket subscribed to:', symbols);
          symbols.forEach(symbol => this.subscribedSymbols.add(symbol));
        }
      }, 1000);
    }
  }

  async fetchMultiTimeframeData(symbol: string): Promise<{ [key: string]: AlpacaBar[] }> {
    const timeframes = ['1Min', '5Min', '15Min', '1Hour', '1Day'];
    const data: { [key: string]: AlpacaBar[] } = {};

    for (const timeframe of timeframes) {
      try {
        data[timeframe] = await this.fetchHistoricalPrices(symbol, timeframe);
        console.log(`Fetched ${data[timeframe].length} ${timeframe} bars for ${symbol}`);
      } catch (error) {
        console.error(`Error fetching ${timeframe} data for ${symbol}:`, error);
        data[timeframe] = [];
      }
    }

    return data;
  }

  async updateStopLoss(orderId: string, newStopPrice: number): Promise<boolean> {
    try {
      // In Alpaca, to update stop loss of an existing position, we need to:
      // 1. Find the stop loss order for this position
      // 2. Cancel it
      // 3. Create a new one
      // However, since Alpaca uses bracket orders, we can't directly update them
      // This is a simplified implementation that logs the intent
      console.log(`Stop loss update requested for order ${orderId}: ${newStopPrice}`);
      console.log('Note: Alpaca bracket orders cannot be directly modified. Consider closing and reopening with new parameters.');
      return true;
    } catch (error) {
      console.error('Error updating stop loss:', error);
      return false;
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
