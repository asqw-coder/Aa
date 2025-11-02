import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useArkId } from './useArkId';
import { CapitalConfig } from '@/types/trading';
import { encryptData, decryptData } from '@/utils/encryption';

interface StoredCredentials {
  paper?: CapitalConfig;
  live?: CapitalConfig;
}

export const useCredentials = () => {
  const [credentials, setCredentials] = useState<CapitalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const { arkId } = useArkId();

  useEffect(() => {
    fetchCredentials();
  }, [arkId]);

  const fetchCredentials = async (mode?: 'paper' | 'live') => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Resolve ARK ID if not available yet
      let resolvedArkId = arkId as string | null;
      if (!resolvedArkId) {
        try {
          const { data: arkData } = await supabase.rpc('get_current_ark_id');
          if (arkData) {
            resolvedArkId = arkData as string;
          }
        } catch (e) {
          console.warn('Unable to resolve ARK ID via RPC:', e);
        }
      }

      // Determine trading mode (defaults to stored preference -> paper)
      const defaultMode = mode || (localStorage.getItem('defaultTradingMode') as 'paper' | 'live') || 'paper';

      // Helper to try reading and setting credentials from an encrypted blob
      const tryLoadFromEncrypted = async (encrypted: string): Promise<boolean> => {
        try {
          const decrypted = await decryptData(encrypted, user.id);
          const stored: StoredCredentials = JSON.parse(decrypted);
          const config = stored[defaultMode];
          if (config) {
            setCredentials(config);
            await fetchAccountBalance(config);
            return true;
          }
        } catch (error) {
          console.error('Failed to decrypt or parse credentials:', error);
        }
        return false;
      };

      // Primary key: ARK-based
      if (resolvedArkId) {
        const encryptedArk = localStorage.getItem(`credentials_${resolvedArkId}`);
        if (encryptedArk && await tryLoadFromEncrypted(encryptedArk)) {
          setLoading(false);
          return;
        }
      }

      // Fallback key: userId-based (backward compatibility / when ARK ID not yet provisioned)
      const encryptedUser = localStorage.getItem(`credentials_${user.id}`);
      if (encryptedUser && await tryLoadFromEncrypted(encryptedUser)) {
        setLoading(false);
        return;
      }

      // Nothing found
      setCredentials(null);
      setAccountBalance(null);
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountBalance = async (config: CapitalConfig) => {
    try {
      const response = await fetch(`${config.apiUrl}/v2/account`, {
        headers: {
          'APCA-API-KEY-ID': config.apiKey,
          'APCA-API-SECRET-KEY': config.secretKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccountBalance(parseFloat(data.equity));
      } else {
        setAccountBalance(null);
      }
    } catch (error) {
      console.error('Failed to fetch account balance:', error);
      setAccountBalance(null);
    }
  };

  const saveCredentials = async (config: CapitalConfig) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Ensure we have an ARK ID
    let resolvedArkId = arkId;
    if (!resolvedArkId) {
      const { data: arkData } = await supabase.rpc('get_current_ark_id');
      if (!arkData) {
        throw new Error('Unable to resolve ARK ID');
      }
      resolvedArkId = arkData as string;
    }

    try {
      // Get existing credentials from localStorage
      const encryptedData = localStorage.getItem(`credentials_${resolvedArkId}`);
      let stored: StoredCredentials = {};
      
      if (encryptedData) {
        try {
          const decrypted = await decryptData(encryptedData, user.id);
          stored = JSON.parse(decrypted);
        } catch (error) {
          console.error('Failed to decrypt existing credentials:', error);
        }
      }

      // Update the appropriate config
      if (config.environment === 'paper') {
        stored.paper = config;
      } else {
        stored.live = config;
      }

      // Encrypt and save to localStorage
      const encrypted = await encryptData(JSON.stringify(stored), user.id);
      localStorage.setItem(`credentials_${resolvedArkId}`, encrypted);

      await fetchCredentials(config.environment);
    } catch (error) {
      console.error('Failed to save credentials:', error);
      throw new Error('Failed to save credentials');
    }
  };

  return {
    credentials,
    loading,
    accountBalance,
    saveCredentials,
    refreshCredentials: (mode?: 'paper' | 'live') => fetchCredentials(mode)
  };
};

