import { NextRequest, NextResponse } from 'next/server';
import { buildCatalog } from '@/lib/x402/catalog';
import { X402_VERSION } from '@/lib/x402/facilitator';

export const dynamic = 'force-dynamic';

/**
 * The same catalogue at the path production x402 facilitators already serve it
 * from, so a client that knows the convention needs no special case for us.
 *
 * Paginated in shape even though one server's catalogue fits in one page: a
 * client that has to special-case a missing `pagination` object is a client we
 * broke for no reason.
 */
export async function GET(req: NextRequest) {
  const items = await buildCatalog(req);
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || 100), 100));
  const offset = Math.max(0, Number(searchParams.get('offset') || 0));

  return NextResponse.json({
    x402Version: X402_VERSION,
    items: items.slice(offset, offset + limit),
    pagination: { limit, offset, total: items.length },
  });
}
