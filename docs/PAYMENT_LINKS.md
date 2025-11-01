# Payment Links Guide

Generate shareable crypto payment URLs with no code required.

## Overview

Payment Links allow you to accept crypto payments by simply sharing a URL. No wallet integration, no SDK required—just a link.

**Perfect for:**
- 💰 One-time payments
- 📧 Invoicing
- 🎁 Donations
- 🧪 Testing payments
- 📱 Non-technical users

---

## Quick Start

### 1. Create a Payment Link

**Via Dashboard:**
1. Go to [payless.network/payment-links](https://payless.network/payment-links)
2. Click "Create Link"
3. Fill in:
   - Amount (USD)
   - Description (optional)
   - Your wallet address
   - Supported chains
4. Copy the generated URL

**Via API:**
```bash
curl -X POST https://payless.network/api/payment-links \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "5.00",
    "description": "Payment for Product XYZ",
    "recipientAddress": "YOUR_WALLET_ADDRESS",
    "chains": ["solana", "bsc", "ethereum"]
  }'
```

Response:
```json
{
  "success": true,
  "link": {
    "id": "abc123def456",
    "url": "https://payless.network/pay/abc123def456",
    "amount": "5.00",
    "status": "active"
  }
}
```

### 2. Share the Link

Send the payment link URL to your customer via:
- Email
- SMS
- Social media
- QR code
- Embed on website

### 3. Customer Pays

Customer clicks the link, selects their preferred blockchain, and sends payment.

---

## API Reference

### Create Payment Link

**Endpoint:** `POST /api/payment-links`

**Request:**
```json
{
  "amount": "10.00",
  "description": "Optional description",
  "recipientAddress": "YOUR_WALLET_ADDRESS",
  "chains": ["solana", "bsc", "ethereum"],
  "expiresIn": 3600000,
  "metadata": {
    "orderId": "12345",
    "customerId": "user@email.com"
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | string | ✅ | Payment amount in USD |
| `recipientAddress` | string | ✅ | Your wallet address to receive payment |
| `description` | string | ❌ | Payment description |
| `chains` | string[] | ❌ | Supported chains (default: all) |
| `expiresIn` | number | ❌ | Expiration time in milliseconds |
| `metadata` | object | ❌ | Custom data for your tracking |

**Response:**
```json
{
  "success": true,
  "link": {
    "id": "abc123",
    "url": "https://payless.network/pay/abc123",
    "amount": "10.00",
    "currency": "USDC/USDT",
    "status": "active",
    "createdAt": 1699564800000
  }
}
```

### Get Payment Link

**Endpoint:** `GET /api/payment-links/{id}`

**Response:**
```json
{
  "success": true,
  "link": {
    "id": "abc123",
    "amount": "10.00",
    "status": "active",
    "recipientAddress": "YOUR_WALLET",
    "chains": ["solana", "bsc", "ethereum"]
  }
}
```

### List Payment Links

**Endpoint:** `GET /api/payment-links?recipientAddress=YOUR_WALLET`

**Response:**
```json
{
  "success": true,
  "links": [...],
  "total": 5
}
```

### Delete Payment Link

**Endpoint:** `DELETE /api/payment-links?id={linkId}`

**Response:**
```json
{
  "success": true,
  "message": "Payment link deleted successfully"
}
```

---

## Integration Examples

### 1. E-Commerce Website

```javascript
// When user clicks "Pay with Crypto"
async function generatePaymentLink(orderId, amount) {
  const response = await fetch('https://payless.network/api/payment-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: amount.toString(),
      description: `Order #${orderId}`,
      recipientAddress: process.env.WALLET_ADDRESS,
      metadata: { orderId }
    })
  });
  
  const { link } = await response.json();
  
  // Redirect customer to payment page
  window.location.href = link.url;
}
```

### 2. Email Invoice

```javascript
// Generate payment link and send via email
const nodemailer = require('nodemailer');

async function sendInvoice(customerEmail, amount, invoiceNumber) {
  // Create payment link
  const response = await fetch('https://payless.network/api/payment-links', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      description: `Invoice #${invoiceNumber}`,
      recipientAddress: process.env.WALLET_ADDRESS
    })
  });
  
  const { link } = await response.json();
  
  // Send email
  await transporter.sendMail({
    to: customerEmail,
    subject: `Invoice #${invoiceNumber}`,
    html: `
      <h2>Payment Due: $${amount}</h2>
      <p>Click below to pay with crypto:</p>
      <a href="${link.url}">Pay Now</a>
    `
  });
}
```

### 3. Serverless Function (Vercel)

```javascript
// api/create-payment-link.js
export default async function handler(req, res) {
  const { amount, description } = req.body;
  
  const response = await fetch('https://payless.network/api/payment-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      description,
      recipientAddress: process.env.WALLET_ADDRESS,
      chains: ['solana', 'ethereum']
    })
  });
  
  const data = await response.json();
  res.json(data);
}
```

### 4. QR Code Generation

```javascript
const QRCode = require('qrcode');

async function generatePaymentQR(amount, description) {
  // Create payment link
  const response = await fetch('https://payless.network/api/payment-links', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      description,
      recipientAddress: process.env.WALLET_ADDRESS
    })
  });
  
  const { link } = await response.json();
  
  // Generate QR code
  const qrCode = await QRCode.toDataURL(link.url);
  
  return {
    url: link.url,
    qrCode // base64 image
  };
}
```

### 5. iFrame Embed

```html
<!-- Embed payment page on your site -->
<iframe 
  src="https://payless.network/pay/abc123"
  width="450"
  height="700"
  frameborder="0"
  style="border-radius: 12px;">
</iframe>
```

### 6. React Component

```jsx
import { useState } from 'react';

function PaymentButton({ amount, description }) {
  const [paymentUrl, setPaymentUrl] = useState(null);
  
  const createPaymentLink = async () => {
    const response = await fetch('https://payless.network/api/payment-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        description,
        recipientAddress: process.env.REACT_APP_WALLET_ADDRESS
      })
    });
    
    const { link } = await response.json();
    setPaymentUrl(link.url);
  };
  
  return paymentUrl ? (
    <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
      Complete Payment
    </a>
  ) : (
    <button onClick={createPaymentLink}>
      Pay ${amount} with Crypto
    </button>
  );
}
```

---

## Webhook Integration

Get real-time notifications when payments are made.

### 1. Register Webhook

```javascript
const response = await fetch('https://payless.network/api/webhooks', {
  method: 'POST',
  body: JSON.stringify({
    url: 'https://your-site.com/webhooks/payless',
    secret: 'your_webhook_secret',
    events: ['payment.confirmed', 'payment.failed']
  })
});
```

### 2. Handle Webhook Events

```javascript
// Express.js example
app.post('/webhooks/payless', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-payless-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex');
    
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(req.body);
  
  switch (event.type) {
    case 'payment.confirmed':
      // Payment successful
      await fulfillOrder(event.data.metadata.orderId);
      break;
      
    case 'payment.failed':
      // Payment failed
      await notifyCustomer(event.data);
      break;
  }
  
  res.json({ received: true });
});
```

---

## Supported Blockchains

| Chain | Native Currency | Tokens | Network ID |
|-------|----------------|---------|------------|
| Solana | SOL | USDC, USDT | mainnet-beta |
| BSC | BNB | USDT, BUSD, USDC | 56 |
| Ethereum | ETH | USDC, USDT | 1 |

Users can choose their preferred blockchain when paying.

---

## Payment Link Lifecycle

```
1. ACTIVE     → Link is ready to accept payment
2. COMPLETED  → Payment received
3. EXPIRED    → Link expired (if expiration was set)
```

---

## Best Practices

### 1. **Set Expiration Times**
For time-sensitive payments:
```javascript
{
  "amount": "100.00",
  "expiresIn": 3600000 // 1 hour in milliseconds
}
```

### 2. **Use Metadata**
Track orders and customers:
```javascript
{
  "metadata": {
    "orderId": "12345",
    "customerId": "user@email.com",
    "productId": "prod_abc"
  }
}
```

### 3. **Webhooks for Automation**
Don't poll—use webhooks for instant notifications.

### 4. **Multi-Chain Support**
Let users choose their preferred blockchain:
```javascript
{
  "chains": ["solana", "bsc", "ethereum"]
}
```

### 5. **Clear Descriptions**
Help users understand what they're paying for:
```javascript
{
  "description": "Premium Subscription - Annual Plan"
}
```

---

## Use Cases

### 💼 **Freelancing**
```javascript
// Create invoice for client
createPaymentLink({
  amount: "500.00",
  description: "Website Development - Project #123",
  expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

### 🛍️ **E-Commerce**
```javascript
// Checkout page
createPaymentLink({
  amount: cart.total,
  description: `Order #${orderId}`,
  metadata: { orderId, items: cart.items }
});
```

### 🎁 **Donations**
```html
<!-- Static donation link -->
<a href="https://payless.network/pay/donate123">
  Donate with Crypto
</a>
```

### 📱 **Mobile Apps**
```javascript
// Open payment link in browser
const paymentUrl = await createPaymentLink(amount, description);
Linking.openURL(paymentUrl);
```

### 🎮 **Gaming**
```javascript
// In-game purchases
createPaymentLink({
  amount: "9.99",
  description: "Premium Battle Pass",
  metadata: { userId, itemId: "battle_pass_001" }
});
```

---

## Security

### Payment Verification
- All payments are verified on-chain
- Signature validation ensures authenticity
- Timestamps prevent replay attacks

### Webhook Security
- HMAC SHA256 signature verification
- Secret key authentication
- Automatic retry with exponential backoff

### Best Practices
1. ✅ Always verify webhook signatures
2. ✅ Use HTTPS for webhook URLs
3. ✅ Store secrets in environment variables
4. ✅ Validate payment amounts on your backend
5. ✅ Keep recipient addresses secure

---

## Limitations

### Current (In-Memory Storage)
- ⚠️ Payment links persist while server is running
- Perfect for development and testing
- Links lost on server restart

### Production (Database Required)
For production use, integrate with:
- **Vercel Postgres** - Serverless SQL
- **Supabase** - PostgreSQL with APIs
- **Upstash Redis** - Serverless Redis
- **PlanetScale** - MySQL

See [Database Integration Guide](./DATABASE.md) for details.

---

## FAQs

**Q: Are payment links reusable?**  
A: No, each link is for a single payment. Once paid, the link status changes to "completed."

**Q: Can I customize the payment page?**  
A: Currently no, but white-label customization is on the roadmap.

**Q: What happens if payment link expires?**  
A: The payment page shows an "expired" message. Users cannot pay through expired links.

**Q: Can I cancel a payment link?**  
A: Yes, delete it via API or dashboard. The payment page will show "not found."

**Q: Do I need a database?**  
A: For development/testing, no. For production with persistence, yes (optional).

**Q: What fees does Payless charge?**  
A: Zero protocol fees! You keep 100% of payments.

---

## Support

- **Documentation**: [payless.gitbook.io](https://payless.gitbook.io)
- **GitHub**: [github.com/Payless2025/PayLess](https://github.com/Payless2025/PayLess)
- **Discord**: [Join community]
- **X/Twitter**: [@paylessnetwork](https://x.com/paylessnetwork)

---

## What's Next?

Explore more features:
- [Webhooks Guide](./WEBHOOKS.md)
- [Multi-Chain Support](./MULTI_CHAIN.md)
- [API Reference](./api-reference.md)
- [SDK Documentation](../sdk/nodejs/README.md)

---

**Ready to accept crypto payments?** [Create your first payment link →](https://payless.network/payment-links)

