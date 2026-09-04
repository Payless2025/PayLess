# PolicyWallet

An agent wallet that enforces its spending limit on chain.

**Deployed:** `0xE8f98Abe2Aaca504de0Eb1B033F6B0318a8C237B` on Robinhood Chain (4663)

## What it does

An agent's budget used to live in the tool's process memory. Real, but only as
real as the process: a leaked key or a manipulated agent walks past it and
takes whatever the wallet holds.

This contract moves the limit to the one place the agent cannot reach. The
agent holds a **session key**, the money lives here, and every payment has to
get past the policy before it settles:

| | |
|---|---|
| `maxPerCall` | largest single payment |
| `allowedRecipient` | where money may go |
| `allowedFacilitator` | who may choose an `upto` amount |
| `maxSignatureTtl` | how far ahead a signature may be dated |
| balance | the day's whole budget |

## How it plugs in without changing anything

The x402 proxies pass `owner` to Permit2 unchanged. When `owner` is a contract,
Permit2 does not `ecrecover` — it calls ERC-1271 `isValidSignature(hash, sig)`
on the owner and requires the magic value back. So this wallet becomes the payer
simply by being named as owner, and Permit2 asks it for permission on every
settlement.

Verified against the deployed Permit2 on 4663: the `isValidSignature` selector
and its `InvalidContractSignature` error are both in that bytecode.

The session key's signature is necessary but never sufficient. The contract
re-derives the Permit2 digest from the fields presented alongside it and
answers the policy questions the process cannot be trusted with.

## Proof it is enforced, not promised

Same session key, same wallet, one field different:

| | |
|---|---|
| in policy, 0.01 | [`0x2ae11497…`](https://robinhoodchain.blockscout.com/tx/0x2ae114977b61a5cee404dda7971bf2d1ede151c3ccd7eff73d0bcb1fe4ed1da3) settled |
| over the cap, 0.03 | [`0x81c7b005…`](https://robinhoodchain.blockscout.com/tx/0x81c7b005e1762990d0e0031caf8941c39198feec631ab702f83475339a4b8a4b) reverted, `InvalidContractSignature`, zero logs |

The second one moved nothing. That is the contract refusing, not our code.

## The daily cap is the balance

`isValidSignature` is a `view` and can write no state, so there is no counter.
Instead `refill()` pulls the operator's configured float at most once per day,
and the balance IS the day's budget: inspectable by anyone on the explorer,
enforced by the token contract, with no bookkeeping to trust.

## Security posture, stated plainly

**This contract has not been audited.** What it has instead:

- **~250 lines, one purpose.** One token, one signature scheme family, no
  upgrade path, no proxy, no admin key that can change how validation works.
- **13 tests**, two of which are cross-language: a digest produced by the
  TypeScript client is verified byte-for-byte by the Solidity contract. Two
  independent EIP-712 implementations agreeing is the strongest evidence
  available short of an audit.
- **An escape hatch that always works.** The operator can `withdraw` everything
  and revoke the session key, each in one transaction, with no timelock.
- **A float sized to be lost.** Keep here only what a bad day can afford. This
  is pocket money with a policy, not a treasury.

### The load-bearing line

The security of this contract is one comparison, in `isValidSignature`:

```solidity
if (_digest(...) != hash) return NOT_MAGIC;
```

The policy is applied to fields supplied in the signature blob. The only thing
binding those fields to what Permit2 will actually execute is that their
re-derived digest equals the `hash` Permit2 is asking about. Weaken that
equality and the policy becomes decoration. Any review of this contract should
start there.

### What a leaked session key costs

Not everything, but not nothing. A thief can spend the current float, to
allowed recipients, under the per-call cap, until the operator revokes. So the
honest claim is **"cannot drain"**, not "cannot spend".

## Build and test

```sh
cd contracts
forge build
forge test
```

Solc 0.8.26, optimizer on, 200 runs. No dependencies beyond the interfaces
declared inline.
