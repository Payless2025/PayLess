/**
 * Which way the agent pays.
 *
 * A signed authorisation costs the agent no gas and no wait for a block, so it
 * wins whenever the endpoint offers one and the facilitator is actually live.
 *
 * Between the two signature schemes: `exact` by default, because `upto` hands
 * the seller discretion over the final amount within the signed ceiling. The
 * exception is an endpoint declaring `pricing: 'metered'` — there the
 * advertised amount IS the ceiling, and `upto` is how you pay the real cost
 * instead of the maximum. An agent preferring `exact` on a metered endpoint is
 * volunteering to overpay on every call.
 *
 * Exported on its own so the tests exercise this function and not a copy of
 * it — a copy stays green while the real thing drifts.
 */

export interface Accept {
  scheme: string;
  network: string;
  amount: string;
  payTo: string;
  asset?: string;
  extra?: {
    assetTransferMethod?: string;
    spender?: string;
    facilitator?: string;
    settlement?: string;
    pricing?: string;
  };
}

export function gaslessOption(accepts: Accept[] | undefined): Accept | null {
  const usable = (accepts ?? []).filter(
    (a) =>
      a.extra?.assetTransferMethod === 'permit2' &&
      a.extra?.settlement === 'live' &&
      a.extra?.spender &&
      a.asset &&
      (a.scheme !== 'upto' || a.extra?.facilitator)
  );
  const metered = usable.find((a) => a.scheme === 'upto' && a.extra?.pricing === 'metered');
  if (metered) return metered;
  return usable.find((a) => a.scheme === 'exact') ?? usable[0] ?? null;
}

/**
 * Whole tokens to base units without floating point.
 *
 * `Math.round(0.007 * 10 ** 6)` happens to work; the day it does not, the
 * signature commits to an off-by-one integer and fails for reasons nobody can
 * read off the revert. Parsed as strings instead.
 */
export function toBaseUnits(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = String(amount).split('.');
  const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * BigInt(10) ** BigInt(decimals) + BigInt(padded || '0');
}
