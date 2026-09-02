/**
 * Metered pricing for the transfers endpoint.
 *
 * Lives here and not in the route file because Next.js route files may export
 * only handlers — and because the tests want these rules without dragging a
 * route's worth of imports behind them.
 *
 * The model: the scan itself costs a base fee even when the range is empty
 * (the chain was queried either way), each returned row adds a flat rate, and
 * the advertised price is a hard ceiling — a promise the metering cannot
 * out-charge however busy the range turns out to be.
 */

/** The scan itself, paid even when the range turns out to be empty. */
export const TRANSFERS_BASE_FEE = 0.002;
/** Each transfer row that comes back. */
export const TRANSFERS_PER_ROW_FEE = 0.001;
/** The advertised price, which is also the metering cap. */
export const TRANSFERS_CEILING = 0.05;

export function meteredTransferCost(rows: number): string {
  const cost = TRANSFERS_BASE_FEE + rows * TRANSFERS_PER_ROW_FEE;
  return Math.min(cost, TRANSFERS_CEILING).toFixed(6);
}
