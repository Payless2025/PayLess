import { EndpointConfig } from './types';
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_RPC_URL,
  ROBINHOOD_EXPLORER_URL,
  DEFAULT_PAYMENT_TOKEN,
} from '../chains/config';

/**
 * The address that receives payments.
 *
 * This is public by necessity — every 402 response has to tell the caller where
 * to send the money — so it lives in code with an env override, not in an env
 * var alone. Keeping it env-only meant it silently went missing on deploys
 * where the variable was never set, and a 402 with an empty recipient makes
 * payment impossible.
 *
 * Forks: set WALLET_ADDRESS to your own address.
 */
export const DEFAULT_WALLET_ADDRESS = '0x426f8846B5011d5aCf659FE5bFBC5fdA6123f759';

export const PAYMENT_CONFIG = {
  walletAddress:
    process.env.ROBINHOOD_WALLET_ADDRESS ||
    process.env.WALLET_ADDRESS ||
    process.env.NEXT_PUBLIC_WALLET_ADDRESS ||
    DEFAULT_WALLET_ADDRESS,
  facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.x402.org',
  chain: 'robinhood',
  chainName: 'Robinhood Chain',
  network: ROBINHOOD_CHAIN_ID,
  rpcUrl: ROBINHOOD_RPC_URL,
  explorerUrl: ROBINHOOD_EXPLORER_URL,
  currency: DEFAULT_PAYMENT_TOKEN.symbol,
  tokenAddress: DEFAULT_PAYMENT_TOKEN.address,
  tokenDecimals: DEFAULT_PAYMENT_TOKEN.decimals,
};

/**
 * Only endpoints that do real work are priced.
 *
 * Settlement is enforced, so a priced endpoint takes real USDG. Charging for a
 * `Math.random()` response would be taking money for nothing — so anything that
 * currently returns placeholder data is free until it is wired to a real
 * source, and says so in its response.
 */
export const ENDPOINT_PRICING: EndpointConfig = {
  // Live reads from Robinhood Chain — no third-party key, nothing simulated
  '/api/chain/token': '0.01',
  '/api/chain/balance': '0.01',
  '/api/chain/receipt': '0.02',

  // Real third-party data, no key required
  '/api/data/crypto': '0.015',

  // Generated locally, genuinely real output
  '/api/tools/qrcode': '0.005',
};

/**
 * Free while they return placeholder data. Wire the upstream source (and its
 * API key where one is needed), then move the entry into ENDPOINT_PRICING.
 */
export const DEMO_ENDPOINTS = [
  '/api/ai/chat',
  '/api/ai/image',
  '/api/ai/translate',
  '/api/ai/tts',
  '/api/data/weather',
  '/api/data/stock',
  '/api/data/news',
  '/api/premium/content',
];

export const FREE_ENDPOINTS = [
  '/api/health',
  '/api/info',
  '/api/analytics',
  // Checking what you owe, and how to stop owing it, is never itself billable
  '/api/subscriptions',
  ...DEMO_ENDPOINTS,
];
