import { PERIOD, type Plan } from './subscriptions';
import { DEFAULT_PAYMENT_TOKEN } from '../chains/config';

/**
 * Subscription plans. Priced in the same token as one-off calls, so a caller
 * never needs a second asset to move from per-request to recurring.
 */
export const PLANS: Plan[] = [
  {
    id: 'chain-daily',
    description: 'Unmetered access to the Robinhood Chain read endpoints, billed daily',
    amount: '0.50',
    periodSeconds: PERIOD.day,
    token: DEFAULT_PAYMENT_TOKEN.address as `0x${string}`,
    decimals: DEFAULT_PAYMENT_TOKEN.decimals,
    symbol: DEFAULT_PAYMENT_TOKEN.symbol,
    endpoints: ['/api/chain/token', '/api/chain/balance', '/api/chain/receipt'],
  },
  {
    id: 'chain-hourly',
    description: 'Same access, billed hourly — for agents that want a short leash',
    amount: '0.05',
    periodSeconds: PERIOD.hour,
    token: DEFAULT_PAYMENT_TOKEN.address as `0x${string}`,
    decimals: DEFAULT_PAYMENT_TOKEN.decimals,
    symbol: DEFAULT_PAYMENT_TOKEN.symbol,
    // Transfer history pairs naturally with the short leash: the data changes
    // every block, so an agent re-asks it every cycle.
    endpoints: ['/api/chain/token', '/api/chain/balance', '/api/chain/receipt', '/api/rwa/transfers'],
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function plansForEndpoint(pathname: string): Plan[] {
  return PLANS.filter((p) => p.endpoints.includes(pathname));
}
