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
