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

export const ENDPOINT_PRICING: EndpointConfig = {
  '/api/ai/chat': '0.05',
  '/api/ai/image': '0.10',
  '/api/ai/translate': '0.03',
  '/api/ai/tts': '0.08',
  '/api/data/weather': '0.01',
  '/api/data/stock': '0.02',
  '/api/data/crypto': '0.015',
  '/api/data/news': '0.025',
  '/api/tools/qrcode': '0.005',
  '/api/premium/content': '1.00',
};

export const FREE_ENDPOINTS = [
  '/api/health',
  '/api/info',
  '/api/analytics',
];
