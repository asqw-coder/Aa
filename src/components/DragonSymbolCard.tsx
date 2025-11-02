import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Target, 
  Clock,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  Brain
} from "lucide-react";

interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entry: number;
  current: number;
  pnl: number;
  confidence: number;
  model: 'LSTM' | 'XGBoost' | 'Transformer';
  timestamp: string;
  reason: string;
}

interface SymbolData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  trades: Trade[];
  totalPnL: number;
  winRate: number;
  rsi: number;
  macd: number;
  prediction: {
    direction: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    model: string;
  };
}

interface DragonSymbolCardProps {
  symbolData: SymbolData;
}

export const DragonSymbolCard = ({ symbolData }: DragonSymbolCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isPositive = symbolData.change >= 0;
  const pnlColor = symbolData.totalPnL >= 0 ? 'success' : 'destructive';
  
  return (
    <div className="dragon-symbol-card p-6">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full dragon-border bg-dragon-scale flex items-center justify-center">
                  <span className="dragon-title text-lg">{symbolData.symbol.slice(0, 3)}</span>
                </div>
                <div>
                  <h3 className="dragon-title text-xl">{symbolData.symbol}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-foreground">${symbolData.price.toFixed(4)}</span>
                    <Badge variant={isPositive ? "default" : "destructive"} className="dragon-glow">
                      {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {symbolData.changePercent > 0 ? '+' : ''}{symbolData.changePercent.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className={`text-lg font-bold ${pnlColor === 'success' ? 'text-success' : 'text-destructive'}`}>
                    {symbolData.totalPnL >= 0 ? '+' : ''}${symbolData.totalPnL.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total P&L</div>
                </div>
                
                {isExpanded ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-primary" />}
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center p-2 rounded dragon-border bg-dragon-scale/20">
                <div className="text-sm text-muted-foreground">Win Rate</div>
                <div className="text-lg font-bold text-primary">{symbolData.winRate}%</div>
              </div>
              <div className="text-center p-2 rounded dragon-border bg-dragon-scale/20">
                <div className="text-sm text-muted-foreground">RSI</div>
                <div className={`text-lg font-bold ${symbolData.rsi > 70 ? 'text-destructive' : symbolData.rsi < 30 ? 'text-success' : 'text-foreground'}`}>
                  {symbolData.rsi.toFixed(0)}
                </div>
              </div>
              <div className="text-center p-2 rounded dragon-border bg-dragon-scale/20">
                <div className="text-sm text-muted-foreground">Trades</div>
                <div className="text-lg font-bold text-foreground">{symbolData.trades.length}</div>
              </div>
              <div className="text-center p-2 rounded dragon-border bg-dragon-scale/20">
                <div className="text-sm text-muted-foreground">Prediction</div>
                <div className={`text-lg font-bold ${symbolData.prediction.direction === 'BUY' ? 'text-success' : symbolData.prediction.direction === 'SELL' ? 'text-destructive' : 'text-warning'}`}>
                  {symbolData.prediction.direction}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4">
          {/* AI Prediction Section */}
          <div className="dragon-card p-4 bg-dragon-scale/10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="dragon-title text-lg flex items-center">
                <Brain className="w-5 h-5 mr-2 text-primary" />
                AI Prediction Analysis
              </h4>
              <Badge variant="outline" className="dragon-border text-primary">
                {symbolData.prediction.confidence}% Confidence
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Direction</div>
                <div className={`text-xl font-bold ${symbolData.prediction.direction === 'BUY' ? 'text-success' : symbolData.prediction.direction === 'SELL' ? 'text-destructive' : 'text-warning'}`}>
                  {symbolData.prediction.direction}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Model</div>
                <div className="text-lg font-semibold text-primary">{symbolData.prediction.model}</div>
              </div>
            </div>
            
            <div className="mt-3">
              <div className="text-sm text-muted-foreground mb-1">Confidence Level</div>
              <Progress value={symbolData.prediction.confidence} className="h-2" />
            </div>
          </div>

          {/* Active Trades Section */}
          {symbolData.trades.length > 0 && (
            <div className="dragon-card p-4 bg-dragon-scale/10">
              <h4 className="dragon-title text-lg mb-3 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-primary" />
                Active Trades ({symbolData.trades.length})
              </h4>
              
              <div className="space-y-3">
                {symbolData.trades.map((trade, index) => (
                  <div key={trade.id} className="dragon-border rounded p-3 bg-card/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={trade.type === 'BUY' ? "default" : "destructive"} className="dragon-glow">
                          {trade.type === 'BUY' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {trade.type}
                        </Badge>
                        <span className="font-semibold text-foreground">{trade.symbol}</span>
                      </div>
                      <div className={`font-bold ${trade.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Entry</div>
                        <div className="font-semibold">${trade.entry.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Current</div>
                        <div className="font-semibold">${trade.current.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Model</div>
                        <div className="font-semibold text-primary">{trade.model}</div>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">Confidence: {trade.confidence}%</div>
                      <Progress value={trade.confidence} className="h-1" />
                    </div>
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(trade.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Indicators */}
          <div className="dragon-card p-4 bg-dragon-scale/10">
            <h4 className="dragon-title text-lg mb-3 flex items-center">
              <Target className="w-5 h-5 mr-2 text-primary" />
              Technical Analysis
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">RSI (14)</span>
                    <span className={`font-bold ${symbolData.rsi > 70 ? 'text-destructive' : symbolData.rsi < 30 ? 'text-success' : 'text-foreground'}`}>
                      {symbolData.rsi.toFixed(1)}
                    </span>
                  </div>
                  <Progress value={symbolData.rsi} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">MACD</span>
                    <span className={`font-bold ${symbolData.macd >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {symbolData.macd.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Volume</div>
                  <div className="text-lg font-bold text-foreground">{symbolData.volume.toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground mb-1">24h Change</div>
                  <div className={`text-lg font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    {isPositive ? '+' : ''}{symbolData.change.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button variant="outline" className="flex-1 dragon-border hover:dragon-glow">
              <Shield className="w-4 h-4 mr-2" />
              Risk Analysis
            </Button>
            <Button variant="outline" className="flex-1 dragon-border hover:dragon-glow">
              <Zap className="w-4 h-4 mr-2" />
              Manual Trade
            </Button>
            <Button variant="outline" className="flex-1 dragon-border hover:dragon-glow">
              <DollarSign className="w-4 h-4 mr-2" />
              Trade History
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};