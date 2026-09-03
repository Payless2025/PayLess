/**
 * A live agent that spends from a policy wallet, on stage.
 *
 * This is the demo the whole stack was built toward: an autonomous buyer that
 * holds only a session key, reads a metered endpoint, pays for what it got,
 * and cannot exceed the cap the chain enforces on it. Every claim on the page
 * is a transaction hash away from being checked.
 *
 * It runs server-side because the session key must not reach a browser. That
 * the key CAN sit on a server without much fear is the point of the design:
 * the most a leaked session key spends is the contract's float, within policy,
 * until one revocation ends it. The float is small on purpose, and when it is
 * gone the agent says so rather than pretending. An empty wallet mid-stage is
 * not a bug in the demo, it is the demo.
 */

import { sign } from 'viem/accounts';
import {
  createPublicClient,
  http,
  getAddress,
  formatUnits,
  hashTypedData,
  type Hex,
} from 'viem';
import { policyWalletBlob, PERMIT2_ADDRESS } from '../x402/permit2';
import { ROBINHOOD_RPC_URL, ROBINHOOD_CHAIN_ID, USDG_ADDRESS } from '../chains/config';

const RWA_ENDPOINT = 'https://www.payless.network/api/rwa/transfers?symbol=NVDA&limit=5';

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

const POLICY_ABI = [
  { name: 'maxPerCall', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;
const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export interface AgentTick {
  ok: boolean;
  step: string;
  detail: string;
  scheme?: string;
  ceiling?: string;
  charged?: string;
  rows?: number;
  txHash?: string;
  explorer?: string;
  floatUSDG?: string;
  capUSDG?: string;
  at: string;
}

function config() {
  const wallet = process.env.PAYLESS_POLICY_WALLET;
  const key = process.env.PAYLESS_SESSION_KEY;
  if (!wallet || !key) return null;
  return {
    wallet: getAddress(wallet as `0x${string}`),
    key: (key.startsWith('0x') ? key : `0x${key}`) as Hex,
  };
}

export function agentConfigured(): boolean {
  return config() !== null;
}

function client() {
  return createPublicClient({ transport: http(ROBINHOOD_RPC_URL) });
}

/** Read the wallet's float and its per-call cap, both from the chain. */
export async function agentState() {
  const cfg = config();
  if (!cfg) return { configured: false, policyWallet: null, floatUSDG: '0', capUSDG: '0' };
  const c = client();
  const [float, cap] = await Promise.all([
    c.readContract({ address: USDG_ADDRESS as `0x${string}`, abi: ERC20_ABI, functionName: 'balanceOf', args: [cfg.wallet] }) as Promise<bigint>,
    (c.readContract({ address: cfg.wallet, abi: POLICY_ABI, functionName: 'maxPerCall' }) as Promise<bigint>).catch(() => BigInt(0)),
  ]);
  return {
    configured: true,
    policyWallet: cfg.wallet,
    floatUSDG: formatUnits(float, 6),
    capUSDG: formatUnits(cap, 6),
  };
}

/** viem v1 sign() returns {r,s,v}; the contract wants a packed 65-byte hex. */
function packSignature(r: Hex, s: Hex, v: bigint | number): Hex {
  const vByte = Number(v) === 27 || Number(v) === 0 ? '1b' : '1c';
  return (r + s.slice(2) + vByte) as Hex;
}

/**
 * One turn of the loop: read the endpoint, pay for the result, report both.
 *
 * The signing here mirrors the MCP SessionWallet exactly (same digest, same
 * blob) because the contract only accepts what it was built to accept, and two
 * producers of that blob had better agree.
 */
export async function runAgentTick(): Promise<AgentTick> {
  const now = () => new Date().toISOString();
  const cfg = config();
  if (!cfg) {
    return { ok: false, step: 'config', detail: 'Agent not configured on this server.', at: now() };
  }

  const before = await agentState();

  const challenge = await fetch(RWA_ENDPOINT).then((r) => r.json()).catch(() => null);
  const accepts: any[] = challenge?.payment?.accepts ?? [];
  const upto = accepts.find(
    (a) => a.scheme === 'upto' && a.extra?.assetTransferMethod === 'permit2' && a.extra?.settlement === 'live'
  );
  if (!upto) {
    return { ok: false, step: 'quote', detail: 'The endpoint offered no live upto scheme.', ...before, at: now() };
  }

  const asset = getAddress(upto.asset as `0x${string}`);
  const ceiling = BigInt(Math.round(Number(upto.amount) * 1e6));

  const nonce = BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const digest = hashTypedData({
    domain: { name: 'Permit2', chainId: Number(ROBINHOOD_CHAIN_ID), verifyingContract: PERMIT2_ADDRESS },
    types: UPTO_TYPES as any,
    primaryType: 'PermitWitnessTransferFrom',
    message: {
      permitted: { token: asset, amount: ceiling },
      spender: getAddress(upto.extra.spender),
      nonce,
      deadline,
      witness: {
        to: getAddress(upto.payTo),
        facilitator: getAddress(upto.extra.facilitator),
        validAfter: BigInt(0),
      },
    } as any,
  });

  const { r, s, v } = await sign({ hash: digest, privateKey: cfg.key });
  const sessionSig = packSignature(r as Hex, s as Hex, v as bigint);

  const blob = policyWalletBlob({
    scheme: 'upto',
    token: asset,
    amount: ceiling.toString(),
    nonce: nonce.toString(),
    deadline: deadline.toString(),
    to: upto.payTo,
    facilitator: upto.extra.facilitator,
    validAfter: '0',
    sessionSignature: sessionSig,
  });

  const payload = {
    scheme: 'upto',
    owner: cfg.wallet,
    permitted: { token: asset, amount: ceiling.toString() },
    nonce: nonce.toString(),
    deadline: deadline.toString(),
    witness: {
      to: getAddress(upto.payTo),
      facilitator: getAddress(upto.extra.facilitator),
      validAfter: '0',
    },
    signature: blob,
  };

  const res = await fetch(RWA_ENDPOINT, { headers: { 'X-Payment': JSON.stringify(payload) } });
  const settledAmount = res.headers.get('x-payment-settled-amount') || undefined;
  const txHash = res.headers.get('x-payment-confirmed') || undefined;
  const settlementFailed = res.headers.get('x-payment-settlement') === 'failed';

  if (res.status !== 200 || settlementFailed) {
    const body = await res.json().catch(() => ({}));
    return {
      ok: false,
      step: 'pay',
      detail: settlementFailed
        ? res.headers.get('x-payment-error') || 'Settlement was refused.'
        : (body as any)?.error || `The endpoint answered ${res.status}.`,
      scheme: 'upto',
      ceiling: formatUnits(ceiling, 6),
      ...before,
      at: now(),
    };
  }

  const data = await res.json();
  const after = await agentState();
  return {
    ok: true,
    step: 'read+paid',
    detail: `Bought NVDA transfer history: ${data?.data?.count ?? '?'} rows. Signed a ceiling of ${formatUnits(ceiling, 6)}, charged what it cost.`,
    scheme: 'upto',
    ceiling: formatUnits(ceiling, 6),
    charged: settledAmount,
    rows: data?.data?.count,
    txHash,
    explorer: txHash ? `https://robinhoodchain.blockscout.com/tx/${txHash}` : undefined,
    ...after,
    at: now(),
  };
}
