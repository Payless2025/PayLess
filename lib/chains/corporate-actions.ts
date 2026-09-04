/**
 * Corporate actions on tokenised equities, read from the chain.
 *
 * The tokens on Robinhood Chain carry a `uiMultiplier`: a scaling factor the
 * issuer adjusts when something happens to the underlying share. Every change
 * is announced on chain as `UIMultiplierUpdated(old, new, effectiveAt)`, with a
 * timestamp that can be in the future.
 *
 * Two things follow, and both are worth selling.
 *
 * First, a pending adjustment is visible before it takes effect. When
 * `newUIMultiplier` differs from `uiMultiplier` and `effectiveAt` has not
 * arrived, the change is scheduled and readable now.
 *
 * Second, and more immediately useful: on any token whose multiplier is not
 * exactly 1, a raw `balanceOf` does not match what the issuer's own interface
 * shows. AAPL is at 1.000566080061092436 today. An agent reading `balanceOf`
 * and reporting it as a share count is quietly wrong, and nothing in the ERC-20
 * interface warns it.
 *
 * What this module does NOT do is name the event. A multiplier moved from 1 to
 * 1.000566 is a fact; calling it a split, a dividend adjustment or anything
 * else would be an interpretation, and we do not have the issuer's paperwork.
 * The numbers, the timestamps and the transaction are reported; the meaning is
 * left to whoever has the prospectus.
 *
 * This data does not exist on a general-purpose chain. It requires equities
 * that are tokenised with their corporate actions encoded on chain, which is
 * exactly what this chain was built to carry.
 */

import { formatUnits, getAddress, keccak256, stringToHex } from 'viem';
import { chainClient, withRpcRetry } from './reader';
import { STOCK_TOKENS, type StockToken } from './rwa';
import { ROBINHOOD_EXPLORER_URL } from './config';

const STOCK_ABI = [
  { name: 'uiMultiplier', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'newUIMultiplier', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'effectiveAt', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'tokenPaused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { name: 'oraclePaused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
] as const;

/** The registry every stock token defers to for address-level blocks. */
export const ACCESS_REGISTRY = '0xe10b6f6B275de231345c20D14Ab812db62151b00' as const;

const REGISTRY_ABI = [
  { name: 'isBlocked', type: 'function', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
] as const;

export const MULTIPLIER_EVENT_TOPIC = keccak256(
  stringToHex('UIMultiplierUpdated(uint256,uint256,uint256)')
);

/** Multipliers are 18-decimal fixed point regardless of the token's own decimals. */
const MULTIPLIER_DECIMALS = 18;
const ONE = BigInt('1000000000000000000');

export interface MultiplierChange {
  from: string;
  to: string;
  effectiveAt: string;
  /** True while `effectiveAt` is still in the future. */
  pending: boolean;
  txHash: string;
  blockNumber: string;
  explorer: string;
}

export interface TokenActions {
  ticker: string;
  address: string;
  /** The multiplier in force right now. */
  multiplier: string;
  /** Set when a different multiplier is scheduled. */
  scheduledMultiplier: string | null;
  effectiveAt: string | null;
  pendingChange: boolean;
  /**
   * True when a raw balanceOf does not equal the issuer's displayed figure.
   * The single most useful field here for anything reading balances.
   */
  balancesNeedScaling: boolean;
  paused: { token: boolean; oracle: boolean; global: boolean };
  transferable: boolean;
  history: MultiplierChange[];
}

function fmt(v: bigint): string {
  return formatUnits(v, MULTIPLIER_DECIMALS);
}

/**
 * Past multiplier changes, from the event log.
 *
 * Queried through the explorer's index rather than `eth_getLogs`, because the
 * public RPC refuses an unbounded range and these events are rare enough that
 * a bounded scan would usually find nothing while still costing the request.
 */
async function readHistory(token: StockToken): Promise<MultiplierChange[]> {
  const url =
    `${ROBINHOOD_EXPLORER_URL}/api?module=logs&action=getLogs` +
    `&fromBlock=0&toBlock=latest&address=${token.address}&topic0=${MULTIPLIER_EVENT_TOPIC}`;

  let rows: any[] = [];
  try {
    const res = await fetch(url, {
      headers: {
        // The explorer's edge answers 403 to unknown agents.
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        accept: 'application/json',
      },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { result?: any };
    rows = Array.isArray(body.result) ? body.result : [];
  } catch {
    // History is an enrichment. Losing it should not fail the whole reading.
    return [];
  }

  const now = Math.floor(Date.now() / 1000);
  return rows.map((r) => {
    // Three unindexed uint256 words: old, new, effectiveAt.
    const data = (r.data as string).slice(2);
    const word = (i: number) => BigInt('0x' + data.slice(i * 64, (i + 1) * 64));
    const effective = Number(word(2));
    return {
      from: fmt(word(0)),
      to: fmt(word(1)),
      effectiveAt: new Date(effective * 1000).toISOString(),
      pending: effective > now,
      txHash: r.transactionHash,
      blockNumber: String(parseInt(r.blockNumber, 16)),
      explorer: `${ROBINHOOD_EXPLORER_URL}/tx/${r.transactionHash}`,
    };
  });
}

export async function readTokenActions(token: StockToken, withHistory = true): Promise<TokenActions> {
  const rpc = chainClient();
  const read = (fn: string) =>
    withRpcRetry(() => rpc.readContract({ address: token.address, abi: STOCK_ABI, functionName: fn as any }));

  const [current, scheduled, effective, tokenPaused, oraclePaused, globalPaused] = await Promise.all([
    read('uiMultiplier') as Promise<bigint>,
    read('newUIMultiplier') as Promise<bigint>,
    read('effectiveAt') as Promise<bigint>,
    read('tokenPaused') as Promise<boolean>,
    read('oraclePaused') as Promise<boolean>,
    read('paused') as Promise<boolean>,
  ]);

  const history = withHistory ? await readHistory(token) : [];
  const pending = scheduled !== current;

  return {
    ticker: token.ticker,
    address: getAddress(token.address),
    multiplier: fmt(current),
    scheduledMultiplier: pending ? fmt(scheduled) : null,
    effectiveAt: effective > BigInt(0) ? new Date(Number(effective) * 1000).toISOString() : null,
    pendingChange: pending,
    balancesNeedScaling: current !== ONE,
    paused: { token: tokenPaused, oracle: oraclePaused, global: globalPaused },
    // Any one of the three stops a transfer, so all three have to be false.
    transferable: !tokenPaused && !globalPaused,
    history,
  };
}

export async function readAllActions(withHistory = true): Promise<TokenActions[]> {
  // Sequential rather than parallel: the public RPC rate-limits, and ten
  // tokens times six reads in one burst is exactly what trips it.
  const out: TokenActions[] = [];
  for (const token of STOCK_TOKENS) {
    out.push(await readTokenActions(token, withHistory));
  }
  return out;
}

export interface Eligibility {
  address: string;
  blockedByRegistry: boolean;
  registryPaused: boolean;
  token?: {
    ticker: string;
    address: string;
    paused: { token: boolean; oracle: boolean; global: boolean };
  };
  /** Whether a transfer would be permitted, as far as on-chain state can say. */
  canReceive: boolean;
  reasons: string[];
}

/**
 * Whether an address can receive a tokenised equity, as far as the chain knows.
 *
 * Honest about its own limits. This reads the on-chain registry and the token's
 * pause flags. It cannot see off-chain eligibility rules, jurisdiction checks,
 * or anything the issuer enforces outside these contracts. A `true` here means
 * "nothing on chain forbids it", which is useful and is not the same as "this
 * transfer will succeed".
 */
export async function checkEligibility(address: string, token?: StockToken): Promise<Eligibility> {
  const rpc = chainClient();
  const who = getAddress(address as `0x${string}`);

  const [blocked, registryPaused] = await Promise.all([
    withRpcRetry(() =>
      rpc.readContract({ address: ACCESS_REGISTRY, abi: REGISTRY_ABI, functionName: 'isBlocked', args: [who] })
    ) as Promise<boolean>,
    withRpcRetry(() =>
      rpc.readContract({ address: ACCESS_REGISTRY, abi: REGISTRY_ABI, functionName: 'paused' })
    ) as Promise<boolean>,
  ]);

  const reasons: string[] = [];
  if (blocked) reasons.push('The access registry blocks this address.');
  if (registryPaused) reasons.push('The access registry itself is paused.');

  let tokenState: Eligibility['token'];
  if (token) {
    const actions = await readTokenActions(token, false);
    tokenState = { ticker: token.ticker, address: actions.address, paused: actions.paused };
    if (actions.paused.token) reasons.push(`${token.ticker} transfers are paused on the token contract.`);
    if (actions.paused.global) reasons.push(`${token.ticker} is globally paused.`);
  }

  return {
    address: who,
    blockedByRegistry: blocked,
    registryPaused,
    token: tokenState,
    canReceive: reasons.length === 0,
    reasons: reasons.length
      ? reasons
      : ['Nothing on chain forbids this transfer. Off-chain eligibility rules are not visible here.'],
  };
}
