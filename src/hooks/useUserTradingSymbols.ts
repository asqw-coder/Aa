import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useArkId } from './useArkId';

const DEFAULT_SYMBOLS = ['USDNGN', 'GBPUSD', 'USDJPY', 'EURNGN', 'XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'BLCO', 'XPTUSD', 'NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'EURUSD', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'WTI', 'NAS100', 'SPX500', 'GER40', 'UK100', 'BTCUSD', 'ETHUSD', 'BNBUSD'];

export const useUserTradingSymbols = () => {
  const { user } = useAuth();
  const { arkId } = useArkId();
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user's trading symbols from database
  useEffect(() => {
    const loadSymbols = async () => {
      if (!user) {
        // If not logged in, use localStorage
        const savedSymbols = localStorage.getItem('tradingSymbols');
        if (savedSymbols) {
          setSymbols(JSON.parse(savedSymbols));
        }
        setLoading(false);
        return;
      }

      try {
        // Try to load existing symbols
        const { data, error: fetchError } = await supabase
          .from('user_trading_symbols')
          .select('symbols')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (!data) {
          // No record found, create one with defaults including ark_id to satisfy RLS
          let resolvedArkId = arkId;
          // Fallback to server-side resolution if hook value is unavailable
          if (!resolvedArkId) {
            const { data: arkData, error: arkErr } = await supabase.rpc('get_current_ark_id');
            if (arkErr || !arkData) {
              console.warn('Unable to resolve ARK ID, proceeding without it');
            }
            resolvedArkId = (arkData as string) || null;
          }

          const { error: insertError } = await supabase
            .from('user_trading_symbols')
            .insert({
              user_id: user.id,
              ark_id: resolvedArkId,
              symbols: DEFAULT_SYMBOLS
            });

          if (insertError) throw insertError;
          setSymbols(DEFAULT_SYMBOLS);
        } else {
          setSymbols(data.symbols || DEFAULT_SYMBOLS);
        }
      } catch (err) {
        console.error('Error loading trading symbols:', err);
        setError(err instanceof Error ? err.message : 'Failed to load symbols');
        setSymbols(DEFAULT_SYMBOLS);
      } finally {
        setLoading(false);
      }
    };

    loadSymbols();
  }, [user]);

  // Save symbols to database or localStorage
  const saveSymbols = async (newSymbols: string[]) => {
    if (!user) {
      // If not logged in, save to localStorage
      localStorage.setItem('tradingSymbols', JSON.stringify(newSymbols));
      setSymbols(newSymbols);
      return { success: true };
    }

    try {
      // Ensure ark_id is included to satisfy RLS
      let resolvedArkId = arkId;
      if (!resolvedArkId) {
        const { data: arkData, error: arkErr } = await supabase.rpc('get_current_ark_id');
        if (!arkErr && arkData) {
          resolvedArkId = arkData as string;
        }
      }

      const { error: updateError } = await supabase
        .from('user_trading_symbols')
        .upsert({
          user_id: user.id,
          ark_id: resolvedArkId,
          symbols: newSymbols,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      setSymbols(newSymbols);
      return { success: true };
    } catch (err) {
      console.error('Error saving trading symbols:', err);
      setError(err instanceof Error ? err.message : 'Failed to save symbols');
      return { success: false, error: err instanceof Error ? err.message : 'Failed to save symbols' };
    }
  };

  return {
    symbols,
    loading,
    error,
    saveSymbols,
    defaultSymbols: DEFAULT_SYMBOLS
  };
};
