/**
 * Which way the agent pays.
 *
 * This function decides whether money leaves as a transaction the agent signs
 * and pays gas for, or as a signature somebody else broadcasts. Choosing wrong
 * is not a crash, it is a silent extra cost on every call, so the rules are
 * worth pinning down.
 */
import assert from 'node:assert/strict';

import { gaslessOption, toBaseUnits, type Accept } from '../src/select.js';

const receipt: Accept = { scheme: 'receipt', network: 'eip155:4663', amount: '0.01', payTo: '0xA', asset: '0xT', extra: { assetTransferMethod: 'receipt', settlement: 'live' } };
const exact: Accept = { scheme: 'exact', network: 'eip155:4663', amount: '0.01', payTo: '0xA', asset: '0xT', extra: { assetTransferMethod: 'permit2', settlement: 'live', spender: '0xS' } };
const upto: Accept = { scheme: 'upto', network: 'eip155:4663', amount: '0.01', payTo: '0xA', asset: '0xT', extra: { assetTransferMethod: 'permit2', settlement: 'live', spender: '0xU', facilitator: '0xF' } };

let passed = 0;
function test(name: string, fn: () => void) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

console.log('\ngasless selection\n');

test('falls back to sending a transfer when nothing gasless is offered', () => {
  assert.equal(gaslessOption([receipt]), null);
});

test('prefers a signature over a transfer', () => {
  assert.equal(gaslessOption([receipt, exact])?.scheme, 'exact');
});

test('prefers exact over upto, because upto hands the seller discretion', () => {
  assert.equal(gaslessOption([upto, exact])?.scheme, 'exact');
});

test('takes upto when it is the only gasless option', () => {
  assert.equal(gaslessOption([receipt, upto])?.scheme, 'upto');
});

test('will not sign for a facilitator that cannot settle', () => {
  // settlement: unconfigured means no signing key at the other end. Signing
  // there produces an authorisation nobody can use.
  const dead = { ...exact, extra: { ...exact.extra!, settlement: 'unconfigured' } };
  assert.equal(gaslessOption([dead]), null);
});

test('will not sign without a spender to pin', () => {
  // Without a spender there is nothing binding the destination, which is the
  // whole reason the proxy exists.
  const loose = { ...exact, extra: { ...exact.extra!, spender: undefined } };
  assert.equal(gaslessOption([loose]), null);
});

test('will not sign without an asset', () => {
  assert.equal(gaslessOption([{ ...exact, asset: undefined }]), null);
});

test('prefers upto on a metered endpoint, where exact means overpaying', () => {
  const meteredUpto = { ...upto, extra: { ...upto.extra!, pricing: 'metered' } };
  const meteredExact = { ...exact, extra: { ...exact.extra!, pricing: 'metered' } };
  assert.equal(gaslessOption([meteredExact, meteredUpto])?.scheme, 'upto');
});

test('base-unit conversion never goes through floating point', () => {
  assert.equal(toBaseUnits('0.007', 6), 7000n);
  assert.equal(toBaseUnits('0.05', 6), 50000n);
  assert.equal(toBaseUnits('1', 6), 1000000n);
  assert.equal(toBaseUnits('0.1234567', 6), 123456n); // fazlası sessizce kırpılır
});

console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
