import { NextRequest, NextResponse } from 'next/server';
import { getWebhookDeliveries } from '@/lib/x402/webhooks';

/**
 * GET /api/webhooks/deliveries?webhookId={id} - Get webhook delivery history
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get('webhookId') || undefined;

    const deliveries = getWebhookDeliveries(webhookId);

    return NextResponse.json({
      success: true,
      deliveries,
      total: deliveries.length,
    });
  } catch (error) {
    console.error('Error fetching webhook deliveries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook deliveries' },
      { status: 500 }
    );
  }
}

