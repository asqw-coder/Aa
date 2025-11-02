/**
 * Tool Registry
 * Manages registration, discovery, and execution of MCP tools
 */

import { MCPTool, ToolCategory } from './MCPProtocol';

export class ToolRegistry {
  private tools: Map<string, MCPTool> = new Map();
  private toolsByCategory: Map<ToolCategory, Set<string>> = new Map();

  constructor() {
    // Initialize category sets
    const categories: ToolCategory[] = [
      'prediction',
      'risk',
      'sentiment',
      'data',
      'training',
      'storage',
      'reporting'
    ];
    
    categories.forEach(cat => {
      this.toolsByCategory.set(cat, new Set());
    });
  }

  /**
   * Register a new tool
   */
  register(tool: MCPTool): void {
    // Validate tool
    this.validateTool(tool);

    // Register tool
    this.tools.set(tool.name, tool);

    // Add to category index
    const categorySet = this.toolsByCategory.get(tool.category);
    if (categorySet) {
      categorySet.add(tool.name);
    }

    console.log(`✅ Registered tool: ${tool.name} (${tool.category})`);
  }

  /**
   * Register multiple tools at once
   */
  registerBatch(tools: MCPTool[]): void {
    tools.forEach(tool => this.register(tool));
  }

  /**
   * Unregister a tool
   */
  unregister(toolName: string): void {
    const tool = this.tools.get(toolName);
    if (!tool) return;

    // Remove from tools map
    this.tools.delete(toolName);

    // Remove from category index
    const categorySet = this.toolsByCategory.get(tool.category);
    if (categorySet) {
      categorySet.delete(toolName);
    }

    console.log(`❌ Unregistered tool: ${toolName}`);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools in a category
   */
  getToolsByCategory(category: ToolCategory): MCPTool[] {
    const toolNames = this.toolsByCategory.get(category);
    if (!toolNames) return [];

    return Array.from(toolNames)
      .map(name => this.tools.get(name))
      .filter((tool): tool is MCPTool => tool !== undefined);
  }

  /**
   * List all registered tools
   */
  listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool metadata (without handler function)
   */
  getToolMetadata(name: string): Omit<MCPTool, 'handler'> | undefined {
    const tool = this.tools.get(name);
    if (!tool) return undefined;

    const { handler, ...metadata } = tool;
    return metadata;
  }

  /**
   * List all tool metadata
   */
  listToolMetadata(): Array<Omit<MCPTool, 'handler'>> {
    return this.listTools().map(tool => {
      const { handler, ...metadata } = tool;
      return metadata;
    });
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get tools by execution mode
   */
  getToolsByExecutionMode(mode: 'sync' | 'async' | 'background'): MCPTool[] {
    return this.listTools().filter(tool => tool.executionMode === mode);
  }

  /**
   * Get cacheable tools
   */
  getCacheableTools(): MCPTool[] {
    return this.listTools().filter(tool => tool.cacheable);
  }

  /**
   * Validate tool definition
   */
  private validateTool(tool: MCPTool): void {
    if (!tool.name) {
      throw new Error('Tool name is required');
    }

    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    if (!tool.handler || typeof tool.handler !== 'function') {
      throw new Error(`Tool handler must be a function: ${tool.name}`);
    }

    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      throw new Error(`Tool inputSchema is required: ${tool.name}`);
    }

    if (!tool.permissions) {
      throw new Error(`Tool permissions are required: ${tool.name}`);
    }

    if (!tool.executionMode) {
      throw new Error(`Tool executionMode is required: ${tool.name}`);
    }

    // Validate background mode has queue
    if (tool.executionMode === 'background' && !tool.backgroundJobQueue) {
      throw new Error(
        `Background tools must specify backgroundJobQueue: ${tool.name}`
      );
    }

    // Validate cacheable tools have TTL
    if (tool.cacheable && !tool.cacheTTL) {
      throw new Error(`Cacheable tools must specify cacheTTL: ${tool.name}`);
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalTools: number;
    byCategory: Record<string, number>;
    byExecutionMode: Record<string, number>;
    cacheable: number;
  } {
    const tools = this.listTools();

    const byCategory: Record<string, number> = {};
    this.toolsByCategory.forEach((toolNames, category) => {
      byCategory[category] = toolNames.size;
    });

    const byExecutionMode: Record<string, number> = {
      sync: 0,
      async: 0,
      background: 0
    };

    tools.forEach(tool => {
      byExecutionMode[tool.executionMode]++;
    });

    return {
      totalTools: tools.length,
      byCategory,
      byExecutionMode,
      cacheable: this.getCacheableTools().length
    };
  }
}
