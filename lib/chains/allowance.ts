/**
 * ERC-20 allowance reads on Robinhood Chain.
 *
 * An allowance is what replaces the card on file. The payer calls `approve` once
 * and that approval lives in their own wallet state — not in our database. They
 * revoke it with `approve(0)` whenever they like, without asking us, without an
 * account to close and without anyone to email.
 *
 * That asymmetry is the point: we can never take more than was approved, and we
 * can never stop them from taking the approval away.
 */

import { formatUnits, getAddress } from 'viem';
import { chainClient, withRpcRetry } from './reader';

const ALLOWANCE_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export interface AllowanceReading {
  token: `0x${string}`;
  owner: `0x${string}`;
  spender: `0x${string}`;
  decimals: number;
  /** Approved amount, in base units */
  raw: string;
  /** Approved amount, in whole tokens */
  allowance: string;
  /** What the payer actually holds — an allowance over an empty wallet is worthless */
  balanceRaw: string;
  balance: string;
  /** min(allowance, balance): what could actually be collected right now */
  collectableRaw: string;
  collectable: string;
}

export async function readAllowance(params: {
  token: `0x${string}`;
  owner: `0x${string}`;
  spender: `0x${string}`;
}): Promise<AllowanceReading> {
  const token = getAddress(params.token);
  const owner = getAddress(params.owner);
  const spender = getAddress(params.spender);
  const rpc = chainClient();

  const [rawAllowance, rawBalance, rawDecimals] = await Promise.all([
    withRpcRetry(() =>
      rpc.readContract({ address: token, abi: ALLOWANCE_ABI, functionName: 'allowance', args: [owner, spender] })
    ),
    withRpcRetry(() =>
      rpc.readContract({ address: token, abi: ALLOWANCE_ABI, functionName: 'balanceOf', args: [owner] })
    ),
    withRpcRetry(() =>
      rpc.readContract({ address: token, abi: ALLOWANCE_ABI, functionName: 'decimals' })
    ),
  ]);

  const allowance = rawAllowance as bigint;
  const balance = rawBalance as bigint;
  const decimals = Number(rawDecimals);
  const collectable = allowance < balance ? allowance : balance;

  return {
    token,
    owner,
    spender,
    decimals,
    raw: allowance.toString(),
    allowance: formatUnits(allowance, decimals),
    balanceRaw: balance.toString(),
    balance: formatUnits(balance, decimals),
    collectableRaw: collectable.toString(),
    collectable: formatUnits(collectable, decimals),
  };
}
