/**
 * Tests for the one part of Payless that can take money from someone.
 *
 * The property under test is not "collection works" — it is "collection happens
 * at most once, and never on an unknown outcome". Those are the failures that
 * cost a subscriber real money, so each one gets an explicit case.
 */

import assert from 'node:assert/strict';
import { MemorySubscriptionStore, type Subscription } from '../lib/x402/subscriptions';
import { setSubscriptionStore } from '../lib/x402/subscription-store';
import { collectPeriod, setCollector, type Collector, type CollectRequest } from '../lib/x402/collector';
import { PLANS } from '../lib/x402/plans';

const plan = PLANS[0];
const PAYER = '0x921C107eA13f252b48F54cf8151f052333394F94' as const;
const RECIPIENT = '0x426f8846B5011d5aCf659FE5bFBC5fdA6123f759' as const;

function subscription(): Subscription {
  return { planId: plan.id, payer: PAYER, startedAt: Date.now(), collected: {} };
}

/** Records every call, so "was this charged twice?" is answerable. */
function spyCollector(behaviour: (req: CollectRequest, call: number) => Promise<any>) {
  const calls: CollectRequest[] = [];
  const collector: Collector = {
    async collect(req) {
      calls.push(req);
      return behaviour(req, calls.length);
    },
  };
  return { collector, calls };
}

function freshStore(shared = true) {
  const store = new MemorySubscriptionStore();
  setSubscriptionStore(store, shared);
  return store;
}

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

async function run() {
  console.log('\ncollector\n');

  await test('no collector configured charges nothing and claims nothing', async () => {
    const store = freshStore();
    setCollector(null);
    const sub = subscription();

    const result = await collectPeriod({ plan, sub, recipient: RECIPIENT, period: 0 });
    assert.equal(result.status, 'unconfigured');

    // Critical: the period must stay unclaimed, or a collector configured later
    // would find every past period already "attempted" and never collect it.
    assert.equal(await store.getPeriod(plan.id, PAYER, 0), null);
  });

  await test('refuses to collect when the ledger is not shared', async () => {
    freshStore(false);
    const { collector, calls } = spyCollector(async () => ({ status: 'collected', txHash: '0xdead' }));
    setCollector(collector);

    const result = await collectPeriod({ plan, sub: subscription(), recipient: RECIPIENT, period: 0 });
    assert.equal(result.status, 'blocked');
    assert.equal(calls.length, 0, 'must not sign anything without a shared ledger');
  });

  await test('collects once and records the receipt', async () => {
    const store = freshStore();
    const { collector, calls } = spyCollector(async (req) => {
      await req.onBroadcast?.('0xaaa');
      return { status: 'collected', txHash: '0xaaa' };
    });
    setCollector(collector);
    const sub = subscription();

    const result = await collectPeriod({ plan, sub, recipient: RECIPIENT, period: 3 });
    assert.equal(result.status, 'collected');
    assert.equal(result.txHash, '0xaaa');
    assert.equal(calls.length, 1);

    const record = await store.getPeriod(plan.id, PAYER, 3);
    assert.equal(record?.status, 'collected');
    assert.equal(sub.collected[3]?.txHash, '0xaaa', 'mirror on the subscription should follow the ledger');
  });

  await test('a second call for the same period does not charge again', async () => {
    freshStore();
    const { collector, calls } = spyCollector(async (req) => {
      await req.onBroadcast?.('0xbbb');
      return { status: 'collected', txHash: '0xbbb' };
    });
    setCollector(collector);
    const sub = subscription();

    await collectPeriod({ plan, sub, recipient: RECIPIENT, period: 1 });
    const second = await collectPeriod({ plan, sub, recipient: RECIPIENT, period: 1 });

    assert.equal(second.status, 'collected');
    assert.equal(second.txHash, '0xbbb');
    assert.equal(calls.length, 1, `collector ran ${calls.length} times for one period`);
  });

  await test('concurrent requests for the same period produce one transfer', async () => {
    freshStore();
    const { collector, calls } = spyCollector(async (req) => {
      // Yield, so a check-then-act implementation would interleave here.
      await new Promise((r) => setTimeout(r, 10));
      await req.onBroadcast?.('0xccc');
      return { status: 'collected', txHash: '0xccc' };
    });
    setCollector(collector);
    const sub = subscription();

    const results = await Promise.all(
      Array.from({ length: 5 }, () => collectPeriod({ plan, sub, recipient: RECIPIENT, period: 7 }))
    );

    assert.equal(calls.length, 1, `five concurrent requests caused ${calls.length} transfers`);
    assert.equal(results.filter((r) => r.status === 'collected').length >= 1, true);
    assert.equal(results.some((r) => r.status === 'in-flight' || r.status === 'collected'), true);
  });

  await test('a failure before broadcast releases the period for a clean retry', async () => {
    const store = freshStore();
    const { collector, calls } = spyCollector(async (req, call) => {
      if (call === 1) throw new Error('RPC down');
      await req.onBroadcast?.('0xddd');
      return { status: 'collected', txHash: '0xddd' };
    });
    setCollector(collector);
    const sub = subscription();

    const first = await collectPeriod({ plan, sub, recipient: RECIPIENT, period: 2 });
    assert.equal(first.status, 'failed');
    assert.equal(await store.getPeriod(plan.id, PAYER, 2), null, 'claim should be released');

    const second = await collectPeriod({ plan, sub, recipient: RECIPIENT, period: 2 });
    assert.equal(second.status, 'collected');
    assert.equal(calls.length, 2);
  });

  await test('a failure after broadcast keeps the claim and never re-sends', async () => {
    const store = freshStore();
    const { collector, calls } = spyCollector(async (req) => {
      // Broadcast, then die before the receipt — the dangerous case.
      await req.onBroadcast?.('0x' + 'e'.repeat(64));
      throw new Error('process crashed waiting for receipt');
    });
    setCollector(collector);
    const sub = subscription();

    const first = await collectPeriod({ plan, sub, recipient: RECIPIENT, period: 4 });
    assert.equal(first.status, 'in-flight');

    const record = await store.getPeriod(plan.id, PAYER, 4);
    assert.equal(record?.status, 'pending');
    assert.equal(record?.txHash, '0x' + 'e'.repeat(64), 'the hash must be durable');

    // The retry looks the hash up on chain (it does not exist, so: unknown) and
    // must not send a second transfer.
    const second = await collectPeriod({ plan, sub, recipient: RECIPIENT, period: 4 });
    assert.equal(second.status, 'in-flight');
    assert.equal(calls.length, 1, `re-sent after an unknown outcome (${calls.length} calls)`);
  });

  await test('a collector that reports failure without broadcasting is retryable', async () => {
    const store = freshStore();
    const { collector } = spyCollector(async () => ({ status: 'failed', error: 'insufficient allowance' }));
    setCollector(collector);

    const result = await collectPeriod({ plan, sub: subscription(), recipient: RECIPIENT, period: 5 });
    assert.equal(result.status, 'failed');
    assert.equal(await store.getPeriod(plan.id, PAYER, 5), null);
  });

  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
