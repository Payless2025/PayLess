# Recurring payments

One request, one payment is the easy half of x402. The hard half is a caller
committing to pay again tomorrow when there is no card on file and no account to
cancel.

## The commitment is an allowance

The payer calls `approve(spender, amount)` on the plan's token. That approval
lives in their own wallet state, not in our database.

```
approve(0x426f8846B5011d5aCf659FE5bFBC5fdA6123f759, 5000000)   // 5 USDG
```

From that point we may collect at most the plan amount, at most once per period,
and never more than the approval. Two properties fall straight out of the ERC-20
semantics rather than from anything we promise:

- **We can never take more than was approved.** Not policy — arithmetic in the
  token contract.
- **We can never stop them cancelling.** `approve(spender, 0)` is theirs to
  send. No cancellation flow, no retention offer, nobody to email.

That asymmetry is the whole design.

## Using it

A `402` on a plan-covered endpoint advertises the recurring option alongside the
one-off price:

```json
{
  "payment": {
    "amount": "0.01",
    "currency": "USDG",
    "subscribe": [
      {
        "planId": "chain-daily",
        "amount": "0.50",
        "periodSeconds": 86400,
        "spender": "0x426f…",
        "howTo": "approve(spender, amount) … then send X-Subscription"
      }
    ]
  }
}
```

Approve once, then send the header on every call:

```
X-Subscription: {"planId":"chain-daily","payer":"0xYourAddress"}
```

No per-request signature, no transaction per call. The server reads the
allowance off Robinhood Chain and decides from that.

Responses carry the state back:

```
x-subscription-plan: chain-daily
x-subscription-period: 3
x-subscription-collected: pending
x-subscription-period-ends: 2026-09-03T00:00:00.000Z
```

`GET /api/subscriptions?payer=0x…` returns the same picture, and is free —
asking what you owe should not itself cost money.

## Plans

| id | amount | period | covers |
|---|---|---|---|
| `chain-daily` | 0.50 USDG | 24h | the `/api/chain/*` reads |
| `chain-hourly` | 0.05 USDG | 1h | the same, on a shorter leash |

Defined in [`lib/x402/plans.ts`](../lib/x402/plans.ts).

## How access is decided

[`decideAccess()`](../lib/x402/subscriptions.ts) takes the plan, the
subscription, and what the chain says is actually collectable — the lesser of
allowance and balance, because an approval over an empty wallet is worthless.

| Situation | Result |
|---|---|
| Period already collected | Served, even if the allowance has since gone to zero — it was paid for |
| Collectable covers this period | Served |
| Collectable is short | `402 insufficient` |
| Allowance is zero | `402 no-allowance` — this is what cancelling looks like |
| Subscription ended | `402 ended` |

Period boundaries are counted from `startedAt`, not from the calendar, so there
is no month-length ambiguity.

## Collection needs a signer, and does not live here

Access is granted on a **verified allowance**. Actually pulling the funds is
`transferFrom`, which needs a key that can sign transactions — and a key able to
pull from every subscriber is the most dangerous thing this codebase could hold.

So it is not held. [`collector.ts`](../lib/x402/collector.ts) defines the
interface; without `setCollector()` the status is `unconfigured` and **nothing
is charged**. Two shapes that work:

1. A separate worker with its own key, outside the web process, running the
   schedule. The web app then only ever reads.
2. A signer service (KMS, Turnkey, Privy) holding the key behind its own
   authorisation.

Because access follows the allowance rather than the collection, a collector
outage degrades to billing arrears — not to paying subscribers being locked out.

## Still open

- **Shared subscription store.** In-memory today, like the spent-transaction
  ledger. On serverless each instance keeps its own copy, so period accounting
  will drift across instances. Same fix as replay protection: one shared,
  atomic store.
- **No collector implementation ships.** By design, per above — but it means
  today the system tracks and authorises without charging.
