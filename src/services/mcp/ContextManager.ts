/**
 * Context Manager
 * Manages trading context state, persistence, and synchronization
 */

import { supabase } from '@/integrations/supabase/client';
import { TradingContext, RiskMetrics, Position, MarketData } from './MCPProtocol';
import { StorageManager } from '../StorageManager';

export class ContextManager {
  private contexts: Map<string, TradingContext> = new Map();
  private storageManager: StorageManager;
  private autoSaveInterval: number = 300000; // 5 minutes
  private saveTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.storageManager = StorageManager.getInstance();
  }

  /**
   * Create a new trading context
   */
  async createContext(
    sessionId: string,
    userId?: string,
    arkId?: string
  ): Promise<TradingContext> {
    const context: TradingContext = {
      sessionId,
      userId,
      arkId,
      marketData: new Map(),
      symbols: [],
      riskMetrics: this.getDefaultRiskMetrics(),
      killSwitchLevel: 0,
      positions: new Map(),
      arkState: {
        learningRate: 0.001,
        adaptationScore: 0,
        confidenceLevel: 0.5,
        recentPerformance: [],
        activeStrategy: 'balanced',
        memoryState: {}
      },
      centralAIState: {},
      modelPerformance: new Map(),
      credentials: null,
      tradingMode: 'paper',
      userSettings: new Map(),
      timestamp: new Date().toISOString(),
      traceId: crypto.randomUUID()
    };

    this.contexts.set(sessionId, context);
    await this.saveContext(sessionId);
    this.scheduleAutoSave(sessionId);

    return context;
  }

  /**
   * Get existing context
   */
  async getContext(sessionId: string): Promise<TradingContext | null> {
    // Check memory first
    let context = this.contexts.get(sessionId);
    
    if (!context) {
      // Try to load from database
      context = await this.loadContext(sessionId);
      if (context) {
        this.contexts.set(sessionId, context);
        this.scheduleAutoSave(sessionId);
      }
    }

    return context || null;
  }

  /**
   * Update context with partial changes
   */
  async updateContext(
    sessionId: string,
    updates: Partial<TradingContext>
  ): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error(`Context not found: ${sessionId}`);
    }

    // Merge updates
    Object.assign(context, updates);
    context.timestamp = new Date().toISOString();

    // Don't await save - let it happen in background
    this.saveContext(sessionId).catch(err => {
      console.error(`Failed to save context ${sessionId}:`, err);
    });
  }

  /**
   * Save context to database
   */
  async saveContext(sessionId: string): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (!context) return;

    // Convert Maps to objects for JSON storage
    const serializedContext = {
      ...context,
      marketData: Object.fromEntries(context.marketData),
      positions: Object.fromEntries(context.positions),
      modelPerformance: Object.fromEntries(context.modelPerformance),
      userSettings: Object.fromEntries(context.userSettings)
    };

    const { error } = await supabase
      .from('mcp_contexts')
      .upsert({
        session_id: sessionId,
        user_id: context.userId,
        context_data: serializedContext,
        updated_at: new Date().toISOString(),
        last_accessed: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to save context:', error);
      throw error;
    }
  }

  /**
   * Load context from database
   */
  async loadContext(sessionId: string): Promise<TradingContext | null> {
    const { data, error } = await supabase
      .from('mcp_contexts')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error || !data) return null;

    // Deserialize Maps from objects
    const contextData = data.context_data as any;
    const context: TradingContext = {
      ...contextData,
      marketData: new Map(Object.entries(contextData.marketData || {})),
      positions: new Map(Object.entries(contextData.positions || {})),
      modelPerformance: new Map(Object.entries(contextData.modelPerformance || {})),
      userSettings: new Map(Object.entries(contextData.userSettings || {}))
    };

    // Update last accessed
    await supabase
      .from('mcp_contexts')
      .update({ last_accessed: new Date().toISOString() })
      .eq('session_id', sessionId);

    return context;
  }

  /**
   * Update market data for a symbol
   */
  async updateMarketData(
    sessionId: string,
    symbol: string,
    data: MarketData
  ): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error(`Context not found: ${sessionId}`);
    }

    const existingData = context.marketData.get(symbol) || [];
    existingData.push(data);

    // Keep only last 100 data points in memory
    if (existingData.length > 100) {
      existingData.shift();
    }

    context.marketData.set(symbol, existingData);
    context.timestamp = new Date().toISOString();
  }

  /**
   * Update risk metrics
   */
  async updateRiskMetrics(
    sessionId: string,
    metrics: Partial<RiskMetrics>
  ): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error(`Context not found: ${sessionId}`);
    }

    Object.assign(context.riskMetrics, metrics);
    context.timestamp = new Date().toISOString();
  }

  /**
   * Update positions
   */
  async updatePositions(
    sessionId: string,
    positions: Map<string, Position>
  ): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (!context) {
      throw new Error(`Context not found: ${sessionId}`);
    }

    context.positions = positions;
    context.timestamp = new Date().toISOString();
  }

  /**
   * Delete context
   */
  async deleteContext(sessionId: string): Promise<void> {
    // Clear auto-save timer
    const timer = this.saveTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.saveTimers.delete(sessionId);
    }

    // Remove from memory
    this.contexts.delete(sessionId);

    // Delete from database
    await supabase
      .from('mcp_contexts')
      .delete()
      .eq('session_id', sessionId);
  }

  /**
   * Schedule auto-save for context
   */
  private scheduleAutoSave(sessionId: string): void {
    // Clear existing timer
    const existingTimer = this.saveTimers.get(sessionId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Set new timer
    const timer = setInterval(() => {
      this.saveContext(sessionId).catch(err => {
        console.error(`Auto-save failed for ${sessionId}:`, err);
      });
    }, this.autoSaveInterval);

    this.saveTimers.set(sessionId, timer);
  }

  /**
   * Get default risk metrics
   */
  private getDefaultRiskMetrics(): RiskMetrics {
    return {
      dailyDrawdown: 0,
      maxDrawdown: 0,
      currentExposure: 0,
      maxExposure: 10000,
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0
    };
  }

  /**
   * Clean up old contexts (older than 7 days)
   */
  async cleanupOldContexts(): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('mcp_contexts')
      .delete()
      .lt('last_accessed', sevenDaysAgo.toISOString())
      .select('session_id');

    if (error) {
      console.error('Failed to cleanup old contexts:', error);
      return 0;
    }

    return data?.length || 0;
  }
}
