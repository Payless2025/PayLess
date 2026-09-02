# payless

Price an HTTP endpoint in one line. Payments settle on
[Robinhood Chain](https://docs.robinhood.com/chain/) in USDG — no accounts on
either side, no processor, no protocol fee.

```bash
npm i payless viem
```

## Charge for a route

```ts
import { createPayless } from 'payless';

const payless = createPayless({ recipient: '0xYourAddress' });

async function handler(req: Request) {
  return Response.json({ data: 'the thing they paid for' });
}

export const GET = payless.protect(handler, '0.01');
```

That's the integration. `protect` wraps any `(Request) => Response` handler, so
it works anywhere the fetch API does — Next.js route handlers, Hono, Bun, Deno,
Cloudflare Workers.

## What the caller sees

No payment:

```http
HTTP/1.1 402 Payment Required

{
  "payment": {
    "amount": "0.01",
    "currency": "USDG",
    "recipient": "0xYourAddress",
    "network": "4663",
    "tokenAddress": "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"
  }
}
```

They send that much USDG on Robinhood Chain and retry with the hash:

```http
X-Payment: {"transactionHash":"0x13c8…"}
```

The server reads the receipt, confirms the transfer really paid it, and only
then runs your handler.

**A signature would prove intent. A receipt proves payment.** Signing is free
and off-chain, so this library does not accept one as proof.

## Paying from the client

You supply the function that moves the money. The SDK never sees a key and
never sends a transaction on your behalf.

```ts
import { payFor } from 'payless';

const res = await payFor('https://api.example.com/data', {
  from: account.address,
  maxAmount: '0.05', // refuse anything pricier
  pay: async ({ to, amount, tokenAddress }) => {
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [to, parseUnits(amount, 6)],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  },
});
```

If the transfer is not mined yet the server answers `402` with `retry: true` —
"come back in a moment", not "pay again". `payFor` reuses the same hash rather
than paying twice.

## Using a facilitator

Everything above assumes you run the chain work yourself: an RPC endpoint, log
decoding, token decimals, a freshness policy and a replay ledger, all to sell one
response for a cent.

A facilitator absorbs that. Point at one and you need none of it:

```ts
import { createPayless } from 'payless';

const payless = createPayless({
  recipient: '0xYourAddress',
  facilitator: 'https://www.payless.network/api/facilitator',
});

export const GET = payless.protect(handler, '0.01');
```

No `rpcUrl`, no `store`. Two HTTP calls happen per paid request and your code
makes neither of them.

Check at startup that it settles what you intend to sell, because finding out at
settlement time is too late — the response is already served:

```ts
import { createFacilitator } from 'payless';

const f = createFacilitator('https://www.payless.network/api/facilitator');
await f.assertSupports('receipt', 'eip155:4663');
```

### When settlement happens

For the `receipt` scheme the payment has already moved on chain before your
endpoint is called, so settling only claims it. That is done **before** your
handler runs: claiming costs the buyer nothing at that point, and it closes the
window where two concurrent requests both pass verification and both get served
off one payment.

For signature schemes, where settling is what actually moves the money, the
handler runs first. Charging before knowing the response rendered would be
charging for nothing.

Both defaults follow from `scheme`. Override with `settleFirst` if your endpoint
needs the other order.

### When the facilitator is down

A facilitator that cannot be reached produces a **503** with `retry: true`, not a
402. Telling a buyer their payment is invalid because a dependency is unreachable
would be a lie that costs them money.

## Replay protection

The transaction hash is the replay key: unique, already on chain, and no
client-generated nonce to trust. One transfer buys one response.

```
402 { "error": "Payment 0x13c8… was already spent on /api/data" }
```

The default ledger is in-memory. **That is correct for one long-lived server and
wrong on serverless**, where each instance keeps its own map — so a payment
could be spent once per warm instance.

On serverless, use the shared store:

```ts
import { createPayless, upstashStoreFromEnv } from 'payless';

const payless = createPayless({
  recipient: '0x…',
  store: upstashStoreFromEnv() ?? undefined, // reads UPSTASH_REDIS_REST_URL/TOKEN
});
```

It talks to Upstash over plain HTTP — no dependency to install, and it works on
edge runtimes where a TCP Redis client will not. Claims go through
`SET key value NX`, so the server decides the winner and there is no
read-then-write gap for two instances to race through.

Any atomic backend works; the interface is two methods:

```ts
createPayless({
  recipient: '0x…',
  store: {
    async claim(hash, record) { /* return the existing record, or null */ },
    async get(hash) { /* … */ },
  },
});
```

## Options

| Option | Default | Notes |
|---|---|---|
| `recipient` | — | Required. A 402 has to name where to pay. |
| `rpcUrl` | public Robinhood Chain RPC | The public one rate-limits; settlement costs two reads per paid request. Use your own. |
| `tokens` | USDG, WETH | Accepted payment tokens. |
| `store` | in-memory | Replay ledger. Replace on serverless. |
| `maxAgeMs` | 30 min | How old a settlement may be. |
| `facilitator` | — | URL or client. Set it and `rpcUrl` and `store` stop mattering: verification and the replay ledger move to the facilitator. |
| `scheme` | `receipt` | What to advertise and settle. |
| `settleFirst` | true for `receipt` | Claim before running the handler. See above for why the default differs by scheme. |

## Reconciliation

Verify a transfer without gating a request:

```ts
const result = await payless.verify('0x13c8…', '0.01');
// { valid: true, details: { from, to, amount, tokenSymbol, blockNumber, explorer } }
```

Decimals are read from the token contract rather than assumed, so an unfamiliar
token is measured correctly instead of being misread by orders of magnitude.

## Network

| | |
|---|---|
| Chain | Robinhood Chain, id `4663` |
| Gas | ETH |
| Default token | USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (6 decimals) |
| Explorer | https://robinhoodchain.blockscout.com |

## Links

- [payless.network](https://payless.network)
- [Source](https://github.com/Payless2025/PayLess)
- [x402](https://www.x402.org/)

MIT.
