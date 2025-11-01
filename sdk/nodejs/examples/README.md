# Payless Node.js SDK Examples

Comprehensive examples demonstrating how to use the Payless SDK.

## Examples

### 1. Basic Usage (`basic-usage.js`)
Learn the fundamentals of making API requests with the Payless SDK:
- Free endpoint requests
- Paid endpoint requests with automatic payment
- POST requests with body data
- Getting API information

```bash
node examples/basic-usage.js
```

### 2. Wallet Integration (`with-wallet.js`)
Connect a real Solana wallet for signing payments:
- Creating a wallet adapter
- Connecting wallet to client
- Making paid requests with real signatures

```bash
node examples/with-wallet.js
```

### 3. Error Handling (`error-handling.js`)
Properly handle various error scenarios:
- 402 Payment Required errors
- Invalid endpoints (404)
- Network errors
- Validation errors
- Best practices for error handling

```bash
node examples/error-handling.js
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update wallet addresses in examples:
```javascript
const client = createClient({
  walletAddress: 'YOUR_RECIPIENT_WALLET_ADDRESS',
  network: 'mainnet-beta',
});
```

3. Run examples:
```bash
node examples/basic-usage.js
```

## Configuration Options

```javascript
const client = createClient({
  walletAddress: 'RECIPIENT_WALLET_ADDRESS',  // Required
  network: 'mainnet-beta',                     // Optional: 'mainnet-beta' | 'devnet' | 'testnet'
  rpcUrl: 'https://api.mainnet-beta.solana.com', // Optional: Custom RPC URL
  usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Optional: USDC mint address
  facilitatorUrl: 'https://facilitator.x402.org', // Optional: Facilitator URL
});
```

## API Methods

### `client.get(endpoint, options)`
Make a GET request to an API endpoint.

### `client.post(endpoint, body, options)`
Make a POST request with a JSON body.

### `client.request(endpoint, options)`
Make a custom HTTP request with full control.

### `client.connectWallet(wallet)`
Connect a wallet adapter for signing payments.

### `client.getApiInfo()`
Get information about the API and available endpoints.

### `client.getHealth()`
Check API health status.

## Response Format

All API methods return a response object with the following structure:

```typescript
{
  success: boolean;     // Whether the request was successful
  data?: any;          // Response data (if successful)
  error?: string;      // Error message (if failed)
  status: number;      // HTTP status code
}
```

## Error Handling Best Practices

1. Always check `response.success` before accessing data
2. Handle specific status codes (402, 404, 500, etc.)
3. Wrap SDK calls in try-catch blocks
4. Provide meaningful error messages to users
5. Implement retry logic for network errors

## Need Help?

- Documentation: https://payless.gitbook.io
- GitHub Issues: https://github.com/Payless2025/PayLess/issues
- Discord: [Join our community]

## License

MIT

