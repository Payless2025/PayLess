/**
 * Which job this Railway service is.
 *
 * Two services run from this one repository and Railway gives them one start
 * command between them, so the choice has to live somewhere the services can
 * differ: an environment variable.
 *
 * `collect` is the default, and deliberately so. That service moves money on a
 * schedule, it was running before this file existed, and it has no RAILWAY_JOB
 * set. A default of anything else would silently stop subscription collection
 * the moment this shipped. The collector is also spawned as its own process
 * with its own arguments rather than imported, so its behaviour is what it
 * always was rather than what this wrapper happens to reproduce.
 *
 *   RAILWAY_JOB=collect   pull due subscription payments   (default)
 *   RAILWAY_JOB=scan      walk x402 settlement history
 */

import { spawnSync } from 'node:child_process';

const JOB = (process.env.RAILWAY_JOB || 'collect').toLowerCase();

/** Seconds between scan passes. The scan is a loop, not a one shot. */
const INTERVAL = Math.max(30, Number(process.env.SCAN_INTERVAL_SECONDS || 300));

function runCollector(): never {
  const result = spawnSync('npx', ['tsx', 'scripts/collect.ts', '--execute'], {
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
}

async function runScanner(): Promise<void> {
  const base = (process.env.PAYLESS_URL || 'https://www.payless.network').replace(/\/+$/, '');
  const secret = process.env.CRON_SECRET;
  const windows = process.env.SCAN_WINDOWS || '3';

  if (!secret) {
    console.error('CRON_SECRET is not set. The scan endpoint refuses unauthenticated callers.');
    process.exit(1);
  }

  console.log(`scanner: every ${INTERVAL}s, ${windows} windows a pass, against ${base}`);

  // A loop rather than a scheduled one shot. History is roughly a thousand
  // windows deep and each pass takes a few of them, so this is a long job that
  // makes steady progress, not a task that finishes.
  for (;;) {
    try {
      const res = await fetch(`${base}/api/cron/x402-stats?windows=${encodeURIComponent(windows)}`, {
        headers: { authorization: `Bearer ${secret}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        passes?: Array<Record<string, unknown>>;
      };

      if (!res.ok || !body.success) {
        // Logged and slept through rather than fatal. A pass that fails costs
        // one interval, and the scan is idempotent, so nothing is lost by
        // simply trying again.
        console.error(`pass failed (HTTP ${res.status}): ${body.error ?? 'no reason given'}`);
      } else {
        for (const pass of body.passes ?? []) {
          console.log(
            `${pass.direction}: ${pass.windowsScanned} scanned, ${pass.windowsSkipped} already done, ` +
              `${pass.settlementsFound} settlements, blocks ${pass.fromBlock}..${pass.toBlock}` +
              (pass.complete ? ' (history complete)' : '')
          );
        }
      }
    } catch (error) {
      console.error('pass failed:', (error as Error).message);
    }

    await new Promise((r) => setTimeout(r, INTERVAL * 1000));
  }
}

if (JOB === 'scan') {
  // The restart policy is shared with the collector, which needs NEVER because
  // it is a one shot that moves money and must not be re-run on its own. That
  // leaves this loop with no safety net, so it grows its own: an unexpected
  // throw is logged and stepped over rather than allowed to end the process for
  // good. Nothing here is transactional, and the scan is idempotent, so the
  // worst a swallowed error costs is one interval.
  process.on('unhandledRejection', (reason) => {
    console.error('unhandled rejection, continuing:', reason);
  });
  process.on('uncaughtException', (error) => {
    console.error('uncaught exception, continuing:', error);
  });
  runScanner();
} else {
  runCollector();
}
