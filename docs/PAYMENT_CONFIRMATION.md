# Payment Confirmation System

## Overview

The Payment Confirmation System provides a comprehensive solution for tracking, verifying, and monitoring payment confirmations in the Payless x402 Protocol. It allows developers to:

- ✅ Verify payment confirmations in real-time
- 📊 Track payment history for wallets
- 🔄 Monitor payment status with auto-polling
- 📝 Store and query payment records
- 🔍 Look up payments by signature or nonce

## Features

### 1. Payment Verification
Verify that a payment has been confirmed by the system using either the transaction signature or unique nonce identifier.

### 2. Payment History
Query historical payment data for any wallet address, including amounts, timestamps, endpoints accessed, and confirmation status.

### 3. Auto-Monitoring
Automatically poll the system to check if a payment has been confirmed, with configurable timeout and interval settings.

### 4. In-Memory Storage
All payment confirmations are stored in memory for fast retrieval (can be replaced with database in production).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Payment Flow                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Client makes payment with signature/nonce                │
│  2. Middleware verifies payment                              │
│  3. Confirmation stored in analytics store                   │
│  4. Client can query confirmation via API                    │
│  5. Client receives confirmation details                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components

### Types (`lib/x402/types.ts`)

```typescript
interface PaymentConfirmation {
  id: string;
  paymentSignature: string;
  nonce: string;
  walletAddress: string;
  recipient: string;
  amount: string;
  token: string;
  tokenMint: string;
  endpoint: string;
  confirmedAt: number;
  status: 'confirmed' | 'pending' | 'failed';
  metadata?: {
    userAgent?: string;
    method?: string;
    responseTime?: number;
  };
}
```

### Analytics Store (`lib/x402/analytics.ts`)

The analytics store has been extended with payment confirmation methods:

- `addConfirmation()` - Store a new payment confirmation
- `getConfirmations()` - Query confirmations with filters
- `getConfirmationByNonce()` - Look up by nonce
- `getConfirmationBySignature()` - Look up by signature
- `getConfirmationsByWallet()` - Get wallet payment history

### API Endpoints

#### GET `/api/payment/confirm`

Query payment confirmations with filters.

**Query Parameters:**
- `signature` - Payment signature
- `nonce` - Payment nonce
- `walletAddress` - Filter by wallet address
- `startDate` - Start date (timestamp)
- `endDate` - End date (timestamp)
- `status` - Filter by status
- `limit` - Maximum results (default: 100)

**Example:**
```bash
curl "https://your-domain.com/api/payment/confirm?walletAddress=9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM&limit=10"
```

**Response:**
```json
{
  "confirmations": [
    {
      "id": "1730390400000-abc123",
      "paymentSignature": "5j7k8...",
      "nonce": "xyz789",
      "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "recipient": "UnknownPayless2025WalletAddress123456789ABC",
      "amount": "0.10",
      "token": "USDC",
      "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "endpoint": "/api/ai/chat",
      "confirmedAt": 1730390400000,
      "status": "confirmed",
      "metadata": {
        "userAgent": "Mozilla/5.0...",
        "method": "POST",
        "responseTime": 150
      }
    }
  ],
  "total": 1,
  "hasMore": false
}
```

#### POST `/api/payment/confirm`

Verify if a specific payment was confirmed.

**Request Body:**
```json
{
  "signature": "5j7k8...",  // or
  "nonce": "xyz789",
  "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"  // optional
}
```

**Response:**
```json
{
  "confirmed": true,
  "confirmation": { /* confirmation details */ },
  "message": "Payment confirmed successfully"
}
```

### Client Utilities (`lib/x402/client.ts`)

#### `checkPaymentConfirmation(signature, walletAddress?)`
Check if a payment was confirmed using the signature.

```typescript
import { checkPaymentConfirmation } from '@/lib/x402/client';

const status = await checkPaymentConfirmation(
  '5j7k8...',
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
);

if (status.confirmed) {
  console.log('Payment confirmed!', status.confirmation);
}
```

#### `checkPaymentConfirmationByNonce(nonce, walletAddress?)`
Check if a payment was confirmed using the nonce.

```typescript
import { checkPaymentConfirmationByNonce } from '@/lib/x402/client';

const status = await checkPaymentConfirmationByNonce('xyz789');
if (status.confirmed) {
  console.log('Payment confirmed!');
}
```

#### `getPaymentHistory(walletAddress, options?)`
Get payment history for a wallet address.

```typescript
import { getPaymentHistory } from '@/lib/x402/client';

const history = await getPaymentHistory(
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  {
    limit: 20,
    startDate: Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days
  }
);

console.log(`Found ${history.total} payments`);
```

#### `monitorPaymentConfirmation(nonce, options?)`
Monitor payment confirmation with auto-polling.

```typescript
import { monitorPaymentConfirmation } from '@/lib/x402/client';

const status = await monitorPaymentConfirmation('xyz789', {
  timeout: 60000,  // 1 minute
  interval: 2000,  // Check every 2 seconds
  onUpdate: (confirmed, attempts) => {
    console.log(`Checking... (Attempt ${attempts})`);
  }
});

if (status.confirmed) {
  console.log('Payment confirmed!');
} else {
  console.log('Timeout - payment not confirmed');
}
```

### React Components (`components/PaymentConfirmation.tsx`)

#### `<PaymentConfirmation />`
Display payment confirmation status with visual feedback.

```tsx
import { PaymentConfirmation } from '@/components/PaymentConfirmation';

<PaymentConfirmation
  signature="5j7k8..."
  walletAddress="9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
/>

// Or with auto-monitoring
<PaymentConfirmation
  nonce="xyz789"
  autoMonitor={true}
/>
```

#### `<PaymentHistory />`
Display payment history for a wallet.

```tsx
import { PaymentHistory } from '@/components/PaymentConfirmation';

<PaymentHistory
  walletAddress="9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
  limit={10}
/>
```

## Integration Examples

### Example 1: Basic Payment Verification

```typescript
// After making a payment, verify it was confirmed
const payment = await signPaymentPayload(paymentPayload);

// Make API request with payment
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: {
    'X-Payment': JSON.stringify(payment),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ message: 'Hello' })
});

// Check confirmation
const confirmationStatus = await checkPaymentConfirmationByNonce(payment.nonce);
if (confirmationStatus.confirmed) {
  console.log('Payment confirmed and stored!');
}
```

### Example 2: Real-time Monitoring

```typescript
// Submit payment and monitor for confirmation
const payment = await createRealPayment(
  walletAddress,
  recipientAddress,
  '0.10',
  tokenMint,
  signMessage
);

// Make payment request
await fetch('/api/data/weather', {
  headers: { 'X-Payment': payment }
});

// Monitor confirmation with visual feedback
const confirmation = await monitorPaymentConfirmation(
  JSON.parse(payment).nonce,
  {
    timeout: 30000,
    onUpdate: (confirmed, attempts) => {
      updateUI(`Checking payment... (${attempts})`);
    }
  }
);

if (confirmation.confirmed) {
  showSuccess('Payment confirmed!');
}
```

### Example 3: Payment History Dashboard

```typescript
// Load payment history for the connected wallet
const history = await getPaymentHistory(connectedWallet, {
  limit: 50
});

// Display stats
const totalSpent = history.confirmations
  .reduce((sum, c) => sum + parseFloat(c.amount), 0);

console.log(`Total spent: $${totalSpent.toFixed(2)}`);
console.log(`Total payments: ${history.total}`);
```

## Demo Page

Visit `/payment-confirmation` to see an interactive demo of the Payment Confirmation System.

Features of the demo:
- Generate test payment data
- Check confirmation by signature or nonce
- Monitor payment status with auto-polling
- View payment history for any wallet
- Interactive UI with real-time feedback

## Best Practices

1. **Always store the nonce** - The nonce is crucial for looking up payment confirmations later
2. **Use auto-monitoring for better UX** - Provide real-time feedback to users
3. **Query history periodically** - Keep your UI updated with the latest payment data
4. **Handle errors gracefully** - Network issues can occur, always have fallbacks
5. **Implement timeouts** - Don't wait forever for confirmations

## Production Considerations

For production deployment:

1. **Replace in-memory storage** with a proper database (PostgreSQL, MongoDB, etc.)
2. **Add authentication** to the confirmation API endpoints
3. **Implement rate limiting** to prevent abuse
4. **Add caching** for frequently queried confirmations
5. **Set up monitoring** and alerts for payment issues
6. **Consider data retention policies** for old confirmations

## Troubleshooting

### Payment not showing as confirmed
- Check that the nonce matches exactly
- Verify the payment was actually submitted with the x-payment header
- Check server logs for verification errors

### History endpoint returns empty
- Ensure the wallet address is correct
- Check that payments were made with that wallet
- Verify the date range if filtering by dates

### Auto-monitoring times out
- Increase the timeout value
- Check network connectivity
- Verify the payment was submitted correctly

## API Rate Limits

The confirmation API endpoints are currently **free** and don't require payment headers. However, for production use, consider implementing rate limits:

- GET /api/payment/confirm: 100 requests per minute
- POST /api/payment/confirm: 50 requests per minute

## Support

For issues or questions about the Payment Confirmation System:
- Check the [API Documentation](./API_ENDPOINTS.md)
- Review the [examples](./examples/)
- Open an issue on GitHub

## License

See [LICENSE](../LICENSE) for details.

