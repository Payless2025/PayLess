# The Robinhood Chain x402 profile

x402 is an open standard and this document does not replace it. It records the
decisions x402 leaves to each chain, as they are implemented on Robinhood Chain
(`eip155:4663`), so that a second implementation can interoperate with the first
without reading anyone's source.

Every rule below is enforced in code in this repository, and the file that
enforces it is named. Where a rule exists because of something specific to this
chain, the reason is given rather than asserted. A profile nobody can check is
just an opinion.

**Status:** descriptive. This is what runs today, not a proposal.
**x402 version:** 2.
**Last verified against the chain:** 17 September 2026.

---

## 1. Network

| | |
|---|---|
| Chain ID | `4663` |
| CAIP-2 network id | `eip155:4663` |
| Stack | Arbitrum Orbit L2 |
| Gas token | ETH |
| Reference RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Explorer | `https://robinhoodchain.blockscout.com` |

The `network` field in every challenge, payload and facilitator response is the
CAIP-2 form, not the bare chain id. Source: `lib/x402/facilitator.ts`.

## 2. Denomination

Payments are denominated in USDG, the stablecoin minted natively on this chain.
WETH is accepted as a secondary asset.

| Symbol | Address | Decimals |
|---|---|---|
| USDG | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | 6 |
| WETH | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` | 18 |

USDC is not deployed on this chain. An integration ported from a USDC chain has
to change the asset, and it has to change the decimals: USDG is 6, and treating
it as 18 understates every amount by twelve orders of magnitude.

Amounts in a 402 challenge are whole tokens as a decimal string (`"0.01"`).
Amounts in a discovery manifest are base units (`"10000"`), because that is what
x402 discovery already publishes. The two are deliberately different shapes;
read the field, not the habit. Source: `lib/chains/config.ts`,
`lib/x402/catalog.ts`.

## 3. Schemes

Three schemes are offered. A conforming server may offer any subset, and must
advertise exactly what it will accept.

### 3.1 `receipt`

The buyer sends the ERC-20 transfer themselves and presents its hash. The
facilitator reads the receipt and confirms it.

This scheme name is not canonical. It is named separately, rather than called
`exact`, because canonical `exact` means an EIP-3009 authorisation and this is
not one. Advertising a name whose meaning you do not implement is worse than
publishing a name of your own.

Requires: nothing from the seller beyond a recipient address. Costs the buyer
gas and one confirmation. Requires the least trust of any scheme, because the
buyer never authorises anyone to pull funds.

### 3.2 `exact`

The buyer signs a Permit2 authorisation and sends no transaction.

| | |
|---|---|
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |
| Spender, pinned | `0x402085c248EeA27D92E8b30b2C58ed07f9E20001` |
| Witness type | `Witness(address to,uint256 validAfter)` |

Why Permit2 and not EIP-3009, which canonical x402 uses: USDG here implements
neither EIP-3009 nor EIP-2612. This was established by scanning the dispatch
table of the implementation behind its proxy. A settle path built on
`transferWithAuthorization` reverts on this chain.

**The spender must be the address above, and an implementation must check it
rather than accept whatever a payload claims.** Permit2 alone does not bind the
destination: the spender chooses `transferDetails.to` at call time, so a
facilitator holding a valid signature could deliver the money elsewhere. The
canonical proxy closes that by taking the destination from the signed witness
itself. With this spender, "the facilitator cannot redirect your money" is a
property of the contract. With any other spender, it is a promise.

The buyer needs one prior `approve(Permit2)` on the token.

### 3.3 `upto`

The buyer signs a ceiling, and the seller settles what the work actually cost
within it.

| | |
|---|---|
| Spender, pinned | `0x4020A4f3b7b90ccA423B9fabCc0CE57C6C240002` |
| Witness type | `Witness(address to,address facilitator,uint256 validAfter)` |

For work whose price is not knowable before it runs, such as a call billed per
row or per token. The settled amount must not exceed the signed ceiling, and
defaults to the ceiling, which makes `upto` behave like `exact`.

The witness names the facilitator, and the proxy rejects any settle whose caller
is not that address. A facilitator offering this scheme must therefore publish
its settling address in `extra.facilitator`, because a buyer who signs the wrong
one has produced an authorisation nobody can use.

Source for this section: `lib/x402/permit2.ts`, `lib/x402/facilitator.ts`.

## 4. The 402 challenge

A challenge carries every way the resource can be paid for, in the x402 v2
`accepts` shape:

```json
{
  "status": 402,
  "payment": {
    "amount": "0.01",
    "currency": "USDG",
    "recipient": "0x…",
    "network": "4663",
    "accepts": [
      { "scheme": "receipt", "network": "eip155:4663", "amount": "0.01",
        "payTo": "0x…", "asset": "0x5fc5…", "extra": { "…": "…" } }
    ]
  }
}
```

Rules:

- Listing only one scheme when more are supported is a defect, not a
  simplification. A caller that cannot see a gasless option will send a transfer
  and wait for a confirmation it did not need.
- `extra.settlement` is present on every entry, so a client reads one field
  rather than treating absence as a third state. Values: `live`, `out-of-gas`,
  `unconfigured`.
- `extra.pricing: "metered"` means the advertised amount is a ceiling rather
  than a price. A client seeing it should prefer `upto`, because on a metered
  resource preferring `upto` is preferring to pay less.
- Where a subscription plan covers the resource, the challenge carries a
  `subscribe` array alongside `accepts`. One request one payment is not the only
  shape available.

Source: `lib/x402/middleware.ts`.

## 5. The facilitator contract

Three endpoints, and the order they are called in is part of the profile:

| Endpoint | When | Answers |
|---|---|---|
| `/supported` | once | what this facilitator can settle |
| `/verify` | before serving the resource | is this payment good |
| `/settle` | after serving it | consume it so it cannot be reused |

Verify before, settle after. Settling first takes payment for a response that
may still fail to render. Serving before verifying gives the resource away. The
window between the two is exactly what the replay ledger closes.

`/supported` must report capability, not configuration. A signing key with no
gas cannot settle, so reporting `live` because a key is present is true about
configuration and false about capability, and the client discovers it at the one
moment it cannot recover. This implementation reads the gas balance and reports
`out-of-gas` below roughly a dozen settlements' worth.

A facilitator is not meant to be the only one. Running your own is documented in
[FACILITATOR.md](FACILITATOR.md), and a seller is free to point at any
facilitator that implements this profile.

Source: `lib/x402/facilitator.ts`.

## 6. Verification rules

These are the rules that decide whether money moved, and they hold for every
scheme.

**The receipt is the payment.** A signature proves that someone authorised an
amount. Signing is free and happens off chain, so it is evidence of intent and
nothing else. Settlement is established by reading the transaction: status
success, an ERC-20 `Transfer` of an accepted asset, to the expected recipient,
for at least the expected amount.

**Amounts compare in base units.** Parse to the asset's own decimals and compare
as integers. Underpayment is rejected with both figures stated.

**Freshness: 30 minutes.** A receipt stays valid on chain forever, so without a
window an old transaction pays for a new request. A seller may narrow the window
per resource, downward only. Source: `SETTLEMENT_MAX_AGE_MS` in
`lib/chains/settlement.ts`.

**One settlement buys one response.** The transaction hash is the spend key:
unique, already on chain, and no client-supplied nonce to trust. It must be
claimed atomically before the work is done, not checked and then written.
Implementations backed by a shared store must use an atomic primitive such as
Redis `SET NX`; a get-then-set is racy across instances. Entries are retained 24
hours, which is longer than any settlement can stay fresh.

**Fail closed.** If the replay ledger cannot be reached, reject. Serving traffic
while the ledger is unavailable means a receipt can be spent once per instance,
and it fails silently, which is the worst shape a failure can take.

Source: `lib/chains/settlement.ts`, `lib/x402/spent-store.ts`.

## 7. Discovery

### 7.1 Manifest

A server publishes what it sells at `/.well-known/x402`, so an agent can ask one
question of an origin it has never seen instead of calling endpoints and reading
402s one at a time.

The record shape is not invented here. It matches what production x402
facilitators already publish at `/discovery/resources`: an `items` array of
`{ resource, type, x402Version, method, accepts[], metadata }`. Where an
existing convention and a better idea disagreed, the existing convention won.

`metadata.inputs` lists the required and optional query parameters. This is not
decoration. A catalogue that says what is for sale but not how to ask for it
sends an agent to an endpoint that answers 400 for a reason nobody told it.

The manifest is free to read. Charging to find out what things cost is an odd
first impression.

### 7.2 Registry

A seller attaches a name to the address the chain already knows by signing a
message and pointing at a manifest.

The rule that keeps it honest: **the manifest must name the signing address as a
`payTo` recipient.** Both directions have to agree, so a listing cannot claim an
address it does not control, and an address cannot be listed against a manifest
that never mentions it.

Listing is free. Charging for it would make the directory about who paid rather
than about who sells. The cost of an entry is a signature and a manifest that
agrees with it, which is the only currency that keeps a directory honest.

### 7.3 Ranking

Where an implementation ranks sellers, this profile's rule is: match first, then
settlements observed on chain, then price. Evidence sits above price
deliberately. The cheapest offer from an address that has never settled anything
is an untested claim, not a bargain.

Source: `app/.well-known/x402/route.ts`, `lib/x402/catalog.ts`,
`app/api/discovery/register/route.ts`, `app/api/route/route.ts`.

## 8. Conformance

A server conforms to this profile when:

1. It answers unpaid requests with 402 and an `accepts` array covering every
   scheme it will honour.
2. Its amounts are USDG at 6 decimals, or an accepted asset at that asset's own
   decimals.
3. It verifies settlement from the chain rather than from a signature.
4. It rejects settlements older than its stated window, at most 30 minutes.
5. It claims each settlement atomically before serving, and refuses to serve
   when the ledger is unreachable.
6. If it offers `exact` or `upto`, it pins the spender to the canonical proxy
   for that scheme and checks it.
7. If it offers `upto`, it settles at or below the signed ceiling and publishes
   the facilitator address named in the witness.
8. It publishes `/.well-known/x402`, free.

A facilitator conforms when it implements `/supported`, `/verify` and `/settle`
as described in section 5, and reports settlement capability from actual gas
rather than from configuration.

## 9. What this profile does not decide

- **Pricing.** What anything costs is the seller's business.
- **Who may sell.** The registry has an honesty rule, not a gate.
- **Which facilitator to use.** Sellers pick, and running your own is expected.
- **Custody.** Nothing here holds anyone's funds. Payments go from payer to
  seller, and a facilitator that took custody would be solving a different
  problem.
- **Other chains.** This is a Robinhood Chain profile. The x402 standard is not.

## 10. Reference implementation

Payless implements this profile end to end and the source is MIT licensed:
[github.com/Payless2025/PayLess](https://github.com/Payless2025/PayLess).

Live at `https://www.payless.network`:

- `/.well-known/x402` the manifest
- `/api/facilitator/supported`, `/verify`, `/settle` the facilitator
- `/api/discovery/resources`, `/sellers`, `/stats` the index
- `/x402` the index as a page

Disagreements with this document are welcome as issues. A profile that cannot be
argued with is not a profile.
