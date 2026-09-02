/**
 * Tests for the exact/Permit2 scheme.
 *
 * The load-bearing claim is the digest. If what we hash differs by one byte
 * from what Permit2 hashes, every honest signature looks forged and every
 * settle reverts. So it is checked two ways: built by hand from the type
 * strings the deployed proxy exposes, and built by viem from a types object.
 * Two independent EIP-712 encoders agreeing is the strongest evidence
 * available without spending money on chain.
 */

import assert from 'node:assert/strict';
import { privateKeyToAccount } from 'viem/accounts';
import { hashTypedData, getAddress, createPublicClient, http } from 'viem';
import {
  permitDigest,
  permit2DomainSeparator,
  verifyPermit2Exact,
  verifyPermit2Upto,
  uptoDigest,
  noncePosition,
  PERMIT2_ADDRESS,
  EXACT_PROXY_ADDRESS,
  UPTO_PROXY_ADDRESS,
  WITNESS_TYPE_STRING,
  UPTO_WITNESS_TYPE_STRING,
  type Permit2Payload,
  type UptoPayload,
} from '../lib/x402/permit2';

const account = privateKeyToAccount(('0x' + '1'.repeat(64)) as `0x${string}`);
const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const SELLER = '0x426f8846B5011d5aCf659FE5bFBC5fdA6123f759';
const OTHER = '0x4fD46Ce55eA3E51b771F663bd56b3910D9f39746';
const now = () => Math.floor(Date.now() / 1000);

/** The same structure, expressed for viem's own encoder. */
const TYPES = {
  PermitWitnessTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'witness', type: 'Witness' },
  ],
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  Witness: [
    { name: 'to', type: 'address' },
    { name: 'validAfter', type: 'uint256' },
  ],
} as const;

function message(p: Permit2Payload) {
  return {
    permitted: { token: getAddress(p.permitted.token), amount: BigInt(p.permitted.amount) },
    spender: getAddress(EXACT_PROXY_ADDRESS),
    nonce: BigInt(p.nonce),
    deadline: BigInt(p.deadline),
    witness: { to: getAddress(p.witness.to), validAfter: BigInt(p.witness.validAfter) },
  };
}

function base(over: Partial<Permit2Payload> = {}): Permit2Payload {
  return {
    owner: account.address,
    permitted: { token: USDG, amount: '10000' }, // 0.01 USDG, 6 decimals
    nonce: '7',
    deadline: String(now() + 600),
    witness: { to: SELLER, validAfter: '0' },
    signature: '0x' + '0'.repeat(130),
    ...over,
  };
}

async function signed(p: Permit2Payload): Promise<Permit2Payload> {
  const signature = await account.signTypedData({
    domain: { name: 'Permit2', chainId: 4663, verifyingContract: PERMIT2_ADDRESS },
    types: TYPES as any,
    primaryType: 'PermitWitnessTransferFrom',
    message: message(p) as any,
  });
  return { ...p, signature };
}

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

async function run() {
  console.log('\nexact / Permit2\n');

  await test('our domain separator matches the deployed Permit2', async () => {
    const c = createPublicClient({ transport: http('https://rpc.mainnet.chain.robinhood.com') });
    const onchain = await c.readContract({
      address: PERMIT2_ADDRESS,
      abi: [{ name: 'DOMAIN_SEPARATOR', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bytes32' }] }],
      functionName: 'DOMAIN_SEPARATOR',
    });
    assert.equal(permit2DomainSeparator(4663), onchain);
  });

  await test('our witness type string still matches the deployed proxy', async () => {
    const c = createPublicClient({ transport: http('https://rpc.mainnet.chain.robinhood.com') });
    const onchain = await c.readContract({
      address: EXACT_PROXY_ADDRESS,
      abi: [{ name: 'WITNESS_TYPE_STRING', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] }],
      functionName: 'WITNESS_TYPE_STRING',
    });
    assert.equal(WITNESS_TYPE_STRING, onchain);
  });

  await test('hand-built digest agrees with viem’s independent encoder', async () => {
    const p = base();
    const theirs = hashTypedData({
      domain: { name: 'Permit2', chainId: 4663, verifyingContract: PERMIT2_ADDRESS },
      types: TYPES as any,
      primaryType: 'PermitWitnessTransferFrom',
      message: message(p) as any,
    });
    assert.equal(permitDigest(p), theirs);
  });

  await test('the digest changes when the destination changes', async () => {
    // If it did not, the witness would bind nothing.
    assert.notEqual(permitDigest(base()), permitDigest(base({ witness: { to: OTHER, validAfter: '0' } })));
  });

  await test('unordered nonce maps to the right bitmap position', async () => {
    assert.deepEqual(noncePosition(BigInt(0)), { word: BigInt(0), bit: BigInt(0) });
    assert.deepEqual(noncePosition(BigInt(255)), { word: BigInt(0), bit: BigInt(255) });
    assert.deepEqual(noncePosition(BigInt(256)), { word: BigInt(1), bit: BigInt(0) });
    assert.deepEqual(noncePosition(BigInt(600)), { word: BigInt(2), bit: BigInt(88) });
  });

  await test('rejects a signature that pays somebody else', async () => {
    const p = await signed(base({ witness: { to: OTHER, validAfter: '0' } }));
    const r = await verifyPermit2Exact({ payload: p, requiredAmount: '0.01', payTo: SELLER, asset: USDG });
    assert.equal(r.ok, false);
    assert.match(r.reason!, /authorises payment to/);
  });

  await test('rejects a signature for a different token', async () => {
    const p = await signed(base());
    const r = await verifyPermit2Exact({ payload: p, requiredAmount: '0.01', payTo: SELLER, asset: OTHER });
    assert.equal(r.ok, false);
    assert.match(r.reason!, /is for token/);
  });

  await test('rejects an expired signature', async () => {
    const p = await signed(base({ deadline: String(now() - 1) }));
    const r = await verifyPermit2Exact({ payload: p, requiredAmount: '0.01', payTo: SELLER, asset: USDG });
    assert.equal(r.ok, false);
    assert.match(r.reason!, /expired/);
  });

  await test('rejects a payment that is not valid yet, and says to retry', async () => {
    const p = await signed(base({ witness: { to: SELLER, validAfter: String(now() + 3600) } }));
    const r = await verifyPermit2Exact({ payload: p, requiredAmount: '0.01', payTo: SELLER, asset: USDG });
    assert.equal(r.ok, false);
    assert.equal(r.retryable, true);
  });

  await test('rejects a signature that recovers to somebody else', async () => {
    const p = await signed(base());
    const r = await verifyPermit2Exact({
      payload: { ...p, owner: OTHER },
      requiredAmount: '0.01', payTo: SELLER, asset: USDG,
    });
    assert.equal(r.ok, false);
    assert.match(r.reason!, /recovers to/);
  });

  await test('rejects a tampered amount, because the signature covers it', async () => {
    const p = await signed(base());
    const tampered = { ...p, permitted: { token: USDG, amount: '20000' } };
    const r = await verifyPermit2Exact({ payload: tampered, requiredAmount: '0.02', payTo: SELLER, asset: USDG });
    assert.equal(r.ok, false);
    assert.match(r.reason!, /recovers to/, 'changing the amount must break the signature');
  });

  await test('rejects a malformed signature without touching the network', async () => {
    const r = await verifyPermit2Exact({ payload: base({ signature: '0xabc' }), requiredAmount: '0.01', payTo: SELLER, asset: USDG });
    assert.equal(r.ok, false);
    assert.match(r.reason!, /65 bytes/);
  });

  console.log('\nupto / Permit2\n');

  const FACILITATOR = '0x758223512c9b88af3eE5985C38276C8728808129';
  const UPTO_TYPES = {
    PermitWitnessTransferFrom: [
      { name: 'permitted', type: 'TokenPermissions' },
      { name: 'spender', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'witness', type: 'Witness' },
    ],
    TokenPermissions: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    Witness: [
      { name: 'to', type: 'address' },
      { name: 'facilitator', type: 'address' },
      { name: 'validAfter', type: 'uint256' },
    ],
  } as const;

  function uptoBase(over: Partial<UptoPayload> = {}): UptoPayload {
    return {
      owner: account.address,
      permitted: { token: USDG, amount: '50000' }, // ceiling 0.05
      nonce: '11',
      deadline: String(now() + 600),
      witness: { to: SELLER, facilitator: FACILITATOR, validAfter: '0' },
      signature: '0x' + '0'.repeat(130),
      ...over,
    };
  }
  async function uptoSigned(p: UptoPayload): Promise<UptoPayload> {
    const signature = await account.signTypedData({
      domain: { name: 'Permit2', chainId: 4663, verifyingContract: PERMIT2_ADDRESS },
      types: UPTO_TYPES as any,
      primaryType: 'PermitWitnessTransferFrom',
      message: {
        permitted: { token: getAddress(p.permitted.token), amount: BigInt(p.permitted.amount) },
        spender: getAddress(UPTO_PROXY_ADDRESS),
        nonce: BigInt(p.nonce),
        deadline: BigInt(p.deadline),
        witness: {
          to: getAddress(p.witness.to),
          facilitator: getAddress(p.witness.facilitator),
          validAfter: BigInt(p.witness.validAfter),
        },
      } as any,
    });
    return { ...p, signature };
  }

  await test('our upto witness type string matches the deployed proxy', async () => {
    const c = createPublicClient({ transport: http('https://rpc.mainnet.chain.robinhood.com') });
    const onchain = await c.readContract({
      address: UPTO_PROXY_ADDRESS,
      abi: [{ name: 'WITNESS_TYPE_STRING', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] }],
      functionName: 'WITNESS_TYPE_STRING',
    });
    assert.equal(UPTO_WITNESS_TYPE_STRING, onchain);
  });

  await test('hand-built upto digest agrees with viem’s encoder', async () => {
    const p = uptoBase();
    const theirs = hashTypedData({
      domain: { name: 'Permit2', chainId: 4663, verifyingContract: PERMIT2_ADDRESS },
      types: UPTO_TYPES as any,
      primaryType: 'PermitWitnessTransferFrom',
      message: {
        permitted: { token: getAddress(p.permitted.token), amount: BigInt(p.permitted.amount) },
        spender: getAddress(UPTO_PROXY_ADDRESS),
        nonce: BigInt(p.nonce),
        deadline: BigInt(p.deadline),
        witness: { to: getAddress(p.witness.to), facilitator: getAddress(p.witness.facilitator), validAfter: BigInt(p.witness.validAfter) },
      } as any,
    });
    assert.equal(uptoDigest(p), theirs);
  });

  await test('the exact and upto digests differ for the same payment', async () => {
    // Different spender, different witness type. Signing one must never satisfy
    // the other.
    const p = uptoBase();
    assert.notEqual(uptoDigest(p), permitDigest({ ...p, witness: { to: SELLER, validAfter: '0' } } as any));
  });

  await test('refuses an authorisation that names another facilitator', async () => {
    // The proxy would revert with UnauthorizedFacilitator(); we say why instead.
    const p = await uptoSigned(uptoBase({ witness: { to: SELLER, facilitator: OTHER, validAfter: '0' } }));
    const r = await verifyPermit2Upto({ payload: p, maxAmount: '0.05', payTo: SELLER, asset: USDG, facilitator: FACILITATOR });
    assert.equal(r.ok, false);
    assert.match(r.reason!, /names .* as its facilitator/);
  });

  await test('refuses to settle above the signed ceiling', async () => {
    const p = await uptoSigned(uptoBase());
    const r = await verifyPermit2Upto({
      payload: p, maxAmount: '0.05', settlementAmount: '0.09',
      payTo: SELLER, asset: USDG, facilitator: FACILITATOR,
    });
    assert.equal(r.ok, false);
    assert.match(r.reason!, /Cannot settle/);
  });

  await test('refuses a ceiling lower than the resource may cost', async () => {
    const p = await uptoSigned(uptoBase({ permitted: { token: USDG, amount: '10000' } }));
    const r = await verifyPermit2Upto({ payload: p, maxAmount: '0.05', payTo: SELLER, asset: USDG, facilitator: FACILITATOR });
    assert.equal(r.ok, false);
    assert.match(r.reason!, /permits only/);
  });

  await test('refuses to settle zero', async () => {
    const p = await uptoSigned(uptoBase());
    const r = await verifyPermit2Upto({
      payload: p, maxAmount: '0.05', settlementAmount: '0',
      payTo: SELLER, asset: USDG, facilitator: FACILITATOR,
    });
    assert.equal(r.ok, false);
    assert.match(r.reason!, /zero/);
  });

  await test('accepts a partial amount under the ceiling', async () => {
    // Reaching the balance check means the ceiling, facilitator, signature and
    // timing all passed. The wallet is empty, so that is as far as it can go.
    const p = await uptoSigned(uptoBase());
    const r = await verifyPermit2Upto({
      payload: p, maxAmount: '0.05', settlementAmount: '0.012',
      payTo: SELLER, asset: USDG, facilitator: FACILITATOR,
    });
    assert.equal(r.ok, false);
    assert.match(r.reason!, /holds 0, needs 0.012/);
  });

  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
