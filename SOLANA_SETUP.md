# 🚀 Payless - Solana Setup Guide

This guide will help you configure Payless to work with Solana blockchain.

---

## 🎯 What Changed from EVM Version

Payless now uses **Solana** instead of Ethereum/Base:
- ✅ **Wallet Addresses**: Solana base58 format (not 0x...)
- ✅ **Signatures**: Ed25519 signatures (not ECDSA)
- ✅ **Token**: USDC SPL Token on Solana
- ✅ **Network**: Solana mainnet-beta/devnet
- ✅ **Wallets**: Phantom, Solflare (not MetaMask)

---

## ⚙️ Configuration

### 1. Environment Variables

Create `.env` file with Solana-specific values:

```env
# Your Solana wallet address (base58 format)
WALLET_ADDRESS=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

# x402 Facilitator URL
FACILITATOR_URL=https://facilitator.x402.org

# Solana Network (mainnet-beta, devnet, testnet)
NETWORK=mainnet-beta

# Solana RPC URL
RPC_URL=https://api.mainnet-beta.solana.com

# USDC SPL Token Mint Address (mainnet)
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### 2. Get a Solana Wallet

**For Development:**
- Install [Phantom Wallet](https://phantom.app/)
- Or use [Solflare](https://solflare.com/)
- Create wallet and copy your address

**For Production:**
- Use a dedicated payment wallet
- Never share your private key
- Consider multi-sig for security

### 3. USDC on Solana

**Token Mint Addresses:**
- **Mainnet**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **Devnet**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

**Get USDC:**
- Buy on exchanges (Coinbase, Binance)
- Bridge from Ethereum using [Portal Bridge](https://www.portalbridge.com/)
- For testing, use devnet faucets

---

## 🔧 Solana-Specific Features

### Payment Verification

The middleware now:
1. ✅ Verifies Ed25519 signatures (not ECDSA)
2. ✅ Checks Solana wallet addresses (base58)
3. ✅ Validates SPL token mint
4. ✅ Uses `tweetnacl` for signature verification
5. ✅ Uses `@solana/web3.js` for blockchain interaction

### Signature Format

```typescript
// Message that gets signed
{
  from: "7xKXtg2CW...",      // Payer Solana address
  to: "7xKXtg2CW...",        // Recipient Solana address
  amount: "0.05",            // USDC amount
  token: "USDC",             // Token symbol
  tokenMint: "EPjFWdd...",   // SPL token mint
  nonce: "abc123",           // Unique ID
  timestamp: 1234567890,     // Unix timestamp
  protocol: "x402-solana"
}
```

### Client Integration

```typescript
import { createPaymentPayload, signPaymentPayload } from '@/lib/x402/client';

// Create payment
const payload = createPaymentPayload(
  'YourSolanaAddress',
  'RecipientAddress',
  '0.05',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
);

// Sign with Phantom wallet
const signed = await signPaymentPayload(payload, phantomWallet);

// Make request
fetch('/api/ai/chat', {
  method: 'POST',
  headers: {
    'X-Payment': JSON.stringify(signed)
  },
  body: JSON.stringify({ message: 'Hello!' })
});
```

---

## 🌐 Solana Networks

### Mainnet-Beta (Production)
```env
NETWORK=mainnet-beta
RPC_URL=https://api.mainnet-beta.solana.com
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### Devnet (Testing)
```env
NETWORK=devnet
RPC_URL=https://api.devnet.solana.com
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

### Testnet (Staging)
```env
NETWORK=testnet
RPC_URL=https://api.testnet.solana.com
```

---

## 💰 Transaction Costs

**Solana Advantages:**
- ⚡ **Fast**: ~400ms confirmation
- 💵 **Cheap**: ~$0.00025 per transaction
- 🚀 **Scalable**: 65,000 TPS

vs. Ethereum:
- 🐌 Slower: ~12 seconds
- 💸 Expensive: $1-50 per transaction
- 📊 Lower TPS: ~15 TPS

---

## 🔐 Security Notes

### Best Practices
1. ✅ Never commit private keys
2. ✅ Use environment variables
3. ✅ Validate all wallet addresses
4. ✅ Verify SPL token mint
5. ✅ Check transaction signatures on-chain
6. ✅ Implement nonce checking to prevent replay

### Signature Verification

```typescript
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';

// Verify signature
const message = new TextEncoder().encode(messageString);
const signature = bs58.decode(signatureBase58);
const publicKey = new PublicKey(walletAddress);

const isValid = nacl.sign.detached.verify(
  message,
  signature,
  publicKey.toBytes()
);
```

---

## 🧪 Testing with Solana

### Demo Mode (No Real Crypto)
The project runs in demo mode by default:
- ✅ No real transactions
- ✅ Mock signatures
- ✅ Perfect for development

### Production Mode
Set `NODE_ENV=production` to enable:
- ✅ Real signature verification
- ✅ On-chain transaction checking
- ✅ Nonce validation
- ✅ Real USDC transfers

---

## 🌐 RPC Providers

### Free Options
- **Solana Official**: `https://api.mainnet-beta.solana.com`
- Rate limited but good for testing

### Paid Options (Better Performance)
- **Helius**: https://helius.dev
- **QuickNode**: https://quicknode.com
- **Alchemy**: https://alchemy.com
- **Triton**: https://triton.one

### Setup Custom RPC
```env
RPC_URL=https://your-custom-rpc.com
```

---

## 📊 Monitoring Transactions

### Solana Explorer
- **Mainnet**: https://explorer.solana.com/
- **Devnet**: https://explorer.solana.com/?cluster=devnet

### Check Your Wallet
```bash
# View wallet balance
solana balance 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

# View recent transactions
solana transaction-history 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

---

## 🔄 Migrating from EVM

If you had the EVM version:

### What Changed
- ❌ `ethers.js` → ✅ `@solana/web3.js`
- ❌ `0x...` addresses → ✅ Base58 addresses
- ❌ ECDSA signatures → ✅ Ed25519 signatures
- ❌ Base/Ethereum → ✅ Solana
- ❌ MetaMask → ✅ Phantom/Solflare

### Migration Steps
1. Update `.env` with Solana values
2. Run `npm install` (new dependencies)
3. Update wallet addresses in config
4. Test in demo mode
5. Deploy with production config

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create .env with Solana config
cp .env.example .env
# Edit .env with your Solana wallet

# 3. Start development
npm run dev

# 4. Test
# Visit http://localhost:3000/playground
```

---

## 🆘 Troubleshooting

### "Invalid wallet address"
- Solana addresses are base58 (not 0x...)
- Should be 32-44 characters
- Example: `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`

### "Invalid signature"
- Make sure you're using Ed25519 signatures
- Not ECDSA (Ethereum-style)
- Use `tweetnacl` for signing

### "Wrong token mint"
- Use correct USDC mint for your network
- Mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

---

## 📚 Resources

### Solana Documentation
- [Solana Docs](https://docs.solana.com/)
- [SPL Token Guide](https://spl.solana.com/token)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)

### Wallets
- [Phantom](https://phantom.app/)
- [Solflare](https://solflare.com/)
- [Backpack](https://backpack.app/)

### Tools
- [Solana Explorer](https://explorer.solana.com/)
- [Solana CLI](https://docs.solana.com/cli)
- [SPL Token CLI](https://spl.solana.com/token)

---

**You're now ready to accept USDC payments on Solana! 🎉**

For general setup, see [README.md](README.md)
For quick start, see [QUICKSTART.md](QUICKSTART.md)

