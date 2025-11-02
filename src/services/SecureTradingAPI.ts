import { supabase } from '@/integrations/supabase/client';
import { TradingSignal, Position, MarketData } from '@/types/trading';

interface WorkingOrder {
  epic: string;
  direction: 'BUY' | 'SELL';
  size: number;
  level: number;
  type: 'LIMIT' | 'STOP';
  timeInForce?: 'GOOD_TILL_CANCELLED' | 'GOOD_TILL_DATE';
  goodTillDate?: string;
}

interface HistoricalPrice {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export class SecureTradingAPI {
  private async callSecureAPI(action: string, params: any = {}) {
    const { data, error } = await supabase.functions.invoke('secure-trading-api', {
      body: { action, ...params }
    });

    if (error) {
      console.error('Secure API call failed:', error);
      throw new Error(`API call failed: ${error.message}`);
    }

    return data;
  }

  async fetchHistoricalPrices(epic: string, resolution?: string, maxPoints?: number): Promise<HistoricalPrice[]> {
    try {
      const response = await this.callSecureAPI('fetchHistoricalPrices', { 
        epic, 
        resolution, 
        maxPoints 
      });
      
      // Transform the response to match expected format
      return response.prices || [];
    } catch (error) {
      console.error('Failed to fetch historical prices:', error);
      return [];
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      const response = await this.callSecureAPI('getPositions');
      return response.positions || [];
    } catch (error) {
      console.error('Failed to get positions:', error);
      return [];
    }
  }

  async placeLimitOrder(order: WorkingOrder): Promise<string | null> {
    try {
      const response = await this.callSecureAPI('placeLimitOrder', { order });
      return response.dealReference || null;
    } catch (error) {
      console.error('Failed to place limit order:', error);
      return null;
    }
  }

  async getWorkingOrders(): Promise<any[]> {
    try {
      const response = await this.callSecureAPI('getWorkingOrders');
      return response.workingOrders || [];
    } catch (error) {
      console.error('Failed to get working orders:', error);
      return [];
    }
  }

  async cancelWorkingOrder(dealId: string): Promise<boolean> {
    try {
      const response = await this.callSecureAPI('cancelWorkingOrder', { dealId });
      return response.success || false;
    } catch (error) {
      console.error('Failed to cancel working order:', error);
      return false;
    }
  }

  async openPosition(signal: TradingSignal): Promise<string | null> {
    try {
      const response = await this.callSecureAPI('openPosition', { signal });
      return response.dealReference || null;
    } catch (error) {
      console.error('Failed to open position:', error);
      return null;
    }
  }

  async closePosition(dealId: string): Promise<boolean> {
    try {
      const response = await this.callSecureAPI('closePosition', { dealId });
      return response.success || false;
    } catch (error) {
      console.error('Failed to close position:', error);
      return false;
    }
  }

  async updateStopLoss(dealId: string, stopLoss: number): Promise<boolean> {
    try {
      const response = await this.callSecureAPI('updateStopLoss', { dealId, stopLoss });
      return response.success || false;
    } catch (error) {
      console.error('Failed to update stop loss:', error);
      return false;
    }
  }

  async getAccountDetails(): Promise<any> {
    try {
      const response = await this.callSecureAPI('getAccountDetails');
      return response.account || {};
    } catch (error) {
      console.error('Failed to get account details:', error);
      return {};
    }
  }

  async getMarketInfo(epic: string): Promise<any> {
    try {
      const response = await this.callSecureAPI('getMarketInfo', { epic });
      return response.market || {};
    } catch (error) {
      console.error('Failed to get market info:', error);
      return {};
    }
  }

  // Note: Real-time WebSocket connections should also be handled securely
  // This would require a separate WebSocket service or secure proxy
  connectWebSocket(symbols: string[], onPriceUpdate: (data: MarketData) => void): void {
    console.warn('WebSocket connections require additional security implementation');
    // TODO: Implement secure WebSocket connection through edge functions
  }

  disconnect(): void {
    // Clean up any connections
    console.log('Disconnecting from secure trading API');
  }
}

// Export a singleton instance
export const secureTradingAPI = new SecureTradingAPI();