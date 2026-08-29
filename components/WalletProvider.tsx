'use client';

import React, { FC, useMemo } from 'react';
import { WagmiConfig, createConfig, configureChains, type Chain } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { InjectedConnector } from 'wagmi/connectors/injected';
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_RPC_URL,
  ROBINHOOD_EXPLORER_URL,
} from '@/lib/chains/config';

/**
 * Robinhood Chain — an Arbitrum Orbit L2 that settles in ETH for gas.
 * https://robinhood.com/us/en/support/articles/robinhood-chain-mainnet/
 */
export const robinhoodChain: Chain = {
  id: Number(ROBINHOOD_CHAIN_ID),
  name: 'Robinhood Chain',
  network: 'robinhood',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [ROBINHOOD_RPC_URL] },
    public: { http: [ROBINHOOD_RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: ROBINHOOD_EXPLORER_URL },
  },
};

export const WalletProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  // The config is built once and is safe to render on the server: wagmi only
  // touches window when a connector actually connects.
  const config = useMemo(() => {
    const { chains, publicClient, webSocketPublicClient } = configureChains(
      [robinhoodChain],
      [publicProvider()]
    );

    return createConfig({
      autoConnect: false,
      connectors: [
        new InjectedConnector({
          chains,
          options: { name: 'Browser Wallet', shimDisconnect: true },
        }),
      ],
      publicClient,
      webSocketPublicClient,
    });
  }, []);

  return <WagmiConfig config={config}>{children}</WagmiConfig>;
};
