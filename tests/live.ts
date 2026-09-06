/**
 * Tests that need the chain, and the switch that decides whether they run.
 *
 * A suite that talks to a live RPC and a public explorer is a suite that fails
 * for reasons unrelated to the code: rate limits, a slow index, a node behind
 * on blocks. Those failures teach nothing and, worse, they train everyone to
 * ignore a red suite.
 *
 * So the network-dependent cases are opt-in. `npm test` stays deterministic and
 * countable; `LIVE=1 npm test` additionally checks that what we believe about
 * the chain is still true. Both matter, and conflating them makes the first one
 * useless.
 *
 * A skipped live test reports itself as skipped rather than passing quietly.
 * Silence would let the chain drift away from our assumptions unnoticed, which
 * is the exact failure these tests exist to catch.
 */

export const LIVE = process.env.LIVE === '1' || process.env.LIVE === 'true';

export function liveNote(): string {
  return LIVE ? '' : ' (live checks skipped; run with LIVE=1)';
}
