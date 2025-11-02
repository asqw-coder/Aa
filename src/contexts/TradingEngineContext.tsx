import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCredentials } from '@/hooks/useCredentials';
import { useUserTradingSymbols } from '@/hooks/useUserTradingSymbols';

interface TradingEngineContextType {
  isActive: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  toggleTradingEngine: () => Promise<void>;
}

const TradingEngineContext = createContext<TradingEngineContextType | undefined>(undefined);

export const TradingEngineProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(() => {
    return localStorage.getItem('tradingEngineActive') === 'true';
  });
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>(() => {
    return (localStorage.getItem('tradingEngineStatus') as any) || 'disconnected';
  });

  const { user } = useAuth();
  const { credentials } = useCredentials();
  const { symbols: userSymbols } = useUserTradingSymbols();

  // Persist state changes to localStorage
  useEffect(() => {
    localStorage.setItem('tradingEngineActive', String(isActive));
    localStorage.setItem('tradingEngineStatus', connectionStatus);
  }, [isActive, connectionStatus]);

  const toggleTradingEngine = async () => {
    if (!credentials) {
      throw new Error('Credentials not available');
    }

    if (isActive) {
      // Stop the trading engine
      try {
        setConnectionStatus('connecting');
        const { error } = await supabase.functions.invoke('trading-engine', {
          body: { action: 'stop' }
        });

        if (error) throw error;

        setIsActive(false);
        setConnectionStatus('disconnected');
      } catch (error) {
        console.error('Error stopping trading engine:', error);
        setConnectionStatus('disconnected');
        throw error;
      }
    } else {
      // Start the trading engine
      try {
        setConnectionStatus('connecting');
        
        // Get user symbols
        const { data: symbolsData } = await supabase
          .from('user_trading_symbols')
          .select('symbols')
          .eq('user_id', user?.id)
          .maybeSingle();

        const symbols = symbolsData?.symbols || userSymbols;

        // Transform credentials to match edge function expectations
        const edgeFunctionCredentials = {
          apiKey: credentials.apiKey,
          apiSecret: credentials.secretKey,
          environment: credentials.environment
        };

        const { data, error } = await supabase.functions.invoke('trading-engine', {
          body: {
            action: 'start',
            credentials: edgeFunctionCredentials,
            symbols: symbols
          }
        });

        if (error) throw error;

        setIsActive(true);
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Error starting trading engine:', error);
        setConnectionStatus('disconnected');
        throw error;
      }
    }
  };

  return (
    <TradingEngineContext.Provider value={{ isActive, connectionStatus, toggleTradingEngine }}>
      {children}
    </TradingEngineContext.Provider>
  );
};

export const useTradingEngine = () => {
  const context = useContext(TradingEngineContext);
  if (context === undefined) {
    throw new Error('useTradingEngine must be used within a TradingEngineProvider');
  }
  return context;
};
