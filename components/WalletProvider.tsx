'use client';

import React, { FC, useMemo, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

export const WalletProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  // Only render on client-side
  useEffect(() => {
    setMounted(true);
    
    // Clean up any stale wallet adapter state on mount
    if (typeof window !== 'undefined') {
      // Clear any phantom adapter state that might be stuck
      try {
        const walletName = localStorage.getItem('walletName');
        if (walletName) {
          // Just log it, don't remove - let user choose to reconnect
          console.log('Previous wallet connection found:', walletName);
        }
      } catch (error) {
        console.error('Error checking wallet state:', error);
      }
    }
  }, []);

  // Use mainnet-beta for production
  const network = WalletAdapterNetwork.Mainnet;
  
  // Use custom RPC or fallback to public endpoint
  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(network);
  }, [network]);

  // Initialize wallet adapters - only once to prevent reconnection issues
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Don't render wallet provider during SSR
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

