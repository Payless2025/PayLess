/**
 * Tests for the facilitator.
 *
 * A facilitator answers two questions for somebody else's money: is this
 * payment good, and has it been used. Getting the first wrong gives a resource
 * away; getting the second wrong lets one payment buy many responses. Both get
 * explicit cases.
 */

import assert from 'node:assert/strict';
import {
  verify,
  settle,
  NETWORK,
  __setVerifierForTests,
  type PaymentRequirements,
  type PaymentPayload,
} from '../lib/x402/facilitator';
import { setSpentStore, MemorySpentStore } from '../lib/x402/spent-store';

const TX = '0x' + 'a'.repeat(64);
const SELLER_A = '0x426f8846B5011d5aCf659FE5bFBC5fdA6123f759';
const SELLER_B = '0x4fD46Ce55eA3E51b771F663bd56b3910D9f39746';
const PAYER = '0x921C107eA13f252b48F54cf8151f052333394F94';
const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';

function req(over: Partial<PaymentRequirements> = {}): PaymentRequirements {
  return { scheme: 'receipt', network: NETWORK, amount: '0.01', payTo: SELLER_A, resource: '/api/thing', ...over };
}
function pay(over: Partial<PaymentPayload> = {}): PaymentPayload {
  return { scheme: 'receipt', network: NETWORK, transactionHash: TX, ...over };
}

/** Stands in for the chain. Records what it was asked, so we can assert on it. */
function chainSays(result: any) {
  const calls: any[] = [];
  __setVerifierForTests(async (p: any) => {
    calls.push(p);
    return result;
  });
  return calls;
}

const good = {
  valid: true,
  details: {
    txHash: TX, from: PAYER, to: SELLER_A, token: USDG,
    tokenSymbol: 'USDG', amount: '0.01', blockNumber: '51544390',
  },
};

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  setSpentStore(new MemorySpentStore(), true);
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}\n    ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

async function run() {
  console.log('\nfacilitator\n');

  await test('rejects a scheme it does not settle', async () => {
    chainSays(good);
    const r = await verify(req({ scheme: 'exact' }), pay({ scheme: 'exact' }));
    assert.equal(r.isValid, false);
    assert.match(r.invalidReason!, /Unsupported scheme/);
  });

  await test('rejects an EIP-3009 payload instead of failing later at settle', async () => {
    // The trap this facilitator exists to avoid: USDG here has no
    // transferWithAuthorization, so a canonical exact payload must die early.
    const calls = chainSays(good);
    const r = await verify(
      req({ scheme: 'exact' }),
      { scheme: 'exact', network: NETWORK, signature: '0xdead', authorization: {} } as any
    );
    assert.equal(r.isValid, false);
    assert.equal(calls.length, 0, 'should not have touched the chain');
  });

  await test('rejects another network', async () => {
    chainSays(good);
    const r = await verify(req({ network: 'eip155:8453' }), pay({ network: 'eip155:8453' }));
    assert.equal(r.isValid, false);
    assert.match(r.invalidReason!, /Unsupported network/);
  });

  await test('rejects a payload whose scheme contradicts the requirements', async () => {
    chainSays(good);
    const r = await verify(req(), pay({ scheme: 'exact' }));
    assert.equal(r.isValid, false);
    assert.match(r.invalidReason!, /does not match/);
  });

  await test('rejects a malformed amount rather than guessing', async () => {
    chainSays(good);
    for (const amount of ['', 'free', '0.01 USDG', '-1']) {
      const r = await verify(req({ amount }), pay());
      assert.equal(r.isValid, false, `accepted amount "${amount}"`);
    }
  });

  await test('a seller may tighten the freshness window but never widen it', async () => {
    const calls = chainSays(good);
    await verify(req({ maxAgeMs: 60_000 }), pay());
    assert.equal(calls[0].maxAgeMs, 60_000, 'tightening should be honoured');

    const calls2 = chainSays(good);
    await verify(req({ maxAgeMs: 999 * 24 * 3600_000 }), pay());
    assert.ok(calls2[0].maxAgeMs <= 30 * 60_000, 'widening must be clamped');
  });

  await test('passes an unmined payment back as retryable', async () => {
    chainSays({ valid: false, pending: true, error: 'not confirmed yet' });
    const r = await verify(req(), pay());
    assert.equal(r.isValid, false);
    assert.equal(r.retryable, true);
  });

  await test('accepts a good payment and reports what the chain said', async () => {
    chainSays(good);
    const r = await verify(req(), pay());
    assert.equal(r.isValid, true);
    assert.equal(r.payer, PAYER);
    assert.equal(r.settlement?.amount, '0.01');
  });

  await test('verify consumes nothing, so calling it twice is free', async () => {
    chainSays(good);
    assert.equal((await verify(req(), pay())).isValid, true);
    assert.equal((await verify(req(), pay())).isValid, true);
    assert.equal((await settle(req(), pay())).success, true, 'settle should still be available');
  });

  await test('settle consumes the payment exactly once', async () => {
    chainSays(good);
    const first = await settle(req(), pay());
    assert.equal(first.success, true);
    assert.equal(first.transaction, TX);

    const second = await settle(req(), pay());
    assert.equal(second.success, false, 'the same payment settled twice');
    assert.match(second.errorReason!, /already settled/);
  });

  await test('verify reports an already-settled payment before the resource is served', async () => {
    chainSays(good);
    await settle(req(), pay());
    const r = await verify(req(), pay());
    assert.equal(r.isValid, false);
    assert.match(r.invalidReason!, /already settled/);
  });

  await test('one transfer paying two sellers can be claimed by each of them', async () => {
    // Keyed by transaction alone, whichever seller asked first would lock the
    // other out of money genuinely sent to them.
    chainSays(good);
    const a = await settle(req({ payTo: SELLER_A }), pay());
    __setVerifierForTests(async () => ({ ...good, details: { ...good.details, to: SELLER_B } }) as any);
    const b = await settle(req({ payTo: SELLER_B }), pay());

    assert.equal(a.success, true, 'seller A should be paid');
    assert.equal(b.success, true, 'seller B was locked out by seller A');
  });

  await test('refuses to settle when the ledger is unreachable, and says to retry', async () => {
    chainSays(good);
    setSpentStore(
      {
        async claim() { throw new Error('redis down'); },
        async get() { return null; },
      } as any,
      true
    );
    const r = await settle(req(), pay());
    assert.equal(r.success, false);
    assert.equal(r.retryable, true, 'a ledger outage is not the buyer’s fault');
  });

  __setVerifierForTests(null);
  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
