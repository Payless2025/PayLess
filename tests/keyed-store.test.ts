/**
 * The store behind payment links, webhooks and streams.
 *
 * What it replaces: a bare `new Map()` per module. Correct on one long-lived
 * server, wrong on serverless — a link created by one instance was "not found"
 * on the next, and which answer you got depended on which machine picked up
 * the request. These tests pin the Map-like contract, and the honesty flag
 * that says whether the thing survives a scale-out at all.
 */

import assert from 'node:assert/strict';
import { keyedStore, setKeyedStore, isKeyedStoreShared, MemoryKeyedStore } from '../lib/x402/keyed-store';

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

interface Row { id: string; value: number }

async function run() {
  console.log('\nkeyed store\n');

  await test('put, get, delete round trip', async () => {
    const s = new MemoryKeyedStore<Row>();
    assert.equal(await s.get('a'), null);
    await s.put('a', { id: 'a', value: 1 });
    assert.deepEqual(await s.get('a'), { id: 'a', value: 1 });
    assert.equal(await s.delete('a'), true);
    assert.equal(await s.get('a'), null);
    assert.equal(await s.delete('a'), false, 'deleting twice must report the second as a miss');
  });

  await test('entries keeps ids alongside values', async () => {
    // Webhooks need this: the id is the delivery target's handle, and losing
    // the pairing would deliver to the wrong subscriber.
    const s = new MemoryKeyedStore<Row>();
    await s.put('x', { id: 'x', value: 1 });
    await s.put('y', { id: 'y', value: 2 });
    const entries = await s.entries();
    assert.deepEqual(entries.map(([k]) => k).sort(), ['x', 'y']);
    assert.equal((await s.all()).length, 2);
  });

  await test('collections do not leak into one another', async () => {
    // One Redis hash per collection. A links id colliding with a webhooks id
    // must not return the wrong object.
    setKeyedStore('links-test', new MemoryKeyedStore<Row>(), false);
    setKeyedStore('hooks-test', new MemoryKeyedStore<Row>(), false);
    await keyedStore<Row>('links-test').put('same-id', { id: 'l', value: 1 });
    await keyedStore<Row>('hooks-test').put('same-id', { id: 'h', value: 2 });
    assert.equal((await keyedStore<Row>('links-test').get('same-id'))?.id, 'l');
    assert.equal((await keyedStore<Row>('hooks-test').get('same-id'))?.id, 'h');
  });

  await test('the same collection resolves to the same store', async () => {
    // Built lazily and cached on globalThis, because Next.js compiles some
    // entrypoints into their own bundle and `next start` forks a worker: a
    // module-level singleton exists more than once, a global does not.
    setKeyedStore('stable', new MemoryKeyedStore<Row>(), false);
    await keyedStore<Row>('stable').put('k', { id: 'k', value: 9 });
    assert.equal((await keyedStore<Row>('stable').get('k'))?.value, 9);
  });

  await test('reports honestly whether it survives a scale-out', async () => {
    setKeyedStore('honest', new MemoryKeyedStore<Row>(), false);
    assert.equal(isKeyedStoreShared('honest'), false);
    setKeyedStore('honest', new MemoryKeyedStore<Row>(), true);
    assert.equal(isKeyedStoreShared('honest'), true);
  });

  await test('without Upstash credentials it falls back rather than throwing', async () => {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    try {
      const s = keyedStore<Row>('fallback-' + Date.now());
      await s.put('a', { id: 'a', value: 1 });
      assert.deepEqual(await s.get('a'), { id: 'a', value: 1 });
    } finally {
      if (url) process.env.UPSTASH_REDIS_REST_URL = url;
      if (token) process.env.UPSTASH_REDIS_REST_TOKEN = token;
    }
  });

  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
