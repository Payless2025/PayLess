/**
 * Client side: pay a 402 and retry.
 *
 * You supply a `pay` function that moves the tokens and returns the hash — the
 * SDK never sees a key, and never sends a transaction on your behalf.
 *
 *   const res = await payFor('https://api.example.com/data', {
 *     pay: async ({ to, amount, tokenAddress }) => {
 *       const hash = await walletClient.writeContract({ … });
 *       await publicClient.waitForTransactionReceipt({ hash });
 *       return hash;
 *     },
 *   });
 */

import type { Challenge } from './types.js';
import {
  chooseGasless,
  permit2TypedData,
  permitHeader,
  type AcceptedPayment,
  type Permit2TypedData,
} from './permit2.js';

export interface PayRequest {
  to: string;
  amount: string;
  currency: string;
  tokenAddress: string;
  chainId: string;
}

export interface SignRequest {
  /** Everything the payment commits to, ready to sign as-is. */
  typedData: Permit2TypedData;
  /** The option this was built from, if you want to inspect it first. */
  accept: AcceptedPayment;
  amount: string;
  currency: string;
}

export interface PayForOptions extends RequestInit {
  /**
   * Moves the money and returns the transaction hash.
   *
   * Optional when `sign` is given and the endpoint offers a gasless option,
   * but worth keeping as the fallback for endpoints that do not.
   */
  pay?: (req: PayRequest) => Promise<string>;
  /**
   * Sign an authorisation instead of sending a transaction.
   *
   * Preferred over `pay` whenever the endpoint offers it: no gas, no waiting
   * for a block, and the facilitator broadcasts on your behalf. You get typed
   * data that is ready to sign and return the signature.
   *
   *   sign: async ({ typedData }) => account.signTypedData(typedData)
   *
   * Needs one prior approve(Permit2, amount) on the token, once, ever.
   */
  sign?: (req: SignRequest) => Promise<string>;
  /** Required with `sign`: the address doing the signing. */
  owner?: string;
  /** Base units per whole token. Defaults to 6, which is USDG. */
  decimals?: number;
  /** Address the payment came from, echoed to the server for its records. */
  from?: string;
  /** How long to keep retrying while the transfer is unmined. */
  confirmTimeoutMs?: number;
  /** Refuse to pay above this, as a guard against a mispriced endpoint. */
  maxAmount?: string;
}

export class PaymentRefused extends Error {}

/**
 * Whole tokens to base units, without floating point.
 *
 * A signature commits to an exact integer, so `0.01 * 10 ** 6` rounding to
 * 9999 would produce a signature the chain rejects for reasons nobody can see.
 */
function toBaseUnits(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = String(amount).split('.');
  const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * BigInt(10) ** BigInt(decimals) + BigInt(padded || '0');
}

/**
 * Fetch a URL, paying if it answers 402.
 * Returns the paid response, or the original if no payment was required.
 */
export async function payFor(url: string, options: PayForOptions): Promise<Response> {
  const { pay, sign, owner, decimals = 6, from, confirmTimeoutMs = 60_000, maxAmount, ...init } = options;

  const first = await fetch(url, init);
  if (first.status !== 402) return first;

  const challenge = (await first.clone().json()) as Challenge;
  const p = challenge?.payment;
  if (!p?.recipient || !p?.amount) {
    throw new PaymentRefused('Endpoint returned 402 without payment details');
  }

  if (maxAmount !== undefined && parseFloat(p.amount) > parseFloat(maxAmount)) {
    throw new PaymentRefused(
      `Endpoint asked for ${p.amount} ${p.currency}, above the ${maxAmount} limit you set`
    );
  }

  // Signing beats sending whenever it is on offer: no gas, and no waiting for
  // your own transaction before the endpoint will answer.
  const gasless = sign ? chooseGasless((p as any).accepts as AcceptedPayment[]) : null;

  let header: () => string;

  if (gasless && sign) {
    if (!owner) {
      throw new PaymentRefused('`owner` is required alongside `sign` — the server recovers the signature and checks it against that address.');
    }
    const amountBaseUnits = toBaseUnits(gasless.amount, decimals);
    const typedData = permit2TypedData({
      accept: gasless,
      owner,
      amountBaseUnits,
      chainId: Number(String(p.network).replace(/^eip155:/, '')),
    });
    const signature = await sign({
      typedData,
      accept: gasless,
      amount: gasless.amount,
      currency: p.currency,
    });
    const body = permitHeader({ typed: typedData, scheme: gasless.scheme, owner, signature });
    header = () => body;
  } else {
    if (!pay) {
      throw new PaymentRefused(
        'This endpoint offers no gasless option, so `pay` is needed to send the transfer.'
      );
    }
    const txHash = await pay({
      to: p.recipient,
      amount: p.amount,
      currency: p.currency,
      tokenAddress: p.tokenAddress,
      chainId: p.network,
    });
    const body = JSON.stringify({
      transactionHash: txHash,
      from,
      to: p.recipient,
      amount: p.amount,
      token: p.currency,
      tokenAddress: p.tokenAddress,
      chainId: p.network,
    });
    header = () => body;
  }

  const started = Date.now();
  // The server refuses an unmined transfer and says so with `retry: true`.
  // That is "come back in a moment", not "pay again" — so we reuse the hash.
  for (;;) {
    const res = await fetch(url, {
      ...init,
      headers: { ...(init.headers || {}), 'X-Payment': header() },
    });

    if (res.status !== 402) return res;

    const body = await res.clone().json().catch(() => ({}));
    if (!body?.retry || Date.now() - started > confirmTimeoutMs) return res;

    await new Promise((r) => setTimeout(r, 2000));
  }
}
