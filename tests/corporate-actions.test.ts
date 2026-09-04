/**
 * Corporate actions on tokenised equities.
 *
 * The claim worth testing is not that the numbers are right, the chain decides
 * that. It is that the module never turns a number into a story: a multiplier
 * moving is a fact, calling it a split is an interpretation we cannot support
 * from chain data, and the difference is the whole reason anyone would trust
 * this endpoint.
 */

import assert from 'node:assert/strict';
import { readTokenActions, checkEligibility, ACCESS_REGISTRY, MULTIPLIER_EVENT_TOPIC } from '../lib/chains/corporate-actions';
import { findStockToken, STOCK_TOKENS } from '../lib/chains/rwa';

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

async function run() {
  console.log('\ncorporate actions\n');

  await test('the event topic matches the token contract signature', async () => {
    // Get this wrong and the history is silently always empty, which reads as
    // "nothing ever happened" rather than as a bug.
    assert.equal(
      MULTIPLIER_EVENT_TOPIC,
      '0x2205df4534432b2f60654a3fdb48737ffdaf3e9edb1a498bd985bc026b15b055'
    );
  });

  await test('live: AAPL carries a multiplier that is not 1, and says balances need scaling', async () => {
    // The most useful field in the whole module: a raw balanceOf on this token
    // does not equal what the issuer shows, and no ERC-20 field warns you.
    const a = await readTokenActions(findStockToken('AAPL')!);
    assert.notEqual(a.multiplier, '1');
    assert.equal(a.balancesNeedScaling, true);
  });

  await test('live: a token at exactly 1 reports no scaling needed', async () => {
    const n = await readTokenActions(findStockToken('NVDA')!, false);
    assert.equal(n.multiplier, '1');
    assert.equal(n.balancesNeedScaling, false);
  });

  await test('live: history comes from the event log with a checkable transaction', async () => {
    const a = await readTokenActions(findStockToken('AAPL')!);
    assert.ok(a.history.length > 0, 'AAPL has a recorded multiplier change');
    for (const h of a.history) {
      assert.match(h.txHash, /^0x[0-9a-f]{64}$/i, 'every change must name its transaction');
      assert.ok(h.explorer.includes(h.txHash));
      assert.ok(Date.parse(h.effectiveAt) > 0);
      assert.notEqual(h.from, h.to, 'a change that changes nothing is not a change');
    }
  });

  await test('reports numbers and dates, never an interpretation', async () => {
    // No field here should be able to say "split" or "dividend". If one ever
    // appears, it is a claim about paperwork we do not have.
    const a = await readTokenActions(findStockToken('AAPL')!);
    const blob = JSON.stringify(a).toLowerCase();
    for (const word of ['split', 'dividend', 'merger', 'spinoff']) {
      assert.ok(!blob.includes(word), `output names the event as "${word}"`);
    }
  });

  await test('live: a token is transferable only when nothing is paused', async () => {
    const a = await readTokenActions(findStockToken('TSLA')!, false);
    assert.equal(a.transferable, !a.paused.token && !a.paused.global);
  });

  await test('live: eligibility reads the shared registry and bounds its own answer', async () => {
    const e = await checkEligibility('0x426f8846B5011d5aCf659FE5bFBC5fdA6123f759', findStockToken('AAPL')!);
    assert.equal(typeof e.blockedByRegistry, 'boolean');
    assert.ok(e.reasons.length > 0, 'an answer without a reason is not an answer');
    if (e.canReceive) {
      // The bound matters more than the verdict: on-chain silence is not
      // permission from the issuer.
      assert.match(e.reasons[0], /Off-chain eligibility/);
    }
  });

  await test('every stock token defers to the same access registry', async () => {
    // If they ever diverge, one registry read stops being a valid answer for
    // all of them and this module has to change shape.
    assert.equal(ACCESS_REGISTRY, '0xe10b6f6B275de231345c20D14Ab812db62151b00');
    assert.ok(STOCK_TOKENS.length >= 10);
  });

  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
