/**
 * Webhook management and delivery system
 */

import crypto from 'crypto';
import { WebhookEvent, WebhookConfig, WebhookDelivery, WebhookEventType, PaymentWebhookData } from './types';

// In-memory storage (replace with database in production)
const webhooks: Map<string, WebhookConfig> = new Map();
const deliveries: Map<string, WebhookDelivery> = new Map();

/**
 * Register a webhook
 */
export function registerWebhook(config: WebhookConfig): string {
  const id = crypto.randomUUID();
  webhooks.set(id, config);
  return id;
}

/**
 * Get webhook by ID
 */
export function getWebhook(id: string): WebhookConfig | undefined {
  return webhooks.get(id);
}

/**
 * Update webhook
 */
export function updateWebhook(id: string, config: Partial<WebhookConfig>): boolean {
  const existing = webhooks.get(id);
  if (!existing) return false;
  
  webhooks.set(id, { ...existing, ...config });
  return true;
}

/**
 * Delete webhook
 */
export function deleteWebhook(id: string): boolean {
  return webhooks.delete(id);
}

/**
 * List all webhooks
 */
export function listWebhooks(): Array<{ id: string; config: WebhookConfig }> {
  return Array.from(webhooks.entries()).map(([id, config]) => ({ id, config }));
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
  const subscribedWebhooks = Array.from(webhooks.entries()).filter(
    ([_, config]) => config.enabled && config.events.includes(eventType)
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

  deliveries.set(delivery.id, delivery);

  try {
    const payload = JSON.stringify(event);
    const signature = createWebhookSignature(payload, config.secret);

    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payless-Signature': signature,
        'X-Payless-Event-Id': event.id,
        'X-Payless-Event-Type': event.type,
      },
      body: payload,
    });

    if (response.ok) {
      delivery.status = 'success';
      deliveries.set(delivery.id, delivery);
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    delivery.status = 'failed';
    delivery.response = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    deliveries.set(delivery.id, delivery);

    // Retry with exponential backoff
    if (retryCount < 2) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      delivery.nextRetryAt = Date.now() + retryDelay;
      deliveries.set(delivery.id, delivery);

      setTimeout(() => {
        deliverWebhook(webhookId, event, config, retryCount + 1);
      }, retryDelay);
    }
  }
}

/**
 * Get webhook delivery history
 */
export function getWebhookDeliveries(webhookId?: string): WebhookDelivery[] {
  const allDeliveries = Array.from(deliveries.values());
  if (webhookId) {
    return allDeliveries.filter(d => d.webhookId === webhookId);
  }
  return allDeliveries;
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

