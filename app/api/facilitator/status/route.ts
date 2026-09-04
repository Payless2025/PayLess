import { NextResponse } from 'next/server';
import { formatEther } from 'viem';
import { signerFromEnv } from '@/lib/x402/facilitator-signer';
import { NETWORK } from '@/lib/x402/facilitator';
import { isSpentStoreShared, getSpentStore } from '@/lib/x402/spent-store';
import { chainClient, withRpcRetry } from '@/lib/chains/reader';

export const dynamic = 'force-dynamic';

/**
 * Whether this facilitator can do its job right now, and what stops it if not.
 *
 * A payment layer that only reports success is not reportable at all. Everything
 * a seller depends on is checked live here: the signer's gas, the replay
 * ledger, the chain itself. Each one is a way this service becomes unable to
 * settle, and each is better learned from a status page than from a failed
 * request.
 *
 * `degraded` is deliberately a state of its own. A service that answers only
 * "up" or "down" gets called "up" while it is quietly out of gas.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  // 1. Can we sign, and can we pay for signing?
  const signer = signerFromEnv();
  if (!signer) {
    checks.signer = { ok: false, detail: 'No signing key configured. Signature schemes cannot settle.' };
  } else {
    try {
      const gas = await signer.gasBalance();
      // Roughly a dozen settlements. Below that, say so before a seller finds out.
      const enough = gas > BigInt(3e14);
      checks.signer = {
        ok: enough,
        detail: enough
          ? `${formatEther(gas)} ETH, enough to keep settling.`
          : `${formatEther(gas)} ETH. Too low to keep settling reliably; top up ${signer.address}.`,
      };
    } catch {
      checks.signer = { ok: false, detail: 'Signer configured, but its balance could not be read.' };
    }
  }

  // 2. The replay ledger. Without a shared one we fail closed on every
  //    receipt, which is safe and also useless.
  if (!isSpentStoreShared()) {
    checks.replayLedger = {
      ok: false,
      detail: 'In-memory. One payment could buy a response per instance, so receipt settlement refuses outright.',
    };
  } else {
    try {
      const store = getSpentStore() as { ping?: () => Promise<boolean> };
      const alive = typeof store.ping === 'function' ? await store.ping() : true;
      checks.replayLedger = {
        ok: alive,
        detail: alive ? 'Shared and answering.' : 'Shared but not answering. Settlement fails closed.',
      };
    } catch {
      checks.replayLedger = { ok: false, detail: 'Shared ledger unreachable. Settlement fails closed.' };
    }
  }

  // 3. The chain. Everything else is downstream of being able to read it.
  try {
    const block = await withRpcRetry(() => chainClient().getBlockNumber());
    checks.chain = { ok: true, detail: `Reading Robinhood Chain at block ${block}.` };
  } catch {
    checks.chain = { ok: false, detail: 'Chain RPC unreachable. Nothing can be verified.' };
  }

  const failed = Object.entries(checks).filter(([, c]) => !c.ok);
  const status = failed.length === 0 ? 'operational' : failed.length === Object.keys(checks).length ? 'down' : 'degraded';

  return NextResponse.json(
    {
      status,
      network: NETWORK,
      checks,
      // Named, because "who runs this" is a fair question to ask of anything
      // you route payments through, and an unanswered one is its own answer.
      operator: {
        name: process.env.PAYLESS_FACILITATOR_OPERATOR || 'Payless',
        contact: process.env.PAYLESS_FACILITATOR_CONTACT || 'https://github.com/Payless2025/PayLess/issues',
        signer: signer?.address ?? null,
      },
      selfHost:
        'This facilitator is not meant to be the only one. Run your own: https://github.com/Payless2025/PayLess/blob/master/docs/FACILITATOR.md',
      checkedAt: new Date().toISOString(),
    },
    { status: status === 'down' ? 503 : 200 }
  );
}
