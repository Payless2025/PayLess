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

export interface PayRequest {
  to: string;
  amount: string;
  currency: string;
  tokenAddress: string;
  chainId: string;
}

export interface PayForOptions extends RequestInit {
  /** Moves the money and returns the transaction hash. */
  pay: (req: PayRequest) => Promise<string>;
  /** Address the payment came from, echoed to the server for its records. */
  from?: string;
  /** How long to keep retrying while the transfer is unmined. */
  confirmTimeoutMs?: number;
  /** Refuse to pay above this, as a guard against a mispriced endpoint. */
  maxAmount?: string;
}

export class PaymentRefused extends Error {}

/**
 * Fetch a URL, paying if it answers 402.
 * Returns the paid response, or the original if no payment was required.
 */
export async function payFor(url: string, options: PayForOptions): Promise<Response> {
  const { pay, from, confirmTimeoutMs = 60_000, maxAmount, ...init } = options;

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

  const txHash = await pay({
    to: p.recipient,
    amount: p.amount,
    currency: p.currency,
    tokenAddress: p.tokenAddress,
    chainId: p.network,
  });

  const header = () =>
    JSON.stringify({
      transactionHash: txHash,
      from,
      to: p.recipient,
      amount: p.amount,
      token: p.currency,
      tokenAddress: p.tokenAddress,
      chainId: p.network,
    });

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
