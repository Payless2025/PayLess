/**
 * Spending limits.
 *
 * This is the part that matters. An agent holding a wallet will, sooner or
 * later, be talked into spending it — by a confused plan, a hostile web page,
 * or a prompt injected into the very data it just paid for.
 *
 * So the limit does not live in the prompt. The model cannot see it, cannot
 * raise it, and cannot argue with it. It is checked here, in the tool, before
 * any transaction is signed.
 *
 * The agent decides what to buy. It does not decide how much it can spend.
 */

export interface BudgetLimits {
  /** Largest single payment allowed, in whole tokens. */
  maxPerCall: number;
  /** Total allowed for the lifetime of this server process. */
  maxTotal: number;
  /** Optional host allowlist. Empty means any host. */
  allowedHosts: string[];
}

export interface Spend {
  at: number;
  host: string;
  url: string;
  amount: number;
  txHash: string;
}

export type Refusal =
  | { ok: true }
  | { ok: false; reason: string; code: 'per-call' | 'total' | 'host' | 'unparseable' };

export class Budget {
  private spends: Spend[] = [];

  constructor(readonly limits: BudgetLimits) {}

  get spent(): number {
    return this.spends.reduce((sum, s) => sum + s.amount, 0);
  }

  get remaining(): number {
    return Math.max(0, this.limits.maxTotal - this.spent);
  }

  get history(): readonly Spend[] {
    return this.spends;
  }

  /** Checked before signing anything. */
  check(url: string, amount: string): Refusal {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      return { ok: false, code: 'unparseable', reason: `Cannot read "${amount}" as an amount.` };
    }

    let host: string;
    try {
      host = new URL(url).host;
    } catch {
      return { ok: false, code: 'unparseable', reason: `"${url}" is not a valid URL.` };
    }

    if (this.limits.allowedHosts.length && !this.limits.allowedHosts.includes(host)) {
      return {
        ok: false,
        code: 'host',
        reason: `${host} is not in the allowed host list. Allowed: ${this.limits.allowedHosts.join(', ')}.`,
      };
    }

    if (value > this.limits.maxPerCall) {
      return {
        ok: false,
        code: 'per-call',
        reason: `That call costs ${value} but the per-call limit is ${this.limits.maxPerCall}. Not paying.`,
      };
    }

    if (this.spent + value > this.limits.maxTotal) {
      return {
        ok: false,
        code: 'total',
        reason: `That would take total spend to ${(this.spent + value).toFixed(6)}, over the ${this.limits.maxTotal} budget. ${this.remaining.toFixed(6)} left.`,
      };
    }

    return { ok: true };
  }

  /** Recorded only after a payment actually settled. */
  record(spend: Spend) {
    this.spends.push(spend);
  }

  summary() {
    return {
      spent: Number(this.spent.toFixed(6)),
      remaining: Number(this.remaining.toFixed(6)),
      maxPerCall: this.limits.maxPerCall,
      maxTotal: this.limits.maxTotal,
      payments: this.spends.length,
      allowedHosts: this.limits.allowedHosts.length ? this.limits.allowedHosts : 'any',
    };
  }
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Limits come from the environment, where the operator sets them — never from
 * anything the model can influence.
 */
export function budgetFromEnv(env = process.env): Budget {
  return new Budget({
    maxPerCall: num(env.PAYLESS_MAX_PER_CALL, 0.1),
    maxTotal: num(env.PAYLESS_MAX_TOTAL, 1),
    allowedHosts: (env.PAYLESS_ALLOWED_HOSTS || '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean),
  });
}
