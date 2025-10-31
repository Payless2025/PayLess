'use client';

import React from 'react';
import { WalletProvider } from './WalletProvider';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}

