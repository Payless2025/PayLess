/**
 * The loop, closed.
 *
 * Every piece of this stack existed before this file and none of them touched
 * each other. The router could say who sells a thing but nobody acted on it.
 * The schemes could move money but nothing decided to. The policy wallet could
 * cap a spend but nothing spent from it. Three weeks of building a machine and
 * never turning it on.
 *
 * So: a need goes in, the router says who sells it, this pays one of them from
 * a wallet the chain polices, and the data comes back with the transaction that
 * bought it. No human in the middle.
 *
 * Three separate things stop this from being a way to drain us, and they are
 * deliberately not the same thing:
 *
 *   - the caller's own ceiling, refused before anything is signed
 *   - the per-call cap inside the policy wallet, enforced by consensus
 *   - the wallet's float, which is all a leaked session key can ever reach
 *
 * Only the middle one is a real guarantee. The first is ours to get wrong and
 * the third is a bound rather than a rule, which is exactly why the contract
 * holds the one that matters.
 */

import { sign } from 'viem/accounts';
import { getAddress, formatUnits, hashTypedData, type Hex } from 'viem';
import { policyWalletBlob, PERMIT2_ADDRESS } from '../x402/permit2';
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_EXPLORER_URL } from '../chains/config';
import { route, type Offer } from '../x402/router';

const ORIGIN = process.env.PAYLESS_PUBLIC_ORIGIN || 'https://www.payless.network';

const UPTO_TYPES = {
  PermitWitnessTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'witness', type: 'Witness' },
  ],
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  Witness: [
    { name: 'to', type: 'address' },
    { name: 'facilitator', type: 'address' },
    { name: 'validAfter', type: 'uint256' },
  ],
} as const;

function config() {
  const wallet = process.env.PAYLESS_POLICY_WALLET;
  const key = process.env.PAYLESS_SESSION_KEY;
  if (!wallet || !key) return null;
  return {
    wallet: getAddress(wallet as `0x${string}`),
    key: (key.startsWith('0x') ? key : `0x${key}`) as Hex,
  };
}

export function buyerConfigured(): boolean {
  return config() !== null;
}

/** viem v1 sign() returns {r,s,v}; the contract wants a packed 65-byte hex. */
function packSignature(r: Hex, s: Hex, v: bigint | number): Hex {
  const vByte = Number(v) === 27 || Number(v) === 0 ? '1b' : '1c';
  return (r + s.slice(2) + vByte) as Hex;
}

export interface Receipt {
  txHash: string | null;
  explorer: string | null;
  ceilingUSDG: string;
  chargedUSDG: string | null;
  payTo: string;
  facilitator: string;
  scheme: 'upto';
}

export interface Purchase {
  ok: boolean;
  step: 'quote' | 'sign' | 'pay' | 'done' | 'refused';
  detail: string;
  resource?: string;
  data?: unknown;
  receipt?: Receipt;
}

/**
 * Pay for one resource and return what it served.
 *
 * The 402 is read first rather than assumed, because a price is only real at
 * the moment it is quoted. A manifest saying two cents and a challenge saying
 * twenty is a disagreement that has to stop the purchase, not be averaged.
 */
export async function purchase(
  resourceUrl: string,
  options: { maxSpendBase?: bigint; params?: Record<string, string> } = {}
): Promise<Purchase> {
  const cfg = config();
  if (!cfg) {
    return { ok: false, step: 'refused', detail: 'No policy wallet or session key configured on this server.' };
  }

  const query = new URLSearchParams(options.params ?? {}).toString();
  const url = query ? `${resourceUrl}${resourceUrl.includes('?') ? '&' : '?'}${query}` : resourceUrl;

  let quoteRes: Response;
  let challenge: any;
  try {
    quoteRes = await fetch(url);
    challenge = await quoteRes.json().catch(() => null);
  } catch (error) {
    return { ok: false, step: 'quote', detail: `Could not read the price: ${(error as Error).message}` };
  }

  const accepts: any[] = challenge?.payment?.accepts ?? [];

  // A resource that refuses the request is a different failure from one that
  // cannot be paid for, and conflating them sends whoever is debugging to the
  // payment code when the problem is a missing parameter. This is exactly how
  // the first live purchase failed: a 400 asking for an address was reported
  // as "no live upto scheme".
  if (accepts.length === 0 && quoteRes.status !== 402) {
    const reason = (challenge as any)?.error ?? `HTTP ${quoteRes.status}`;
    return {
      ok: false,
      step: 'quote',
      detail: `The resource refused the request before quoting a price: ${reason}`,
      resource: url,
    };
  }
  const upto = accepts.find(
    (a) => a.scheme === 'upto' && a.extra?.assetTransferMethod === 'permit2' && a.extra?.settlement === 'live'
  );
  if (!upto) {
    return {
      ok: false,
      step: 'quote',
      detail: 'That resource offered no live upto scheme, so this buyer cannot pay for it.',
      resource: url,
    };
  }

  const asset = getAddress(upto.asset as `0x${string}`);
  const ceiling = BigInt(Math.round(Number(upto.amount) * 1e6));

  // The caller's ceiling is checked against what the seller actually quoted,
  // not against what the router advertised. Those can differ, and the quote is
  // the one that will be charged.
  if (options.maxSpendBase !== undefined && ceiling > options.maxSpendBase) {
    return {
      ok: false,
      step: 'refused',
      detail:
        `Quoted ceiling ${formatUnits(ceiling, 6)} USDG is above the ${formatUnits(options.maxSpendBase, 6)} USDG limit set for this purchase. Nothing was signed.`,
      resource: url,
    };
  }

  const nonce = BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const digest = hashTypedData({
    domain: { name: 'Permit2', chainId: Number(ROBINHOOD_CHAIN_ID), verifyingContract: PERMIT2_ADDRESS },
    types: UPTO_TYPES as any,
    primaryType: 'PermitWitnessTransferFrom',
    message: {
      permitted: { token: asset, amount: ceiling },
      spender: getAddress(upto.extra.spender),
      nonce,
      deadline,
      witness: {
        to: getAddress(upto.payTo),
        facilitator: getAddress(upto.extra.facilitator),
        validAfter: BigInt(0),
      },
    } as any,
  });

  const { r, s, v } = await sign({ hash: digest, privateKey: cfg.key });
  const blob = policyWalletBlob({
    scheme: 'upto',
    token: asset,
    amount: ceiling.toString(),
    nonce: nonce.toString(),
    deadline: deadline.toString(),
    to: upto.payTo,
    facilitator: upto.extra.facilitator,
    validAfter: '0',
    sessionSignature: packSignature(r as Hex, s as Hex, v as bigint),
  });

  const payload = {
    scheme: 'upto',
    owner: cfg.wallet,
    permitted: { token: asset, amount: ceiling.toString() },
    nonce: nonce.toString(),
    deadline: deadline.toString(),
    witness: {
      to: getAddress(upto.payTo),
      facilitator: getAddress(upto.extra.facilitator),
      validAfter: '0',
    },
    signature: blob,
  };

  const res = await fetch(url, { headers: { 'X-Payment': JSON.stringify(payload) } });
  const charged = res.headers.get('x-payment-settled-amount');
  const txHash = res.headers.get('x-payment-confirmed');
  const settlementFailed = res.headers.get('x-payment-settlement') === 'failed';

  const receipt: Receipt = {
    txHash,
    explorer: txHash ? `${ROBINHOOD_EXPLORER_URL}/tx/${txHash}` : null,
    ceilingUSDG: formatUnits(ceiling, 6),
    chargedUSDG: charged,
    payTo: getAddress(upto.payTo),
    facilitator: getAddress(upto.extra.facilitator),
    scheme: 'upto',
  };

  if (res.status !== 200 || settlementFailed) {
    const body = await res.json().catch(() => ({}));
    return {
      ok: false,
      step: 'pay',
      detail: settlementFailed
        ? 'The resource served but settlement failed, so nothing was charged and nothing should be trusted.'
        : `The seller answered ${res.status}: ${(body as any)?.error ?? 'no reason given'}`,
      resource: url,
      receipt,
    };
  }

  return {
    ok: true,
    step: 'done',
    detail: `Bought ${url} for ${charged ?? receipt.ceilingUSDG} USDG.`,
    resource: url,
    data: await res.json().catch(() => null),
    receipt,
  };
}

// ---------------------------------------------------------------------------
// Need in, data out
// ---------------------------------------------------------------------------

export interface FetchResult extends Purchase {
  need: string;
  /** Who was considered, and why the winner won. */
  chosen?: { seller: string; sellerName: string | null; why: string; operatedByRouter: boolean };
  alternativesConsidered: number;
  disclosure: string;
}

/**
 * Say what you need. Get the data and the transaction that paid for it.
 *
 * The router chooses and this pays, and those stay separate on purpose: the
 * ranking rule is a claim about who is worth buying from, and the purchase is
 * a claim about what was actually spent. Merging them would make it impossible
 * to tell a bad ranking from a bad payment.
 */
export async function fetchByNeed(
  need: string,
  options: { maxSpendBase?: bigint; params?: Record<string, string> } = {}
): Promise<FetchResult> {
  const quote = await route({ need, limit: 5 });

  const base = {
    need,
    alternativesConsidered: quote.offers.length,
    disclosure: quote.disclosure,
  };

  const affordable = quote.offers.filter((o: Offer) =>
    options.maxSpendBase === undefined ? true : BigInt(o.amountBase) <= options.maxSpendBase
  );

  if (affordable.length === 0) {
    return {
      ...base,
      ok: false,
      step: 'refused',
      detail:
        quote.offers.length === 0
          ? `Nobody registered on this chain advertises anything matching "${need}".`
          : `Everyone selling "${need}" is above the limit set for this purchase. Nothing was signed.`,
    };
  }

  // The router already ranked these by match, then evidence, then price. Taking
  // the top one is the whole point of having ranked them; re-deciding here
  // would make the ranking advisory and hide which rule actually chose.
  const pick = affordable[0];

  // Checked before paying, not after. The alternative is to spend USDG, get a
  // 400 asking for an address, and have both the money and the answer gone.
  const supplied = options.params ?? {};
  const missing = pick.inputs.required.filter((k) => !supplied[k]);
  if (missing.length > 0) {
    return {
      ...base,
      ok: false,
      step: 'refused',
      detail:
        `${pick.resource} needs ${missing.map((m) => `"${m}"`).join(', ')} before it will answer, and none was supplied. Nothing was signed.`,
      chosen: {
        seller: pick.seller,
        sellerName: pick.sellerName,
        why: pick.why,
        operatedByRouter: pick.operatedByRouter,
      },
    };
  }

  const result = await purchase(pick.resource, options);

  return {
    ...base,
    ...result,
    chosen: {
      seller: pick.seller,
      sellerName: pick.sellerName,
      why: pick.why,
      operatedByRouter: pick.operatedByRouter,
    },
  };
}
