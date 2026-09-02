/**
 * Which way the agent pays.
 *
 * This function decides whether money leaves as a transaction the agent signs
 * and pays gas for, or as a signature somebody else broadcasts. Choosing wrong
 * is not a crash, it is a silent extra cost on every call, so the rules are
 * worth pinning down.
 */
import assert from 'node:assert/strict';

// Mirrors the selection in server.ts. Kept here so the rules are testable
// without standing up a stdio server.
interface Accept {
  scheme: string; network: string; amount: string; payTo: string; asset?: string;
  extra?: { assetTransferMethod?: string; spender?: string; facilitator?: string; settlement?: string };
}
function gaslessOption(accepts: Accept[]): Accept | null {
  const usable = accepts.filter(
    (a) => a.extra?.assetTransferMethod === 'permit2' && a.extra?.settlement === 'live' && a.extra?.spender && a.asset
  );
  return usable.find((a) => a.scheme === 'exact') ?? usable[0] ?? null;
}

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

console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
