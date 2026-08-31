# Changelog

All notable changes to the Payless project will be documented in this file.

## [Unreleased]

### Changed — BREAKING: single-chain migration to Robinhood Chain

Payless now settles exclusively on **Robinhood Chain** (EVM / Arbitrum Orbit,
chain ID `4663`). Solana, BSC, Ethereum and the planned Polygon support have
been removed from the website and its libraries.

- **Payment token is now USDG** (Paxos Global Dollar,
  `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`, 6 decimals). USDC is not
  deployed on Robinhood Chain.
- **Signatures are EIP-191** (`personal_sign`, recovered with
  `ethers.utils.verifyMessage`) instead of Solana ed25519 + base58.
- `lib/chains/solana.ts`, `bsc.ts` and `ethereum.ts` are replaced by
  `lib/chains/robinhood.ts`.
- `lib/x402/multi-chain-middleware.ts` is removed; `withMultiChainPayment` is
  gone and every paid route now uses `withX402Payment` from
  `lib/x402/middleware.ts`.
- Payment payloads use `tokenAddress` (ERC-20 contract) instead of `tokenMint`,
  and carry a `chainId`.
- Wallet connection moved from the Solana wallet adapter (Phantom / Solflare)
  to wagmi + an injected EVM connector (MetaMask, Rabby, …).
- Environment variables: `SOLANA_*` / `BSC_*` / `ETHEREUM_*` / `USDC_MINT` /
  `NETWORK` / `RPC_URL` are replaced by `ROBINHOOD_CHAIN_ID`,
  `ROBINHOOD_RPC_URL`, `ROBINHOOD_EXPLORER_URL` and `USDG_ADDRESS`.
  `WALLET_ADDRESS` must now be a `0x…` address.
- Token gating reads an ERC-20 `balanceOf` on Robinhood Chain via
  `PAYLESS_TOKEN_ADDRESS`. Until that variable is set every wallet resolves to
  the free tier.
- `@solana/*`, `bs58` and `tweetnacl` dropped from the website's dependencies.
- Docs `MULTI_CHAIN.md`, `ETHEREUM_SUPPORT.md` and `MULTI_CHAIN_TEST_RESULTS.md`
  removed — they documented chains Payless no longer supports.

### Fixed
- Dashboard metric cards read `data.metrics` from `/api/analytics`, which
  returns `data`. Every card showed zero while the transaction table below was
  populated. Now reads `data.data`.

### Historical entries below describe the previous multi-chain releases and are
### left unchanged as a record of what shipped at the time.


### Added
- **Ethereum Support**: Full Ethereum mainnet integration for accepting payments in USDC and USDT
  - New `lib/chains/ethereum.ts` with payment verification
  - Multi-chain middleware updated to support Ethereum
  - Gas price estimation utility
  - Complete Ethereum documentation

- **Webhook System**: Real-time payment notifications
  - Webhook registration and management API (`/api/webhooks`)
  - Event types: `payment.confirmed`, `payment.pending`, `payment.failed`
  - Automatic retry with exponential backoff
  - Signature verification for security
  - Delivery history tracking
  - Test webhook endpoint
  - Complete webhook documentation

- **SDK Improvements**:
  - Enhanced error handling with detailed error messages
  - Better validation for requests
  - Support for non-JSON responses
  - Comprehensive examples:
    - Basic usage examples
    - Wallet integration examples
    - Error handling patterns
  - Improved TypeScript types

- **Documentation**:
  - New Ethereum Support guide
  - Complete Webhooks documentation
  - SDK usage examples
  - Updated README with new features
  - Enhanced SUMMARY for better navigation

### Changed
- Multi-chain response now includes Ethereum as an option
- Improved error messages in SDK client
- Better handling of payment creation failures

### Technical
- Added `crypto` module for webhook signature generation
- Enhanced multi-chain middleware with Ethereum support
- Improved type definitions for webhooks
- Better error handling in payment verification

## [1.0.0] - 2024-11-01

### Added
- Initial release
- x402 protocol implementation
- Solana payment support
- BSC (Binance Smart Chain) support
- Multi-chain middleware
- Payment analytics
- Interactive playground
- Node.js SDK
- Python SDK
- Next.js API routes
- Comprehensive documentation

### Features
- Zero protocol fees
- Instant settlement
- Privacy-first approach
- Serverless ready
- AI agent compatible
- Built-in analytics

---

## Release Notes

### Ethereum Support
Ethereum is now fully supported as a payment option. Users can pay with USDC or USDT on Ethereum mainnet. The integration includes:
- Complete payment verification
- Gas price estimation
- Address validation utilities
- Transaction link helpers
- Full documentation

**Note**: Ethereum has higher gas fees compared to Solana and BSC. We recommend offering multiple chain options to users.

### Webhook System
The new webhook system enables real-time notifications for payment events. Key features:
- Automatic delivery with retry logic
- Secure signature verification
- Multiple event types
- Delivery history tracking
- Easy testing with test endpoint

Webhooks are perfect for:
- Sending confirmation emails
- Updating databases
- Triggering analytics events
- Team notifications

### SDK Improvements
The Node.js SDK has been significantly improved with:
- Better error handling
- More comprehensive examples
- Detailed documentation
- Support for edge cases

The SDK now gracefully handles:
- Network errors
- Invalid endpoints
- Payment failures
- Non-JSON responses

## Migration Guide

### From v1.0.0 to Unreleased

#### Ethereum Integration
If you want to support Ethereum payments, add the following environment variable:

```env
ETHEREUM_WALLET_ADDRESS=0xYourEthereumAddress
ETHEREUM_RPC_URL=https://eth.llamarpc.com
```

The multi-chain middleware automatically includes Ethereum in 402 responses.

#### Webhooks
To start using webhooks:

1. Register your webhook endpoint:
```bash
POST /api/webhooks
{
  "url": "https://your-server.com/webhooks",
  "secret": "your_secret",
  "events": ["payment.confirmed"]
}
```

2. Implement webhook handler with signature verification
3. Test with `/api/webhooks/test` endpoint

#### SDK Updates
Update your SDK usage to take advantage of improved error handling:

```javascript
const response = await client.get('/api/endpoint');

if (!response.success) {
  // Better error messages now available
  console.error('Error:', response.error);
  console.error('Status:', response.status);
}
```

## Roadmap

This file records what has already shipped. Planned and in-progress work lives
on the [roadmap](https://payless.network/roadmap), and community requests are in
[GitHub Issues](https://github.com/Payless2025/PayLess/issues).

## Contributing

We welcome contributions! If you'd like to contribute to Payless:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

- **Documentation**: https://github.com/Payless2025/PayLess/tree/master/docs
- **GitHub**: https://github.com/Payless2025/PayLess
- **X**: [@paylessnetwork](https://x.com/paylessnetwork)

---

**Stay updated!** Follow us on [X/Twitter](https://x.com/paylessnetwork) for the latest updates and announcements.

