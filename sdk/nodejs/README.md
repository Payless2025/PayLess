# Payless SDK for Node.js

Official Node.js/TypeScript SDK for integrating Payless x402 payments into your applications.

## Installation

```bash
npm install @payless/sdk
# or
yarn add @payless/sdk
```

## Quick Start

```typescript
import { createClient } from '@payless/sdk';

// Initialize client
const payless = createClient({
  walletAddress: 'YOUR_WALLET_ADDRESS', // Your Solana wallet to receive payments
});

// Make a paid API request
const response = await payless.post('/api/ai/chat', {
  message: 'Hello, world!',
});

console.log(response.data);
```

## Features

- ✅ Automatic payment handling with x402 protocol
- ✅ TypeScript support with full type definitions
- ✅ Solana wallet integration
- ✅ Mock payments for testing
- ✅ Easy-to-use API client
- ✅ Built-in retry logic for 402 responses

## Usage

### Basic Usage

```typescript
import { createClient } from '@payless/sdk';

const client = createClient({
  walletAddress: '8ahe4N7mFaLyQ7powRGWxZ3cnqbteF3yAeioMpM4ocMX',
  network: 'mainnet-beta', // or 'devnet', 'testnet'
});

// GET request
const weather = await client.get('/api/data/weather?city=London');

// POST request
const translation = await client.post('/api/ai/translate', {
  text: 'Hello, world!',
  targetLanguage: 'es',
});

console.log(translation.data);
```

### With Wallet Integration

```typescript
import { createClient } from '@payless/sdk';
import { Keypair } from '@solana/web3.js';

const client = createClient({
  walletAddress: 'YOUR_WALLET_ADDRESS',
});

// Connect your Solana wallet
const wallet = {
  publicKey: keypair.publicKey.toString(),
  signMessage: async (message: Uint8Array) => {
    return nacl.sign.detached(message, keypair.secretKey);
  },
};

client.connectWallet(wallet);

// Now all payments will be signed with your real wallet
const response = await client.post('/api/ai/chat', {
  message: 'Tell me about Solana',
});
```

### Error Handling

```typescript
const response = await client.get('/api/data/stock?symbol=AAPL');

if (!response.success) {
  console.error('Error:', response.error);
  console.error('Status:', response.status);
} else {
  console.log('Data:', response.data);
}
```

### Manual Payment Creation

```typescript
import { createPaymentProof, paymentProofToHeader } from '@payless/sdk';

// With real wallet
const proof = await createPaymentProof(
  senderAddress,
  recipientAddress,
  '0.05', // amount in USDC
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
  signMessageFunction
);

// Use in custom HTTP request
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Payment': paymentProofToHeader(proof),
  },
  body: JSON.stringify({ data: '...' }),
});
```

### Testing with Mock Payments

```typescript
import { createMockPaymentProof } from '@payless/sdk';

// Create mock payment for testing (no real wallet needed)
const mockProof = createMockPaymentProof(
  'SENDER_ADDRESS',
  'RECIPIENT_ADDRESS',
  '0.05',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
);

console.log(mockProof);
```

## API Reference

### `createClient(config)`

Creates a new Payless client instance.

**Parameters:**
- `config.walletAddress` (string, required): Your Solana wallet address to receive payments
- `config.network` (string, optional): Solana network ('mainnet-beta', 'devnet', 'testnet')
- `config.rpcUrl` (string, optional): Custom RPC URL
- `config.usdcMint` (string, optional): USDC token mint address
- `config.facilitatorUrl` (string, optional): x402 facilitator URL

**Returns:** `PaylessClient`

### `client.request(endpoint, options)`

Make a request to a Payless-protected API endpoint.

**Parameters:**
- `endpoint` (string): API endpoint path
- `options.method` (string, optional): HTTP method (GET, POST, PUT, DELETE)
- `options.headers` (object, optional): Additional headers
- `options.body` (any, optional): Request body
- `options.paymentAmount` (string, optional): Override payment amount

**Returns:** `Promise<ApiResponse>`

### `client.get(endpoint, options)`

Shorthand for GET requests.

### `client.post(endpoint, body, options)`

Shorthand for POST requests.

### `client.connectWallet(wallet)`

Connect a Solana wallet for signing payments.

**Parameters:**
- `wallet.publicKey` (string): Wallet public key
- `wallet.signMessage` (function): Message signing function

## Examples

### AI Chat

```typescript
const response = await client.post('/api/ai/chat', {
  message: 'Explain the x402 protocol',
  model: 'gpt-4',
});
```

### Image Generation

```typescript
const response = await client.post('/api/ai/image', {
  prompt: 'A futuristic cityscape',
  size: '1024x1024',
});
```

### Cryptocurrency Prices

```typescript
const response = await client.get('/api/data/crypto?symbol=SOL');
console.log(`SOL Price: $${response.data.price}`);
```

### QR Code Generation

```typescript
const response = await client.post('/api/tools/qrcode', {
  data: 'https://payless.com',
  size: '256',
});
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import { PaylessClient, ApiResponse, PaymentProof } from '@payless/sdk';

const client: PaylessClient = createClient({ ... });

const response: ApiResponse<{ message: string }> = await client.post('/api/ai/chat', {
  message: 'Hello',
});
```

## License

MIT

## Links

- [Documentation](https://payless.gitbook.io/payless-documentation)
- [GitHub](https://github.com/Payless2025/PayLess)
- [Website](https://payless.com)

## Support

For issues and questions, please visit our [GitHub Issues](https://github.com/Payless2025/PayLess/issues).

