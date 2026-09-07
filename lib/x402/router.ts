/**
 * The buyer's side.
 *
 * Everything built here so far helps somebody sell: a facilitator, schemes, a
 * wallet that enforces a budget, a catalogue, an index of who gets paid. None
 * of it helps an agent decide who to buy from, which is the question an agent
 * actually has. It knows what it needs. It does not know who on this chain
 * sells it, what they charge, or whether they have ever delivered anything.
 *
 * So this answers that, and the ranking is the part that matters. Prices come
 * from manifests, which are claims: a seller writes them and could write
 * anything. Settlement counts come from the chain, which nobody can write. A
 * router that sorted on price alone would be trivial to game by advertising a
 * price nobody honours, so price is what an offer says and evidence is what
 * happened, and both travel with every result.
 *
 * Two things are stated in every response rather than buried:
 *
 *   - We sell here too, and we run this. An offer of ours is flagged, so a
 *     caller can see the conflict rather than discover it.
 *   - Being paid is not being good. The chain proves a settlement happened. It
 *     says nothing about whether the data was worth the money, and no amount of
 *     on-chain evidence will ever say that.
 */

import { formatUnits, getAddress } from 'viem';
import { allRegistrations, fetchManifest, type RegisteredSeller } from '../chains/seller-registry';
import { readAllSellerTotals, type SellerTotal } from '../chains/x402-stats';
import { PAYMENT_CONFIG } from './config';

export interface Offer {
  seller: string;
  sellerName: string | null;
  resource: string;
  description: string;
  method: string;
  scheme: string;
  network: string;
  /** Base units, as the manifest advertises them. */
  amountBase: string;
  amountUSDG: string;
  /** A metered item advertises a ceiling; the charge is decided after the work. */
  pricing: 'fixed' | 'metered';
  manifestUrl: string;
  /** Settlements observed paying this address. Read from the chain. */
  paymentsObserved: number;
  volumeObservedUSDG: string;
  /** True when the offer belongs to whoever operates this router. */
  operatedByRouter: boolean;
  /** Why this offer ranked where it did, in one line. */
  why: string;
}

export interface Quote {
  need: string | null;
  offers: Offer[];
  considered: number;
  sellersConsidered: number;
  disclosure: string;
  limits: string;
  retrievedAt: string;
}

/** Our own payTo, so an offer of ours can be labelled rather than hidden. */
function ourAddress(): string {
  try {
    return getAddress(PAYMENT_CONFIG.walletAddress as `0x${string}`);
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Gathering
// ---------------------------------------------------------------------------

interface RawItem {
  resource?: unknown;
  method?: unknown;
  accepts?: unknown;
  metadata?: unknown;
}

/**
 * Turn one seller's manifest into offers.
 *
 * Defensive throughout, because a manifest is a stranger's JSON: every field is
 * checked before use and anything malformed is skipped rather than thrown on. A
 * router that dies on one bad manifest is a router that any seller can take
 * down by publishing nonsense.
 */
function offersFrom(entry: RegisteredSeller, manifest: unknown, total: SellerTotal | null): Offer[] {
  const body = manifest as { items?: unknown } | null;
  if (!body || typeof body !== 'object' || !Array.isArray(body.items)) return [];

  const seller = entry.address;
  const mine = ourAddress() !== '' && seller.toLowerCase() === ourAddress().toLowerCase();
  const out: Offer[] = [];

  for (const raw of body.items as RawItem[]) {
    if (!raw || typeof raw !== 'object') continue;
    const resource = typeof raw.resource === 'string' ? raw.resource : null;
    if (!resource) continue;

    const accepts = Array.isArray(raw.accepts) ? raw.accepts : [];
    const meta = (raw.metadata ?? {}) as { description?: unknown; pricing?: unknown };

    for (const acceptRaw of accepts) {
      const accept = acceptRaw as Record<string, unknown>;
      const payTo = typeof accept?.payTo === 'string' ? accept.payTo : null;
      // An item paying somebody else is not this seller's offer to make, even
      // when it appears in their manifest.
      if (!payTo || payTo.toLowerCase() !== seller.toLowerCase()) continue;

      const amount = typeof accept.amount === 'string' ? accept.amount : null;
      if (amount === null || !/^\d+$/.test(amount)) continue;

      out.push({
        seller,
        sellerName: entry.name,
        resource,
        description: typeof meta.description === 'string' ? meta.description : '',
        method: typeof raw.method === 'string' ? raw.method : 'GET',
        scheme: typeof accept.scheme === 'string' ? accept.scheme : 'unknown',
        network: typeof accept.network === 'string' ? accept.network : 'unknown',
        amountBase: amount,
        amountUSDG: formatUnits(BigInt(amount), 6),
        pricing: meta.pricing === 'metered' ? 'metered' : 'fixed',
        manifestUrl: entry.manifestUrl,
        paymentsObserved: total?.payments ?? 0,
        volumeObservedUSDG: total ? formatUnits(BigInt(total.volumeBase), 6) : '0',
        operatedByRouter: mine,
        why: '',
      });
    }
  }

  return out;
}

/** Every offer currently on the table, from every registered seller. */
export async function collectOffers(): Promise<{ offers: Offer[]; sellers: number }> {
  const [registrations, totals] = await Promise.all([allRegistrations(), readAllSellerTotals()]);
  const byAddress = new Map(totals.map((t) => [t.address.toLowerCase(), t]));

  const all: Offer[] = [];
  for (const entry of registrations) {
    const fetched = await fetchManifest(entry.manifestUrl);
    // A seller whose manifest is down drops out of this answer rather than
    // failing it. Their registration is untouched: unreachable is not
    // disqualified, and the registry already draws that line.
    if (!fetched.ok) continue;
    all.push(...offersFrom(entry, fetched.body, byAddress.get(entry.address.toLowerCase()) ?? null));
  }

  return { offers: all, sellers: registrations.length };
}

// ---------------------------------------------------------------------------
// Matching and ranking
// ---------------------------------------------------------------------------

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

/**
 * How well an offer answers a need.
 *
 * Deliberately simple and deliberately transparent: a count of query terms that
 * appear in the description or the resource path. A cleverer scorer would be
 * harder to explain, and an agent choosing where to spend money is owed an
 * explanation it can check rather than a number it has to trust.
 */
function relevance(offer: Offer, terms: string[]): number {
  if (terms.length === 0) return 1;
  const haystack = `${offer.resource} ${offer.description}`.toLowerCase();
  let hits = 0;
  for (const term of terms) if (haystack.includes(term)) hits += 1;
  return hits;
}

export interface RouteOptions {
  need?: string | null;
  limit?: number;
  /** Drop offers above this price in base units. Metered items are ceilings. */
  maxAmountBase?: string | null;
}

/**
 * Rank offers for a need.
 *
 * Order of tie-breaks, most to least important: does it match, has it ever
 * actually been paid, is it cheaper. Evidence sits above price on purpose. The
 * cheapest offer from an address that has never settled anything is not a
 * bargain, it is an untested claim, and an agent spending real money should see
 * those ordered accordingly.
 */
export async function route(options: RouteOptions = {}): Promise<Quote> {
  const { offers, sellers } = await collectOffers();
  const terms = tokenise(options.need ?? '');
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const cap = options.maxAmountBase && /^\d+$/.test(options.maxAmountBase)
    ? BigInt(options.maxAmountBase)
    : null;

  const scored = offers
    .map((offer) => ({ offer, score: relevance(offer, terms) }))
    .filter((x) => x.score > 0)
    .filter((x) => (cap === null ? true : BigInt(x.offer.amountBase) <= cap));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.offer.paymentsObserved !== a.offer.paymentsObserved) {
      return b.offer.paymentsObserved - a.offer.paymentsObserved;
    }
    const av = BigInt(a.offer.amountBase);
    const bv = BigInt(b.offer.amountBase);
    return av === bv ? 0 : av < bv ? -1 : 1;
  });

  const ranked = scored.slice(0, limit).map(({ offer, score }) => ({
    ...offer,
    why:
      `${score} of ${Math.max(terms.length, 1)} terms matched; ` +
      `${offer.paymentsObserved} settlements observed on chain; ` +
      `${offer.pricing === 'metered' ? 'ceiling' : 'price'} ${offer.amountUSDG} USDG`,
  }));

  return {
    need: options.need ?? null,
    offers: ranked,
    considered: offers.length,
    sellersConsidered: sellers,
    disclosure:
      'Payless operates this router and also sells here. Offers of ours are flagged with operatedByRouter, and they are ranked by the same rules as everyone else.',
    limits:
      'Prices come from each seller manifest and are claims, not guarantees; a metered item advertises a ceiling and charges what the work cost. Settlement counts come from the chain and are facts, but being paid is not the same as being good: nothing here says whether the data was worth the money. Only registered sellers appear, so this is not every seller on the chain.',
    retrievedAt: new Date().toISOString(),
  };
}
