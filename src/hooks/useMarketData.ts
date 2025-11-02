import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface MarketSymbol {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
  status: string;
  spread: number;
  bid: number;
  ask: number;
  timestamp: string;
}

interface MarketDataResponse {
  success: boolean;
  data: MarketSymbol[];
  timestamp: string;
}

export const useMarketData = (filterByUserSymbols: boolean = true) => {
  const { user } = useAuth();
  const [marketData, setMarketData] = useState<MarketSymbol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userSymbols, setUserSymbols] = useState<string[]>([]);

  const fetchMarketData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call the edge function to fetch and cache fresh market data
      const { data, error: functionError } = await supabase.functions.invoke('market-data-fetcher');
      
      if (functionError) {
        throw functionError;
      }

      const response = data as MarketDataResponse;
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch market data');
      }

      // Transform the data to include required fields
      let transformedData: MarketSymbol[] = response.data.map((item, index) => ({
        id: item.symbol.replace('/', ''),
        symbol: item.symbol,
        name: item.name,
        price: item.price,
        change: item.change,
        changePercent: item.changePercent,
        volume: item.volume,
        high24h: item.high24h,
        low24h: item.low24h,
        status: item.status,
        spread: item.spread,
        bid: item.price - (item.spread * 0.00001),
        ask: item.price + (item.spread * 0.00001),
        timestamp: response.timestamp
      }));

      // Filter by user's selected symbols if enabled
      if (filterByUserSymbols && userSymbols.length > 0) {
        transformedData = transformedData.filter(item => 
          userSymbols.some(userSymbol => 
            item.symbol.replace('/', '').toUpperCase() === userSymbol.toUpperCase() ||
            item.symbol.toUpperCase() === userSymbol.toUpperCase()
          )
        );
      }

      setMarketData(transformedData);
      
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      
      // Try to load cached data as fallback
      try {
        const { data: cachedData, error: cacheError } = await supabase
          .from('market_data_cache')
          .select('*')
          .order('timestamp', { ascending: false });

        if (!cacheError && cachedData && cachedData.length > 0) {
          // Group by symbol and get the latest entry for each
          const latestBySymbol = cachedData.reduce((acc, item) => {
            if (!acc[item.symbol] || new Date(item.timestamp) > new Date(acc[item.symbol].timestamp)) {
              acc[item.symbol] = item;
            }
            return acc;
          }, {} as Record<string, any>);

          const fallbackData: MarketSymbol[] = Object.values(latestBySymbol).map((item: any) => ({
            id: item.symbol.replace('/', ''),
            symbol: item.symbol,
            name: getSymbolName(item.symbol),
            price: (item.bid + item.ask) / 2,
            change: 0, // We don't have historical data for change
            changePercent: 0,
            volume: item.volume || 0,
            high24h: (item.bid + item.ask) / 2,
            low24h: (item.bid + item.ask) / 2,
            status: 'active',
            spread: parseFloat(((item.ask - item.bid) / item.bid * 100000).toFixed(1)),
            bid: item.bid,
            ask: item.ask,
            timestamp: item.timestamp
          }));

          setMarketData(fallbackData);
          setError('Using cached data - Live data temporarily unavailable');
        }
      } catch (fallbackError) {
        console.error('Error loading fallback data:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getSymbolName = (symbol: string): string => {
    const names: Record<string, string> = {
      'EUR/USD': 'Euro vs US Dollar',
      'GBP/USD': 'British Pound vs US Dollar', 
      'USD/JPY': 'US Dollar vs Japanese Yen',
      'AUD/USD': 'Australian Dollar vs US Dollar',
      'USD/CAD': 'US Dollar vs Canadian Dollar',
      'USD/CHF': 'US Dollar vs Swiss Franc',
      'NZD/USD': 'New Zealand Dollar vs US Dollar',
      'EUR/GBP': 'Euro vs British Pound',
      'GBP/JPY': 'British Pound vs Japanese Yen',
      'EUR/JPY': 'Euro vs Japanese Yen',
      'AUD/JPY': 'Australian Dollar vs Japanese Yen',
      'NZD/JPY': 'New Zealand Dollar vs Japanese Yen'
    };
    return names[symbol] || symbol;
  };

  // Load user's trading symbols
  useEffect(() => {
    const loadUserSymbols = async () => {
      if (!user || !filterByUserSymbols) return;

      try {
        const { data } = await supabase
          .from('user_trading_symbols')
          .select('symbols')
          .eq('user_id', user.id)
          .single();

        if (data?.symbols) {
          setUserSymbols(data.symbols);
        }
      } catch (err) {
        console.error('Error loading user symbols:', err);
      }
    };

    loadUserSymbols();
  }, [user, filterByUserSymbols]);

  // Set up real-time subscription for market data cache updates
  useEffect(() => {
    // Initial fetch
    fetchMarketData();

    // Set up real-time subscription
    const channel = supabase
      .channel('market-data-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_data_cache'
        },
        (payload) => {
          console.log('Market data updated:', payload);
          // Refetch data when market_data_cache is updated
          fetchMarketData();
        }
      )
      .subscribe();

    // Set up periodic refresh (every 3 seconds for real-time feel)
    const intervalId = setInterval(() => {
      fetchMarketData();
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, []);

  const refreshData = () => {
    fetchMarketData();
  };

  return {
    marketData,
    isLoading,
    error,
    refreshData
  };
};