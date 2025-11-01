import { NextRequest, NextResponse } from 'next/server';
import { getWebhook } from '@/lib/x402/webhooks';
import { WebhookEventType, PaymentWebhookData } from '@/lib/x402/types';
import { emitPaymentConfirmed } from '@/lib/x402/webhooks';

/**
 * POST /api/webhooks/test?id={webhookId} - Test webhook delivery
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    const webhook = getWebhook(webhookId);
    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Create test payment data
    const testData: PaymentWebhookData = {
      paymentId: 'test_' + Date.now(),
      signature: 'test_signature_' + Math.random().toString(36).substring(7),
      chain: 'solana',
      from: '11111111111111111111111111111111',
      to: '22222222222222222222222222222222',
      amount: '1.00',
      token: 'USDC',
      endpoint: '/api/test',
      timestamp: Date.now(),
      status: 'confirmed',
      metadata: {
        userAgent: 'PaylessWebhookTest/1.0',
        method: 'POST',
        responseTime: 100,
      },
    };

    // Trigger test webhook
    await emitPaymentConfirmed(testData);

    return NextResponse.json({
      success: true,
      message: 'Test webhook sent successfully',
      testData,
    });
  } catch (error) {
    console.error('Error testing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to send test webhook' },
      { status: 500 }
    );
  }
}

