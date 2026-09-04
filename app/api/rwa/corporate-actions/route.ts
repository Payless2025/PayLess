import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';
import { readAllActions, readTokenActions } from '@/lib/chains/corporate-actions';
import { findStockToken, STOCK_TOKENS } from '@/lib/chains/rwa';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

/**
 * Corporate actions on tokenised equities, read from the chain.
 *
 * The one field most callers actually need is `balancesNeedScaling`. When a
 * token's multiplier is not exactly 1, a raw `balanceOf` does not match the
 * issuer's own figure, and nothing in the ERC-20 interface says so.
 *
 * Deliberately reports numbers and timestamps without naming the event. A
 * multiplier moving from 1 to 1.000566 is a fact; calling it a split or a
 * dividend would be an interpretation we cannot support from chain data alone.
 */
async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('symbol') || searchParams.get('token');

  try {
    const tokens = query ? [findStockToken(query)!] : STOCK_TOKENS;
    const actions =
      tokens.length === 1
        ? [await readTokenActions(tokens[0])]
        : await readAllActions(searchParams.get('history') !== 'false');

    const pending = actions.filter((a) => a.pendingChange);
    const scaling = actions.filter((a) => a.balancesNeedScaling);
    const halted = actions.filter((a) => !a.transferable);

    return NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      data: {
        count: actions.length,
        pendingChanges: pending.length,
        needScaling: scaling.map((a) => a.ticker),
        notTransferable: halted.map((a) => a.ticker),
        tokens: actions,
      },
      notes: {
        multiplier:
          'A scaling factor the issuer adjusts when something happens to the underlying share. Reported as a number and a timestamp; naming the event would be an interpretation this data cannot support.',
        scaling:
          'Where balancesNeedScaling is true, a raw balanceOf does not equal the issuer displayed figure. Multiply by the multiplier.',
      },
      source: 'Robinhood Chain RPC and event logs',
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[rwa/corporate-actions]', error);
    return NextResponse.json(
      { success: false, error: 'Could not read corporate actions from Robinhood Chain' },
      { status: 502 }
    );
  }
}

export const GET = withX402Payment(handler, undefined, {
  validate: (req) => {
    const v = new URL(req.url).searchParams.get('symbol') || new URL(req.url).searchParams.get('token');
    if (v && !findStockToken(v)) return `Unknown stock token "${v}" — nothing was charged.`;
    return null;
  },
});
