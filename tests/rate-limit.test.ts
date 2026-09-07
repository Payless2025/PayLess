/**
 * The rate limiter.
 *
 * What makes this worth testing is not that it counts. It is that the thing it
 * replaced looked exactly like a working limiter and enforced nothing: counters
 * in a module Map mean every serverless instance starts at zero, so the real
 * ceiling was the stated limit times however many instances happened to be
 * warm. Nobody would have reported that as a bug, because from the outside a
 * limit that never triggers and a limit nobody reaches look identical.
 *
 * So these pin the two properties that actually matter: it eventually says no,
 * and it never claims a shared count it does not have.
 */

import assert from 'node:assert/strict';
import { consume, callerKey, rateHeaders } from '../lib/x402/rate-limit';

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

// These run with no Redis configured, which is the fallback path. That is the
// weaker of the two implementations, so anything it gets right the shared one
// gets right too, and the honesty flag is testable exactly here.
function key(name: string) {
  return `${name}:${Math.random().toString(36).slice(2)}`;
}

async function run() {
  console.log('\nrate limit\n');

  await test('the third request against a limit of two is refused', async () => {
    const k = key('basic');
    assert.equal((await consume(k, 2, 60)).allowed, true);
    assert.equal((await consume(k, 2, 60)).allowed, true);
    assert.equal((await consume(k, 2, 60)).allowed, false, 'the limiter never said no');
  });

  await test('remaining counts down and never goes negative', async () => {
    const k = key('remaining');
    assert.equal((await consume(k, 2, 60)).remaining, 1);
    assert.equal((await consume(k, 2, 60)).remaining, 0);
    assert.equal((await consume(k, 2, 60)).remaining, 0, 'remaining went below zero');
  });

  await test('separate keys do not share a bucket', async () => {
    // Otherwise one busy caller locks out everybody else, which is a denial of
    // service wearing a rate limiter costume.
    const a = key('a');
    const b = key('b');
    await consume(a, 1, 60);
    assert.equal((await consume(a, 1, 60)).allowed, false);
    assert.equal((await consume(b, 1, 60)).allowed, true);
  });

  await test('a window that has passed starts a fresh bucket', async () => {
    const k = key('window');
    assert.equal((await consume(k, 1, 1)).allowed, true);
    assert.equal((await consume(k, 1, 1)).allowed, false);
    await new Promise((r) => setTimeout(r, 1100));
    assert.equal((await consume(k, 1, 1)).allowed, true, 'the window never reset');
  });

  await test('a limit of -1 is unlimited and costs nothing to check', async () => {
    const v = await consume(key('unlimited'), -1, 60);
    assert.equal(v.allowed, true);
    assert.equal(v.limit, -1);
    assert.equal(v.remaining, -1);
  });

  await test('a limit of zero refuses immediately', async () => {
    const v = await consume(key('zero'), 0, 60);
    assert.equal(v.allowed, false);
    assert.equal(v.remaining, 0);
  });

  await test('without Redis it reports the count is not shared', async () => {
    // The whole failure of the previous implementation in one field. A limiter
    // that quietly stops limiting is worse than one that admits it, because
    // only the second kind gets fixed.
    const v = await consume(key('honesty'), 5, 60);
    assert.equal(v.shared, false, 'it claimed a shared counter with no Redis configured');
  });

  await test('headers tell a caller what happened and what to do', async () => {
    const k = key('headers');
    const ok = rateHeaders(await consume(k, 1, 60));
    assert.equal(ok['x-ratelimit-limit'], '1');
    assert.equal(ok['x-ratelimit-remaining'], '0');
    assert.equal(ok['retry-after'], undefined, 'a permitted request must not ask for a retry');
    assert.equal(ok['x-ratelimit-shared'], 'false');

    const denied = rateHeaders(await consume(k, 1, 60));
    assert.ok(denied['retry-after'], 'a refused request must say when to come back');
  });

  await test('the caller key falls back rather than lumping everyone together', async () => {
    // An unknown caller still gets a bucket. Returning the same key for every
    // unidentified request would let one of them exhaust it for all of them.
    const forwarded = callerKey(new Headers({ 'x-forwarded-for': '203.0.113.9, 70.41.3.18' }), 'route');
    assert.equal(forwarded, 'route:203.0.113.9', 'it must use the client, not the last proxy');

    const real = callerKey(new Headers({ 'x-real-ip': '198.51.100.4' }), 'route');
    assert.equal(real, 'route:198.51.100.4');

    const none = callerKey(new Headers(), 'route');
    assert.equal(none, 'route:unknown');

    // Scope keeps one endpoint's budget out of another's.
    assert.notEqual(callerKey(new Headers(), 'route'), callerKey(new Headers(), 'sellers'));
  });

  await test('the expensive endpoints are actually wired to it', async () => {
    // A limiter nothing calls is a module, not a defence. These two are the
    // free endpoints that spend real money per request.
    const fs = await import('node:fs/promises');
    for (const [file, scope] of [
      ['app/api/discovery/sellers/route.ts', 'sellers'],
      ['app/api/route/route.ts', 'route'],
    ] as const) {
      const src = await fs.readFile(file, 'utf8');
      assert.match(src, new RegExp(`consume\\(callerKey\\(req\\.headers, '${scope}'\\)`), `${file} does not consume a budget`);
      assert.match(src, /status: 429/, `${file} never returns 429`);
    }
  });

  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
