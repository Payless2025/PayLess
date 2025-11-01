# Ethereum Support

Payless now supports Ethereum mainnet for accepting payments! This expands our multi-chain capabilities beyond Solana and BSC.

## Overview

With Ethereum support, you can now accept payments in USDC and USDT on Ethereum mainnet, giving your users more flexibility in how they pay for your API services.

## Supported Tokens

- **USDC**: USD Coin (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)
- **USDT**: Tether USD (0xdAC17F958D2ee523a2206206994597C13D831ec7)

## Configuration

### Environment Variables

Add your Ethereum wallet address to your environment variables:

```env
# Ethereum Configuration
ETHEREUM_WALLET_ADDRESS=0xYourEthereumWalletAddress
ETHEREUM_RPC_URL=https://eth.llamarpc.com
```

If you don't specify an Ethereum-specific wallet address, it will fall back to `WALLET_ADDRESS`.

### Supported Networks

- **Mainnet**: Chain ID 1
- **RPC Endpoints**: 
  - https://eth.llamarpc.com (default)
  - https://rpc.ankr.com/eth

## Making Payments

### Client-Side

When making a payment request, specify Ethereum as the chain:

```javascript
const payment = {
  chain: 'ethereum',
  payment: {
    from: '0xYourWalletAddress',
    to: '0xRecipientAddress',
    amount: '0.01',
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    chainId: '1',
    timestamp: Date.now(),
    message: 'Payment message',
    signature: 'signed_message'
  }
};
```

### Multi-Chain Response

When a 402 Payment Required response is returned, Ethereum will be included in the available chains:

```json
{
  "status": 402,
  "message": "Payment Required",
  "payment": {
    "amount": "0.01",
    "currency": "USDC/USDT",
    "chains": [
      {
        "chain": "solana",
        "recipient": "SolanaWalletAddress...",
        "network": "mainnet-beta",
        "tokens": ["USDC", "USDT"]
      },
      {
        "chain": "bsc",
        "recipient": "0xBSCWalletAddress...",
        "network": "56",
        "tokens": ["USDT", "BUSD", "USDC"]
      },
      {
        "chain": "ethereum",
        "recipient": "0xEthereumWalletAddress...",
        "network": "1",
        "tokens": ["USDC", "USDT"]
      }
    ]
  }
}
```

## Gas Fees

Ethereum has higher gas fees compared to Solana and BSC. The SDK provides a helper function to check current gas prices:

```javascript
import { getEthereumGasPrice } from '@/lib/chains/ethereum';

const gasPrice = await getEthereumGasPrice();
console.log('Current gas prices:', gasPrice);
// { low: '20', medium: '30', high: '40' } // In Gwei
```

## Payment Verification

The Ethereum payment verification process:

1. **Recipient Validation**: Ensures payment is sent to correct address
2. **Amount Validation**: Confirms payment amount meets requirement
3. **Timestamp Validation**: Checks payment is not expired (5 minute window)
4. **Chain ID Validation**: Verifies payment is on Ethereum mainnet (chain ID 1)
5. **Signature Validation**: Verifies message signature matches sender

## Example Integration

### With ethers.js

```javascript
import { ethers } from 'ethers';
import { createEthereumPaymentMessage } from '@/lib/chains/ethereum';

// Connect wallet
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const fromAddress = await signer.getAddress();

// Create payment message
const toAddress = '0xRecipientAddress';
const amount = '0.01';
const token = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC
const timestamp = Date.now();

const message = createEthereumPaymentMessage(
  fromAddress,
  toAddress,
  amount,
  token,
  timestamp
);

// Sign message
const signature = await signer.signMessage(message);

// Make API request with payment
const response = await fetch('/api/your-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Payment': JSON.stringify({
      chain: 'ethereum',
      payment: {
        from: fromAddress,
        to: toAddress,
        amount,
        token,
        chainId: '1',
        timestamp,
        message,
        signature,
      },
    }),
  },
  body: JSON.stringify({ /* your data */ }),
});
```

## Block Explorers

- **Etherscan**: https://etherscan.io
- Transaction: `https://etherscan.io/tx/{txHash}`
- Address: `https://etherscan.io/address/{address}`

## Utilities

### Format Address
```javascript
import { formatEthereumAddress } from '@/lib/chains/ethereum';

const formatted = formatEthereumAddress('0x1234...5678');
// Returns: '0x1234...5678'
```

### Validate Address
```javascript
import { isValidEthereumAddress } from '@/lib/chains/ethereum';

const isValid = isValidEthereumAddress('0x...');
// Returns: true or false
```

### Get Transaction Link
```javascript
import { getEthereumTransactionLink } from '@/lib/chains/ethereum';

const link = getEthereumTransactionLink(txHash);
// Returns: 'https://etherscan.io/tx/{txHash}'
```

## Best Practices

1. **Gas Optimization**: Consider batching transactions when possible
2. **Fee Estimation**: Always check gas prices before transactions
3. **User Communication**: Inform users about gas fees upfront
4. **Fallback Chains**: Offer Solana or BSC as lower-fee alternatives
5. **Token Approval**: Ensure users have approved token spending

## Troubleshooting

### High Gas Fees
If gas fees are too high, suggest users:
- Wait for lower network congestion
- Use BSC or Solana for lower fees
- Use Layer 2 solutions (coming soon)

### Invalid Chain ID
Ensure you're connected to Ethereum mainnet (chain ID 1), not a testnet.

### Signature Verification Failed
- Check that the message format matches exactly
- Ensure wallet is signing the correct message
- Verify timestamp is recent (within 5 minutes)

## Future Enhancements

- [ ] Layer 2 support (Arbitrum, Optimism)
- [ ] EIP-712 typed signatures
- [ ] Token allowance checking
- [ ] Gas fee estimation in payment flow
- [ ] Smart contract payment verification

## Learn More

- [Ethereum Official Docs](https://ethereum.org/developers)
- [ethers.js Documentation](https://docs.ethers.org)
- [ERC-20 Token Standard](https://eips.ethereum.org/EIPS/eip-20)
- [Payless Multi-Chain Guide](./MULTI_CHAIN.md)

