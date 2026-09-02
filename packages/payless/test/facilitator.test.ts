/**
 * Tests for the facilitator client.
 *
 * Two things are worth proving. That the HTTP wiring works against the real
 * service, and that the settle ordering is right, which a live service cannot
 * show you because it depends on when the handler runs.
 */

import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { createPayless } from '../src/server.js';
import { FacilitatorClient, FacilitatorUnavailable } from '../src/facilitator.js';

const LIVE = 'https://www.payless.network/api/facilitator';
const SELLER = '0x426f8846B5011d5aCf659FE5bFBC5fdA6123f759';

/** A facilitator that records the order it was called in. */
function stub(behaviour: { verify?: any; settle?: any; status?: number } = {}) {
  const calls: string[] = [];
  const server: Server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      calls.push(req.url!);
      if (behaviour.status) { res.writeHead(behaviour.status); return res.end('nope'); }
      const out =
        req.url === '/verify'
          ? behaviour.verify ?? { isValid: true, payer: '0xabc' }
          : behaviour.settle ?? { success: true, transaction: '0xdead' };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out));
    });
  });
  return {
    calls,
    async start() {
      await new Promise<void>((r) => server.listen(0, r));
      return `http://127.0.0.1:${(server.address() as any).port}`;
    },
    stop: () => new Promise<void>((r) => server.close(() => r())),
  };
}

const payment = JSON.stringify({ transactionHash: '0x' + 'a'.repeat(64) });
const call = (h: any, headers: Record<string, string> = {}) =>
  h(new Request('https://seller.test/api/thing', { headers }));

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

async function run() {
  console.log('\nfacilitator client\n');

  await test('reads the live facilitator’s supported kinds', async () => {
    const f = new FacilitatorClient(LIVE);
    const { kinds } = await f.supported();
    assert.ok(kinds.length > 0);
    assert.ok(kinds.some((k) => k.scheme === 'receipt'));
  });

  await test('assertSupports passes for a kind it settles', async () => {
    const f = new FacilitatorClient(LIVE);
    const kind = await f.assertSupports('receipt', 'eip155:4663');
    assert.equal(kind.scheme, 'receipt');
  });

  await test('assertSupports fails loudly for one it does not', async () => {
    const f = new FacilitatorClient(LIVE);
    await assert.rejects(() => f.assertSupports('exact', 'eip155:8453'), /does not settle/);
  });

  await test('the live facilitator rejects a payment that never happened', async () => {
    const f = new FacilitatorClient(LIVE);
    const r = await f.verify(
      { scheme: 'receipt', network: 'eip155:4663', amount: '0.01', payTo: SELLER },
      { transactionHash: '0x' + '9'.repeat(64) }
    );
    assert.equal(r.isValid, false);
  });

  await test('no payment still gets a 402 with the price', async () => {
    const s = stub(); const url = await s.start();
    const h = createPayless({ recipient: SELLER, facilitator: url }).protect(async () => new Response('ok'), '0.01');
    const res = await call(h);
    assert.equal(res.status, 402);
    assert.equal((await res.json()).payment.amount, '0.01');
    assert.equal(s.calls.length, 0, 'should not bother the facilitator with an unpaid request');
    await s.stop();
  });

  await test('receipt claims the payment before running the handler', async () => {
    // The window this closes: two concurrent requests both passing verify and
    // both being served off one payment.
    const s = stub(); const url = await s.start();
    let handlerRan = false;
    const h = createPayless({ recipient: SELLER, facilitator: url }).protect(
      async () => { handlerRan = true; return new Response('ok'); }, '0.01');
    const res = await call(h, { 'x-payment': payment });
    assert.equal(res.status, 200);
    assert.deepEqual(s.calls, ['/verify', '/settle'], 'settle must precede the handler');
    assert.ok(handlerRan);
    await s.stop();
  });

  await test('a signature scheme runs the handler before settling', async () => {
    const s = stub(); const url = await s.start();
    const order: string[] = [];
    const h = createPayless({ recipient: SELLER, facilitator: url, scheme: 'exact' }).protect(
      async () => { order.push('handler'); return new Response('ok'); }, '0.01');
    await call(h, { 'x-payment': payment });
    assert.deepEqual(s.calls, ['/verify', '/settle']);
    assert.equal(order[0], 'handler');
    await s.stop();
  });

  await test('an invalid payment never reaches the handler', async () => {
    const s = stub({ verify: { isValid: false, invalidReason: 'nope' } });
    const url = await s.start();
    let ran = false;
    const h = createPayless({ recipient: SELLER, facilitator: url }).protect(
      async () => { ran = true; return new Response('ok'); }, '0.01');
    const res = await call(h, { 'x-payment': payment });
    assert.equal(res.status, 402);
    assert.equal(ran, false);
    assert.deepEqual(s.calls, ['/verify'], 'must not try to settle what did not verify');
    await s.stop();
  });

  await test('an already-settled payment is refused before the handler runs', async () => {
    const s = stub({ settle: { success: false, errorReason: 'already settled' } });
    const url = await s.start();
    let ran = false;
    const h = createPayless({ recipient: SELLER, facilitator: url }).protect(
      async () => { ran = true; return new Response('ok'); }, '0.01');
    const res = await call(h, { 'x-payment': payment });
    assert.equal(res.status, 402);
    assert.equal(ran, false, 'served a response for a payment that could not be claimed');
    await s.stop();
  });

  await test('a broken facilitator is a 503, not a rejected payment', async () => {
    // Saying "your payment is invalid" because our dependency is down would be
    // a lie that costs the buyer money.
    const s = stub({ status: 500 }); const url = await s.start();
    const h = createPayless({ recipient: SELLER, facilitator: url }).protect(async () => new Response('ok'), '0.01');
    const res = await call(h, { 'x-payment': payment });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).retry, true);
    await s.stop();
  });

  await test('an unreachable facilitator is also a 503', async () => {
    const h = createPayless({
      recipient: SELLER,
      facilitator: { url: 'http://127.0.0.1:1', timeoutMs: 2000 },
    }).protect(async () => new Response('ok'), '0.01');
    const res = await call(h, { 'x-payment': payment });
    assert.equal(res.status, 503);
  });

  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
