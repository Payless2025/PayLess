import { NextRequest, NextResponse } from 'next/server';
import { registerWebhook, listWebhooks, updateWebhook, deleteWebhook } from '@/lib/x402/webhooks';
import { WebhookConfig, WebhookEventType } from '@/lib/x402/types';

/**
 * GET /api/webhooks - List all webhooks
 */
export async function GET(req: NextRequest) {
  try {
    const webhooks = listWebhooks();
    
    return NextResponse.json({
      success: true,
      webhooks,
      total: webhooks.length,
    });
  } catch (error) {
    console.error('Error listing webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to list webhooks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks - Register a new webhook
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, secret, events, enabled = true } = body;

    // Validate required fields
    if (!url || !secret || !events) {
      return NextResponse.json(
        { error: 'Missing required fields: url, secret, events' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 400 }
      );
    }

    // Validate events
    const validEvents = Object.values(WebhookEventType);
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e as WebhookEventType));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid event types: ${invalidEvents.join(', ')}` },
        { status: 400 }
      );
    }

    const config: WebhookConfig = {
      url,
      secret,
      events,
      enabled,
    };

    const webhookId = registerWebhook(config);

    return NextResponse.json({
      success: true,
      webhookId,
      message: 'Webhook registered successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering webhook:', error);
    return NextResponse.json(
      { error: 'Failed to register webhook' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/webhooks?id={webhookId} - Update webhook
 */
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updated = updateWebhook(webhookId, body);

    if (!updated) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook updated successfully',
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/webhooks?id={webhookId} - Delete webhook
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    const deleted = deleteWebhook(webhookId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}

