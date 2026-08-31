# Tokenised equities on Robinhood Chain

Robinhood Chain was built to carry tokenised real-world assets. Payless sells
data about them — and deliberately does not accept them as payment.

## Why data and not payment

Our settlement verifier already handles arbitrary ERC-20s, so adding NVDA to the
accepted payment tokens would have been a one-line change. We are not doing it:

- **They are securities.** Tokenised debt securities issued through Robinhood
  Assets (Jersey) Limited, tracking equities without conferring shareholder
  rights. Accepting them for API calls means holding securities as a business.
- **They are barred from US persons** under securities law.
- **Transfers are gated.** Compliance checks run on both sender and receiver.
  A payment that reverts is worse than no payment path — the caller cannot pay
  and cannot diagnose why.
- **They move in price.** Pricing a $0.01 call in a volatile asset needs an
  oracle we do not have.

The asymmetry that makes the product work:

> **Reading is permissionless. Transferring is not.**

So settlement stays in USDG — stable, unrestricted, no securities exposure —
and the tokenised equities become the thing being described rather than the
thing being moved.

## Endpoints

| Endpoint | Price | Returns |
|---|---|---|
| `/api/rwa/tokens` | 0.02 USDG | Every tracked stock token with live supply |
| `/api/rwa/token?symbol=NVDA` | 0.01 USDG | One token, by ticker or address |
| `/api/rwa/holdings?address=0x…` | 0.02 USDG | An address's tokenised equity position |
| `/api/data/stock?symbol=TSLA` | 0.01 USDG | The same read, on the legacy path |

## What these are not

Supply is not a quote. These endpoints report **on-chain token state**, not last
trade prices. `/api/data/stock` used to return `Math.random()` shaped like a
quote; it now returns the real token state and says plainly that it is not a
market price.

## Canonical addresses

Anyone can deploy an ERC-20 called NVDA. The addresses in
[`lib/chains/rwa.ts`](../lib/chains/rwa.ts) were each verified against chain
4663 — the symbol matches the ticker and the on-chain name carries the
`· Robinhood Token` marker.

Every response carries a `canonical` flag re-checked at read time, so if an
address in our list ever stops matching, the answer says so instead of quietly
serving it. The authoritative list is
[docs.robinhood.com/chain/contracts](https://docs.robinhood.com/chain/contracts/);
check against it rather than trusting this repo.

Currently tracked: TSLA, AAPL, NVDA, AMZN, MSFT, GOOGL, META, MSTR, SPY, QCOM.

## Open

The list is maintained by hand. Robinhood generates its published table from an
on-chain asset registry, but the registry address is not in the static docs — 
resolving it would let this list follow new listings automatically instead of
waiting for a commit.
