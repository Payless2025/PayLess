'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useNetwork, useSwitchNetwork } from 'wagmi';
import { Wallet, LogOut, AlertTriangle } from 'lucide-react';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

const EXPECTED_CHAIN_ID = Number(ROBINHOOD_CHAIN_ID);

export function formatAddress(address?: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Connect button for Robinhood Chain.
 */
export function WalletConnectButton({ className = '' }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isLoading, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();

  // Wallet state only exists in the browser, so hold the server and first
  // client render identical to avoid a hydration mismatch.
  useEffect(() => setMounted(true), []);

  const base =
    'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60';

  if (!mounted) {
    return (
      <button className={`${base} bg-purple-600 text-white ${className}`} disabled>
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
    );
  }

  if (isConnected && chain && chain.id !== EXPECTED_CHAIN_ID) {
    return (
      <button
        onClick={() => switchNetwork?.(EXPECTED_CHAIN_ID)}
        className={`${base} bg-amber-500 hover:bg-amber-600 text-white ${className}`}
      >
        <AlertTriangle className="w-4 h-4" />
        Switch to Robinhood Chain
      </button>
    );
  }

  if (isConnected) {
    return (
      <button
        onClick={() => disconnect()}
        title="Disconnect"
        className={`${base} bg-purple-600 hover:bg-purple-700 text-white ${className}`}
      >
        <Wallet className="w-4 h-4" />
        <span className="font-mono">{formatAddress(address)}</span>
        <LogOut className="w-4 h-4 opacity-70" />
      </button>
    );
  }

  const connector = connectors[0];

  return (
    <button
      onClick={() => connector && connect({ connector })}
      disabled={isLoading || !connector?.ready}
      className={`${base} bg-purple-600 hover:bg-purple-700 text-white ${className}`}
      title={
        connector?.ready
          ? 'Connect a browser wallet on Robinhood Chain'
          : 'No browser wallet detected — install MetaMask or another EVM wallet'
      }
    >
      <Wallet className="w-4 h-4" />
      {isLoading ? 'Connecting…' : connector?.ready ? 'Connect Wallet' : 'No Wallet Found'}
      {error && <span className="sr-only">{error.message}</span>}
    </button>
  );
}

export default WalletConnectButton;
