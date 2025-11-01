# Webhooks

Payless supports webhooks for real-time payment notifications. Get instant updates when payments are confirmed, pending, or failed.

## Overview

Webhooks allow your application to receive automated notifications about payment events. Instead of polling for updates, Payless will push notifications to your server whenever important events occur.

## Event Types

### `payment.confirmed`
Triggered when a payment is successfully confirmed on the blockchain.

### `payment.pending`
Triggered when a payment is initiated but not yet confirmed.

### `payment.failed`
Triggered when a payment fails validation or confirmation.

## Webhook Payload

All webhook events follow this structure:

```json
{
  "id": "evt_1234567890",
  "type": "payment.confirmed",
  "timestamp": 1699564800000,
  "data": {
    "paymentId": "pay_abc123",
    "signature": "5X7J...",
    "chain": "solana",
    "from": "9WzDXwBb...",
    "to": "FDgSegox...",
    "amount": "0.05",
    "token": "USDC",
    "endpoint": "/api/ai/chat",
    "timestamp": 1699564800000,
    "status": "confirmed",
    "metadata": {
      "userAgent": "Mozilla/5.0...",
      "method": "POST",
      "responseTime": 234
    }
  }
}
```

## Setup

### 1. Register a Webhook

```bash
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://your-server.com/webhooks/payless",
  "secret": "your_webhook_secret_key",
  "events": ["payment.confirmed", "payment.failed"],
  "enabled": true
}
```

Response:
```json
{
  "success": true,
  "webhookId": "wh_1234567890",
  "message": "Webhook registered successfully"
}
```

### 2. Implement Webhook Endpoint

```javascript
// Express.js example
const express = require('express');
const crypto = require('crypto');

app.post('/webhooks/payless', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-payless-signature'];
  const eventId = req.headers['x-payless-event-id'];
  const eventType = req.headers['x-payless-event-type'];
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', 'your_webhook_secret_key')
    .update(req.body)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Parse event
  const event = JSON.parse(req.body);
  
  // Handle event
  switch (event.type) {
    case 'payment.confirmed':
      console.log('Payment confirmed:', event.data);
      // Update your database, send notifications, etc.
      break;
    case 'payment.failed':
      console.log('Payment failed:', event.data);
      // Handle failed payment
      break;
  }
  
  // Return 200 to acknowledge receipt
  res.json({ received: true });
});
```

### 3. Verify Signatures (Security)

Always verify webhook signatures to ensure requests are from Payless:

```javascript
function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## API Endpoints

### List Webhooks

```bash
GET /api/webhooks
```

Response:
```json
{
  "success": true,
  "webhooks": [
    {
      "id": "wh_123",
      "config": {
        "url": "https://your-server.com/webhooks/payless",
        "events": ["payment.confirmed"],
        "enabled": true
      }
    }
  ],
  "total": 1
}
```

### Update Webhook

```bash
PATCH /api/webhooks?id={webhookId}
Content-Type: application/json

{
  "enabled": false
}
```

### Delete Webhook

```bash
DELETE /api/webhooks?id={webhookId}
```

### Get Delivery History

```bash
GET /api/webhooks/deliveries?webhookId={webhookId}
```

Response:
```json
{
  "success": true,
  "deliveries": [
    {
      "id": "del_123",
      "webhookId": "wh_123",
      "eventId": "evt_456",
      "url": "https://your-server.com/webhooks/payless",
      "status": "success",
      "attempts": 1,
      "lastAttemptAt": 1699564800000
    }
  ],
  "total": 1
}
```

### Test Webhook

```bash
POST /api/webhooks/test?id={webhookId}
```

Sends a test event to verify your webhook endpoint is working correctly.

## Retry Logic

Payless automatically retries failed webhook deliveries:

- **Retry Attempts**: 3 attempts total
- **Retry Delays**: 
  - 1st retry: 1 second
  - 2nd retry: 2 seconds
  - 3rd retry: 4 seconds (exponential backoff)

### Successful Delivery
A webhook is considered successfully delivered if your endpoint returns:
- HTTP status code: 200-299
- Within 10 seconds

### Failed Delivery
Webhooks fail if:
- HTTP status code: 400-599
- Timeout (>10 seconds)
- Network error

## Best Practices

### 1. Respond Quickly
Return a 200 response immediately, then process the event asynchronously:

```javascript
app.post('/webhooks/payless', async (req, res) => {
  // Immediately acknowledge
  res.json({ received: true });
  
  // Process asynchronously
  processWebhookAsync(req.body).catch(console.error);
});
```

### 2. Handle Duplicates
The same event might be delivered multiple times. Use `event.id` to deduplicate:

```javascript
const processedEvents = new Set();

function handleWebhook(event) {
  if (processedEvents.has(event.id)) {
    return; // Already processed
  }
  
  processedEvents.add(event.id);
  // Process event...
}
```

### 3. Secure Your Endpoint
- Always verify signatures
- Use HTTPS only
- Rate limit webhook endpoints
- Log all webhook attempts

### 4. Monitor Deliveries
Check delivery history regularly to ensure webhooks are being delivered successfully.

## Example Use Cases

### 1. Email Notifications
Send confirmation emails when payments are successful:

```javascript
case 'payment.confirmed':
  await sendEmail({
    to: user.email,
    subject: 'Payment Confirmed',
    body: `Your payment of ${event.data.amount} ${event.data.token} was confirmed!`
  });
  break;
```

### 2. Database Updates
Update your database with payment status:

```javascript
case 'payment.confirmed':
  await db.payments.update({
    where: { id: event.data.paymentId },
    data: { 
      status: 'confirmed',
      signature: event.data.signature,
      confirmedAt: new Date(event.data.timestamp)
    }
  });
  break;
```

### 3. Analytics Tracking
Track payment events in your analytics:

```javascript
case 'payment.confirmed':
  analytics.track('Payment Confirmed', {
    amount: event.data.amount,
    chain: event.data.chain,
    endpoint: event.data.endpoint,
  });
  break;
```

### 4. Slack Notifications
Send alerts to your team:

```javascript
case 'payment.confirmed':
  await slack.sendMessage({
    channel: '#payments',
    text: `💰 New payment: ${event.data.amount} ${event.data.token} on ${event.data.chain}`
  });
  break;
```

## Webhook Headers

Every webhook request includes these headers:

| Header | Description |
|--------|-------------|
| `Content-Type` | Always `application/json` |
| `X-Payless-Signature` | HMAC SHA256 signature for verification |
| `X-Payless-Event-Id` | Unique event identifier |
| `X-Payless-Event-Type` | Type of event (e.g., `payment.confirmed`) |

## Testing Webhooks

### Local Development with ngrok

```bash
# Start ngrok
ngrok http 3000

# Use the ngrok URL for your webhook
https://abc123.ngrok.io/webhooks/payless
```

### Using the Test Endpoint

```bash
curl -X POST "http://localhost:3000/api/webhooks/test?id=wh_123"
```

This sends a test event to your webhook URL.

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook is enabled**: Ensure `enabled: true`
2. **Verify URL is accessible**: Test with curl or Postman
3. **Check firewall rules**: Ensure your server accepts incoming requests
4. **Review delivery history**: Check for failed attempts

### Signature Verification Failing

1. **Secret mismatch**: Ensure you're using the correct secret
2. **Body modification**: Don't parse/modify the body before verification
3. **Character encoding**: Use raw body bytes for signature calculation

### Timeouts

1. **Respond quickly**: Return 200 immediately
2. **Process async**: Handle heavy processing after responding
3. **Optimize database queries**: Use indexes and caching

## Webhook Limits

- **Maximum payload size**: 1 MB
- **Timeout**: 10 seconds
- **Retry attempts**: 3 times
- **Maximum webhooks per account**: 10 (contact us for more)

## Security Considerations

1. **Always verify signatures** - Never skip signature verification
2. **Use HTTPS only** - Never use HTTP webhooks
3. **Validate event data** - Don't trust webhook data blindly
4. **Rate limiting** - Protect against webhook floods
5. **Secret rotation** - Rotate webhook secrets periodically

## Need Help?

- [API Reference](./api-reference.md)
- [GitHub Issues](https://github.com/Payless2025/PayLess/issues)
- [Discord Community](https://discord.gg/payless)

---

**Ready to receive real-time payment notifications? Set up your webhook today!** 🚀

