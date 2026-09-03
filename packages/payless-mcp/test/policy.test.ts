/**
 * Session-key mode.
 *
 * The property under test: what leaves signPermit is not an authorisation by
 * itself. The blob must decode to exactly the fields the contract will judge,
 * and when the deployed contract judges them, policy must be the verdict.
 * The live half runs only when the session key file exists on this machine.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createPublicClient, http, decodeAbiParameters, hashTypedData, getAddress } from 'viem';
import { SessionWallet } from '../src/wallet.js';

const POLICY = '0xE8f98Abe2Aaca504de0Eb1B033F6B0318a8C237B';
const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const EXACT = '0x402085c248EeA27D92E8b30b2C58ed07f9E20001';
const SELLER = '0x426f8846B5011d5aCf659FE5bFBC5fdA6123f759';
const P2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
const KEY_FILE = '/tmp/sk';

let passed = 0; let skipped = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

const BLOB_TYPES = [
  { type: 'uint8' }, { type: 'address' }, { type: 'uint256' },
  { type: 'uint256' }, { type: 'uint256' }, { type: 'address' },
  { type: 'address' }, { type: 'uint256' }, { type: 'bytes' },
] as const;

function digestOf(p: any) {
  return hashTypedData({
    domain: { name: 'Permit2', chainId: 4663, verifyingContract: P2 },
    types: {
      PermitWitnessTransferFrom: [
        { name: 'permitted', type: 'TokenPermissions' }, { name: 'spender', type: 'address' },
        { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'witness', type: 'Witness' },
      ],
      TokenPermissions: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }],
      Witness: [{ name: 'to', type: 'address' }, { name: 'validAfter', type: 'uint256' }],
    } as any,
    primaryType: 'PermitWitnessTransferFrom',
    message: {
      permitted: { token: p.permitted.token, amount: BigInt(p.permitted.amount) },
      spender: EXACT, nonce: BigInt(p.nonce), deadline: BigInt(p.deadline),
      witness: { to: p.witness.to, validAfter: BigInt(p.witness.validAfter) },
    } as any,
  });
}

async function run() {
  console.log('\nsession-key mode\n');
  const haveKey = existsSync(KEY_FILE);
  const wallet = haveKey
    ? new SessionWallet(POLICY, readFileSync(KEY_FILE, 'utf8').trim())
    : null;

  await test('the payer it presents is the contract, never the key', async () => {
    const w = new SessionWallet(POLICY, '0x' + '7'.repeat(64));
    assert.equal(getAddress(w.address), getAddress(POLICY));
    assert.notEqual(getAddress(w.sessionAddress), getAddress(POLICY));
  });

  await test('the blob decodes to exactly the fields the contract will judge', async () => {
    const w = new SessionWallet(POLICY, '0x' + '7'.repeat(64));
    const p = await w.signPermit({ scheme: 'exact', token: USDG, amount: 10000n, to: SELLER, spender: EXACT });
    const [scheme, token, amount, nonce, deadline, to, facilitator, validAfter, sig] =
      decodeAbiParameters(BLOB_TYPES as any, p.signature as `0x${string}`) as any[];
    assert.equal(scheme, 0);
    assert.equal(getAddress(token), getAddress(USDG));
    assert.equal(amount, 10000n);
    assert.equal(nonce.toString(), p.nonce);
    assert.equal(deadline.toString(), p.deadline);
    assert.equal(getAddress(to), getAddress(SELLER));
    assert.equal(validAfter, 0n);
    assert.match(sig, /^0x[0-9a-f]{130}$/i);
    // The policy is applied to THESE fields. If they could drift from what was
    // signed, the digest equality in the contract is all that stands.
  });

  if (!wallet) {
    console.log('  - live contract checks skipped (no session key on this machine)');
    skipped = 2;
  } else {
    const c = createPublicClient({ transport: http('https://rpc.mainnet.chain.robinhood.com') });
    const abi = [{ name: 'isValidSignature', type: 'function', stateMutability: 'view',
      inputs: [{ name: 'h', type: 'bytes32' }, { name: 's', type: 'bytes' }], outputs: [{ name: '', type: 'bytes4' }] }] as const;

    await test('live: the deployed contract accepts an in-policy authorisation', async () => {
      const p = await wallet.signPermit({ scheme: 'exact', token: USDG, amount: 10000n, to: SELLER, spender: EXACT });
      const answer = await c.readContract({ address: POLICY, abi, functionName: 'isValidSignature',
        args: [digestOf(p), p.signature as `0x${string}`] });
      assert.equal(answer, '0x1626ba7e');
    });

    await test('live: the deployed contract refuses an over-cap one', async () => {
      const p = await wallet.signPermit({ scheme: 'exact', token: USDG, amount: 30000n, to: SELLER, spender: EXACT });
      const answer = await c.readContract({ address: POLICY, abi, functionName: 'isValidSignature',
        args: [digestOf(p), p.signature as `0x${string}`] });
      assert.equal(answer, '0xffffffff', 'the cap is the contract\'s answer, not ours');
    });
  }

  console.log(`\n${passed} passed${skipped ? `, ${skipped} skipped` : ''}${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}
run();
