import { useEffect } from "react";
import { FinancialCard } from "@/components/FinancialCard";
import { DonutChart } from "@/components/DonutChart";
import { MiniBarChart } from "@/components/MiniBarChart";
import { TransactionList } from "@/components/TransactionList";
import { ModernBottomNav } from "@/components/ModernBottomNav";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeTradingData } from "@/hooks/useRealtimeTradingData";
import { useCredentials } from "@/hooks/useCredentials";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { DollarSign, Activity, Target, Brain, Play, Pause } from "lucide-react";
import { useTradingEngine } from "@/contexts/TradingEngineContext";

const Index = () => {
  const { isActive, connectionStatus, toggleTradingEngine: toggleEngine } = useTradingEngine();
  const notifications = useNotifications();
  const { user, loading } = useAuth();
  const { credentials, loading: credentialsLoading, accountBalance, refreshCredentials } = useCredentials();
  const navigate = useNavigate();
  const tradingData = useRealtimeTradingData();

  // Listen for changes to default trading mode and credentials updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'defaultTradingMode') {
        // Reload credentials when default mode changes
        refreshCredentials();
      }
    };

    const handleCredentialsUpdate = () => {
      // Reload credentials when they're updated
      refreshCredentials();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('credentialsUpdated', handleCredentialsUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('credentialsUpdated', handleCredentialsUpdate);
    };
  }, [refreshCredentials]);


  // Wrapper to handle notifications
  const toggleTradingEngine = async () => {
    if (!credentials) {
      notifications.addNotification({
        type: 'error',
        title: 'Configuration Required',
        message: 'Please save your trading configuration in Settings first.'
      });
      navigate('/settings/trading');
      return;
    }

    try {
      await toggleEngine();
      
      notifications.addNotification({
        type: isActive ? 'warning' : 'success',
        title: isActive ? 'Trading Stopped' : 'Trading Started',
        message: isActive 
          ? 'Trading engine has been stopped. No new trades will be executed.'
          : 'Trading engine is now active and monitoring markets for opportunities.'
      });
    } catch (error) {
      console.error('Error toggling trading engine:', error);
      notifications.addNotification({
        type: 'error',
        title: isActive ? 'Stop Failed' : 'Start Failed',
        message: 'An error occurred while toggling the trading engine.'
      });
    }
  };

  // Real trading data from database
  const totalPnL = tradingData.dailyReport?.totalDailyProfit || 0 - (tradingData.dailyReport?.totalDailyLoss || 0);
  const balanceDisplay = accountBalance ?? tradingData.dailyReport?.currentBalance ?? 0;
  const dailyTrades = tradingData.dailyReport?.totalTrades || 0;
  const winRate = tradingData.dailyReport?.winRate || 0;
  
  // Generate real chart data from trading positions
  const chartData = tradingData.positions.length > 0 
    ? tradingData.positions.slice(-7).map((pos, index) => ({
        name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] || `Day ${index + 1}`,
        value: pos.pnl
      }))
    : [];

  // Real profit/loss distribution
  const totalProfit = tradingData.dailyReport?.totalDailyProfit || 0;
  const totalLoss = tradingData.dailyReport?.totalDailyLoss || 0;
  const totalBalance = totalProfit + totalLoss;
  
  const donutData = totalBalance > 0 ? [
    { name: 'Profits', value: (totalProfit / totalBalance) * 100, color: '#22c55e' },
    { name: 'Losses', value: (totalLoss / totalBalance) * 100, color: '#ef4444' }
  ] : [];

  // Real transactions from trading positions
  const transactions = tradingData.positions.slice(-4).map((pos, index) => ({
    id: pos.dealId || `pos-${index}`,
    name: pos.symbol,
    type: `${pos.direction} Position`,
    amount: `$${Math.abs(pos.pnl).toFixed(2)}`,
    date: new Date(pos.timestamp).toLocaleDateString(),
    isPositive: pos.pnl >= 0
  }));

  if (loading || tradingData.isLoading || credentialsLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto space-y-6 pb-24">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-80 w-full rounded-3xl" />
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-6 pb-24">
        {/* Main Balance Card - Real Data */}
        <FinancialCard
          title="Account Balance"
          value={`$${balanceDisplay.toLocaleString()}`}
          subtitle={`${tradingData.positions.length} Active Positions`}
          trend={{ 
            value: totalPnL >= 0 ? `+$${totalPnL.toFixed(2)}` : `-$${Math.abs(totalPnL).toFixed(2)}`, 
            isPositive: totalPnL >= 0 
          }}
          variant="gradient"
          className="relative min-h-[280px]"
        >
          {chartData.length > 0 && (
            <div className="mt-6">
              <MiniBarChart data={chartData} color="#fff" height={80} />
            </div>
          )}
          <div className="mt-6 text-white/80">
            <p className="text-sm">Recent Positions</p>
            {tradingData.positions.slice(-2).map((pos, index) => (
              <div key={pos.dealId || index} className="flex items-center justify-between mt-2 text-xs">
                <span>{pos.symbol} • ${Math.abs(pos.pnl).toFixed(2)}</span>
                <span>{new Date(pos.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
            {tradingData.positions.length === 0 && (
              <div className="text-center mt-4 text-white/60">
                <p>No active positions</p>
              </div>
            )}
          </div>
        </FinancialCard>

        {/* Trading Performance Card - Real Data */}
        <FinancialCard
          title="Trading Performance"
          value={`$${totalPnL.toFixed(2)}`}
          subtitle="Total P&L"
          variant="accent"
          className="text-white min-h-[220px]"
        >
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <p className="text-xl font-bold">${totalProfit.toFixed(0)}</p>
              <p className="text-xs opacity-80">Profits</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">${totalLoss.toFixed(0)}</p>
              <p className="text-xs opacity-80">Losses</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{dailyTrades}</p>
              <p className="text-xs opacity-80">Trades</p>
            </div>
          </div>
        </FinancialCard>

        {/* Profit Distribution Chart - Real Data */}
        <FinancialCard
          title="Profit Distribution"
          value={`$${totalPnL.toFixed(2)}`}
          subtitle="Current Performance"
          className="min-h-[320px]"
        >
          <div className="mt-6">
            {donutData.length > 0 ? (
              <>
                <DonutChart 
                  data={donutData}
                  centerValue={`$${totalPnL.toFixed(0)}`}
                  centerLabel="Net P&L"
                  size={200}
                />
                <div className="flex justify-between mt-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>{donutData[0]?.value.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>{donutData[1]?.value.toFixed(1)}%</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No trading data available</p>
                <p className="text-sm">Start trading to see performance</p>
              </div>
            )}
          </div>
        </FinancialCard>

        {/* Trading Control Card - Real Data */}
        <FinancialCard
          title="Trading Engine"
          value={isActive ? "Active" : "Dormant"}
          subtitle={`${tradingData.positions.length} Open Positions`}
          icon={Brain}
          className="min-h-[180px]"
        >
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-success' : 'bg-muted'}`} />
              <span className="text-sm text-muted-foreground">
                {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              </span>
            </div>
            <Button
              onClick={toggleTradingEngine}
              size="sm"
              variant={isActive ? "destructive" : "default"}
              className="px-6"
            >
              {isActive ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
          </div>
        </FinancialCard>

        {/* Recent Transactions - Real Data */}
        <FinancialCard
          title="Recent Transactions"
          value={transactions.length.toString()}
          subtitle="Latest Trading Activity"
          className="min-h-[320px]"
        >
          {transactions.length > 0 ? (
            <TransactionList 
              transactions={transactions}
              title="Recent Trades"
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No recent transactions</p>
              <p className="text-sm">Transactions will appear here once trading starts</p>
            </div>
          )}
        </FinancialCard>

        {/* Account Stats Grid - Real Data */}
        <div className="grid grid-cols-2 gap-6">
          <FinancialCard
            title="Daily P&L"
            value={`$${totalPnL.toFixed(2)}`}
            trend={{ 
              value: totalPnL >= 0 ? `+${((totalPnL / Math.max(balanceDisplay, 1)) * 100).toFixed(1)}%` : `${((totalPnL / Math.max(balanceDisplay, 1)) * 100).toFixed(1)}%`, 
              isPositive: totalPnL >= 0 
            }}
            icon={DollarSign}
            className="min-h-[140px]"
          />
          <FinancialCard
            title="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            trend={{ 
              value: winRate >= 50 ? "Good" : "Below Average", 
              isPositive: winRate >= 50 
            }}
            icon={Target}
            className="min-h-[140px]"
          />
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

export default Index;