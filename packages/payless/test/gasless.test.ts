/**
 * Paying by signature, from the buyer's side.
 *
 * The load-bearing parts are which option gets chosen and what exactly gets
 * signed. A wrong choice is a silent extra gas fee on every call; a wrong
 * signature is rejected for reasons that are very hard to read off a revert.
 */

import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { payFor, PaymentRefused } from '../src/client.js';
import { chooseGasless, permit2TypedData, PERMIT2_ADDRESS, type AcceptedPayment } from '../src/permit2.js';

const SELLER = '0x426f8846B5011d5aCf659FE5bFBC5fdA6123f759';
const OWNER = '0x921C107eA13f252b48F54cf8151f052333394F94';
const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const SPENDER = '0x402085c248EeA27D92E8b30b2C58ed07f9E20001';

const receipt: AcceptedPayment = { scheme: 'receipt', network: 'eip155:4663', amount: '0.01', payTo: SELLER, asset: USDG, extra: { assetTransferMethod: 'receipt', settlement: 'live' } };
const exact: AcceptedPayment = { scheme: 'exact', network: 'eip155:4663', amount: '0.01', payTo: SELLER, asset: USDG, extra: { assetTransferMethod: 'permit2', settlement: 'live', spender: SPENDER } };
const upto: AcceptedPayment = { scheme: 'upto', network: 'eip155:4663', amount: '0.05', payTo: SELLER, asset: USDG, extra: { assetTransferMethod: 'permit2', settlement: 'live', spender: '0x4020A4f3b7b90ccA423B9fabCc0CE57C6C240002', facilitator: '0x758223512c9b88af3eE5985C38276C8728808129' } };

/** A seller that answers 402 once, then echoes whatever was presented. */
function seller(accepts: AcceptedPayment[]) {
  let presented: any = null;
  const server: Server = createServer((req, res) => {
    const header = req.headers['x-payment'] as string | undefined;
    if (!header) {
      res.writeHead(402, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({
        status: 402, message: 'Payment Required',
        payment: { amount: '0.01', currency: 'USDG', recipient: SELLER, network: 'eip155:4663', tokenAddress: USDG, accepts },
      }));
    }
    presented = JSON.parse(header);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  return {
    get presented() { return presented; },
    async start() { await new Promise<void>((r) => server.listen(0, r)); return `http://127.0.0.1:${(server.address() as any).port}/x`; },
    stop: () => new Promise<void>((r) => server.close(() => r())),
  };
}

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

async function run() {
  console.log('\ngasless client\n');

  await test('prefers a signature over sending a transfer', async () => {
    assert.equal(chooseGasless([receipt, exact])?.scheme, 'exact');
  });

  await test('prefers exact over upto, which grants the seller discretion', async () => {
    assert.equal(chooseGasless([upto, exact])?.scheme, 'exact');
  });

  await test('prefers upto on a metered endpoint, where exact means overpaying', async () => {
    // On a metered endpoint the advertised amount is a ceiling. Picking exact
    // there settles the ceiling on every call, which defeats the metering.
    const meteredUpto = { ...upto, extra: { ...upto.extra!, pricing: 'metered' } };
    const meteredExact = { ...exact, extra: { ...exact.extra!, pricing: 'metered' } };
    assert.equal(chooseGasless([meteredExact, meteredUpto])?.scheme, 'upto');
    // ...but only when the metered upto is actually usable.
    const dead = { ...meteredUpto, extra: { ...meteredUpto.extra, settlement: 'unconfigured' } };
    assert.equal(chooseGasless([meteredExact, dead])?.scheme, 'exact');
  });

  await test('will not sign for a facilitator that cannot settle', async () => {
    assert.equal(chooseGasless([{ ...exact, extra: { ...exact.extra!, settlement: 'unconfigured' } }]), null);
  });

  await test('will not sign an upto option that names no facilitator', async () => {
    // Nobody could settle it, so the signature would be worthless.
    const { facilitator, ...rest } = upto.extra!;
    assert.equal(chooseGasless([{ ...upto, extra: rest }]), null);
  });

  await test('binds destination, token and amount into the signed message', async () => {
    const t = permit2TypedData({ accept: exact, owner: OWNER, amountBaseUnits: BigInt(10000), chainId: 4663 });
    assert.equal(t.domain.verifyingContract, PERMIT2_ADDRESS);
    assert.equal(t.domain.chainId, 4663);
    assert.equal(t.message.witness.to, SELLER);
    assert.equal(t.message.spender, SPENDER);
    assert.equal(t.message.permitted.amount, BigInt(10000));
    assert.equal(t.types.Witness.length, 2, 'exact witness has no facilitator field');
  });

  await test('the upto witness carries the facilitator, exact does not', async () => {
    const u = permit2TypedData({ accept: upto, owner: OWNER, amountBaseUnits: BigInt(50000), chainId: 4663 });
    assert.equal(u.types.Witness.length, 3);
    assert.equal(u.message.witness.facilitator, upto.extra!.facilitator);
  });

  await test('converts amounts without floating point', async () => {
    // 0.01 * 10 ** 6 in floating point is not reliably 10000, and a signature
    // committing to 9999 fails for reasons nobody can read.
    const t = permit2TypedData({ accept: { ...exact, amount: '0.07' }, owner: OWNER, amountBaseUnits: BigInt(70000), chainId: 4663 });
    assert.equal(t.message.permitted.amount, BigInt(70000));
  });

  await test('signs and presents an authorisation end to end', async () => {
    const s = seller([receipt, exact]);
    const url = await s.start();
    let sawTypedData: any = null;
    const res = await payFor(url, {
      owner: OWNER,
      sign: async ({ typedData }) => { sawTypedData = typedData; return '0x' + 'ab'.repeat(65); },
    });
    assert.equal(res.status, 200);
    assert.ok(sawTypedData, 'sign was never called');
    assert.equal(s.presented.scheme, 'exact');
    assert.equal(s.presented.owner, OWNER);
    assert.equal(s.presented.witness.to, SELLER);
    assert.equal(s.presented.permitted.amount, '10000');
    assert.equal(s.presented.transactionHash, undefined, 'must not claim a transaction it never sent');
    await s.stop();
  });

  await test('falls back to sending when nothing gasless is offered', async () => {
    const s = seller([receipt]);
    const url = await s.start();
    let signed = false;
    const res = await payFor(url, {
      owner: OWNER,
      sign: async () => { signed = true; return '0x'; },
      pay: async () => '0x' + 'cd'.repeat(32),
    });
    assert.equal(res.status, 200);
    assert.equal(signed, false);
    assert.ok(s.presented.transactionHash);
    await s.stop();
  });

  await test('refuses clearly when it can neither sign nor send', async () => {
    const s = seller([receipt]);
    const url = await s.start();
    await assert.rejects(() => payFor(url, { owner: OWNER, sign: async () => '0x' }), PaymentRefused);
    await s.stop();
  });

  await test('refuses to sign without an owner to check the signature against', async () => {
    const s = seller([exact]);
    const url = await s.start();
    await assert.rejects(() => payFor(url, { sign: async () => '0x' }), /owner. is required/);
    await s.stop();
  });

  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
