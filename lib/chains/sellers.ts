/**
 * Who is actually selling on this chain, derived from settlements.
 *
 * Our own catalogue lists our own endpoints, which is useful and is also the
 * smallest possible view. The x402 proxies see every settlement on this chain,
 * whichever facilitator broadcast it, and each one carries a transfer whose
 * recipient is a seller who has been paid.
 *
 * That makes this index different in kind from a directory. A registry entry is
 * a claim: somebody filled in a form. A row here is a receipt: somebody was
 * paid, repeatedly, and the chain remembers. Nobody signs up, and nobody can
 * list themselves into it.
 *
 * The honest limit, stated because it decides what the data may be used for:
 * the chain shows that an address receives x402 payments. It does not show what
 * that address sells. A URL only appears when a seller publishes its own
 * manifest, and the two are joined then. Until that happens a row means "this
 * address gets paid through x402" and nothing more, which is already more than
 * any registry can prove.
 */

import { formatUnits, getAddress, decodeEventLog, keccak256, stringToHex } from 'viem';
import { chainClient, withRpcRetry } from './reader';
import { ROBINHOOD_EXPLORER_URL, USDG_ADDRESS } from './config';

/** The canonical x402 proxies. Every settlement on this chain goes through one. */
export const X402_PROXIES = {
  exact: '0x402085c248EeA27D92E8b30b2C58ed07f9E20001',
  upto: '0x4020A4f3b7b90ccA423B9fabCc0CE57C6C240002',
} as const;

const TRANSFER_EVENT = {
  name: 'Transfer',
  type: 'event',
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false },
  ],
} as const;

export const SETTLED_TOPIC = keccak256(stringToHex('Settled()'));

/** The event both proxies emit on a successful settlement. */
const SETTLED_EVENT = { name: 'Settled', type: 'event', inputs: [] } as const;

export interface Seller {
  address: string;
  /** Settlements observed paying this address. */
  payments: number;
  volumeUSDG: string;
  firstSeenBlock: string;
  lastSeenBlock: string;
  /** Which schemes were used to pay it. */
  schemes: string[];
  /** Which facilitators broadcast those settlements. */
  facilitators: string[];
  explorer: string;
}

export interface SellerIndex {
  sellers: Seller[];
  /** Settlements actually examined. The index is a sample, and says so. */
  settlementsScanned: number;
  facilitatorsSeen: number;
  blocksScanned: string;
  scannedFrom: string;
  scannedTo: string;
  source: string;
  limits: string;
  retrievedAt: string;
}

/**
 * Blocks per query. The public RPC refuses an unbounded range, and this chain
 * produces blocks fast enough that a "last N blocks" window measured in
 * thousands covers minutes rather than days.
 */
const CHUNK = BigInt(50_000);

/**
 * Build the index from recent settlements.
 *
 * Bounded rather than exhaustive: the exact proxy alone has over eleven
 * thousand settlements, and reading all of them to answer "who sells here"
 * would cost more than the answer is worth. The response says how many were
 * examined so a caller can tell a sample from a census.
 */
export async function readSellers(
  options: { chunks?: number; maxReceipts?: number } = {}
): Promise<SellerIndex> {
  const chunks = options.chunks ?? 40;
  const maxReceipts = options.maxReceipts ?? 30;
  const rpc = chainClient();
  const usdg = getAddress(USDG_ADDRESS as `0x${string}`);

  const head = await withRpcRetry(() => rpc.getBlockNumber());
  let to = head;
  const settlements: Array<{ hash: `0x${string}`; scheme: string }> = [];

  // Walk backwards in bounded windows. Settlements are sparse and this chain
  // is fast, so a single recent window usually finds nothing; stopping at the
  // first empty one would report an empty chain rather than a quiet minute.
  for (let i = 0; i < chunks && settlements.length < maxReceipts; i++) {
    const from = to > CHUNK ? to - CHUNK : BigInt(0);
    for (const [scheme, proxy] of Object.entries(X402_PROXIES)) {
      if (settlements.length >= maxReceipts) break;
      try {
        const logs = await withRpcRetry(() =>
          rpc.getLogs({ address: proxy as `0x${string}`, event: SETTLED_EVENT, fromBlock: from, toBlock: to })
        );
        for (const log of logs) {
          settlements.push({ hash: log.transactionHash as `0x${string}`, scheme });
          if (settlements.length >= maxReceipts) break;
        }
      } catch {
        // A window the node refuses is skipped rather than failing the scan.
      }
    }
    if (from === BigInt(0)) break;
    to = from;
  }

  const found = new Map<
    string,
    { payments: number; volume: bigint; first: bigint; last: bigint; schemes: Set<string>; facilitators: Set<string> }
  >();
  const facilitators = new Set<string>();
  let scanned = 0;
  let earliest: bigint | null = null;
  let latest: bigint | null = null;

  for (const s of settlements) {
    let receipt;
    try {
      receipt = await withRpcRetry(() => rpc.getTransactionReceipt({ hash: s.hash }));
    } catch {
      continue;
    }
    scanned += 1;
    const block = receipt.blockNumber;
    if (earliest === null || block < earliest) earliest = block;
    if (latest === null || block > latest) latest = block;
    // Whoever broadcast it is a facilitator operating on this chain.
    if (receipt.from) facilitators.add(getAddress(receipt.from));

    for (const log of receipt.logs) {
      let token: `0x${string}`;
      try {
        token = getAddress(log.address);
      } catch {
        continue;
      }
      if (token !== usdg) continue;

      let decoded;
      try {
        decoded = decodeEventLog({ abi: [TRANSFER_EVENT], data: log.data, topics: log.topics });
      } catch {
        continue;
      }
      const args = decoded.args as unknown as { to: string; value: bigint };
      const seller = getAddress(args.to);

      const entry = found.get(seller) ?? {
        payments: 0,
        volume: BigInt(0),
        first: block,
        last: block,
        schemes: new Set<string>(),
        facilitators: new Set<string>(),
      };
      entry.payments += 1;
      entry.volume += args.value;
      if (block < entry.first) entry.first = block;
      if (block > entry.last) entry.last = block;
      entry.schemes.add(s.scheme);
      if (receipt.from) entry.facilitators.add(getAddress(receipt.from));
      found.set(seller, entry);
    }
  }

  const sellers = Array.from(found.entries())
    .map(([address, e]) => ({
      address,
      payments: e.payments,
      volumeUSDG: formatUnits(e.volume, 6),
      firstSeenBlock: e.first.toString(),
      lastSeenBlock: e.last.toString(),
      schemes: Array.from(e.schemes),
      facilitators: Array.from(e.facilitators),
      explorer: `${ROBINHOOD_EXPLORER_URL}/address/${address}`,
    }))
    .sort((a, b) => b.payments - a.payments);

  return {
    sellers,
    settlementsScanned: scanned,
    facilitatorsSeen: facilitators.size,
    blocksScanned: (head - to).toString(),
    scannedFrom: earliest?.toString() ?? to.toString(),
    scannedTo: latest?.toString() ?? head.toString(),
    source: 'Settled events on the canonical x402 proxies, and the USDG transfers inside those settlements',
    limits:
      'A sample of settlements walking back from the chain head, not a census. Being listed means the address was paid through x402; it does not say what it sells. A URL appears only when a seller publishes its own manifest.',
    retrievedAt: new Date().toISOString(),
  };
}
