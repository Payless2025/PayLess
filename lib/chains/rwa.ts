/**
 * Robinhood Chain stock tokens — the tokenised equities the chain was built to
 * carry.
 *
 * Why this exists as a *data* product and not a payment option:
 *
 *   Reading these tokens is permissionless. Moving them is not — transfers run
 *   through compliance checks on both sender and receiver, they are tokenised
 *   debt securities issued through Robinhood Assets (Jersey) Limited, and they
 *   are barred from US persons. Accepting them as payment would mean holding
 *   securities as a business.
 *
 *   So Payless keeps settlement in USDG and sells data about these assets
 *   instead. That asymmetry — read freely, transfer never — is the whole reason
 *   this file is a reader and not a payment token list.
 *
 * Addresses below were each verified against chain 4663: the symbol matches the
 * ticker and the on-chain name carries the "· Robinhood Token" marker. The
 * canonical list is published at https://docs.robinhood.com/chain/contracts/ —
 * check against it before trusting this file, because anyone can deploy an
 * ERC-20 called NVDA.
 */

import { formatUnits, getAddress } from 'viem';
import { chainClient, withRpcRetry, ERC20_READ_ABI } from './reader';
import { ROBINHOOD_EXPLORER_URL } from './config';

export interface StockToken {
  ticker: string;
  /** Issuer name, for display only — the on-chain name is authoritative */
  label: string;
  address: `0x${string}`;
}

export const STOCK_TOKENS: StockToken[] = [
  { ticker: 'TSLA', label: 'Tesla', address: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d' },
  { ticker: 'AAPL', label: 'Apple', address: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9' },
  { ticker: 'NVDA', label: 'NVIDIA', address: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC' },
  { ticker: 'AMZN', label: 'Amazon', address: '0x12f190a9F9d7D37a250758b26824B97CE941bF54' },
  { ticker: 'MSFT', label: 'Microsoft', address: '0xe93237C50D904957Cf27E7B1133b510C669c2e74' },
  { ticker: 'GOOGL', label: 'Alphabet Class A', address: '0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3' },
  { ticker: 'META', label: 'Meta Platforms', address: '0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35' },
  { ticker: 'MSTR', label: 'Strategy Inc.', address: '0xec262a75e413fAfD0dF80480274532C79D42da09' },
  { ticker: 'SPY', label: 'SPDR S&P 500 ETF Trust', address: '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C' },
  { ticker: 'QCOM', label: 'Qualcomm', address: '0x0f17206447090e464C277571124dD2688E48AEA9' },
];

export function findStockToken(query: string): StockToken | undefined {
  const q = query.trim();
  const byTicker = STOCK_TOKENS.find((t) => t.ticker.toLowerCase() === q.toLowerCase());
  if (byTicker) return byTicker;
  try {
    const addr = getAddress(q);
    return STOCK_TOKENS.find((t) => getAddress(t.address) === addr);
  } catch {
    return undefined;
  }
}

/** The marker every canonical Robinhood stock token carries in its on-chain name. */
const CANONICAL_NAME = /Robinhood Token/i;

export interface StockTokenReading {
  ticker: string;
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  totalSupplyFormatted: string;
  /**
   * True when the contract's own name and symbol match what we expect for this
   * ticker. A false here means the address in our list no longer looks
   * canonical — the data is served with the flag rather than silently trusted.
   */
  canonical: boolean;
  explorer: string;
}

export async function readStockToken(token: StockToken): Promise<StockTokenReading> {
  const rpc = chainClient();
  const address = getAddress(token.address);
  const read = (functionName: 'name' | 'symbol' | 'decimals' | 'totalSupply') =>
    withRpcRetry(() => rpc.readContract({ address, abi: ERC20_READ_ABI, functionName }));

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    read('name'),
    read('symbol'),
    read('decimals'),
    read('totalSupply'),
  ]);

  const dp = Number(decimals);
  return {
    ticker: token.ticker,
    address,
    name: name as string,
    symbol: symbol as string,
    decimals: dp,
    totalSupply: (totalSupply as bigint).toString(),
    totalSupplyFormatted: formatUnits(totalSupply as bigint, dp),
    canonical: (symbol as string) === token.ticker && CANONICAL_NAME.test(name as string),
    explorer: `${ROBINHOOD_EXPLORER_URL}/token/${address}`,
  };
}

export async function readStockHoldings(owner: `0x${string}`, tokens: StockToken[]) {
  const rpc = chainClient();
  const held = await Promise.all(
    tokens.map(async (token) => {
      const address = getAddress(token.address);
      const [raw, decimals] = await Promise.all([
        withRpcRetry(() =>
          rpc.readContract({ address, abi: ERC20_READ_ABI, functionName: 'balanceOf', args: [owner] })
        ),
        withRpcRetry(() => rpc.readContract({ address, abi: ERC20_READ_ABI, functionName: 'decimals' })),
      ]);
      const dp = Number(decimals);
      return {
        ticker: token.ticker,
        label: token.label,
        address,
        raw: (raw as bigint).toString(),
        balance: formatUnits(raw as bigint, dp),
        decimals: dp,
      };
    })
  );
  return held;
}

// ---------------------------------------------------------------------------
// Transfer history
//
// Everything above reads the present: supply, balance, metadata. This reads
// what actually happened — who moved NVDA, when, how much. It is the first
// endpoint here whose answer has no knowable size in advance: a quiet block
// range holds nothing, an active one holds hundreds of rows. That makes it the
// natural first user of the `upto` scheme, where the buyer signs a ceiling and
// is charged for what actually came back.
// ---------------------------------------------------------------------------

const TRANSFER_EVENT = {
  name: 'Transfer',
  type: 'event',
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false },
  ],
} as const;

/**
 * The widest range one query may scan. Wide enough to be useful (about two
 * hours of blocks), narrow enough that the public RPC answers it, and a hard
 * bound on how much work one payment can buy.
 */
export const MAX_TRANSFER_RANGE = 5000;

export interface StockTransfer {
  from: string;
  to: string;
  amount: string;
  amountRaw: string;
  blockNumber: string;
  txHash: string;
  logIndex: number;
  explorer: string;
}

export interface StockTransferReading {
  token: StockToken;
  /** Re-checked against the on-chain name at read time, same as readStockToken. */
  canonical: boolean;
  fromBlock: string;
  toBlock: string;
  transfers: StockTransfer[];
}

/**
 * Every Transfer of one stock token in a block range, straight from the chain.
 *
 * The range is clamped rather than rejected: a caller asking for more than
 * MAX_TRANSFER_RANGE gets the most recent slice of what they asked for and the
 * response says which blocks it actually covers, so paging is a matter of
 * moving `fromBlock` — not of guessing what the server silently did.
 */
export async function readStockTransfers(
  token: StockToken,
  fromBlock: bigint,
  toBlock: bigint
): Promise<StockTransferReading> {
  const rpc = chainClient();

  if (toBlock < fromBlock) {
    throw new Error(`Block range is inverted: ${fromBlock} to ${toBlock}.`);
  }
  const clampedFrom =
    toBlock - fromBlock >= BigInt(MAX_TRANSFER_RANGE)
      ? toBlock - BigInt(MAX_TRANSFER_RANGE - 1)
      : fromBlock;

  const [logs, name, decimalsRaw] = await Promise.all([
    withRpcRetry(() =>
      rpc.getLogs({
        address: token.address,
        event: TRANSFER_EVENT,
        fromBlock: clampedFrom,
        toBlock,
      })
    ),
    withRpcRetry(() =>
      rpc.readContract({ address: token.address, abi: ERC20_READ_ABI, functionName: 'name' })
    ),
    withRpcRetry(() =>
      rpc.readContract({ address: token.address, abi: ERC20_READ_ABI, functionName: 'decimals' })
    ),
  ]);

  const decimals = Number(decimalsRaw);

  return {
    token,
    canonical: CANONICAL_NAME.test(name as string),
    fromBlock: clampedFrom.toString(),
    toBlock: toBlock.toString(),
    transfers: (logs as any[]).map((log) => ({
      from: getAddress(log.args.from),
      to: getAddress(log.args.to),
      amount: formatUnits(log.args.value as bigint, decimals),
      amountRaw: (log.args.value as bigint).toString(),
      blockNumber: log.blockNumber.toString(),
      txHash: log.transactionHash,
      logIndex: log.logIndex,
      explorer: `${ROBINHOOD_EXPLORER_URL}/tx/${log.transactionHash}`,
    })),
  };
}

export interface TransferPage {
  rows: StockTransfer[];
  /** Rows existed beyond this page. */
  truncated: boolean;
  /**
   * Where the next query's `since` should start to see everything this page
   * could not fit. When a single block holds more rows than the limit, this
   * points back INTO that block and `overlap` says so, because losing rows
   * silently is worse than sending a few twice.
   */
  nextSince: bigint;
  overlap: boolean;
}

/**
 * Page oldest-first, cutting at a block boundary.
 *
 * The bug this replaces: the route kept the newest `limit` rows and advanced
 * `since` past the whole range, so on a busy token the older rows in the range
 * simply vanished — paid for, scanned, never delivered, unreachable by the
 * next page. NVDA at ~1 transfer per block trips that on almost every default
 * query.
 */
export function pageTransfers(all: StockTransfer[], limit: number, toBlock: bigint): TransferPage {
  if (all.length <= limit) {
    return { rows: all, truncated: false, nextSince: toBlock + BigInt(1), overlap: false };
  }

  let rows = all.slice(0, limit);
  const lastBlock = rows[rows.length - 1].blockNumber;

  // If the cut would split a block, retreat to the previous boundary so the
  // next page sees that block whole.
  if (all[limit].blockNumber === lastBlock) {
    const beforeBlock = rows.filter((t) => t.blockNumber !== lastBlock);
    if (beforeBlock.length > 0) {
      return {
        rows: beforeBlock,
        truncated: true,
        nextSince: BigInt(lastBlock),
        overlap: false,
      };
    }
    // One block alone exceeds the limit. Keep the split and point the next
    // page back at the same block: duplicates, but nothing lost.
    return { rows, truncated: true, nextSince: BigInt(lastBlock), overlap: true };
  }

  return { rows, truncated: true, nextSince: BigInt(lastBlock) + BigInt(1), overlap: false };
}
