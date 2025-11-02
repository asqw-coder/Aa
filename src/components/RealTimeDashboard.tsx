import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRealtimeTradingData } from '@/hooks/useRealtimeTradingData';
import { Play, Pause, Settings, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface RealTimeDashboardProps {
  isActive: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  onToggleEngine: () => void;
  onOpenSettings: () => void;
  notifications?: ReturnType<typeof useNotifications>;
}

export const RealTimeDashboard = ({
  isActive,
  connectionStatus,
  onToggleEngine,
  onOpenSettings,
  notifications
}: RealTimeDashboardProps) => {
  // Get real-time trading data
  const {
    positions,
    riskMetrics,
    isLoading,
    error
  } = useRealtimeTradingData();

  // Calculate summary metrics from positions
  const totalPnL = positions.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
  const dailyTrades = positions.length;
  const winRate = positions.length > 0 ? 
    (positions.filter(p => (p.pnl || 0) > 0).length / positions.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="trust-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div className="text-xl font-semibold mb-2 text-trust-text">Initializing Trading Engine</div>
          <div className="text-trust-text-muted">Loading trading data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="trust-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-destructive/10 flex items-center justify-center">
            <TrendingDown className="w-8 h-8 text-destructive" />
          </div>
          <div className="text-xl font-semibold mb-2 text-trust-text">Engine Error</div>
          <div className="text-trust-text-muted mb-4">{error}</div>
          <Button onClick={() => window.location.reload()} variant="trust">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Trading Dashboard</span>
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
                {connectionStatus}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold">${totalPnL.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total P&L</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{dailyTrades}</p>
                <p className="text-xs text-muted-foreground">Trades</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </div>
            <Button 
              onClick={onToggleEngine} 
              className="w-full"
              variant={isActive ? 'destructive' : 'default'}
            >
              {isActive ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Trading
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Trading
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            {positions.length > 0 ? (
              <div className="space-y-2">
                {positions.map((pos, index) => (
                  <div key={pos.dealId || index} className="flex justify-between items-center p-2 bg-muted rounded-md">
                    <span className="font-medium">{pos.symbol}</span>
                    <span className={pos.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                      ${pos.pnl.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No open positions</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};