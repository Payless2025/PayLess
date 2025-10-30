# API Reference

Complete reference for Payless payment middleware and utilities.

## Middleware

### `withX402Payment()`

Wraps your API handler with payment verification.

**Signature:**
```typescript
withX402Payment(
  handler: (req: NextRequest) => Promise<NextResponse>,
  price: string,
  currency?: string
): (req: NextRequest) => Promise<NextResponse>
```

**Parameters:**
- `handler` - Your API route handler function
- `price` - Price in USD (e.g., "0.01" for 1 cent)
- `currency` - Currency code (default: "USDC")

**Returns:**
- Wrapped handler that requires payment

**Example:**
```typescript
import { withX402Payment } from '@/lib/x402/middleware';

async function myApiHandler(req: NextRequest) {
  // Your logic here
  return NextResponse.json({ result: "success" });
}

export const POST = withX402Payment(myApiHandler, "0.05");
```

## Configuration

### `PAYMENT_CONFIG`

Global payment configuration object.

```typescript
export const PAYMENT_CONFIG = {
  walletAddress: string;        // Your Solana wallet
  facilitatorUrl: string;        // x402 facilitator URL
  network: string;               // Solana network
  rpcUrl: string;                // Solana RPC endpoint
  currency: string;              // Payment currency
  usdcMint: string;              // USDC token mint address
};
```

### `ENDPOINT_PRICING`

Price configuration for each endpoint.

```typescript
export const ENDPOINT_PRICING: EndpointConfig = {
  '/api/ai/chat': '0.05',
  '/api/ai/image': '0.10',
  '/api/data/weather': '0.01',
  '/api/data/stock': '0.02',
  '/api/premium/content': '1.00',
};
```

## Client Utilities

### `createPaymentPayload()`

Create payment payload for x402 protocol.

```typescript
createPaymentPayload(
  from: string,
  to: string,
  amount: string,
  currency: string
): X402PaymentPayload
```

### `signPaymentPayload()`

Sign payment with wallet.

```typescript
signPaymentPayload(
  payload: X402PaymentPayload,
  wallet?: SolanaWalletProvider
): Promise<string>
```

### `verifyPayment()`

Verify payment on server.

```typescript
verifyPayment(
  payment: X402PaymentPayload,
  signature: string
): Promise<boolean>
```

## Types

### `X402PaymentPayload`

```typescript
interface X402PaymentPayload {
  from: string;      // Payer's Solana wallet
  to: string;        // Recipient's Solana wallet
  amount: string;    // Payment amount
  currency: string;  // Currency code (e.g., "USDC")
  timestamp: number; // Unix timestamp
  nonce: string;     // Unique transaction ID
}
```

### `X402PaymentHeader`

```typescript
interface X402PaymentHeader {
  payment: X402PaymentPayload;
  signature: string;
}
```

## Environment Variables

Required environment variables:

```env
WALLET_ADDRESS=<your-solana-wallet>
FACILITATOR_URL=https://facilitator.x402.org
NETWORK=mainnet-beta
RPC_URL=https://api.mainnet-beta.solana.com
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

## Error Handling

The middleware returns these HTTP status codes:

- `200` - Payment verified, request successful
- `402` - Payment required (with payment details in response)
- `400` - Invalid payment format
- `403` - Payment verification failed
- `500` - Server error

---

For more details, see our [GitHub repository](https://github.com/Payless2025/PayLess).

