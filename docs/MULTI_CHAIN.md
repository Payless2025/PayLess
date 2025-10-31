# Multi-Chain Support

Payless now supports multiple blockchain networks, starting with **Solana** and **BSC (Binance Smart Chain)**.

## Supported Chains

### 1. Solana (Mainnet)
- **Native Currency:** SOL
- **Payment Tokens:** USDC, USDT
- **Wallets:** Phantom, Solflare
- **Block Explorer:** https://solscan.io

### 2. BSC (Binance Smart Chain)
- **Native Currency:** BNB
- **Payment Tokens:** USDT, BUSD, USDC
- **Wallets:** MetaMask, Trust Wallet, Binance Wallet
- **Block Explorer:** https://bscscan.com

### Coming Soon
- ⏳ Ethereum Mainnet
- ⏳ Polygon
- ⏳ Arbitrum
- ⏳ Optimism

## Configuration

### Environment Variables

Add these to your `.env.local`:

```env
# Solana Configuration
SOLANA_WALLET_ADDRESS=your_solana_wallet_address
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# BSC Configuration
BSC_WALLET_ADDRESS=your_bsc_wallet_address
BSC_RPC_URL=https://bsc-dataseed1.binance.org

# Fallback (used if chain-specific not set)
WALLET_ADDRESS=your_default_wallet_address
```

## Usage

### Backend: Multi-Chain Middleware

```typescript
import { withMultiChainPayment } from '@/lib/x402/multi-chain-middleware';

async function handler(req: NextRequest) {
  return NextResponse.json({ data: 'premium content' });
}

// This endpoint accepts payments from both Solana and BSC
export const GET = withMultiChainPayment(handler, '0.10');
```

### Frontend: Chain Selection

The payment system automatically detects and supports multiple chains:

```typescript
// Payment will include chain information
const payment = {
  chain: 'bsc', // or 'solana'
  payment: {
    from: walletAddress,
    to: recipientAddress,
    amount: '0.10',
    // ... chain-specific fields
  }
};
```

## Payment Tokens

### Solana
| Token | Address | Decimals |
|-------|---------|----------|
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 |
| USDT | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` | 6 |

### BSC
| Token | Address | Decimals |
|-------|---------|----------|
| USDT | `0x55d398326f99059fF775485246999027B3197955` | 18 |
| BUSD | `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56` | 18 |
| USDC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | 18 |

## API Response (402 Payment Required)

When payment is required, the response now includes all supported chains:

```json
{
  "status": 402,
  "message": "Payment Required",
  "payment": {
    "amount": "0.10",
    "currency": "USDC/USDT",
    "chains": [
      {
        "chain": "solana",
        "recipient": "YOUR_SOLANA_ADDRESS",
        "network": "mainnet-beta",
        "tokens": ["USDC", "USDT"]
      },
      {
        "chain": "bsc",
        "recipient": "YOUR_BSC_ADDRESS",
        "network": "56",
        "tokens": ["USDT", "BUSD", "USDC"]
      }
    ]
  }
}
```

## Wallet Integration

### Solana Wallets

```typescript
import { useWallet } from '@solana/wallet-adapter-react';

const { publicKey, signMessage } = useWallet();

// Create Solana payment
const payment = await createSolanaPayment(
  publicKey.toString(),
  recipientAddress,
  amount,
  tokenMint
);
```

### BSC/EVM Wallets

```typescript
import { useAccount, useSignMessage } from 'wagmi';

const { address } = useAccount();
const { signMessage } = useSignMessage();

// Create BSC payment
const payment = await createBSCPayment(
  address,
  recipientAddress,
  amount,
  tokenAddress
);
```

## Payment Verification

### Solana
- Uses Ed25519 signatures
- Verifies with `tweetnacl` library
- Checks signature against public key

### BSC
- Uses ECDSA signatures
- Verifies with `ethers.js` library
- Recovers address from signature

## Example: Complete Integration

```typescript
// API Route with multi-chain support
import { withMultiChainPayment } from '@/lib/x402/multi-chain-middleware';

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const data = await fetchData(searchParams.get('query'));
  
  return NextResponse.json({
    success: true,
    data,
  });
}

export const GET = withMultiChainPayment(handler, '0.05');
```

```typescript
// Client making payment
import { createClient } from '@payless/sdk';

const client = createClient({
  walletAddress: 'YOUR_ADDRESS',
  chain: 'bsc', // or 'solana'
});

// SDK automatically handles chain-specific logic
const response = await client.get('/api/data/query?q=test');
```

## Benefits

### For Users
- **Choice:** Pick your preferred blockchain
- **Lower Fees:** Choose chain with lowest gas fees
- **Flexibility:** Use existing wallets

### For Developers
- **More Users:** Support multiple ecosystems
- **Same Code:** Unified API regardless of chain
- **Future-Proof:** Easy to add new chains

## Adding New Chains

Adding a new chain requires 3 steps:

1. **Add Chain Config** (`lib/chains/config.ts`)
2. **Add Verification Logic** (`lib/chains/[chain].ts`)
3. **Update Middleware** (`lib/x402/multi-chain-middleware.ts`)

Example for adding Polygon:

```typescript
// 1. Add config
export const POLYGON_CONFIG: ChainConfig = {
  id: '137',
  name: 'Polygon',
  // ... config
};

// 2. Add verification
export async function verifyPolygonPayment(/* ... */) {
  // Verification logic
}

// 3. Update middleware
case SupportedChain.POLYGON:
  const result = await verifyPolygonPayment(/* ... */);
  // Handle result
```

## Security

All chains use:
- ✅ Cryptographic signature verification
- ✅ Timestamp expiry checks (5 minutes)
- ✅ Amount validation
- ✅ Recipient address verification
- ✅ Replay attack prevention

## Resources

- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [Ethers.js Docs](https://docs.ethers.org/)
- [BSC Documentation](https://docs.bnbchain.org/)
- [Wagmi Documentation](https://wagmi.sh/)

## FAQ

**Q: Can I use different wallet addresses for each chain?**  
A: Yes! Set `SOLANA_WALLET_ADDRESS` and `BSC_WALLET_ADDRESS` separately.

**Q: Which chain should I recommend to users?**  
A: It depends on their preference. Solana has faster transactions, BSC has wider wallet support.

**Q: Are gas fees included in the payment amount?**  
A: No, users pay gas fees separately when making the transaction.

**Q: Can I disable certain chains?**  
A: Yes, just don't set the wallet address for that chain in env variables.

**Q: How do I test multi-chain payments?**  
A: Use testnets (Solana Devnet, BSC Testnet) before deploying to mainnet.

## Support

Need help with multi-chain integration? [Open an issue](https://github.com/Payless2025/PayLess/issues)

