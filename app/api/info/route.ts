import { NextRequest, NextResponse } from 'next/server';

// Must be evaluated per request: it reports live runtime state, and as a
// prerendered route it was reporting build-time state instead — which made the
// replay-protection status quietly wrong.
export const dynamic = 'force-dynamic';
import { ENDPOINT_PRICING, PAYMENT_CONFIG } from '@/lib/x402/config';
import { ROBINHOOD_CONFIG } from '@/lib/chains/config';
import { isSpentStoreShared } from '@/lib/x402/spent-store';

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
      replayProtection: isSpentStoreShared() ? 'shared' : 'per-instance',
      // Which credential names this runtime can see. Names only, never values —
      // enough to tell "not set" from "set under a name we do not read", which
      // is otherwise only diagnosable by guessing.
      ledgerEnv: [
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN',
        'KV_REST_API_URL',
        'KV_REST_API_TOKEN',
        'REDIS_URL',
        'KV_URL',
      ].filter((name) => Boolean(process.env[name])),
    },
    documentation: 'https://github.com/Payless2025/PayLess/tree/master/docs',
  });
}
