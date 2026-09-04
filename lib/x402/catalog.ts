/**
 * What this server sells, in a form an agent can read before spending anything.
 *
 * Until now the only way to learn a price was to call the endpoint and read the
 * 402 that came back. That works, but it means an agent deciding between five
 * endpoints makes five requests to find out, and cannot plan a budget before it
 * starts.
 *
 * The record shape here is not invented. It matches what production x402
 * facilitators already publish at `/discovery/resources`: an `items` array of
 * `{ resource, type, x402Version, accepts[], metadata }`. Copying an existing
 * convention beats designing a better one nobody reads, so where their fields
 * and ours disagreed, theirs won.
 */

import { ENDPOINT_PRICING, PAYMENT_CONFIG, isMetered } from './config';
import { supportedKinds, NETWORK, X402_VERSION } from './facilitator';

export interface CatalogAccept {
  scheme: string;
  network: string;
  /** Base units, as x402 discovery publishes them. */
  amount: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export interface CatalogItem {
  resource: string;
  type: 'http';
  x402Version: number;
  method: string;
  accepts: CatalogAccept[];
  metadata: {
    mimeType: string;
    description: string;
    /** Present when the advertised amount is a ceiling rather than a price. */
    pricing?: 'metered' | 'fixed';
  };
  lastUpdated: string;
}

/**
 * What each endpoint actually returns, in a sentence.
 *
 * Written for an agent choosing between them, so each says what the data IS
 * rather than which route serves it. An endpoint with no honest description
 * has no business being in a catalogue.
 */
const DESCRIPTIONS: Record<string, string> = {
  '/api/chain/token':
    'Live ERC-20 metadata from Robinhood Chain: name, symbol, decimals, total supply, read from the contract.',
  '/api/chain/balance':
    'Live token balance for any address on Robinhood Chain, read from the contract rather than an index.',
  '/api/chain/receipt':
    'Verify a transaction receipt on Robinhood Chain: status, block, and the ERC-20 transfers it contains.',
  '/api/rwa/tokens':
    'The tokenised equities on Robinhood Chain, each checked against the canonical Robinhood Token marker at read time.',
  '/api/rwa/token':
    'One tokenised equity: supply, decimals, and whether its on-chain name matches the canonical issuer marker.',
  '/api/rwa/holdings':
    'Which tokenised equities an address holds, and how much of each.',
  '/api/rwa/transfers':
    'Transfer history for one tokenised equity, straight from the chain logs. Priced per row returned, because the size of the answer is not knowable in advance.',
  '/api/rwa/corporate-actions':
    'Corporate actions on tokenised equities: the current scaling multiplier, any scheduled change with its effective date, pause state, and the full history from the chain event log. Tells you when a raw balanceOf will not match the issuer figure.',
  '/api/rwa/eligibility':
    'Whether an address can receive a tokenised equity, read from the access registry every stock token defers to plus that token pause flags. On-chain state only.',
  '/api/data/stock':
    'Market data for a tokenised equity, paired with its on-chain supply.',
  '/api/tools/qrcode': 'Generate a QR code for a payment link or arbitrary payload.',
};

const METHODS: Record<string, string> = {
  '/api/tools/qrcode': 'POST',
};

/** Whole tokens to base units without floating point, as the spec publishes them. */
function toBaseUnits(amount: string, decimals: number): string {
  const [whole, fraction = ''] = String(amount).split('.');
  const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
  // Written as a loop rather than ** because the build targets es5, where the
  // bigint exponent operator is not available.
  let scale = BigInt(1);
  for (let i = 0; i < decimals; i++) scale *= BigInt(10);
  return (BigInt(whole || '0') * scale + BigInt(padded || '0')).toString();
}

function originFrom(req?: Request): string {
  if (req) {
    try {
      return new URL(req.url).origin;
    } catch {
      /* fall through */
    }
  }
  return process.env.PAYLESS_PUBLIC_ORIGIN || 'https://www.payless.network';
}

/**
 * Every priced endpoint, with every way it can be paid.
 *
 * Free endpoints are deliberately absent: this is a catalogue of what costs
 * money, and listing free ones alongside would make an agent budget for
 * requests it never has to pay for.
 */
export async function buildCatalog(req?: Request): Promise<CatalogItem[]> {
  const origin = originFrom(req);
  const kinds = await supportedKinds();
  const now = new Date().toISOString();
  const decimals = PAYMENT_CONFIG.tokenDecimals;

  return Object.entries(ENDPOINT_PRICING).map(([path, price]) => {
    const metered = isMetered(path);
    return {
      resource: `${origin}${path}`,
      type: 'http' as const,
      x402Version: X402_VERSION,
      method: METHODS[path] ?? 'GET',
      accepts: kinds.map((kind) => ({
        scheme: kind.scheme,
        network: NETWORK,
        amount: toBaseUnits(price, decimals),
        payTo: PAYMENT_CONFIG.walletAddress,
        asset: PAYMENT_CONFIG.tokenAddress,
        // How long a signature for this resource stays usable. Shorter than the
        // facilitator's own window, so a stale quote fails here rather than at
        // settlement.
        maxTimeoutSeconds: 300,
        extra: metered ? { ...kind.extra, pricing: 'metered' } : kind.extra,
      })),
      metadata: {
        mimeType: 'application/json',
        description: DESCRIPTIONS[path] ?? 'A paid endpoint on Payless.',
        // Stated, because on a metered resource the advertised amount is a
        // ceiling and an agent budgeting against it would over-reserve.
        pricing: metered ? ('metered' as const) : ('fixed' as const),
      },
      lastUpdated: now,
    };
  });
}
