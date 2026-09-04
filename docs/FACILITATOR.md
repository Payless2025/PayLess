# The Robinhood Chain facilitator

## What a facilitator is for

Selling an API call for a cent normally means running a node, verifying
signatures, decoding transfer logs, and making sure nobody spends the same
payment twice. That is a lot of machinery for one cent.

A facilitator does all of it for you. Your server makes two HTTP calls, "is this
payment good" and "now consume it", and never touches a chain.

## Why this document exists

If one company's endpoint is the only way to verify payments on a chain, that is
not a payment layer. That is a single point of failure with a logo on it.

So everything here is written so you can stop depending on ours. The protocol is
specified, the implementation is in this repository, and the deployment takes
about ten minutes.

**Public instance:** `https://www.payless.network/api/facilitator`
**Status:** `https://www.payless.network/api/facilitator/status`

---

## The interface

Three endpoints. Two of them are the whole integration.

### `GET /supported`

What this facilitator can settle. Call it once at startup and fail loudly if it
does not list what you intend to sell. Discovering at settlement time that the
scheme was never supported is unrecoverable, because the response is already
served.

```json
{
  "kinds": [
    { "x402Version": 2, "scheme": "receipt", "network": "eip155:4663", "extra": { ... } },
    { "x402Version": 2, "scheme": "exact",   "network": "eip155:4663", "extra": { ... } },
    { "x402Version": 2, "scheme": "upto",    "network": "eip155:4663", "extra": { ... } }
  ],
  "replayLedger": "shared",
  "ledgerReachable": true,
  "operator": { "name": "...", "contact": "..." },
  "status": "/api/facilitator/status",
  "selfHost": "..."
}
```

`extra.settlement` is `live`, `out-of-gas`, or `unconfigured`. It is computed
from the signer's actual gas balance, not from whether a key is configured. A
key with no gas cannot settle, and reporting `live` off the key alone is true
about configuration and false about capability.

### `POST /verify`

Before serving the resource.

```json
{ "paymentRequirements": { ... }, "paymentPayload": { ... } }
```

```json
{ "isValid": true, "payer": "0x...", "settlement": { ... } }
```

Consumes nothing, so calling it twice is free. A bad payment is answered with
`200` and `isValid: false`. A non-2xx means the facilitator itself is broken,
which is a different problem: do not report it to the buyer as an invalid
payment.

`retryable: true` means the payer should wait, not pay again.

### `POST /settle`

After serving the resource. Same body shape.

```json
{ "success": true, "transaction": "0x...", "network": "eip155:4663" }
```

### `GET /status`

Whether it can do its job right now. `operational`, `degraded`, or `down`, with
a named reason per check: signer gas, replay ledger, chain reachability.

`degraded` is its own state on purpose. A service that answers only up or down
gets called up while it is quietly out of gas.

---

## The order of the two calls

Verify before serving, settle after. That is the convention, and for signature
schemes it is correct: settling is what moves the money, so taking it before you
know the response rendered would be charging for nothing.

The `receipt` scheme is the exception. There the payment already moved before the
request arrived, so settling only claims it. Claiming **before** your handler
runs costs the buyer nothing at that point and closes the window where two
concurrent requests both pass verification and both get served off one payment.

The `payless` SDK picks the right order from the scheme. If you integrate by
hand, pick it deliberately.

---

## The three schemes

### `receipt`

The buyer sends the ERC-20 transfer themselves and presents its hash. The
facilitator verifies the receipt on chain, checks freshness, and claims the hash
so it buys exactly one response.

Costs the buyer gas and one confirmation. Requires the least trust of anything
here: the money has already moved, and you could verify it yourself with your
own RPC if you wanted.

### `exact`

The buyer signs a Permit2 authorisation and sends no transaction. The facilitator
broadcasts it and pays the gas.

USDG on this chain implements neither EIP-3009 nor EIP-2612, verified by scanning
the dispatch table of the implementation behind its proxy. So the canonical x402
`exact` scheme, which signs `transferWithAuthorization`, cannot work here. This
runs through Permit2 and the canonical x402 proxy instead.

The proxy matters more than it looks. Permit2 alone does not bind the
destination: the spender picks it at call time, so a facilitator could take a
signature meant for one recipient and deliver it elsewhere. The proxy takes the
destination from the signed witness itself, which makes "the facilitator cannot
redirect your money" a property of the contract rather than a promise from
whoever runs it.

Requires one prior `approve(Permit2, amount)` from the buyer. Once, ever.

### `upto`

The buyer signs a ceiling, the seller settles what the work actually cost, and
the difference is never taken. For anything whose price is not knowable before it
runs, such as a model call billed by tokens or a query whose result size is
unknown.

Two things the contract enforces rather than the facilitator promising: the
settled amount cannot exceed the signed ceiling, and only the facilitator named
inside the signature may choose it. An `upto` authorisation written for one
facilitator is useless to another.

Report the metered cost from your handler with the `x-payment-cost` response
header. It is clamped to the advertised price.

---

## Addresses on chain 4663

| | |
|---|---|
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |
| x402 exact proxy | `0x402085c248EeA27D92E8b30b2C58ed07f9E20001` |
| x402 upto proxy | `0x4020A4f3b7b90ccA423B9fabCc0CE57C6C240002` |
| USDG | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |

All four are checkable with `eth_getCode`. The proxies' `PERMIT2()` both return
the canonical Permit2, and their `WITNESS_TYPE_STRING()` is what the signature
must be built against. Read those from the chain rather than trusting any
document, including this one.

---

## Running your own

```sh
git clone https://github.com/Payless2025/PayLess
cd PayLess
npm install
```

Environment:

| Variable | Needed for | Notes |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | receipt scheme | The replay ledger. Without it, receipt settlement refuses outright rather than risking a double spend. |
| `UPSTASH_REDIS_REST_TOKEN` | receipt scheme | |
| `PAYLESS_FACILITATOR_PRIVATE_KEY` | exact, upto | The key that broadcasts. Fund it with a little ETH for gas and nothing else. |
| `PAYLESS_FACILITATOR_ADDRESS` | exact, upto | That key's address. |
| `ROBINHOOD_RPC_URL` | all | The public RPC rate-limits. Use your own for anything real. |
| `PAYLESS_FACILITATOR_OPERATOR` | optional | Your name, reported in `/supported` and `/status`. |
| `PAYLESS_FACILITATOR_CONTACT` | optional | Where to reach you when it breaks. |

Then deploy the Next.js app anywhere that runs it. The facilitator is four route
handlers under `app/api/facilitator/`; the logic is in `lib/x402/facilitator.ts`
and `lib/x402/permit2.ts`.

### What the signing key can and cannot do

It broadcasts other people's signed authorisations and pays their gas. It cannot
change the destination, the amount, or the token: all three are inside the
signature, and the proxy takes the destination from the witness.

Stolen, it costs you the ETH in it plus the nuisance of someone broadcasting
authorisations that had already been granted. Keep only gas there.

### Before you point anyone at it

Check your own `/status`. If `signer` is not `ok`, signature schemes will fail at
the last possible moment, which is the worst moment.

---

## Using it as a seller

```ts
import { createPayless } from 'payless';

const payless = createPayless({
  recipient: '0xYourAddress',
  facilitator: 'https://www.payless.network/api/facilitator',
});

export const GET = payless.protect(handler, '0.01');
```

No `rpcUrl`, no `store`. Both become the facilitator's problem.

Point it at your own instance by changing one string. That is the whole reason
this document exists.
