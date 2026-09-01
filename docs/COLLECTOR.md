# Running the subscription collector

The collector holds the only key in Payless that can pull funds from someone
else's wallet. It runs outside the website, on its own schedule, so the web
process never has that key and cannot leak it.

## What it does

Once per run it walks every subscription, asks Robinhood Chain what each payer
has actually approved, and collects at most one period per subscription. It
sends `transferFrom(payer, treasury, amount)`, signed by the collector address
and delivered to the treasury wallet. The signer never holds the money.

It defaults to a dry run. Charging anybody requires `--execute`, spelled out.

## Addresses

| Role | Address | Holds |
|---|---|---|
| Spender (signs) | `PAYLESS_COLLECTOR_ADDRESS` | gas only |
| Treasury (receives) | `WALLET_ADDRESS` | the proceeds |

Subscribers approve the **spender**. `transferFrom` spends the signer's
allowance and delivers wherever the call names, so these do not have to be the
same address, and keeping them apart means a stolen collector key inherits the
right to move approved funds into the treasury, and no balance at all.

The spender must match what the site advertises. The worker checks this before
signing anything and refuses loudly if it does not, because the on-chain failure
would otherwise be an opaque revert.

## Environment

| Variable | Required | Notes |
|---|---|---|
| `PAYLESS_COLLECTOR_PRIVATE_KEY` | for `--execute` | 32-byte hex. Never in the web app. |
| `PAYLESS_COLLECTOR_ADDRESS` | yes | Must be this key's address, and must match the site. |
| `UPSTASH_REDIS_REST_URL` | yes | The shared period ledger. |
| `UPSTASH_REDIS_REST_TOKEN` | yes | |
| `ROBINHOOD_RPC_URL` | no | Defaults to the public RPC, which rate-limits. |

Without the Upstash pair the worker refuses to run at all. That is deliberate:
on an in-memory ledger two runs cannot agree on what has been collected, and the
failure mode is charging a subscriber twice.

## Railway

Deploy this repository as a service, then in Settings:

- **Build command**: `npm ci`
- **Start command**: `npx tsx scripts/collect.ts --execute`
- **Cron schedule**: match the shortest billing period. The hourly plan wants
  something like `*/15 * * * *`; a daily-only deployment can run hourly.
- **Restart policy**: never. The script exits when it finishes, and a restarting
  service would run it in a loop.

Overlapping runs are safe. Each billing period is claimed atomically before any
transfer is signed, so a second run finds the period taken and moves on.

Do not set a health check. This is a task, not a server, and it has no port.

## Gas

`transferFrom` costs roughly 60k gas. At the gas price observed on 2026-09-01
that is about 0.000033 ETH per collection, so 0.005 ETH covers around 150 of
them. Top it up when it runs low; there is no reason to keep more than that in
a hot signing key.

## First run

Do this before scheduling anything:

```sh
npm run collect            # dry run: says what it would collect, charges nothing
npm run collect:execute    # actually collects
```

The dry run reads the same allowances and applies the same decisions as the real
one. If it says a subscription is `no-allowance`, that subscriber cancelled by
calling `approve(spender, 0)`, which is the intended way out and not an error.
