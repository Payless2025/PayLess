/**
 * Webhook management and delivery system
 */

import crypto from 'crypto';
import { WebhookEvent, WebhookConfig, WebhookDelivery, WebhookEventType, PaymentWebhookData } from './types';
import { checkWebhookTarget } from './webhook-target';

// Shared when Upstash is configured. A webhook registered on one instance used
// to be invisible to every other one, so deliveries fired or did not depending
// on which machine handled the event.
import { keyedStore } from './keyed-store';

const webhooks = () => keyedStore<WebhookConfig>('webhooks');
const deliveries = () => keyedStore<WebhookDelivery>('webhook-deliveries');

/**
 * Register a webhook
 */
export async function registerWebhook(config: WebhookConfig): Promise<string> {
  const id = crypto.randomUUID();
  await webhooks().put(id, config);
  return id;
}

/**
 * Get webhook by ID
 */
export async function getWebhook(id: string): Promise<WebhookConfig | undefined> {
  return (await webhooks().get(id)) ?? undefined;
}

/**
 * Update webhook
 */
export async function updateWebhook(id: string, config: Partial<WebhookConfig>): Promise<boolean> {
  const existing = await webhooks().get(id);
  if (!existing) return false;

  await webhooks().put(id, { ...existing, ...config });
  return true;
}

/**
 * Delete webhook
 */
export async function deleteWebhook(id: string): Promise<boolean> {
  return webhooks().delete(id);
}

/**
 * List all webhooks
 */
export async function listWebhooks(): Promise<Array<{ id: string; config: WebhookConfig }>> {
  return (await webhooks().entries()).map(([id, config]) => ({ id, config }));
}

/**
 * Create webhook signature for verification
 */
export function createWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Trigger a webhook event
 */
export async function triggerWebhook(
  eventType: WebhookEventType,
  data: PaymentWebhookData
): Promise<void> {
  const event: WebhookEvent = {
    id: crypto.randomUUID(),
    type: eventType,
    timestamp: Date.now(),
    data,
  };

  // Find all webhooks subscribed to this event type
  const subscribedWebhooks = (await webhooks().entries()).filter(
    ([, config]) => config.enabled && config.events.includes(eventType)
  );

  // Deliver to each webhook
  const deliveryPromises = subscribedWebhooks.map(([webhookId, config]) =>
    deliverWebhook(webhookId, event, config)
  );

  await Promise.allSettled(deliveryPromises);
}

/**
 * Deliver webhook to endpoint
 */
async function deliverWebhook(
  webhookId: string,
  event: WebhookEvent,
  config: WebhookConfig,
  retryCount: number = 0
): Promise<void> {
  const delivery: WebhookDelivery = {
    id: crypto.randomUUID(),
    webhookId,
    eventId: event.id,
    url: config.url,
    status: 'pending',
    attempts: retryCount + 1,
    maxAttempts: 3,
    lastAttemptAt: Date.now(),
  };

  await deliveries().put(delivery.id, delivery);

  try {
    const payload = JSON.stringify(event);
    const signature = createWebhookSignature(payload, config.secret);

    // Re-checked at delivery, not only at registration. A host that was public
    // when it was registered can point somewhere private later, and following a
    // redirect would take us there without ever being asked.
    const target = checkWebhookTarget(config.url);
    if (!target.ok) {
      delivery.status = 'failed';
      delivery.response = { error: target.reason };
      await deliveries().put(delivery.id, delivery);
      return;
    }

    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payless-Signature': signature,
        'X-Payless-Event-Id': event.id,
        'X-Payless-Event-Type': event.type,
      },
      body: payload,
      // A public URL that redirects to a private one is the standard way around
      // a destination check, so redirects are not followed at all.
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      delivery.status = 'success';
      await deliveries().put(delivery.id, delivery);
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    delivery.status = 'failed';
    delivery.response = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    await deliveries().put(delivery.id, delivery);

    // Retry with exponential backoff
    if (retryCount < 2) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      delivery.nextRetryAt = Date.now() + retryDelay;
      await deliveries().put(delivery.id, delivery);

      setTimeout(() => {
        deliverWebhook(webhookId, event, config, retryCount + 1);
      }, retryDelay);
    }
  }
}

/**
 * Get webhook delivery history
 */
export async function getWebhookDeliveries(webhookId?: string): Promise<WebhookDelivery[]> {
  const all = await deliveries().all();
  if (webhookId) {
    return all.filter((d) => d.webhookId === webhookId);
  }
  return all;
}

/**
 * Emit payment confirmed event
 */
export async function emitPaymentConfirmed(data: PaymentWebhookData): Promise<void> {
  await triggerWebhook(WebhookEventType.PAYMENT_CONFIRMED, data);
}

/**
 * Emit payment pending event
 */
export async function emitPaymentPending(data: PaymentWebhookData): Promise<void> {
  await triggerWebhook(WebhookEventType.PAYMENT_PENDING, data);
}

/**
 * Emit payment failed event
 */
export async function emitPaymentFailed(data: PaymentWebhookData): Promise<void> {
  await triggerWebhook(WebhookEventType.PAYMENT_FAILED, data);
}

