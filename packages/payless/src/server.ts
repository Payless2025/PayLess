/**
 * Server side: price a route.
 *
 *   const payless = createPayless({ recipient: '0x…' });
 *   export const GET = payless.protect(handler, '0.01');
 *
 * `protect` wraps any `(Request) => Response` handler, so it works anywhere the
 * fetch API does — Next.js route handlers, Hono, Bun, Deno, Cloudflare Workers.
 *
 * The flow it enforces:
 *   1. no payment            -> 402 with the price, your address and the chain
 *   2. unmined transfer      -> 402 with `retry: true` (come back, don't re-pay)
 *   3. verified transfer     -> the hash is claimed, then your handler runs
 *   4. hash already claimed  -> 402, because one transfer buys one response
 */

import type { PublicClient } from 'viem';
import {
  DEFAULT_TOKENS,
  ROBINHOOD_CHAIN_ID,
  createChainClient,
  type PaymentToken,
} from './chain.js';
import { MemorySpentStore, type SpentStore } from './store.js';
import { verifySettlement, DEFAULT_MAX_AGE_MS } from './verify.js';
import type { Challenge, PaylessOptions, PaymentPayload } from './types.js';
import {
  FacilitatorClient,
  FacilitatorUnavailable,
  type FacilitatorPaymentRequirements,
} from './facilitator.js';

export type Handler = (req: Request, ...rest: any[]) => Promise<Response> | Response;

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export class Payless {
  readonly recipient: string;
  readonly tokens: PaymentToken[];
  readonly client: PublicClient;
  readonly store: SpentStore;
  readonly maxAgeMs: number;
  readonly facilitator?: FacilitatorClient;
  readonly scheme: string;
  private settleFirst: boolean;

  constructor(options: PaylessOptions) {
    if (!options?.recipient) {
      throw new Error('payless: `recipient` is required — a 402 has to tell the caller where to pay.');
    }
    this.recipient = options.recipient;
    this.tokens = options.tokens ?? DEFAULT_TOKENS;
    this.client = createChainClient(options.rpcUrl);
    this.store = options.store ?? new MemorySpentStore();
    this.maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
    this.scheme = options.scheme ?? 'receipt';

    if (options.facilitator) {
      this.facilitator =
        options.facilitator instanceof FacilitatorClient
          ? options.facilitator
          : new FacilitatorClient(options.facilitator as any);
    }

    // Receipt payments have already moved before the request arrives, so
    // claiming first costs the buyer nothing and closes the window where two
    // concurrent requests both pass verify and both get served. Signature
    // schemes settle money at settle time, so there the handler runs first.
    this.settleFirst = options.settleFirst ?? this.scheme === 'receipt';
  }

  /** CAIP-2, which is how x402 v2 names a network. */
  get network() {
    return `eip155:${ROBINHOOD_CHAIN_ID}`;
  }

  private requirements(price: string, resource: string): FacilitatorPaymentRequirements {
    return {
      scheme: this.scheme,
      network: this.network,
      amount: price,
      payTo: this.recipient,
      asset: this.tokens[0]?.address,
      resource,
      maxAgeMs: this.maxAgeMs,
    };
  }

  /** The 402 body advertising what this endpoint costs and how to pay it. */
  challenge(amount: string): Challenge {
    const primary = this.tokens[0];
    return {
      status: 402,
      message: 'Payment Required',
      payment: {
        amount,
        currency: primary.symbol,
        recipient: this.recipient,
        network: String(ROBINHOOD_CHAIN_ID),
        tokenAddress: primary.address,
        acceptedTokens: this.tokens.map((t) => ({
          symbol: t.symbol,
          address: t.address,
          decimals: t.decimals,
        })),
      },
    };
  }

  /** Wrap a handler so it costs `price` to call. */
  protect(handler: Handler, price: string): Handler {
    return async (req: Request, ...rest: any[]) => {
      const header = req.headers.get('x-payment');
      const pathname = (() => {
        try {
          return new URL(req.url).pathname;
        } catch {
          return req.url;
        }
      })();

      if (!header) {
        return json(this.challenge(price), 402);
      }

      let payload: PaymentPayload;
      try {
        payload = JSON.parse(header);
      } catch {
        return json({ error: 'X-Payment must be JSON' }, 400);
      }

      if (!payload.transactionHash) {
        return json(
          {
            error:
              'Missing transactionHash. Send the transfer on Robinhood Chain first, then retry with its hash.',
            ...this.challenge(price),
          },
          402
        );
      }

      if (this.facilitator) {
        return this.viaFacilitator(req, rest, handler, price, pathname, payload);
      }

      const settlement = await verifySettlement({
        client: this.client,
        txHash: payload.transactionHash,
        expectedAmount: price,
        expectedRecipient: this.recipient,
        acceptedTokens: this.tokens,
        maxAgeMs: this.maxAgeMs,
      });

      if (!settlement.valid) {
        return json(
          {
            error: settlement.error,
            ...(settlement.pending ? { pending: true, retry: true } : {}),
          },
          402
        );
      }

      // One transfer buys one response. Claim before doing any work.
      const details = settlement.details!;
      const previous = await this.store.claim(details.txHash, {
        endpoint: pathname,
        amount: details.amount,
        spentAt: Date.now(),
      });

      if (previous) {
        return json(
          { error: `Payment ${details.txHash} was already spent on ${previous.endpoint}` },
          402
        );
      }

      const response = await handler(req, ...rest);
      const out = new Response(response.body, response);
      out.headers.set('x-payment-confirmed', details.txHash);
      out.headers.set('x-payment-amount', details.amount);
      out.headers.set('x-payment-token', details.tokenSymbol);
      out.headers.set('x-payment-chain', String(ROBINHOOD_CHAIN_ID));
      return out;
    };
  }

  /**
   * The facilitator path. No RPC call, no local ledger, two HTTP calls.
   *
   * A facilitator being down is reported as 503, not 402. Telling a buyer their
   * payment is invalid because our dependency is unreachable would be a lie
   * that costs them money.
   */
  private async viaFacilitator(
    req: Request,
    rest: any[],
    handler: Handler,
    price: string,
    pathname: string,
    payload: PaymentPayload
  ): Promise<Response> {
    const requirements = this.requirements(price, pathname);
    const facilitator = this.facilitator!;

    try {
      const check = await facilitator.verify(requirements, payload);
      if (!check.isValid) {
        return json(
          { error: check.invalidReason, ...(check.retryable ? { pending: true, retry: true } : {}) },
          402
        );
      }

      // Claim before serving, when claiming takes nothing. See the constructor.
      let settled;
      if (this.settleFirst) {
        settled = await facilitator.settle(requirements, payload);
        if (!settled.success) {
          return json(
            { error: settled.errorReason, ...(settled.retryable ? { retry: true } : {}) },
            402
          );
        }
      }

      const response = await handler(req, ...rest);

      if (!this.settleFirst) {
        settled = await facilitator.settle(requirements, payload);
        if (!settled.success) {
          // The resource is already served. Surfacing this on the response
          // rather than swallowing it is the only honest option left.
          const out = new Response(response.body, response);
          out.headers.set('x-payment-settlement', 'failed');
          out.headers.set('x-payment-error', String(settled.errorReason ?? 'settlement failed').slice(0, 200));
          return out;
        }
      }

      const out = new Response(response.body, response);
      out.headers.set('x-payment-confirmed', settled?.transaction ?? '');
      out.headers.set('x-payment-amount', price);
      out.headers.set('x-payment-chain', String(ROBINHOOD_CHAIN_ID));
      out.headers.set('x-payment-facilitator', facilitator.url);
      if (check.payer) out.headers.set('x-payment-payer', check.payer);
      return out;
    } catch (error) {
      if (error instanceof FacilitatorUnavailable) {
        return json(
          {
            error: 'Payment could not be checked right now, so nothing was consumed. Retry shortly.',
            retry: true,
          },
          503
        );
      }
      throw error;
    }
  }

  /** Verify a transaction without gating a request — useful for reconciliation. */
  verify(txHash: string, amount: string, token?: string) {
    return verifySettlement({
      client: this.client,
      txHash,
      expectedAmount: amount,
      expectedRecipient: this.recipient,
      expectedToken: token,
      acceptedTokens: this.tokens,
      maxAgeMs: this.maxAgeMs,
    });
  }
}

export function createPayless(options: PaylessOptions) {
  return new Payless(options);
}
