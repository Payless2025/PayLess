# Payless Integration Tutorials

Comprehensive guides for integrating Payless x402 payments into your applications.

## Available Tutorials

### 1. [Next.js Integration](./nextjs-integration.md)
Complete guide for integrating Payless into Next.js applications (App Router).

**Topics Covered:**
- Environment setup
- x402 middleware implementation
- Protected API routes
- Frontend wallet integration
- Payment handling
- Best practices

**Best For:** Full-stack Next.js applications

---

### 2. [Express.js Integration](./express-integration.md)
Learn how to add Payless payments to your Express.js backend API.

**Topics Covered:**
- Middleware creation
- Route protection
- Payment verification
- Rate limiting
- Analytics tracking
- Deployment

**Best For:** Node.js REST APIs

---

### 3. [Python Integration](./python-integration.md)
Guide for Flask and FastAPI backends with Python.

**Topics Covered:**
- Flask middleware
- FastAPI dependencies
- Payment verification
- Async handling
- Docker deployment
- Testing

**Best For:** Python web applications

---

### 4. [React Frontend Integration](./react-integration.md)
Build payment-enabled React applications with wallet integration.

**Topics Covered:**
- Wallet provider setup
- Custom hooks
- Payment components
- Error handling
- Caching strategies
- UI/UX patterns

**Best For:** React SPAs and frontends

---

## Quick Start Guide

### Backend Setup (Choose One)

**Next.js API Route:**
```typescript
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req) {
  return NextResponse.json({ data: "premium content" });
}

export const GET = withX402Payment(handler, '0.05');
```

**Express.js:**
```javascript
const { withX402Payment } = require('./middleware/x402');

app.get('/api/premium', withX402Payment('0.05'), (req, res) => {
  res.json({ data: "premium content" });
});
```

**Python Flask:**
```python
from middleware.x402 import with_x402_payment

@app.route('/api/premium')
@with_x402_payment('0.05')
def premium():
    return {'data': 'premium content'}
```

### Frontend Setup

**React:**
```typescript
import { createClient } from '@payless/sdk';
import { useWallet } from '@solana/wallet-adapter-react';

const { publicKey, signMessage } = useWallet();

const client = createClient({
  walletAddress: 'YOUR_WALLET_ADDRESS',
});

client.connectWallet({
  publicKey: publicKey.toString(),
  signMessage,
});

const response = await client.get('/api/premium');
```

## Common Patterns

### 1. Pay-Per-Request
Single payment for each API call.

```typescript
// Backend
export const GET = withX402Payment(handler, '0.05');

// Frontend
const response = await client.get('/api/endpoint');
```

### 2. Tiered Pricing
Different prices for different endpoints.

```typescript
const PRICING = {
  '/api/basic': '0.01',
  '/api/premium': '0.10',
  '/api/enterprise': '1.00',
};
```

### 3. Subscription Model
Pay once, access multiple times within a period.

```typescript
// Store access token after first payment
localStorage.setItem('access_token', token);

// Use token for subsequent requests
headers: {
  'Authorization': `Bearer ${token}`,
}
```

### 4. Pay-Per-Token (AI)
Charge based on usage (tokens, compute time, etc.).

```typescript
// Calculate cost based on usage
const cost = (tokens / 1000) * pricePerKTokens;
```

## Integration Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] Wallet address verified
- [ ] Payment verification working
- [ ] Error handling implemented
- [ ] HTTPS enabled
- [ ] Rate limiting added
- [ ] Analytics tracking setup
- [ ] User wallet connection tested
- [ ] Payment flows tested
- [ ] Documentation updated

## Testing

### Test Without Payment
```bash
curl http://localhost:3000/api/premium
# Should return 402 Payment Required
```

### Test With Mock Payment
```typescript
import { createMockPaymentProof } from '@payless/sdk';

const mockPayment = createMockPaymentProof(
  'SENDER_ADDRESS',
  'RECIPIENT_ADDRESS',
  '0.05',
  'USDC_MINT'
);
```

### Test With Real Wallet
Use the playground or connect a real wallet in development.

## Security Best Practices

1. **Verify Payment Amounts:** Always check payment matches endpoint price
2. **Validate Timestamps:** Reject expired payments (>5 minutes old)
3. **Check Recipient:** Ensure payment is sent to your wallet
4. **Verify Signatures:** Validate cryptographic signatures
5. **Use HTTPS:** Always use HTTPS in production
6. **Rate Limit:** Prevent abuse with rate limiting
7. **Log Payments:** Keep records for debugging and analytics

## Performance Tips

1. **Cache Verifications:** Don't verify the same payment twice
2. **Async Processing:** Use async/await for non-blocking operations
3. **Connection Pooling:** Reuse database/RPC connections
4. **CDN for Static:** Serve static content from CDN
5. **Lazy Loading:** Load components/data on demand

## Troubleshooting

### Common Issues

**"Payment Required" Even After Payment:**
- Check payment header is included
- Verify signature is valid
- Ensure timestamp is recent
- Check wallet address matches

**Signature Verification Failed:**
- Verify message format matches
- Check signing function is correct
- Ensure public key is valid

**Connection Issues:**
- Check network (mainnet vs devnet)
- Verify RPC URL is accessible
- Test wallet connection

## Getting Help

- **Documentation:** [docs.payless.com](https://payless.gitbook.io/payless-documentation)
- **GitHub Issues:** [github.com/Payless2025/PayLess/issues](https://github.com/Payless2025/PayLess/issues)
- **Examples:** [github.com/Payless2025/PayLess](https://github.com/Payless2025/PayLess)

## Contributing

Found an issue or want to improve these tutorials? Pull requests are welcome!

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Submit a pull request

## License

All tutorials are MIT licensed. Feel free to use and adapt them for your projects.

