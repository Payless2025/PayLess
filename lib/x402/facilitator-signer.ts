/**
 * The key that puts somebody else's signature on chain.
 *
 * In the Permit2 flow the buyer signs and sends nothing. Someone has to call
 * `proxy.settle(...)`, and on an EVM chain every call is a transaction signed
 * by an account that pays its gas. That account is this one.
 *
 * What it can do is narrow, and narrow by construction rather than by promise:
 *
 *   - It cannot redirect the money. The proxy takes the transfer destination
 *     from the signed witness, so changing it invalidates the signature.
 *   - It cannot change the amount. `exact` moves permit.permitted.amount, which
 *     is also inside the signature.
 *   - It cannot touch a wallet that has not already authorised a payment.
 *
 * Stolen, it costs us the ETH in it, plus the nuisance of somebody broadcasting
 * authorisations that people had already agreed to. So keep only gas here.
 *
 * On double-settling: Permit2's nonce bitmap is the authority, and a second
 * settle of the same nonce reverts on chain. That makes this much simpler than
 * the subscription collector, which had to persist a hash before awaiting a
 * receipt. Here an unknown outcome is resolved by asking the chain whether the
 * nonce is spent, which is a question the chain can always answer.
 */

import { createPublicClient, createWalletClient, http, getAddress, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ROBINHOOD_RPC_URL, ROBINHOOD_CHAIN_ID } from '../chains/config';
import { EXACT_PROXY_ADDRESS, UPTO_PROXY_ADDRESS, type Permit2Payload, type UptoPayload } from './permit2';

export const EXACT_PROXY_ABI = [
  {
    name: 'settle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'permit',
        type: 'tuple',
        components: [
          {
            name: 'permitted',
            type: 'tuple',
            components: [
              { name: 'token', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
          },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      { name: 'owner', type: 'address' },
      {
        name: 'witness',
        type: 'tuple',
        components: [
          { name: 'to', type: 'address' },
          { name: 'validAfter', type: 'uint256' },
        ],
      },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

/**
 * The upto proxy's settle, which takes the amount as a separate argument
 * because the whole point of the scheme is that it is not known at signing.
 */
export const UPTO_PROXY_ABI = [
  {
    name: 'settle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'permit',
        type: 'tuple',
        components: [
          {
            name: 'permitted',
            type: 'tuple',
            components: [
              { name: 'token', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
          },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      { name: 'settlementAmount', type: 'uint256' },
      { name: 'owner', type: 'address' },
      {
        name: 'witness',
        type: 'tuple',
        components: [
          { name: 'to', type: 'address' },
          { name: 'facilitator', type: 'address' },
          { name: 'validAfter', type: 'uint256' },
        ],
      },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

const CHAIN: Chain = {
  id: Number(ROBINHOOD_CHAIN_ID),
  name: 'Robinhood Chain',
  network: 'robinhood',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [ROBINHOOD_RPC_URL] }, public: { http: [ROBINHOOD_RPC_URL] } },
} as Chain;

export interface BroadcastResult {
  status: 'settled' | 'failed' | 'in-flight';
  txHash?: string;
  error?: string;
}

export class FacilitatorSigner {
  readonly address: `0x${string}`;
  private account;
  private pub;
  private wallet;

  constructor(privateKey: string, rpcUrl: string = ROBINHOOD_RPC_URL) {
    const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error('PAYLESS_FACILITATOR_PRIVATE_KEY must be a 32-byte hex private key.');
    }
    this.account = privateKeyToAccount(key as `0x${string}`);
    this.address = this.account.address;
    const transport = http(rpcUrl);
    this.pub = createPublicClient({ chain: CHAIN, transport });
    this.wallet = createWalletClient({ account: this.account, chain: CHAIN, transport });
  }

  async gasBalance(): Promise<bigint> {
    return this.pub.getBalance({ address: this.address });
  }

  /**
   * Put the authorisation on chain.
   *
   * Simulated first. A settle that would revert is better caught before it
   * costs gas, and simulation returns the proxy's own error rather than an
   * opaque failed receipt.
   */
  async settleExact(payload: Permit2Payload): Promise<BroadcastResult> {
    const args = [
      {
        permitted: {
          token: getAddress(payload.permitted.token),
          amount: BigInt(payload.permitted.amount),
        },
        nonce: BigInt(payload.nonce),
        deadline: BigInt(payload.deadline),
      },
      getAddress(payload.owner),
      {
        to: getAddress(payload.witness.to),
        validAfter: BigInt(payload.witness.validAfter),
      },
      payload.signature as `0x${string}`,
    ] as const;

    try {
      await this.pub.simulateContract({
        address: EXACT_PROXY_ADDRESS,
        abi: EXACT_PROXY_ABI,
        functionName: 'settle',
        args: args as any,
        account: this.account,
      });
    } catch (error) {
      return {
        status: 'failed',
        error: `Settlement would revert: ${shortReason(error)}`,
      };
    }

    let txHash: `0x${string}`;
    try {
      txHash = await this.wallet.writeContract({
        address: EXACT_PROXY_ADDRESS,
        abi: EXACT_PROXY_ABI,
        functionName: 'settle',
        args: args as any,
      });
    } catch (error) {
      // Nothing was broadcast, so nothing can be in flight.
      return { status: 'failed', error: shortReason(error) };
    }

    try {
      const receipt = await this.pub.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
      if (receipt.status !== 'success') {
        return { status: 'failed', txHash, error: 'Settlement reverted on chain.' };
      }
      return { status: 'settled', txHash };
    } catch {
      // Broadcast but unconfirmed. Reported with the hash; whether it landed is
      // answerable later from the Permit2 nonce bitmap.
      return { status: 'in-flight', txHash, error: 'Broadcast, but the receipt was not seen in time.' };
    }
  }

  /**
   * Settle at an amount the seller chose after doing the work.
   *
   * The proxy checks two things we cannot fake: the amount must not exceed the
   * signed ceiling, and msg.sender must be the facilitator named in the
   * witness. So an authorisation written for somebody else is unusable here,
   * and over-charging is impossible rather than merely discouraged.
   */
  async settleUpto(payload: UptoPayload, settlementAmount: bigint): Promise<BroadcastResult> {
    const args = [
      {
        permitted: {
          token: getAddress(payload.permitted.token),
          amount: BigInt(payload.permitted.amount),
        },
        nonce: BigInt(payload.nonce),
        deadline: BigInt(payload.deadline),
      },
      settlementAmount,
      getAddress(payload.owner),
      {
        to: getAddress(payload.witness.to),
        facilitator: getAddress(payload.witness.facilitator),
        validAfter: BigInt(payload.witness.validAfter),
      },
      payload.signature as `0x${string}`,
    ] as const;

    try {
      await this.pub.simulateContract({
        address: UPTO_PROXY_ADDRESS,
        abi: UPTO_PROXY_ABI,
        functionName: 'settle',
        args: args as any,
        account: this.account,
      });
    } catch (error) {
      return { status: 'failed', error: `Settlement would revert: ${shortReason(error)}` };
    }

    let txHash: `0x${string}`;
    try {
      txHash = await this.wallet.writeContract({
        address: UPTO_PROXY_ADDRESS,
        abi: UPTO_PROXY_ABI,
        functionName: 'settle',
        args: args as any,
      });
    } catch (error) {
      return { status: 'failed', error: shortReason(error) };
    }

    try {
      const receipt = await this.pub.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
      if (receipt.status !== 'success') {
        return { status: 'failed', txHash, error: 'Settlement reverted on chain.' };
      }
      return { status: 'settled', txHash };
    } catch {
      return { status: 'in-flight', txHash, error: 'Broadcast, but the receipt was not seen in time.' };
    }
  }
}

function shortReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  // viem errors carry a useful first line and a long tail of request detail.
  const named = /(InvalidDestination|PaymentTooEarly|InvalidAmount|InvalidOwner|InvalidSigner|InvalidNonce|SignatureExpired|TransferFromFailed|UnauthorizedFacilitator|AmountExceedsPermitted)/.exec(message);
  if (named) return named[1];
  return message.split('\n')[0].slice(0, 200);
}

/** Null when no key is configured, which is a supported state rather than an error. */
export function signerFromEnv(env = process.env): FacilitatorSigner | null {
  const key = env.PAYLESS_FACILITATOR_PRIVATE_KEY;
  if (!key) return null;
  try {
    return new FacilitatorSigner(key, env.ROBINHOOD_RPC_URL || ROBINHOOD_RPC_URL);
  } catch (error) {
    console.error('[facilitator] signing key rejected:', error);
    return null;
  }
}
