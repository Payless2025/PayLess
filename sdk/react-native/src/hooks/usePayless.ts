import { useState, useEffect, useCallback } from 'react';
import { PaylessClient } from '../client';
import { PaylessConfig, WalletAdapter, ApiResponse } from '../types';

export interface UsePaylessReturn {
  client: PaylessClient | null;
  wallet: WalletAdapter | undefined;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connectWallet: (wallet: WalletAdapter) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  makeRequest: <T = any>(endpoint: string, options?: any) => Promise<ApiResponse<T>>;
}

/**
 * React Hook for Payless SDK
 */
export function usePayless(config: PaylessConfig): UsePaylessReturn {
  const [client, setClient] = useState<PaylessClient | null>(null);
  const [wallet, setWallet] = useState<WalletAdapter | undefined>();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize client
  useEffect(() => {
    try {
      const newClient = new PaylessClient(config);
      setClient(newClient);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize client');
    }
  }, [config.walletAddress, config.network]);

  // Connect wallet
  const connectWallet = useCallback(async (walletAdapter: WalletAdapter) => {
    if (!client) {
      setError('Client not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      client.connectWallet(walletAdapter);
      setWallet(walletAdapter);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    if (!client) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await client.disconnectWallet();
      setWallet(undefined);
      setIsConnected(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // Make API request
  const makeRequest = useCallback(async <T = any>(
    endpoint: string,
    options?: any
  ): Promise<ApiResponse<T>> => {
    if (!client) {
      return {
        success: false,
        error: 'Client not initialized',
        status: 0,
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await client.request<T>(endpoint, options);
      if (!response.success) {
        setError(response.error || 'Request failed');
      }
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Request failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
        status: 0,
      };
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  return {
    client,
    wallet,
    isConnected,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    makeRequest,
  };
}

