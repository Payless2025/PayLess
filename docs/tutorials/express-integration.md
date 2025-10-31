# Express.js Integration Tutorial

Learn how to add Payless x402 payments to your Express.js backend API.

## Prerequisites

- Node.js 18+ installed
- A Solana wallet address for receiving payments
- Basic knowledge of Express.js

## Installation

```bash
npm install express @payless/sdk @solana/web3.js bs58 tweetnacl cors dotenv
```

## Step 1: Project Setup

Create `.env` file:

```env
PORT=3000
WALLET_ADDRESS=YOUR_WALLET_ADDRESS_HERE
NETWORK=mainnet-beta
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

## Step 2: Create x402 Middleware

Create `middleware/x402.js`:

```javascript
const { PublicKey } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

// Define your endpoint pricing
const ENDPOINT_PRICING = {
  '/api/premium/content': '0.10',
  '/api/ai/chat': '0.05',
  '/api/data/analysis': '0.02',
};

function withX402Payment(price) {
  return async (req, res, next) => {
    const endpointPrice = price || ENDPOINT_PRICING[req.path];

    if (!endpointPrice) {
      return res.status(500).json({ error: 'Endpoint not configured' });
    }

    // Check for payment header
    const paymentHeader = req.headers['x-payment'];

    if (!paymentHeader) {
      return res.status(402).json({
        status: 402,
        message: 'Payment Required',
        payment: {
          amount: endpointPrice,
          currency: 'USDC',
          recipient: process.env.WALLET_ADDRESS,
          network: process.env.NETWORK,
          tokenMint: process.env.USDC_MINT,
        },
      });
    }

    // Verify payment
    try {
      const payment = JSON.parse(paymentHeader);

      // Verify recipient
      if (payment.to !== process.env.WALLET_ADDRESS) {
        return res.status(402).json({ error: 'Invalid recipient address' });
      }

      // Verify amount
      if (parseFloat(payment.amount) < parseFloat(endpointPrice)) {
        return res.status(402).json({ error: 'Insufficient payment amount' });
      }

      // Verify timestamp (within 5 minutes)
      const now = Date.now();
      if (now - payment.timestamp > 5 * 60 * 1000) {
        return res.status(402).json({ error: 'Payment expired' });
      }

      // Verify signature
      const messageBytes = Buffer.from(payment.message, 'utf8');
      const signatureBytes = bs58.decode(payment.signature);
      const publicKey = new PublicKey(payment.from);

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );

      if (!isValid) {
        return res.status(402).json({ error: 'Invalid signature' });
      }

      // Payment verified - proceed
      req.payment = payment;
      next();
    } catch (error) {
      console.error('Payment verification error:', error);
      return res.status(402).json({ error: 'Payment verification failed' });
    }
  };
}

module.exports = { withX402Payment };
```

## Step 3: Create Express Server

Create `server.js`:

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { withX402Payment } = require('./middleware/x402');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Free endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Protected endpoints with x402
app.get('/api/premium/content', withX402Payment('0.10'), (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'Exclusive Article',
      content: 'This is premium content that requires payment.',
      author: 'John Doe',
      paidBy: req.payment.from,
    },
  });
});

app.post('/api/ai/chat', withX402Payment('0.05'), (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Simulate AI response
  res.json({
    success: true,
    data: {
      response: `You said: ${message}. This is an AI response.`,
      model: 'gpt-4',
      timestamp: new Date().toISOString(),
    },
  });
});

app.get('/api/data/analysis', withX402Payment('0.02'), (req, res) => {
  const { query } = req.query;

  res.json({
    success: true,
    data: {
      query,
      results: [
        { metric: 'engagement', value: 85 },
        { metric: 'conversion', value: 12.5 },
      ],
    },
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Wallet Address: ${process.env.WALLET_ADDRESS}`);
});
```

## Step 4: Create Client Example

Create `client-example.js`:

```javascript
const { createClient } = require('@payless/sdk');

async function main() {
  // Create client
  const client = createClient({
    walletAddress: process.env.SERVER_WALLET_ADDRESS,
  });

  try {
    // Try without payment (will get 402)
    console.log('Trying without payment...');
    const response1 = await client.get('http://localhost:3000/api/premium/content');
    console.log('Response:', response1);

    // Try with payment (will succeed)
    console.log('\nTrying with payment...');
    const response2 = await client.get('http://localhost:3000/api/premium/content');
    console.log('Response:', response2);

    // POST request with payment
    console.log('\nPOST request with payment...');
    const response3 = await client.post('http://localhost:3000/api/ai/chat', {
      message: 'Hello, AI!',
    });
    console.log('Response:', response3);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

## Step 5: Run Your Server

```bash
# Start server
node server.js

# In another terminal, test with client
node client-example.js
```

## Testing with cURL

### Test Without Payment

```bash
curl http://localhost:3000/api/premium/content
```

Response:
```json
{
  "status": 402,
  "message": "Payment Required",
  "payment": {
    "amount": "0.10",
    "currency": "USDC",
    "recipient": "YOUR_WALLET_ADDRESS"
  }
}
```

### Test With Mock Payment

```javascript
const { createMockPaymentProof, paymentProofToHeader } = require('@payless/sdk');

const mockPayment = createMockPaymentProof(
  'SENDER_ADDRESS',
  process.env.WALLET_ADDRESS,
  '0.10',
  process.env.USDC_MINT
);

const paymentHeader = paymentProofToHeader(mockPayment);

// Use in request
fetch('http://localhost:3000/api/premium/content', {
  headers: {
    'X-Payment': paymentHeader,
  },
});
```

## Advanced: Rate Limiting

Create `middleware/rateLimit.js`:

```javascript
const rateLimit = {};

function rateLimitByWallet(maxRequests = 10, windowMs = 60000) {
  return (req, res, next) => {
    if (!req.payment) {
      return next();
    }

    const wallet = req.payment.from;
    const now = Date.now();

    if (!rateLimit[wallet]) {
      rateLimit[wallet] = { count: 0, resetTime: now + windowMs };
    }

    const limit = rateLimit[wallet];

    if (now > limit.resetTime) {
      limit.count = 0;
      limit.resetTime = now + windowMs;
    }

    limit.count++;

    if (limit.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        resetIn: Math.ceil((limit.resetTime - now) / 1000),
      });
    }

    next();
  };
}

module.exports = { rateLimitByWallet };
```

Use it:

```javascript
const { rateLimitByWallet } = require('./middleware/rateLimit');

app.get('/api/premium/content',
  withX402Payment('0.10'),
  rateLimitByWallet(10, 60000),
  (req, res) => {
    // Handler
  }
);
```

## Advanced: Analytics Tracking

Create `middleware/analytics.js`:

```javascript
const analytics = [];

function trackPayment() {
  return (req, res, next) => {
    if (req.payment) {
      analytics.push({
        timestamp: Date.now(),
        endpoint: req.path,
        amount: req.payment.amount,
        wallet: req.payment.from,
      });

      console.log(`Payment received: $${req.payment.amount} from ${req.payment.from}`);
    }
    next();
  };
}

function getAnalytics(req, res) {
  const totalRevenue = analytics.reduce(
    (sum, event) => sum + parseFloat(event.amount),
    0
  );

  res.json({
    totalPayments: analytics.length,
    totalRevenue: totalRevenue.toFixed(2),
    recentPayments: analytics.slice(-10).reverse(),
  });
}

module.exports = { trackPayment, getAnalytics };
```

Add to server:

```javascript
const { trackPayment, getAnalytics } = require('./middleware/analytics');

app.use(trackPayment());

// Analytics endpoint (free)
app.get('/api/analytics', getAnalytics);
```

## Deployment

### Heroku

```bash
heroku create your-app-name
heroku config:set WALLET_ADDRESS=your_wallet_address
heroku config:set NETWORK=mainnet-beta
git push heroku main
```

### Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t payless-api .
docker run -p 3000:3000 -e WALLET_ADDRESS=your_address payless-api
```

## Best Practices

1. **Always validate payment amounts**
2. **Set appropriate timeouts for payment expiry**
3. **Log all payment attempts**
4. **Use HTTPS in production**
5. **Implement rate limiting**
6. **Cache payment verifications**

## Resources

- [Express.js Documentation](https://expressjs.com/)
- [Payless SDK](../../sdk/nodejs/README.md)
- [Example Repository](https://github.com/Payless2025/PayLess)

## Support

Need help? [Open an issue](https://github.com/Payless2025/PayLess/issues)

