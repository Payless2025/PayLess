/**
 * payless — price an HTTP endpoint in one line.
 *
 * Server:
 *   const payless = createPayless({ recipient: '0x…' });
 *   export const GET = payless.protect(handler, '0.01');
 *
 * Client:
 *   const res = await payFor(url, { pay: async ({ to, amount }) => hash });
 *
 * Settles on Robinhood Chain (chain 4663) in USDG. No accounts on either side,
 * no processor, no protocol fee.
 */

export { Payless, createPayless, type Handler } from './server.js';
export { payFor, PaymentRefused, type PayRequest, type PayForOptions } from './client.js';
export { verifySettlement, DEFAULT_MAX_AGE_MS, type SettlementResult, type SettlementDetails } from './verify.js';
export { MemorySpentStore, type SpentStore, type SpentRecord } from './store.js';
export {
  UpstashSpentStore,
  createUpstashStore,
  upstashStoreFromEnv,
  type UpstashOptions,
} from './stores/upstash.js';
export {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_RPC_URL,
  ROBINHOOD_EXPLORER_URL,
  USDG,
  WETH,
  DEFAULT_TOKENS,
  createChainClient,
  explorerTx,
  explorerAddress,
  type PaymentToken,
} from './chain.js';
export type { PaylessOptions, PaymentPayload, Challenge } from './types.js';
