/**
 * Talking to a facilitator.
 *
 * Without one, a seller has to become a blockchain company: an RPC endpoint,
 * log decoding, token decimals, a freshness policy and a replay ledger, all to
 * sell one response for a cent. A facilitator absorbs that. The seller makes
 * two HTTP calls and never touches a chain.
 *
 *   POST /verify   before serving: is this payment good?
 *   POST /settle   after serving:  consume it so it cannot be reused
 *
 * On the order of those two, which is not as obvious as it looks.
 *
 * The x402 convention is verify-then-serve-then-settle, and for signature-based
 * schemes that is clearly right: settle actually moves the money, so taking it
 * before you know the response rendered would be charging for nothing.
 *
 * For the receipt scheme the money has *already* moved before the request is
 * made. Settling only claims it. Claiming after serving leaves a window where
 * two concurrent requests both pass verify, both get served, and only one
 * settles — one payment, two responses. Claiming first closes that window and
 * costs nothing, because there is no payment left to take.
 *
 * So the default is scheme-dependent, and `settleFirst` overrides it when a
 * seller knows better than this rule for their own endpoint.
 */

export interface FacilitatorPaymentRequirements {
  scheme: string;
  network: string;
  amount: string;
  payTo: string;
  asset?: string;
  resource?: string;
  maxAgeMs?: number;
}

export interface FacilitatorVerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  /** The payer should try again rather than pay again. */
  retryable?: boolean;
  payer?: string;
  settlement?: Record<string, unknown>;
}

export interface FacilitatorSettleResponse {
  success: boolean;
  errorReason?: string;
  retryable?: boolean;
  transaction?: string;
  network?: string;
  payer?: string;
}

export interface FacilitatorKind {
  x402Version: number;
  scheme: string;
  network: string;
  extra?: Record<string, unknown>;
}

export interface FacilitatorOptions {
  /** Base URL, with or without a trailing slash. */
  url: string;
  /** Applied to every call. Defaults to 30 seconds. */
  timeoutMs?: number;
  /** Extra headers, if the facilitator you use wants an API key. */
  headers?: Record<string, string>;
}

/** Raised when the facilitator itself fails, as distinct from a bad payment. */
export class FacilitatorUnavailable extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'FacilitatorUnavailable';
  }
}

export class FacilitatorClient {
  readonly url: string;
  private timeoutMs: number;
  private headers: Record<string, string>;

  constructor(options: FacilitatorOptions | string) {
    const opts = typeof options === 'string' ? { url: options } : options;
    if (!opts?.url) throw new Error('payless: a facilitator needs a `url`.');
    this.url = opts.url.replace(/\/+$/, '');
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.headers = opts.headers ?? {};
  }

  private async call<T>(path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.url}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...this.headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });

      // A bad payment is answered with 200 and isValid:false. A non-2xx means
      // the facilitator is broken, which is a different problem and must not be
      // reported to the buyer as "your payment is invalid".
      if (!res.ok) {
        throw new FacilitatorUnavailable(`facilitator returned ${res.status} for ${path}`);
      }
      return (await res.json()) as T;
    } catch (error) {
      if (error instanceof FacilitatorUnavailable) throw error;
      const reason = (error as Error)?.name === 'AbortError' ? 'timed out' : (error as Error)?.message;
      throw new FacilitatorUnavailable(`facilitator ${this.url} unreachable: ${reason}`, error);
    } finally {
      clearTimeout(timer);
    }
  }

  /** What this facilitator can settle. Worth calling once at startup. */
  supported(): Promise<{ kinds: FacilitatorKind[]; [k: string]: unknown }> {
    return this.call('/supported');
  }

  verify(
    paymentRequirements: FacilitatorPaymentRequirements,
    paymentPayload: unknown
  ): Promise<FacilitatorVerifyResponse> {
    return this.call('/verify', { paymentRequirements, paymentPayload });
  }

  settle(
    paymentRequirements: FacilitatorPaymentRequirements,
    paymentPayload: unknown
  ): Promise<FacilitatorSettleResponse> {
    return this.call('/settle', { paymentRequirements, paymentPayload });
  }

  /**
   * Confirm at startup that this facilitator handles what you intend to sell.
   *
   * Discovering at settle time that the scheme was never supported is the one
   * failure a seller cannot recover from: the resource is already served.
   */
  async assertSupports(scheme: string, network: string): Promise<FacilitatorKind> {
    const { kinds } = await this.supported();
    const kind = kinds?.find((k) => k.scheme === scheme && k.network === network);
    if (!kind) {
      const listed = (kinds ?? []).map((k) => `${k.scheme}/${k.network}`).join(', ') || 'nothing';
      throw new Error(
        `payless: ${this.url} does not settle ${scheme} on ${network}. It settles: ${listed}.`
      );
    }
    return kind;
  }
}

export function createFacilitator(options: FacilitatorOptions | string) {
  return new FacilitatorClient(options);
}
