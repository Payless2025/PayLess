/**
 * What the agent decides, separated from how it pays.
 *
 * Buying data on a schedule is not judgement, it is a cron job. The interesting
 * claim is that an agent reads something, concludes something, and lets that
 * conclusion change what it buys next, including deciding to buy nothing.
 *
 * So the reasoning lives here as pure functions over data already fetched. No
 * network, no wallet, no clock beyond what is passed in. That makes every
 * branch testable without spending money, which matters because the branches
 * that never fire in a demo are exactly the ones worth being sure about.
 *
 * The rule the whole file follows: a decision must name the observation that
 * caused it. An agent that says "buying transfer history" is doing a task. One
 * that says "buying transfer history because AAPL's multiplier changed and any
 * balance I hold is stale" is making a decision, and the difference is legible
 * to whoever is watching.
 */

export interface TokenSnapshot {
  ticker: string;
  multiplier: string;
  scheduledMultiplier: string | null;
  effectiveAt: string | null;
  pendingChange: boolean;
  balancesNeedScaling: boolean;
  transferable: boolean;
  paused: { token: boolean; oracle: boolean; global: boolean };
}

export interface EligibilitySnapshot {
  canReceive: boolean;
  blockedByRegistry: boolean;
  registryPaused: boolean;
  reasons: string[];
}

export type Action =
  | {
      kind: 'buy';
      resource: string;
      params: Record<string, string>;
      reason: string;
      /**
       * Which token this purchase settles. Named separately from the params
       * because a holdings query is keyed by address, and without this the
       * caller cannot tell what was handled and would ask again forever.
       */
      subject: string;
    }
  | { kind: 'skip'; reason: string }
  | { kind: 'stop'; reason: string };

export interface Decision {
  observation: string;
  action: Action;
  /** How much of the day's float this step is allowed to consume, if it buys. */
  priority: 'high' | 'normal' | 'low';
}

/**
 * Given what the agent has learned, what should it do next?
 *
 * Ordered by consequence, not by cost. A blocked address makes every later
 * purchase pointless, so it is checked before anything is bought; a stale
 * balance makes numbers wrong, so it outranks routine market colour.
 */
export function decide(input: {
  eligibility?: EligibilitySnapshot;
  tokens?: TokenSnapshot[];
  /** Whole tokens the wallet can still spend today. */
  floatRemaining: number;
  /** The most a single call may cost. */
  perCallCeiling: number;
  /** Tickers already examined this cycle, so it does not loop. */
  seen?: string[];
  /** Whose holdings to read. Without it, a holdings question has no subject. */
  holder?: string;
}): Decision {
  const { eligibility, tokens = [], floatRemaining, perCallCeiling, seen = [], holder } = input;

  // 0. Money first. An agent that plans a purchase it cannot afford has not
  //    made a decision, it has made a request that will be refused.
  if (floatRemaining < perCallCeiling) {
    return {
      observation: `Float is ${floatRemaining} and a call may cost up to ${perCallCeiling}.`,
      action: {
        kind: 'stop',
        reason:
          'Not enough left to cover the ceiling on another call. Stopping is the correct move: the wallet refuses over-spend on chain anyway, and finding that out by being rejected wastes a settlement.',
      },
      priority: 'high',
    };
  }

  // 1. Eligibility gates everything downstream. If this address cannot receive
  //    the assets, data about them is trivia rather than input to a trade.
  if (eligibility && !eligibility.canReceive) {
    return {
      observation: eligibility.reasons[0],
      action: {
        kind: 'stop',
        reason:
          'This address cannot receive the assets, so paying for more data about them buys nothing actionable.',
      },
      priority: 'high',
    };
  }

  // 2. A scheduled corporate action is the most perishable thing on the chain:
  //    it has a date, and after that date every cached figure is wrong.
  const pending = tokens.find((t) => t.pendingChange && !seen.includes(t.ticker));
  if (pending) {
    return {
      observation: `${pending.ticker} has a multiplier change scheduled${pending.effectiveAt ? ` for ${pending.effectiveAt}` : ''}: ${pending.multiplier} to ${pending.scheduledMultiplier}.`,
      action: {
        kind: 'buy',
        resource: '/api/rwa/transfers',
        params: { symbol: pending.ticker, limit: '20' },
        subject: pending.ticker,
        reason:
          'A scheduled adjustment changes what every holder balance means. Reading the transfer flow around it is the only way to see who is moving before it lands.',
      },
      priority: 'high',
    };
  }

  // 3. A multiplier already off 1 means raw balances are quietly wrong now,
  //    which is worth more than any market colour.
  const scaling = tokens.find((t) => t.balancesNeedScaling && !seen.includes(t.ticker));
  if (scaling) {
    const observation = `${scaling.ticker} carries a multiplier of ${scaling.multiplier}, so a raw balanceOf does not match the issuer figure.`;
    // Holdings are a question about somebody. Without an address there is no
    // question, so it asks the flow instead of sending a request it knows is
    // malformed.
    return holder
      ? {
          observation,
          action: {
            kind: 'buy',
            resource: '/api/rwa/holdings',
            params: { address: holder },
            subject: scaling.ticker,
            reason:
              'Any holding read without this multiplier is wrong by that factor. Worth resolving before trusting a position.',
          },
          priority: 'high',
        }
      : {
          observation,
          action: {
            kind: 'buy',
            resource: '/api/rwa/transfers',
            params: { symbol: scaling.ticker, limit: '10' },
            subject: scaling.ticker,
            reason:
              'The multiplier makes cached balances wrong, and with no address to check holdings for, the flow is the next best read.',
          },
          priority: 'high',
        };
  }

  // 4. A halted token is worth knowing about and not worth studying: nothing
  //    can move, so flow data would describe a frozen picture.
  const halted = tokens.find((t) => !t.transferable && !seen.includes(t.ticker));
  if (halted) {
    return {
      observation: `${halted.ticker} is not transferable right now (token paused: ${halted.paused.token}, global: ${halted.paused.global}).`,
      action: {
        kind: 'skip',
        reason: 'Nothing can move while it is paused, so transfer history would only describe a frozen picture.',
      },
      priority: 'low',
    };
  }

  // 5. Nothing unusual. Watch the most liquid name rather than buying the whole
  //    catalogue for the sake of activity.
  const next = tokens.find((t) => !seen.includes(t.ticker));
  if (next) {
    return {
      observation: seen.length
        ? `Nothing further needs attention; ${seen.length} of ${tokens.length} tokens already handled this cycle.`
        : `No pending actions and no scaling anomalies across ${tokens.length} tokens.`,
      action: {
        kind: 'buy',
        resource: '/api/rwa/transfers',
        params: { symbol: next.ticker, limit: '10' },
        subject: next.ticker,
        reason: 'Nothing needs attention, so this is routine flow sampling rather than a response to anything.',
      },
      priority: 'normal',
    };
  }

  return {
    observation: `All ${tokens.length} tokens examined this cycle.`,
    action: { kind: 'skip', reason: 'Everything has been looked at. Waiting beats buying the same data twice.' },
    priority: 'low',
  };
}
