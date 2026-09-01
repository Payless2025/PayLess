# payless-mcp

Let an agent pay for APIs — within a limit it cannot exceed.

An agent can hold a balance and sign a transaction. It cannot open an account,
pass KYC, or paste an API key into a dashboard. So today it can only call
services a human provisioned for it in advance.

This MCP server removes that step. The agent meets a `402`, pays it on
[Robinhood Chain](https://docs.robinhood.com/chain/), and continues.

```bash
npx -y payless-mcp
```

## The limit is not in the prompt

An agent with a wallet will, sooner or later, be talked into spending it — by a
confused plan, a hostile page, or an instruction hidden in the very data it just
paid for.

So the budget is enforced in the tool, before anything is signed. The model
cannot see it, raise it, or argue with it. There is no tool that changes it.

**The agent decides what to buy. It does not decide how much it can spend.**

## Setup

```json
{
  "mcpServers": {
    "payless": {
      "command": "npx",
      "args": ["-y", "payless-mcp"],
      "env": {
        "PAYLESS_AGENT_PRIVATE_KEY": "0x…",
        "PAYLESS_MAX_PER_CALL": "0.10",
        "PAYLESS_MAX_TOTAL": "1.00",
        "PAYLESS_ALLOWED_HOSTS": "api.example.com"
      }
    }
  }
}
```

| Variable | Default | Meaning |
|---|---|---|
| `PAYLESS_AGENT_PRIVATE_KEY` | — | The agent's own wallet. Without it the agent can quote prices but not pay. |
| `PAYLESS_MAX_PER_CALL` | `0.1` | Largest single payment, in USDG |
| `PAYLESS_MAX_TOTAL` | `1` | Total for the life of the process |
| `PAYLESS_ALLOWED_HOSTS` | any | Comma-separated host allowlist |
| `PAYLESS_RPC_URL` | public RPC | The public endpoint rate-limits |

**Fund that address with pocket money, not a treasury.** Whatever sits in it is
the ceiling on what a manipulated agent could reach, before the budget narrows
it further.

The key is read from this process's environment and never leaves it. It is not
a tool input, appears in no tool output, and is never shown to the model — an
agent cannot leak a secret it was never handed.

## Tools

| Tool | Moves money | Does |
|---|---|---|
| `quote` | no | What does this URL cost, and can we afford it? |
| `fetch_paid` | **yes** | Fetch a URL, paying its 402 if the budget allows |
| `budget_status` | no | What is left, and what has been spent |
| `wallet_status` | no | Address and balances. Never the key. |

Only `fetch_paid` can spend, and it checks the budget before signing.

## What a refusal looks like

```json
{
  "paid": false,
  "refused": true,
  "reason": "That call costs 0.5 but the per-call limit is 0.1. Not paying.",
  "budget": { "spent": 0.02, "remaining": 0.98, "maxPerCall": 0.1 }
}
```

The agent is told plainly, so it can choose something else rather than retrying
into a wall.

## Requirements

The agent's wallet needs, on Robinhood Chain (chain `4663`):

- **USDG** to pay with — [`0x5fc5…d168`](https://robinhoodchain.blockscout.com/token/0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168), 6 decimals
- **ETH** for gas — a transfer costs about 48,000 gas

## Server side

To charge for your own endpoint, see [`payless`](https://www.npmjs.com/package/payless):

```ts
export const GET = payless.protect(handler, '0.01');
```

MIT · [payless.network](https://payless.network) ·
[source](https://github.com/Payless2025/PayLess/tree/master/packages/payless-mcp)
