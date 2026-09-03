import { NextResponse } from 'next/server';
import { agentState } from '@/lib/agent/session-agent';

export const dynamic = 'force-dynamic';

/** The wallet's float and cap, read from the chain. Free, and the whole point:
 *  anyone can watch the balance and confirm it never crosses the cap. */
export async function GET() {
  try {
    return NextResponse.json({ success: true, ...(await agentState()) });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not read the wallet from chain.' }, { status: 502 });
  }
}
