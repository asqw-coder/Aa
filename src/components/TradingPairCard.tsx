import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, TrendingUp, TrendingDown } from "lucide-react";

interface TradingPairCardProps {
  isActive: boolean;
  onToggle: () => void;
  currentSymbol?: string;
  currentPrice?: number;
  priceChange?: number;
  nextAction?: string;
}

export const TradingPairCard = ({
  isActive,
  onToggle,
  currentSymbol = "EUR/USD",
  currentPrice = 1.0845,
  priceChange = 0.0012,
  nextAction = "Analyzing market..."
}: TradingPairCardProps) => {
  const isPricePositive = priceChange >= 0;

  return (
    <Card className="trust-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white font-bold text-lg">{currentSymbol.split('/')[0].slice(0, 2)}</span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">{currentSymbol}</h3>
            <p className="text-sm text-muted-foreground">Trading Pair</p>
          </div>
        </div>

        <Button
          variant={isActive ? "destructive" : "default"}
          onClick={onToggle}
          className="gap-2 rounded-xl min-w-[140px]"
        >
          {isActive ? (
            <>
              <Pause className="h-4 w-4" />
              Stop Trading
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Start Trading
            </>
          )}
        </Button>
      </div>

      {/* Price Display */}
      <div className="bg-card rounded-xl p-4 mb-4 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground text-sm">Current Price</span>
          <div className={`flex items-center gap-1 ${isPricePositive ? 'text-success' : 'text-destructive'}`}>
            {isPricePositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="text-sm font-medium">
              {isPricePositive ? '+' : ''}{priceChange.toFixed(4)}
            </span>
          </div>
        </div>
        <div className="text-3xl font-bold text-foreground">{currentPrice.toFixed(4)}</div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isActive ? "default" : "secondary"} className="rounded-lg">
            {isActive ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="outline" className="rounded-lg">AI Trading</Badge>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {nextAction}
        </div>
      </div>
    </Card>
  );
};