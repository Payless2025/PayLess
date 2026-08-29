# Robinhood Chain

Payless settles exclusively on **Robinhood Chain**, an EVM-compatible Arbitrum
Orbit L2. This page is the reference for the network, the token Payless accepts,
and the shape of a payment.

> This document replaces the former `MULTI_CHAIN.md`, `ETHEREUM_SUPPORT.md` and
> `MULTI_CHAIN_TEST_RESULTS.md`. Payless no longer supports Solana, BSC,
> Ethereum or Polygon.

---

## Network details

| | Mainnet |
|---|---|
| Chain ID | `4663` |
| RPC URL | `https://rpc.mainnet.chain.robinhood.com` |
| Block explorer | `https://robinhoodchain.blockscout.com` (Blockscout) |
| Gas token | ETH |
| Stack | Arbitrum Orbit |
| Access | Permissionless — anyone can deploy and transact |

Sources: [Robinhood Chain mainnet](https://robinhood.com/us/en/support/articles/robinhood-chain-mainnet/),
[Robinhood Chain docs](https://docs.robinhood.com/chain/).

A testnet exists with a [faucet](https://faucet.testnet.chain.robinhood.com).
Its chain ID and RPC are not asserted here — set `ROBINHOOD_CHAIN_ID` and
`ROBINHOOD_RPC_URL` from the official docs if you want to point Payless at it.

Because the public RPC is rate limited, use a dedicated endpoint for anything
beyond development.

---

## Tokens

Payless denominates payments in **USDG**, the Paxos Global Dollar — the
stablecoin natively minted on Robinhood Chain. **USDC is not deployed on this
chain**; if you are migrating from a USDC integration, every amount and label
becomes USDG.

| Symbol | Name | Contract | Decimals |
|--------|------|----------|----------|
| USDG | Global Dollar | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | 6 |
| WETH | Wrapped Ether | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` | 18 |

Canonical list: [docs.robinhood.com/chain/contracts](https://docs.robinhood.com/chain/contracts/).
A token with a matching ticker at a different address is not the canonical one —
always verify against that page.

---

## Configuration

```env
# The 0x… address that receives payments
WALLET_ADDRESS=0xYourRobinhoodChainWalletAddressHere

# Network (these are the defaults — override only to change network)
ROBINHOOD_CHAIN_ID=4663
ROBINHOOD_RPC_URL=https://rpc.mainnet.chain.robinhood.com
ROBINHOOD_EXPLORER_URL=https://robinhoodchain.blockscout.com

# Payment token
USDG_ADDRESS=0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
```

The browser needs the same network values as the server. Every variable above
also has a `NEXT_PUBLIC_` form (`NEXT_PUBLIC_ROBINHOOD_CHAIN_ID`, etc.) which
takes precedence when set; without it a server-only override would leave the
client on the defaults.

---

## How a payment works

Payless implements the x402 flow. Nothing is submitted on-chain by the
middleware — it verifies a **signed authorization** from the payer.

1. The client calls a paid endpoint with no payment.
2. The server answers `402 Payment Required` with the amount, recipient, chain
   ID and accepted token contracts.
3. The client builds a payload, signs `message` with `personal_sign` (EIP-191),
   and retries with an `X-Payment` header.
4. The server recovers the signer with `ethers.utils.verifyMessage` and checks
   it equals `from`.

### Payload

```typescript
interface RobinhoodPaymentPayload {
  from: string;         // Payer address (0x…)
  to: string;           // Recipient address (0x…)
  amount: string;       // Whole tokens, e.g. "0.05" — not base units
  token: string;        // "USDG"
  tokenAddress: string; // ERC-20 contract
  chainId: string;      // "4663"
  nonce: string;
  timestamp: number;    // Unix ms
  message: string;      // The exact string that was signed
  signature: string;    // EIP-191 signature (0x…, 65 bytes)
}
```

`message` is the JSON serialization of the payment fields with
`protocol: "x402-robinhood"`. Build it with `createPaymentMessage()` from
[`lib/x402/client.ts`](../lib/x402/client.ts) so the client and server agree
byte for byte — the signature is over that exact string, so any drift fails
verification.

### What the server checks

Implemented in [`lib/chains/robinhood.ts`](../lib/chains/robinhood.ts):

| Check | Failure |
|---|---|
| `to` matches the configured `WALLET_ADDRESS` | `Invalid recipient address` |
| `amount` ≥ the endpoint price | `Insufficient payment amount` |
| `timestamp` within 5 minutes | `Payment expired` |
| `chainId` equals `4663` | `Invalid chain ID` |
| Recovered signer equals `from` | `Invalid signature` |
| `tokenAddress` is USDG or WETH | `Invalid token…` |

### Demo mode

With `ENABLE_DEMO_PAYMENTS=true` (or outside production) signature recovery is
skipped so the playground works without a funded wallet. Recipient, amount and
token are still enforced. **Never set this in production** — it accepts any
signature.

### Not yet implemented

Signature verification proves the payer *authorized* the amount. It does not yet
prove settlement. Before taking real money you still need to:

- confirm the transfer landed on Robinhood Chain for the right amount and token;
- reject a `nonce` that has already been spent (replay protection — the
  5-minute window narrows it, it does not close it).

---

## Wallets

Any EVM wallet works — MetaMask, Rabby, Coinbase Wallet. The site connects
through wagmi's injected connector; see
[`components/WalletProvider.tsx`](../components/WalletProvider.tsx) for the
chain definition and [`components/WalletConnectButton.tsx`](../components/WalletConnectButton.tsx)
for the connect / network-switch UI.

If a visitor is connected to a different network the button offers to switch
them to chain `4663`.

---

## Related

- [Quick Start](./quickstart.md)
- [API Reference](./api-reference.md)
- [Token Gating](./TOKEN_GATING.md)
- [Payment Links](./PAYMENT_LINKS.md)
