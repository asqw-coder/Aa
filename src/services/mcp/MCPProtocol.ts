/**
 * MCP (Model Context Protocol) Core Type Definitions
 * Defines the standardized protocol for AI component communication
 */

import { MarketData } from '@/types/trading';

// Tool execution modes
export type ToolExecutionMode = 'sync' | 'async' | 'background';
export type ToolCategory = 'prediction' | 'risk' | 'sentiment' | 'data' | 'training' | 'storage' | 'reporting';

// Tool definition interface
export interface MCPTool {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  outputSchema: Record<string, any>;
  handler: (params: any, context: TradingContext) => Promise<any>;
  permissions: ToolPermissions;
  cacheable: boolean;
  cacheTTL?: number; // seconds
  executionMode: ToolExecutionMode;
  estimatedDuration?: number; // milliseconds
  backgroundJobQueue?: string; // queue name for background jobs
}

// Tool permissions
export interface ToolPermissions {
  readMarketData: boolean;
  writePositions: boolean;
  accessCredentials: boolean;
  modifySettings: boolean;
  trainModels: boolean;
  executeTrades: boolean;
}

// Unified trading context
export interface TradingContext {
  sessionId: string;
  userId?: string;
  arkId?: string;
  
  // Market state
  marketData: Map<string, MarketData[]>;
  symbols: string[];
  
  // Risk state
  riskMetrics: RiskMetrics;
  killSwitchLevel: number;
  positions: Map<string, Position>;
  
  // AI state
  arkState: ARKState;
  centralAIState: any;
  modelPerformance: Map<string, PerformanceMetrics>;
  
  // Configuration
  credentials: any;
  tradingMode: 'paper' | 'live';
  userSettings: Map<string, any>;
  
  // Metadata
  timestamp: string;
  traceId: string;
}

// Risk metrics
export interface RiskMetrics {
  dailyDrawdown: number;
  maxDrawdown: number;
  currentExposure: number;
  maxExposure: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
}

// Position interface
export interface Position {
  dealId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  openedAt: string;
}

// ARK state
export interface ARKState {
  learningRate: number;
  adaptationScore: number;
  confidenceLevel: number;
  recentPerformance: number[];
  activeStrategy: string;
  memoryState: any;
}

// Performance metrics
export interface PerformanceMetrics {
  accuracy: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  profitFactor: number;
}

// MCP Resource (for StorageManager)
export interface MCPResource {
  uri: string; // e.g., "storage://models/lstm/EURUSD/v1.2.3"
  name: string;
  mimeType: string;
  description: string;
  tier: 'local' | 'supabase' | 'r2' | 'backblaze';
  metadata: Record<string, any>;
}

// Background job status
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundJob {
  id: string;
  toolName: string;
  inputParams: any;
  status: JobStatus;
  progress: number; // 0-100
  result?: any;
  errorMessage?: string;
  priority: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  sessionId?: string;
  userId?: string;
}

// Tool call audit log
export interface ToolCallLog {
  id: string;
  sessionId: string;
  toolName: string;
  inputParams: any;
  outputResult?: any;
  executionTimeMs: number;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

// Tool result cache entry
export interface ToolCacheEntry {
  cacheKey: string;
  toolName: string;
  result: any;
  createdAt: string;
  expiresAt: string;
}

// MCP Action types for edge function
export type MCPAction = 
  | 'start_trading'
  | 'execute_cycle'
  | 'stop_trading'
  | 'get_context'
  | 'get_job_status'
  | 'cancel_job'
  | 'list_tools'
  | 'execute_tool';

// MCP Request/Response interfaces
export interface MCPRequest {
  action: MCPAction;
  sessionId: string;
  params?: any;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

// Learning signal for feedback loop
export interface LearningSignal {
  source: string;
  type: 'reward' | 'punishment' | 'adjustment';
  metric: number;
  metadata: any;
  timestamp: string;
}
