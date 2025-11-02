import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MarketSymbol {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
  bid: number;
  ask: number;
  spread: number;
  status: string;
  timestamp: string;
}

async function getMarketDataFromCache(): Promise<MarketSymbol[]> {
  try {
    // Get the latest market data from cache (populated by trading-engine via Alpaca WebSocket)
    const { data, error } = await supabase
      .from('market_data_cache')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching cached data:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No cached market data available');
      return [];
    }

    // Group by symbol and get the latest entry for each
    const latestBySymbol = data.reduce((acc, item) => {
      if (!acc[item.symbol] || new Date(item.timestamp) > new Date(acc[item.symbol].timestamp)) {
        acc[item.symbol] = item;
      }
      return acc;
    }, {} as Record<string, any>);

    // Get historical data for calculating changes (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: historicalData } = await supabase
      .from('market_data_cache')
      .select('*')
      .gte('timestamp', oneDayAgo)
      .order('timestamp', { ascending: true });

    // Calculate 24h highs, lows, and changes
    const historicalBySymbol = (historicalData || []).reduce((acc, item) => {
      if (!acc[item.symbol]) {
        acc[item.symbol] = [];
      }
      acc[item.symbol].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.values(latestBySymbol).map((item: any) => {
      const symbolHistory = historicalBySymbol[item.symbol] || [item];
      const currentPrice = (item.bid + item.ask) / 2;
      const oldestPrice = symbolHistory.length > 1 
        ? (symbolHistory[0].bid + symbolHistory[0].ask) / 2 
        : currentPrice;
      
      const prices = symbolHistory.map((h: any) => (h.bid + h.ask) / 2);
      const high24h = Math.max(...prices, currentPrice);
      const low24h = Math.min(...prices, currentPrice);
      
      const change = currentPrice - oldestPrice;
      const changePercent = oldestPrice > 0 ? (change / oldestPrice) * 100 : 0;

      return {
        id: item.symbol.replace('/', ''),
        symbol: item.symbol,
        name: getSymbolName(item.symbol),
        price: currentPrice,
        change,
        changePercent,
        volume: item.volume || 0,
        high24h,
        low24h,
        bid: item.bid,
        ask: item.ask,
        spread: parseFloat(((item.ask - item.bid) / item.bid * 100000).toFixed(1)),
        status: 'active',
        timestamp: item.timestamp
      };
    });
  } catch (error) {
    console.error('Error processing market data from cache:', error);
    return [];
  }
}

function getSymbolName(symbol: string): string {
  const symbolNames: { [key: string]: string } = {
    'EURUSD': 'Euro / US Dollar',
    'GBPUSD': 'British Pound / US Dollar',
    'USDJPY': 'US Dollar / Japanese Yen',
    'AUDUSD': 'Australian Dollar / US Dollar',
    'USDCAD': 'US Dollar / Canadian Dollar',
    'USDCHF': 'US Dollar / Swiss Franc',
    'NZDUSD': 'New Zealand Dollar / US Dollar',
    'EURGBP': 'Euro / British Pound',
    'EURJPY': 'Euro / Japanese Yen',
    'GBPJPY': 'British Pound / Japanese Yen',
    'XAUUSD': 'Gold / US Dollar',
    'XAGUSD': 'Silver / US Dollar',
    'BTCUSD': 'Bitcoin / US Dollar',
    'ETHUSD': 'Ethereum / US Dollar',
    'USDNGN': 'US Dollar / Nigerian Naira',
    'EURNGN': 'Euro / Nigerian Naira',
    'USOIL': 'US Crude Oil',
    'UKOIL': 'UK Crude Oil',
    'BLCO': 'Brent Crude Oil',
    'XPTUSD': 'Platinum / US Dollar',
    'NVDA': 'NVIDIA Corporation',
    'AAPL': 'Apple Inc.',
    'TSLA': 'Tesla Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'BNBUSD': 'Binance Coin / US Dollar',
    'WTI': 'West Texas Intermediate',
    'NAS100': 'NASDAQ 100',
    'SPX500': 'S&P 500',
    'GER40': 'DAX 40',
    'UK100': 'FTSE 100'
  };
  return symbolNames[symbol] || symbol;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching market data from Alpaca cache...');

    // Get market data from cache (populated by trading-engine's Alpaca WebSocket)
    const marketData = await getMarketDataFromCache();

    if (marketData.length === 0) {
      console.warn('No market data available. Make sure the trading engine is running.');
    }

    const response = {
      success: true,
      data: marketData,
      timestamp: new Date().toISOString(),
      source: 'alpaca_cache'
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Market data fetcher error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      data: [],
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
