import { EndpointConfig } from './types';

export const PAYMENT_CONFIG = {
  walletAddress: process.env.WALLET_ADDRESS || process.env.NEXT_PUBLIC_WALLET_ADDRESS || '8ahe4N7mFaLyQ7powRGWxZ3cnqbteF3yAeioMpM4ocMX',
  facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.x402.org',
  network: process.env.NETWORK || 'mainnet-beta', // Solana network
  rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  currency: 'USDC',
  // USDC SPL Token Mint Address on Solana Mainnet
  usdcMint: process.env.USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

export const ENDPOINT_PRICING: EndpointConfig = {
  '/api/ai/chat': '0.05',
  '/api/ai/image': '0.10',
  '/api/data/weather': '0.01',
  '/api/data/stock': '0.02',
  '/api/premium/content': '1.00',
};

export const FREE_ENDPOINTS = [
  '/api/health',
  '/api/info',
];
