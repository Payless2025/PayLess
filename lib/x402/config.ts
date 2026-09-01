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

/**
 * The address subscribers approve as spender.
 *
 * Deliberately separable from the address that receives the money. ERC-20
 * `transferFrom` spends the allowance of whoever signs it and delivers to
 * whatever recipient that call names — so the key that pulls from subscribers
 * and the wallet that holds the proceeds do not have to be the same thing.
 *
 * Keeping them apart means the collector key needs gas and nothing else. If it
 * is ever stolen, the thief inherits the right to move approved funds *to the
 * treasury address baked into the collection call*, and no balance at all.
 *
 * It defaults to the payment wallet so a single-key deployment still works.
 * Set PAYLESS_COLLECTOR_ADDRESS to split them, and give the worker the matching
 * key as PAYLESS_COLLECTOR_PRIVATE_KEY.
 */
export const COLLECTOR_ADDRESS =
  process.env.PAYLESS_COLLECTOR_ADDRESS ||
  process.env.NEXT_PUBLIC_PAYLESS_COLLECTOR_ADDRESS ||
  '';

export const PAYMENT_CONFIG = {
  walletAddress:
    process.env.ROBINHOOD_WALLET_ADDRESS ||
    process.env.WALLET_ADDRESS ||
    process.env.NEXT_PUBLIC_WALLET_ADDRESS ||
    DEFAULT_WALLET_ADDRESS,
  // Was https://facilitator.x402.org, which does not resolve. Advertising a
  // dead facilitator is worse than advertising none: a client that follows it
  // fails with a DNS error rather than a payment error.
  facilitatorUrl:
    process.env.FACILITATOR_URL || 'https://www.payless.network/api/facilitator',
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
 * Who subscribers approve. Falls back to the payment wallet, which is correct
 * for a deployment that has not split the roles yet.
 */
export function subscriptionSpender(): string {
  return COLLECTOR_ADDRESS || PAYMENT_CONFIG.walletAddress;
}

/** Where collected subscription funds land. Always the treasury, never the signer. */
export function subscriptionRecipient(): string {
  return PAYMENT_CONFIG.walletAddress;
}

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

  // Tokenised equities on Robinhood Chain — the assets the chain was built to
  // carry. Reading them is permissionless; transferring them is not, which is
  // why they are the product and not a payment option.
  '/api/rwa/tokens': '0.02',
  '/api/rwa/token': '0.01',
  '/api/rwa/holdings': '0.02',
  '/api/data/stock': '0.01',

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
