/**
 * Read-only access to Robinhood Chain, shared by the /api/chain/* endpoints.
 *
 * These endpoints sell data about the chain Payless settles on: real reads, no
 * third-party API key, nothing simulated. That is the point — an endpoint that
 * charges USDG and returns invented numbers is worse than no endpoint.
 *
 * The public RPC rate-limits under light load (verified: it returns 429), so
 * every call goes through a bounded retry.
 */

import { createPublicClient, http, getAddress, isAddress, formatUnits, formatEther } from 'viem';
import { ROBINHOOD_RPC_URL, ROBINHOOD_CONFIG, PAYLESS_TOKEN } from './config';

export const ERC20_READ_ABI = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

let client: ReturnType<typeof createPublicClient> | undefined;

export function chainClient() {
  if (!client) client = createPublicClient({ transport: http(ROBINHOOD_RPC_URL) });
  return client;
}

/** Retry only on rate limiting; surface every other failure immediately. */
export async function withRpcRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number })?.status;
      const rateLimited = status === 429 || /429|rate limit/i.test(String((error as Error)?.message));
      if (!rateLimited) throw error;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastError;
}

export class BadRequest extends Error {}

/** Parse an address parameter, or throw a message worth returning to the caller. */
export function requireAddress(value: string | null, field: string) {
  if (!value) throw new BadRequest(`Missing "${field}" parameter`);
  if (!isAddress(value)) throw new BadRequest(`"${field}" is not a valid address`);
  return getAddress(value);
}

export function requireHash(value: string | null, field: string) {
  if (!value) throw new BadRequest(`Missing "${field}" parameter`);
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new BadRequest(`"${field}" is not a valid transaction hash`);
  return value as `0x${string}`;
}

/** Tokens Payless knows by name, so callers can pass a symbol instead of an address. */
export const KNOWN_TOKENS: Record<string, string> = {
  ...Object.fromEntries(
    ROBINHOOD_CONFIG.paymentTokens.map((t) => [t.symbol.toUpperCase(), t.address])
  ),
  PAYLESS: PAYLESS_TOKEN.address,
};

export function resolveToken(value: string | null): `0x${string}` {
  if (!value) throw new BadRequest('Missing "token" parameter (symbol or address)');
  const bySymbol = KNOWN_TOKENS[value.toUpperCase()];
  if (bySymbol) return getAddress(bySymbol);
  if (isAddress(value)) return getAddress(value);
  throw new BadRequest(
    `Unknown token "${value}". Pass a contract address, or one of: ${Object.keys(KNOWN_TOKENS).join(', ')}`
  );
}

export async function readErc20(address: `0x${string}`) {
  const rpc = chainClient();
  const read = (functionName: 'name' | 'symbol' | 'decimals' | 'totalSupply') =>
    withRpcRetry(() =>
      rpc.readContract({ address, abi: ERC20_READ_ABI, functionName })
    );

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    read('name'),
    read('symbol'),
    read('decimals'),
    read('totalSupply'),
  ]);

  return {
    address,
    name: name as string,
    symbol: symbol as string,
    decimals: Number(decimals),
    totalSupply: (totalSupply as bigint).toString(),
    totalSupplyFormatted: formatUnits(totalSupply as bigint, Number(decimals)),
  };
}

export async function readBalances(owner: `0x${string}`, tokens: `0x${string}`[]) {
  const rpc = chainClient();

  const native = await withRpcRetry(() => rpc.getBalance({ address: owner }));

  const balances = await Promise.all(
    tokens.map(async (token) => {
      const [raw, decimals, symbol] = await Promise.all([
        withRpcRetry(() =>
          rpc.readContract({ address: token, abi: ERC20_READ_ABI, functionName: 'balanceOf', args: [owner] })
        ),
        withRpcRetry(() => rpc.readContract({ address: token, abi: ERC20_READ_ABI, functionName: 'decimals' })),
        withRpcRetry(() => rpc.readContract({ address: token, abi: ERC20_READ_ABI, functionName: 'symbol' })),
      ]);
      return {
        token,
        symbol: symbol as string,
        decimals: Number(decimals),
        raw: (raw as bigint).toString(),
        balance: formatUnits(raw as bigint, Number(decimals)),
      };
    })
  );

  return {
    address: owner,
    native: { symbol: 'ETH', raw: native.toString(), balance: formatEther(native) },
    tokens: balances,
  };
}
