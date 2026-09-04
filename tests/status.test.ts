/**
 * The facilitator's own status.
 *
 * A payment layer that only reports success is not reportable. These pin the
 * one property that makes a status page worth having: it must be able to say
 * no, and it must say which part failed.
 */

import assert from 'node:assert/strict';

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

const BASE = 'https://www.payless.network/api/facilitator';

async function run() {
  console.log('\nfacilitator status\n');

  await test('live: reports a status and a reason per check', async () => {
    const res = await fetch(`${BASE}/status`);
    const s = await res.json();
    assert.ok(['operational', 'degraded', 'down'].includes(s.status), `unexpected status ${s.status}`);
    for (const name of ['signer', 'replayLedger', 'chain']) {
      assert.ok(s.checks[name], `missing check: ${name}`);
      assert.equal(typeof s.checks[name].ok, 'boolean');
      assert.ok(s.checks[name].detail.length > 0, `${name} has no reason`);
    }
    console.log(`    (${s.status}: ${Object.entries(s.checks).map(([k, v]: any) => `${k}=${v.ok}`).join(' ')})`);
  });

  await test('live: names an operator and a way to stop depending on it', async () => {
    // The question this answers: who runs this, and can I run my own. An
    // unanswered version of that question is its own answer.
    const s = await fetch(`${BASE}/status`).then((r) => r.json());
    assert.ok(s.operator?.name, 'no operator named');
    assert.ok(s.operator?.contact, 'no contact given');
    assert.match(s.selfHost, /FACILITATOR\.md/);
  });

  await test('live: /supported carries the same operator and status pointers', async () => {
    const d = await fetch(`${BASE}/supported`).then((r) => r.json());
    assert.ok(d.operator?.name);
    assert.equal(d.status, '/api/facilitator/status');
    assert.match(d.selfHost, /FACILITATOR\.md/);
  });

  await test('live: a degraded service does not answer 503', async () => {
    // Degraded means some schemes still settle. Answering 503 would take the
    // working ones down with the broken one.
    const res = await fetch(`${BASE}/status`);
    const s = await res.json();
    if (s.status === 'degraded') assert.equal(res.status, 200);
    if (s.status === 'down') assert.equal(res.status, 503);
    if (s.status === 'operational') assert.equal(res.status, 200);
  });

  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
