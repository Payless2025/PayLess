import { NextResponse } from 'next/server';
import { runAgentTick, agentConfigured } from '@/lib/agent/session-agent';

export const dynamic = 'force-dynamic';

/**
 * One turn of the stage agent: read NVDA transfers, pay for them from the
 * policy wallet, report the whole act with its hash.
 *
 * Rate-limited because it spends real money. The cap on how much it can spend
 * is the wallet's float, enforced on chain, but a public button that signs a
 * payment on every click still deserves a leash so one visitor cannot drain a
 * day's float in a page load. When the float is gone the agent says so — that
 * is the demonstration, not an error to hide.
 */
const COOLDOWN_MS = 20_000;
let lastTick = 0;

export async function POST() {
  if (!agentConfigured()) {
    return NextResponse.json(
      { ok: false, step: 'config', detail: 'The stage agent has no policy wallet configured on this server yet.' },
      { status: 503 }
    );
  }

  const waited = Date.now() - lastTick;
  if (waited < COOLDOWN_MS) {
    return NextResponse.json(
      { ok: false, step: 'cooldown', detail: `One purchase every ${COOLDOWN_MS / 1000}s. Try again in ${Math.ceil((COOLDOWN_MS - waited) / 1000)}s.` },
      { status: 429 }
    );
  }
  lastTick = Date.now();

  try {
    const tick = await runAgentTick();
    return NextResponse.json(tick);
  } catch (error) {
    lastTick = 0; // a crash was not a real turn; do not hold the cooldown
    return NextResponse.json(
      { ok: false, step: 'error', detail: error instanceof Error ? error.message : 'The turn failed.' },
      { status: 500 }
    );
  }
}
