import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ModernBottomNav } from "@/components/ModernBottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useMarketData, type MarketSymbol } from "@/hooks/useMarketData";
import { useMobile } from "@/hooks/use-mobile";
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

interface PriceHistoryPoint {
  timestamp: number;
  price: number;
  time: string;
}

interface SymbolCardProps {
  symbol: MarketSymbol;
  onClick: () => void;
}

const SymbolCard = ({ symbol, onClick }: SymbolCardProps) => {
  const isPositive = symbol.change >= 0;

  return (
    <Card 
      className="p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] trust-symbol-card"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-base sm:text-lg truncate">{symbol.symbol}</h3>
            <Badge variant={symbol.status === "active" ? "default" : "secondary"} className="text-xs">
              {symbol.status}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 truncate">{symbol.name}</p>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div>
              <p className="text-xl sm:text-2xl font-bold">{symbol.price.toFixed(4)}</p>
              <div className={`flex items-center gap-1 ${isPositive ? 'text-profit' : 'text-loss'}`}>
                {isPositive ? (
                  <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
                <span className="text-xs sm:text-sm font-medium">
                  {isPositive ? '+' : ''}{symbol.change.toFixed(4)} ({isPositive ? '+' : ''}{symbol.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-right flex-shrink-0">
          <div className="mb-2">
            {isPositive ? (
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-profit ml-auto" />
            ) : (
              <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-loss ml-auto" />
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            <p>Vol: {(symbol.volume / 1000).toFixed(1)}K</p>
            <p>Spread: {symbol.spread}p</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

const Trades = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { marketData, isLoading, error, refreshData } = useMarketData();
  const { isMobile } = useMobile();
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol | null>(null);
  const [priceHistory, setPriceHistory] = useState<Record<string, PriceHistoryPoint[]>>({});
  const maxHistoryPoints = 50; // Keep last 50 price points for smoother charts
  const lastUpdateRef = useRef<Record<string, number>>({});

  // Track price history for all symbols with more sensitive change detection
  useEffect(() => {
    if (marketData.length > 0) {
      const now = Date.now();
      
      setPriceHistory(prev => {
        const updated = { ...prev };
        
        marketData.forEach(symbol => {
          // More sensitive change detection - any price change or 2 second intervals
          const lastUpdate = lastUpdateRef.current[symbol.id] || 0;
          const timeSinceLastUpdate = now - lastUpdate;
          
          if (!updated[symbol.id]) {
            updated[symbol.id] = [];
          }
          
          const lastPrice = updated[symbol.id].length > 0 ? 
            updated[symbol.id][updated[symbol.id].length - 1].price : null;
          
          // Detect any price change (even tiny ones) or force update every 2 seconds
          const priceChanged = lastPrice === null || Math.abs(symbol.price - lastPrice) > 0.00001;
          const timeForUpdate = timeSinceLastUpdate > 2000;
          
          if (priceChanged || timeForUpdate) {
            const newPoint: PriceHistoryPoint = {
              timestamp: now,
              price: symbol.price,
              time: new Date(now).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit',
                hour12: false 
              })
            };
            
            updated[symbol.id] = [...updated[symbol.id], newPoint]
              .slice(-maxHistoryPoints); // Keep only recent points
            
            lastUpdateRef.current[symbol.id] = now;
          }
        });
        
        return updated;
      });
    }
  }, [marketData]);

  // Update selected symbol when market data changes
  useEffect(() => {
    if (selectedSymbol && marketData.length > 0) {
      const updatedSymbol = marketData.find(s => s.id === selectedSymbol.id);
      if (updatedSymbol) {
        setSelectedSymbol(updatedSymbol);
      }
    }
  }, [marketData, selectedSymbol]);

  const handleSymbolClick = (symbol: MarketSymbol) => {
    setSelectedSymbol(symbol);
    
    // Initialize price history if it doesn't exist
    if (!priceHistory[symbol.id] || priceHistory[symbol.id].length === 0) {
      const now = Date.now();
      const initialPoint: PriceHistoryPoint = {
        timestamp: now,
        price: symbol.price,
        time: new Date(now).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          hour12: false 
        })
      };
      
      setPriceHistory(prev => ({
        ...prev,
        [symbol.id]: [initialPoint]
      }));
    }
  };

  const getChartData = () => {
    if (!selectedSymbol || !priceHistory[selectedSymbol.id]) {
      return [];
    }
    
    const history = priceHistory[selectedSymbol.id];
    if (history.length < 2) {
      // If we don't have enough real data, create a minimal chart
      return [{
        name: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          hour12: false 
        }),
        price: selectedSymbol.price
      }];
    }
    
    return history.map(point => ({
      name: point.time,
      price: point.price
    }));
  };

  const handleRefresh = () => {
    refreshData();
    toast({
      title: "Market Data Refreshed",
      description: "Latest market data has been fetched.",
    });
  };

  useEffect(() => {
    if (error) {
      toast({
        title: "Market Data Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleBackToList = () => {
    setSelectedSymbol(null);
  };

  if (selectedSymbol) {
    return (
      <div className="min-h-screen bg-background">
        {/* Full Screen Symbol Detail View */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={handleBackToList}
              className="text-primary"
            >
              ← Back to Trades
            </Button>
          </div>

          <div className={`${isMobile ? 'px-2' : 'max-w-lg mx-auto'} space-y-4 sm:space-y-6 pb-24`}>
            {/* Main Symbol Info Card */}
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-background via-card to-secondary text-foreground border-2 border-primary/30 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold">{selectedSymbol.symbol}</h1>
                  <p className="text-white/80">{selectedSymbol.name}</p>
                </div>
                <Badge 
                  variant="secondary" 
                  className="bg-primary/20 text-primary border-primary/30"
                >
                  LIVE
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold mb-2">{selectedSymbol.price.toFixed(4)}</p>
                  <div className={`flex items-center gap-2 ${selectedSymbol.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {selectedSymbol.change >= 0 ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5" />
                    )}
                    <span>
                      {selectedSymbol.change >= 0 ? '+' : ''}{selectedSymbol.change.toFixed(4)} 
                      ({selectedSymbol.change >= 0 ? '+' : ''}{selectedSymbol.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span>Bid: {selectedSymbol.bid.toFixed(4)} | Ask: {selectedSymbol.ask.toFixed(4)}</span>
                  </div>
                </div>

                {/* Real-Time Price Chart - MT5 Style */}
                <div className="bg-slate-950 rounded-lg p-4 h-80 border border-primary/30 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-slate-300">Live Price Movement</h3>
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                      {priceHistory[selectedSymbol.id]?.length || 0} points
                    </Badge>
                  </div>
                  {getChartData().length > 0 ? (
                    <ChartContainer
                      config={{
                        price: {
                          label: "Price",
                          color: "#00d4aa",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getChartData()} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                          <CartesianGrid 
                            strokeDasharray="1 1" 
                            stroke="rgba(100, 116, 139, 0.2)"
                            horizontal={true}
                            vertical={true}
                          />
                          <XAxis 
                            dataKey="name" 
                            stroke="#64748b"
                            fontSize={10}
                            tick={{ fill: '#64748b' }}
                            axisLine={{ stroke: '#64748b', strokeWidth: 1 }}
                            tickLine={{ stroke: '#64748b' }}
                            interval="preserveStartEnd"
                            minTickGap={40}
                          />
                          <YAxis 
                            stroke="#64748b"
                            fontSize={10}
                            tick={{ fill: '#64748b' }}
                            domain={['dataMin - 0.00005', 'dataMax + 0.00005']}
                            axisLine={{ stroke: '#64748b', strokeWidth: 1 }}
                            tickLine={{ stroke: '#64748b' }}
                            tickFormatter={(value) => value.toFixed(5)}
                            orientation="right"
                          />
                          <ChartTooltip 
                            content={<ChartTooltipContent />}
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              color: '#e2e8f0',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                              fontSize: '12px'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke="#00d4aa"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ 
                              r: 4, 
                              fill: '#00d4aa',
                              stroke: '#0f172a',
                              strokeWidth: 2
                            }}
                            connectNulls={false}
                            animationDuration={200}
                          />
                          {/* Current price reference line */}
                          {selectedSymbol && (
                            <ReferenceLine 
                              y={selectedSymbol.price} 
                              stroke="#fbbf24" 
                              strokeDasharray="2 2"
                              strokeWidth={1}
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-slate-400">Building price history...</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Card className="p-3 sm:p-4">
                <h3 className="font-medium text-muted-foreground mb-2 text-sm sm:text-base">24h High</h3>
                <p className="text-lg sm:text-xl font-bold text-profit">{selectedSymbol.high24h.toFixed(4)}</p>
              </Card>
              <Card className="p-3 sm:p-4">
                <h3 className="font-medium text-muted-foreground mb-2 text-sm sm:text-base">24h Low</h3>
                <p className="text-lg sm:text-xl font-bold text-loss">{selectedSymbol.low24h.toFixed(4)}</p>
              </Card>
            </div>

            {/* Trading Statistics */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Trading Statistics</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume (24h)</span>
                  <span className="font-medium">{(selectedSymbol.volume / 1000).toFixed(1)}K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spread</span>
                  <span className="font-medium">{selectedSymbol.spread} pips</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={selectedSymbol.status === "active" ? "default" : "secondary"}>
                    {selectedSymbol.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Range (24h)</span>
                  <span className="font-medium">
                    {((selectedSymbol.high24h - selectedSymbol.low24h) * 10000).toFixed(1)} pips
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium text-xs">
                    {new Date(selectedSymbol.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </Card>

            {/* Trading Actions */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Button className="bg-profit hover:bg-profit/90 text-white py-4 sm:py-6">
                <div className="text-center">
                  <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1" />
                  <div className="text-sm sm:text-base">Buy</div>
                  <div className="text-xs opacity-80">{selectedSymbol.ask.toFixed(4)}</div>
                </div>
              </Button>
              <Button variant="destructive" className="py-4 sm:py-6">
                <div className="text-center">
                  <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1" />
                  <div className="text-sm sm:text-base">Sell</div>
                  <div className="text-xs opacity-80">{selectedSymbol.bid.toFixed(4)}</div>
                </div>
              </Button>
            </div>
          </div>
        </div>

        <ModernBottomNav
          onHome={() => navigate('/')}
          onTrades={() => navigate('/trades')}
          onSettings={() => navigate('/settings')}
          onNotifications={() => navigate('/notifications')}
          onProfile={() => navigate('/profile')}
          onAdmin={() => navigate('/admin')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        <div className={`${isMobile ? 'px-2' : 'max-w-lg mx-auto'} space-y-4 sm:space-y-6 pb-24`}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Trading Symbols</h1>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <p className="text-muted-foreground">Live forex rates updated every second</p>
            {error && (
              <div className="flex items-center gap-2 mt-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && marketData.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {/* Symbol Cards Grid */}
              <div className="space-y-4">
                {marketData.map((symbol) => (
                  <SymbolCard
                    key={symbol.id}
                    symbol={symbol}
                    onClick={() => handleSymbolClick(symbol)}
                  />
                ))}
              </div>

              {/* Market Summary Card */}
              <Card className="p-6 bg-gradient-to-br from-accent/10 to-primary/5">
                <h2 className="text-lg font-semibold mb-4">Market Summary</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Volume</p>
                    <p className="text-xl font-bold">
                      {(marketData.reduce((sum, s) => sum + s.volume, 0) / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Pairs</p>
                    <p className="text-xl font-bold">{marketData.filter(s => s.status === "active").length}</p>
                  </div>
                </div>
                {marketData.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(marketData[0].timestamp).toLocaleString()}
                    </p>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      <ModernBottomNav
        onHome={() => navigate('/')}
        onTrades={() => navigate('/trades')}
        onSettings={() => navigate('/settings')}
        onNotifications={() => navigate('/notifications')}
        onProfile={() => navigate('/profile')}
        onAdmin={() => navigate('/admin')}
      />
    </div>
  );
};

export default Trades;