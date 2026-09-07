/**
 * Drive one pass of the x402 settlement scanner.
 *
 * The scan lives behind an HTTP endpoint rather than in this script so that the
 * work runs where the credentials already are. This is only a trigger, which
 * means it needs nothing but a URL and a secret and can be run from anywhere on
 * any schedule.
 *
 * It is a separate script from the Vercel deployment for a practical reason:
 * scheduled functions there are capped at daily frequency on the plan this
 * project runs, and a daily pass would take most of a year to walk 56 million
 * blocks. An external scheduler has no such limit.
 *
 *   PAYLESS_URL=https://www.payless.network CRON_SECRET=... npx tsx scripts/scan-x402.ts
 *
 * Exits non-zero when a pass fails, so a scheduler can see it.
 */

const BASE = (process.env.PAYLESS_URL || 'https://www.payless.network').replace(/\/+$/, '');
const SECRET = process.env.CRON_SECRET;
const CHUNKS = process.env.SCAN_CHUNKS || '8';

async function main() {
  if (!SECRET) {
    console.error('CRON_SECRET is not set. The scan endpoint refuses unauthenticated callers.');
    process.exit(1);
  }

  const url = `${BASE}/api/cron/x402-stats?chunks=${encodeURIComponent(CHUNKS)}`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${SECRET}` } });
  const body = await res.json().catch(() => ({}));

  if (!res.ok || !body.success) {
    console.error(`scan failed (HTTP ${res.status}):`, body.error || body);
    process.exit(1);
  }

  for (const pass of body.passes ?? []) {
    console.log(
      `${pass.direction}: ${pass.chunksScanned} chunks, ` +
        `${pass.settlementsFound} settlements, ${pass.daysTouched} days touched, ` +
        `blocks ${pass.fromBlock}..${pass.toBlock}` +
        (pass.complete ? ' (history complete)' : '')
    );
  }
}

main().catch((error) => {
  console.error('scan failed:', error);
  process.exit(1);
});
