/**
 * Regression tests for two holes found in review.
 *
 * Both were the kind that leave everything looking fine: the types check, the
 * tests pass, and the endpoint quietly stops charging.
 */

import assert from 'node:assert/strict';
import { demoPaymentsEnabled } from '../lib/x402/middleware';
import { replayKey } from '../lib/x402/facilitator';

let passed = 0;
function test(name: string, fn: () => void) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

console.log('\nsecurity regressions\n');

test('production ignores ENABLE_DEMO_PAYMENTS entirely', () => {
  // Demo mode verifies neither the signature nor the chain, and claims no
  // transaction hash, so a single header would open every paid endpoint
  // forever. One environment variable must not be able to do that.
  assert.equal(demoPaymentsEnabled({ NODE_ENV: 'production', ENABLE_DEMO_PAYMENTS: 'true' } as any), false);
  assert.equal(demoPaymentsEnabled({ NODE_ENV: 'production', ENABLE_DEMO_PAYMENTS: '1' } as any), false);
  assert.equal(demoPaymentsEnabled({ NODE_ENV: 'production' } as any), false);
});

test('demo mode still works locally, where it is for', () => {
  assert.equal(demoPaymentsEnabled({ NODE_ENV: 'development', ENABLE_DEMO_PAYMENTS: 'true' } as any), true);
  assert.equal(demoPaymentsEnabled({ NODE_ENV: 'development' } as any), false);
});

test('the shipped example does not turn demo mode on', () => {
  const example = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', '.env.example'), 'utf8'
  );
  assert.ok(!/^\s*ENABLE_DEMO_PAYMENTS\s*=\s*true/m.test(example),
    '.env.example ships demo payments enabled');
});

test('the replay key is keyed by recipient, not by hash alone', () => {
  // Keyed by hash alone, one transfer paying two sellers would let whichever
  // asked first lock the other out of money genuinely sent to them.
  const hash = '0x' + 'a'.repeat(64);
  assert.notEqual(replayKey(hash, '0xAAA'), replayKey(hash, '0xBBB'));
  assert.ok(replayKey(hash, '0xAaA').includes('0xaaa'), 'must normalise case');
});

test('both payment paths derive the key the same way', () => {
  // The bug this guards: the middleware claimed bare transaction hashes while
  // the facilitator claimed hash:recipient. Same store, two key spaces, so a
  // receipt consumed through one path was still spendable through the other.
  const fs = require('node:fs');
  const path = require('node:path');
  const middleware = fs.readFileSync(path.join(__dirname, '..', 'lib/x402/middleware.ts'), 'utf8');
  assert.ok(
    /claimSettlement\(\s*replayKey\(/.test(middleware),
    'middleware must claim through replayKey, not a bare transaction hash'
  );
});

console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
