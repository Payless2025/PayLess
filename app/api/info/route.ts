import { NextRequest, NextResponse } from 'next/server';
import { ENDPOINT_PRICING, PAYMENT_CONFIG } from '@/lib/x402/config';
import { ROBINHOOD_CONFIG } from '@/lib/chains/config';
import { getSpentStore } from '@/lib/x402/spent-store';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    name: 'Payless API',
    description: 'Serverless payment platform with x402 protocol integration',
    version: '1.0.0',
    payment: {
      protocol: 'x402',
      wallet: PAYMENT_CONFIG.walletAddress,
      chain: PAYMENT_CONFIG.chain,
      chainName: PAYMENT_CONFIG.chainName,
      network: PAYMENT_CONFIG.network,
      currency: PAYMENT_CONFIG.currency,
      tokenAddress: PAYMENT_CONFIG.tokenAddress,
      tokenDecimals: PAYMENT_CONFIG.tokenDecimals,
      rpcUrl: PAYMENT_CONFIG.rpcUrl,
      explorerUrl: PAYMENT_CONFIG.explorerUrl,
      acceptedTokens: ROBINHOOD_CONFIG.paymentTokens.map((token) => ({
        symbol: token.symbol,
        address: token.address,
        decimals: token.decimals,
      })),
      facilitator: PAYMENT_CONFIG.facilitatorUrl,
    },
    endpoints: Object.entries(ENDPOINT_PRICING).map(([path, price]) => ({
      path,
      price: `$${price} ${PAYMENT_CONFIG.currency}`,
      method: 'GET/POST',
    })),
    // Operational truth, not a secret: whether replay protection survives a
    // scale-out. Per-instance means one payment can be spent once per warm
    // instance, so this needs to be visible without reading deploy logs.
    integrity: {
      replayProtection:
        getSpentStore().constructor.name === 'MemorySpentStore' ? 'per-instance' : 'shared',
    },
    documentation: 'https://github.com/Payless2025/PayLess/tree/master/docs',
  });
}
