# ⚡ Payment Streaming

## Overview

Payment Streaming allows you to charge users **per-second, per-minute, or per-hour** for metered services. Perfect for AI APIs, compute time, streaming media, and any usage-based billing.

**Key Features:**
- ⚡ Real-time billing (pay-per-second possible!)
- ⏸️ Pause/Resume streams anytime
- 💰 Automatic balance tracking
- 🔄 Multi-chain support (Solana, BSC, Ethereum)
- 📊 Live usage metrics
- 🛡️ Insufficient funds protection

## Why Payment Streaming?

### Traditional Model Problems
- ❌ Flat monthly fees (overcharge or undercharge)
- ❌ Complex metering systems
- ❌ Credit card fraud & chargebacks
- ❌ Delays in payment settlement

### Payment Streaming Advantages
- ✅ **Fair pricing** - Pay only for what you use
- ✅ **Instant settlement** - Blockchain-powered
- ✅ **No chargebacks** - Crypto payments are final
- ✅ **Global reach** - No payment processor needed
- ✅ **Real-time tracking** - See usage and costs live

## Use Cases

### 1. AI APIs
Charge per second of inference time or per token generated.

**Example:** OpenAI alternative charging 0.001 SOL per second
- User starts API call → Stream starts
- Every second charges 0.001 SOL
- User gets response → Stream stops
- Total cost: 3 seconds = 0.003 SOL

### 2. Compute Time
Rent GPU/CPU power with per-second billing.

**Example:** Cloud GPU at 0.01 SOL per minute
- User launches instance → Stream starts
- Charges 0.01 SOL every minute
- User stops instance → Stream ends
- Total: 127 minutes = 1.27 SOL

### 3. Streaming Media
Video/audio streaming with per-minute charges.

**Example:** Premium content at 0.0001 SOL per minute
- User plays video → Stream starts
- Pauses video → Stream pauses (no charges)
- Resumes → Stream resumes
- Total: 45 minutes watched = 0.0045 SOL

### 4. API Rate Limiting
Unlimited API access with usage-based pricing.

**Example:** Data API at 0.005 SOL per hour
- User connects → Stream starts
- Makes unlimited calls while streaming
- Disconnects after 3 hours → 0.015 SOL charged

## How It Works

### Stream Lifecycle

```
┌──────────┐    ┌────────┐    ┌────────┐    ┌────────────┐
│  Create  │ -> │ Active │ -> │ Paused │ -> │ Completed  │
│  Stream  │    │(billing)│   │(no bill)│   │ (final)    │
└──────────┘    └────────┘    └────────┘    └────────────┘
                     ↓                              ↓
                ┌─────────┐                   ┌────────┐
                │  Auto   │                   │Cancelled│
                │ Update  │                   └────────┘
                └─────────┘
```

### 1. Create Stream

```typescript
POST /api/streams

{
  "walletAddress": "9aXHx...",
  "config": {
    "serviceName": "AI API Service",
    "description": "GPT-4 alternative API",
    "ratePerInterval": 0.001,
    "billingInterval": "per_second",
    "chain": "solana",
    "minBalance": 0.1,
    "maxDuration": 3600
  },
  "initialBalance": 1.0
}
```

**Response:**
```json
{
  "success": true,
  "stream": {
    "id": "abc123",
    "status": "active",
    "walletAddress": "9aXHx...",
    "totalCharged": 0,
    "estimatedBalance": 1.0,
    "createdAt": 1699564800000
  }
}
```

### 2. Monitor Stream

```typescript
GET /api/streams/abc123
```

**Response:**
```json
{
  "success": true,
  "stream": {
    "id": "abc123",
    "status": "active",
    "totalDuration": 127,
    "totalCharged": 0.127,
    "estimatedBalance": 0.873,
    "config": {
      "ratePerInterval": 0.001,
      "billingInterval": "per_second"
    }
  }
}
```

### 3. Pause Stream

```typescript
PATCH /api/streams/abc123

{
  "action": "pause"
}
```

Stream stops billing. User not charged while paused.

### 4. Resume Stream

```typescript
PATCH /api/streams/abc123

{
  "action": "resume"
}
```

Stream resumes billing from where it left off.

### 5. Complete Stream

```typescript
PATCH /api/streams/abc123

{
  "action": "complete"
}
```

Ends stream and finalizes billing.

## API Reference

### Create Stream

**Endpoint:** `POST /api/streams`

**Body:**
```typescript
{
  walletAddress: string;
  config: {
    serviceName: string;
    description?: string;
    ratePerInterval: number;  // Amount per interval
    billingInterval: 'per_second' | 'per_minute' | 'per_hour';
    chain: 'solana' | 'bsc' | 'ethereum';
    minBalance?: number;      // Stop stream if balance goes below
    maxDuration?: number;     // Max seconds before auto-complete
  };
  initialBalance: number;     // Starting balance in tokens
}
```

### Get Stream

**Endpoint:** `GET /api/streams/:id`

**Response:**
```typescript
{
  success: boolean;
  stream: {
    id: string;
    walletAddress: string;
    status: 'active' | 'paused' | 'completed' | 'cancelled' | 'insufficient_funds';
    totalDuration: number;    // Total active seconds
    totalCharged: number;     // Total amount charged
    estimatedBalance: number; // Remaining balance
    config: StreamConfig;
    events: StreamEvent[];    // History of all stream events
  };
}
```

### Get Wallet Streams

**Endpoint:** `GET /api/streams?wallet=xxx`

Returns all streams for a wallet address.

### Update Stream

**Endpoint:** `PATCH /api/streams/:id`

**Actions:**
- `pause` - Pause billing
- `resume` - Resume billing
- `complete` - End stream
- `cancel` - Cancel stream
- `add_funds` - Add balance (requires `amount`)

**Body:**
```typescript
{
  action: 'pause' | 'resume' | 'complete' | 'cancel' | 'add_funds';
  amount?: number;  // Required for add_funds
  reason?: string;  // Optional for cancel
}
```

### Delete Stream

**Endpoint:** `DELETE /api/streams/:id`

Cancels and removes stream.

## Billing Intervals

### Per Second
```typescript
{
  ratePerInterval: 0.001,
  billingInterval: 'per_second'
}
```
Charges 0.001 tokens every second. Best for real-time services.

### Per Minute
```typescript
{
  ratePerInterval: 0.05,
  billingInterval: 'per_minute'
}
```
Charges 0.05 tokens every minute. Good balance for most services.

### Per Hour
```typescript
{
  ratePerInterval: 2.5,
  billingInterval: 'per_hour'
}
```
Charges 2.5 tokens every hour. Best for longer sessions.

## Configuration Options

### Min Balance
```typescript
{
  minBalance: 0.1
}
```
Stream automatically pauses if balance drops below this amount. Prevents overcharging.

### Max Duration
```typescript
{
  maxDuration: 3600  // 1 hour in seconds
}
```
Stream automatically completes after this duration. Prevents runaway costs.

### Initial Balance
```typescript
{
  initialBalance: 5.0
}
```
Starting balance for the stream. User deposits this upfront.

## Stream Events

Every action is logged in the stream's event history:

```typescript
{
  type: 'started' | 'paused' | 'resumed' | 'completed' | 'cancelled' | 'billed' | 'insufficient_funds';
  timestamp: number;
  amount?: number;
  balance?: number;
  reason?: string;
}
```

**Example Event History:**
```json
[
  { "type": "started", "timestamp": 1699564800000, "balance": 1.0 },
  { "type": "billed", "timestamp": 1699564860000, "amount": 0.06, "balance": 0.94 },
  { "type": "paused", "timestamp": 1699564920000, "balance": 0.88 },
  { "type": "resumed", "timestamp": 1699565000000, "balance": 0.88 },
  { "type": "completed", "timestamp": 1699565180000, "balance": 0.70 }
]
```

## Frontend Integration

### React Example

```typescript
import { useState, useEffect } from 'react';

function StreamMonitor({ streamId }: { streamId: string }) {
  const [stream, setStream] = useState(null);

  useEffect(() => {
    const fetchStream = async () => {
      const res = await fetch(`/api/streams/${streamId}`);
      const data = await res.json();
      setStream(data.stream);
    };

    // Fetch every 5 seconds
    const interval = setInterval(fetchStream, 5000);
    fetchStream();

    return () => clearInterval(interval);
  }, [streamId]);

  if (!stream) return <div>Loading...</div>;

  return (
    <div>
      <h3>Stream Status: {stream.status}</h3>
      <p>Duration: {stream.totalDuration}s</p>
      <p>Charged: {stream.totalCharged} SOL</p>
      <p>Balance: {stream.estimatedBalance} SOL</p>
      
      {stream.status === 'active' && (
        <button onClick={() => pauseStream(streamId)}>
          Pause
        </button>
      )}
      
      {stream.status === 'paused' && (
        <button onClick={() => resumeStream(streamId)}>
          Resume
        </button>
      )}
    </div>
  );
}
```

## Best Practices

### 1. Set Min Balance
Always set `minBalance` to prevent overcharging:
```typescript
{
  minBalance: ratePerInterval * 60  // At least 60 intervals buffer
}
```

### 2. Use Max Duration
Protect users from accidentally leaving streams running:
```typescript
{
  maxDuration: 3600  // Auto-stop after 1 hour
}
```

### 3. Update Frequency
For active streams, update every 5-10 seconds for smooth UX.

### 4. Handle Insufficient Funds
```typescript
if (stream.status === 'insufficient_funds') {
  // Prompt user to add funds
  await addStreamFunds(streamId, amount);
}
```

### 5. Show Real-time Cost
Display running total to users:
```typescript
const costPerSecond = config.ratePerInterval / getIntervalSeconds(config.billingInterval);
const estimatedCost = duration * costPerSecond;
```

## Production Considerations

### Database Storage
In production, replace in-memory storage with a database:

```typescript
// Instead of Map
const streamStore = new Map<string, PaymentStream>();

// Use PostgreSQL, MongoDB, etc.
await db.streams.create(stream);
```

### Background Jobs
Run a background job to update active streams:

```typescript
// Every 10 seconds
setInterval(() => {
  updateAllActiveStreams();
}, 10000);
```

### Webhooks
Send notifications when streams change status:

```typescript
// When stream completes
await fetch(webhookUrl, {
  method: 'POST',
  body: JSON.stringify({
    event: 'stream.completed',
    stream: streamData
  })
});
```

### Rate Limiting
Protect your API from abuse:

```typescript
// Max 1000 streams per wallet
if (getWalletStreams(wallet).length >= 1000) {
  throw new Error('Too many active streams');
}
```

## Troubleshooting

### Stream Not Billing
- Check `status` is `active`
- Verify `lastBilledAt` is updating
- Ensure background job is running

### Balance Not Updating
- Call `updateStreamBilling()` before returning stream
- Check for calculation errors in `calculateStreamCost()`

### Stream Won't Resume
- Verify `status` is `paused`
- Check if `minBalance` requirement is met
- Ensure stream hasn't exceeded `maxDuration`

## Examples

### AI Inference Streaming
```typescript
// Start inference
const stream = await createStream(wallet, {
  serviceName: 'GPT-4 Inference',
  ratePerInterval: 0.001,
  billingInterval: 'per_second',
  chain: 'solana',
  minBalance: 0.06,  // 60 seconds buffer
  maxDuration: 300   // 5 min max
}, 1.0);

// ... run inference ...

// Stop when done
await completeStream(stream.id);
```

### GPU Rental
```typescript
const stream = await createStream(wallet, {
  serviceName: 'RTX 4090 Rental',
  ratePerInterval: 0.02,
  billingInterval: 'per_minute',
  chain: 'solana',
  minBalance: 1.0,
  maxDuration: 14400  // 4 hours
}, 10.0);
```

### Video Streaming
```typescript
const stream = await createStream(wallet, {
  serviceName: '4K Video Stream',
  ratePerInterval: 0.0005,
  billingInterval: 'per_minute',
  chain: 'solana',
  minBalance: 0.03,  // 60 min buffer
}, 0.5);

// Pause on player pause
video.on('pause', () => pauseStream(stream.id));

// Resume on player resume
video.on('play', () => resumeStream(stream.id));
```

## Support

- 📖 [Full Documentation](https://payless.gitbook.io/payless-documentation)
- 💬 [Discord Community](https://discord.gg/payless)
- 🐦 [Twitter](https://twitter.com/paylessnetwork)
- 🐛 [Report Issues](https://github.com/Payless2025/PayLess/issues)

---

**Payment Streaming** - Pay for what you use, not what you might use ⚡
