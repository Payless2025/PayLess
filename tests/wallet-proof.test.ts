/**
 * Tests for wallet ownership proof.
 *
 * The property under test: a tier, a rate limit, or a delete button keyed to
 * an address is only safe if presenting that address required its key. Every
 * case here is a way someone might get the address without the key.
 */

import assert from 'node:assert/strict';
import { privateKeyToAccount } from 'viem/accounts';

process.env.PAYLESS_AUTH_SECRET = 'test-secret-that-only-tests-know';

import {
  buildChallenge,
  verifyChallenge,
  issueToken,
  checkToken,
  provenAddress,
  CHALLENGE_TTL_MS,
  TOKEN_TTL_MS,
} from '../lib/x402/wallet-proof';

const owner = privateKeyToAccount(('0x' + '2'.repeat(64)) as `0x${string}`);
const stranger = privateKeyToAccount(('0x' + '3'.repeat(64)) as `0x${string}`);

let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

async function run() {
  console.log('\nwallet proof\n');

  await test('the full round trip: challenge, sign, verify, token', async () => {
    const { message } = buildChallenge(owner.address);
    const signature = await owner.signMessage({ message });
    const proof = await verifyChallenge(message, signature);
    assert.equal(proof.ok, true);
    assert.equal(proof.address, owner.address);

    const { token } = issueToken(proof.address!);
    const checked = checkToken(token);
    assert.equal(checked.address, owner.address);
  });

  await test('a signature from the wrong key proves nothing', async () => {
    // The whole attack this closes: knowing an address is not owning it.
    const { message } = buildChallenge(owner.address);
    const signature = await stranger.signMessage({ message });
    const proof = await verifyChallenge(message, signature);
    assert.equal(proof.ok, false);
    assert.match(proof.reason!, /recovers to/);
  });

  await test('an edited timestamp breaks the MAC', async () => {
    const { message } = buildChallenge(owner.address, Date.now() - 10 * 60_000);
    const freshened = message.replace(/^Issued: .+$/m, `Issued: ${new Date().toISOString()}`);
    const signature = await owner.signMessage({ message: freshened });
    const proof = await verifyChallenge(freshened, signature);
    assert.equal(proof.ok, false);
    assert.match(proof.reason!, /not issued by this server/);
  });

  await test('a stale challenge is refused even with a valid signature', async () => {
    const issued = Date.now() - CHALLENGE_TTL_MS - 1000;
    const { message } = buildChallenge(owner.address, issued);
    const signature = await owner.signMessage({ message });
    const proof = await verifyChallenge(message, signature);
    assert.equal(proof.ok, false);
    assert.match(proof.reason!, /expired/);
  });

  await test('an arbitrary signed message is not a challenge', async () => {
    const message = 'gm, please give me whale tier';
    const signature = await owner.signMessage({ message });
    const proof = await verifyChallenge(message, signature);
    assert.equal(proof.ok, false);
  });

  await test('a tampered token fails closed', async () => {
    const { token } = issueToken(owner.address);
    const [prefix, body, mac] = token.split('.');
    const forgedBody = Buffer.from(
      JSON.stringify({ a: stranger.address, e: Date.now() + TOKEN_TTL_MS })
    ).toString('base64url');
    assert.equal(checkToken(`${prefix}.${forgedBody}.${mac}`).address, null, 'swapped address passed');
    assert.equal(checkToken(`${prefix}.${body}.${'0'.repeat(64)}`).address, null, 'forged mac passed');
    assert.equal(checkToken('plx1.zzz').address, null);
  });

  await test('an expired token is refused', async () => {
    const { token } = issueToken(owner.address, Date.now() - TOKEN_TTL_MS - 1000);
    const checked = checkToken(token);
    assert.equal(checked.address, null);
    assert.match((checked as any).reason, /expired/);
  });

  await test('provenAddress reads Bearer and x-wallet-proof, nothing else', async () => {
    const { token } = issueToken(owner.address);
    assert.equal(provenAddress(new Headers({ authorization: `Bearer ${token}` })).address, owner.address);
    assert.equal(provenAddress(new Headers({ 'x-wallet-proof': token })).address, owner.address);
    // The legacy header is a claim, not a proof, and must count for nothing.
    assert.equal(provenAddress(new Headers({ 'x-wallet-address': owner.address })).address, null);
    assert.equal(provenAddress(new Headers()).address, null);
  });

  await test('with no secret configured, nothing verifies and nothing is issued', async () => {
    const saved = process.env.PAYLESS_AUTH_SECRET;
    delete process.env.PAYLESS_AUTH_SECRET;
    try {
      assert.throws(() => buildChallenge(owner.address), /PAYLESS_AUTH_SECRET/);
      const checked = checkToken('plx1.whatever.mac');
      assert.equal(checked.address, null);
      assert.match((checked as any).reason, /not configured/);
    } finally {
      process.env.PAYLESS_AUTH_SECRET = saved;
    }
  });

  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
