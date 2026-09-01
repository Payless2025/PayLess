/**
 * The subscription collector.
 *
 * Runs outside the web application, in its own process, holding the only key in
 * this system that can pull funds from anyone. The website never sees it.
 *
 * Defaults to a dry run. Moving money requires `--execute`, spelled out, every
 * time — a script that charges people the moment somebody runs it to "see what
 * it does" is a script waiting to cause an incident.
 *
 *   npx tsx scripts/collect.ts              # report what would be collected
 *   npx tsx scripts/collect.ts --execute    # actually collect
 *
 * Environment:
 *   PAYLESS_COLLECTOR_PRIVATE_KEY   the signing key (required for --execute)
 *   PAYLESS_COLLECTOR_ADDRESS       the address subscribers approve
 *   UPSTASH_REDIS_REST_URL/TOKEN    the shared period ledger (required)
 */

import { readFileSync, existsSync } from 'node:fs';
import { getAddress, formatUnits } from 'viem';

// Load .env.local the way the app would. A standalone process gets none of
// Next.js's environment loading for free.
for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '');
  }
}

import { PLANS } from '../lib/x402/plans';
import { subscriptionSpender, subscriptionRecipient } from '../lib/x402/config';
import { decideAccess, periodIndex, amountInBaseUnits } from '../lib/x402/subscriptions';
import { getSubscriptionStore, isSubscriptionStoreShared } from '../lib/x402/subscription-store';
import { collectPeriod, setCollector } from '../lib/x402/collector';
import { collectorFromEnv, ConfigError } from '../lib/x402/collector-key';
import { readAllowance } from '../lib/chains/allowance';

const execute = process.argv.includes('--execute');

function line(...parts: unknown[]) {
  console.log(parts.join(' '));
}

async function main() {
  const spender = subscriptionSpender();
  const recipient = subscriptionRecipient();

  line(`payless collector · ${execute ? 'EXECUTING' : 'dry run'}`);
  line(`  spender   ${spender}`);
  line(`  recipient ${recipient}`);

  if (!isSubscriptionStoreShared()) {
    // Without a shared ledger two runs cannot agree on what has been collected,
    // and the failure mode is charging somebody twice.
    line('\nRefusing to run: the period ledger is in-memory.');
    line('Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
    process.exit(1);
  }

  const collector = collectorFromEnv();
  if (execute) {
    if (!collector) {
      line('\nRefusing to run: --execute needs PAYLESS_COLLECTOR_PRIVATE_KEY.');
      process.exit(1);
    }
    // Fails loudly rather than reverting on chain with an opaque error.
    collector.assertIsSpender(spender);
    setCollector(collector);
    line(`  signer    ${collector.address} ✓ matches advertised spender`);
  } else if (collector) {
    line(`  signer    ${collector.address} (loaded, not used — dry run)`);
  } else {
    line('  signer    none configured');
  }

  const store = getSubscriptionStore();
  const subs = await store.all();
  line(`\n${subs.length} subscription(s)\n`);

  let due = 0;
  let collected = 0;
  let skipped = 0;

  for (const sub of subs) {
    const plan = PLANS.find((p) => p.id === sub.planId);
    if (!plan) {
      line(`· ${sub.planId} ${sub.payer} — unknown plan, skipped`);
      skipped++;
      continue;
    }

    const period = periodIndex(sub, plan);
    const label = `${plan.id} ${sub.payer} period ${period}`;

    if (period < 0) {
      line(`· ${label} — not started`);
      continue;
    }

    const already = await store.getPeriod(plan.id, sub.payer, period);
    if (already?.status === 'collected') {
      line(`· ${label} — already collected ${already.txHash ?? ''}`);
      continue;
    }

    let reading;
    try {
      reading = await readAllowance({
        token: plan.token,
        owner: sub.payer,
        spender: getAddress(spender as `0x${string}`),
      });
    } catch (error) {
      line(`· ${label} — allowance read failed: ${(error as Error).message}`);
      skipped++;
      continue;
    }

    const decision = decideAccess({ sub, plan, collectableRaw: reading.collectableRaw });
    const need = formatUnits(amountInBaseUnits(plan), plan.decimals);

    if (!decision.allowed) {
      // Cancelled or out of funds. Not an error — this is how someone leaves.
      line(`· ${label} — ${decision.code}: ${decision.reason}`);
      continue;
    }

    due++;

    if (!execute) {
      line(`· ${label} — would collect ${need} ${plan.symbol} (collectable ${reading.collectable})`);
      continue;
    }

    const result = await collectPeriod({
      plan,
      sub,
      recipient: getAddress(recipient as `0x${string}`),
      period,
    });

    if (result.status === 'collected') {
      collected++;
      await store.put(sub);
      line(`· ${label} — collected ${need} ${plan.symbol} · ${result.txHash}`);
    } else {
      line(`· ${label} — ${result.status}: ${result.error ?? ''} ${result.txHash ?? ''}`);
    }
  }

  line(
    `\n${due} due · ${execute ? `${collected} collected` : 'nothing charged (dry run)'} · ${skipped} skipped`
  );
  if (!execute && due > 0) line('Re-run with --execute to collect.');
}

main().catch((error) => {
  if (error instanceof ConfigError) {
    // The operator needs to read this, so it gets no stack trace in front of it.
    console.error(`\nRefusing to run: ${error.message}`);
    process.exit(1);
  }
  console.error('\ncollector failed:', error);
  process.exit(1);
});
