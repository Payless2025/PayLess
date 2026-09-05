/**
 * What the agent decides.
 *
 * Every branch here is a case that will not fire during a demo, which is
 * exactly why it gets a test. An agent that only behaves correctly on the happy
 * path is a script with better marketing.
 */

import assert from 'node:assert/strict';
import { decide, type TokenSnapshot } from '../lib/agent/decisions';

let passed = 0;
function test(name: string, fn: () => void) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

const token = (over: Partial<TokenSnapshot> = {}): TokenSnapshot => ({
  ticker: 'NVDA',
  multiplier: '1',
  scheduledMultiplier: null,
  effectiveAt: null,
  pendingChange: false,
  balancesNeedScaling: false,
  transferable: true,
  paused: { token: false, oracle: false, global: false },
  ...over,
});

const rich = { floatRemaining: 1, perCallCeiling: 0.05 };

console.log('\nagent decisions\n');

test('stops when the float cannot cover another ceiling', () => {
  // Planning a purchase you cannot afford is not a decision, it is a request
  // that will be refused, and the refusal costs a settlement to discover.
  const d = decide({ floatRemaining: 0.03, perCallCeiling: 0.05, tokens: [token()] });
  assert.equal(d.action.kind, 'stop');
  assert.match(d.observation, /0\.03/);
});

test('stops when the address cannot receive the assets at all', () => {
  const d = decide({
    ...rich,
    eligibility: { canReceive: false, blockedByRegistry: true, registryPaused: false, reasons: ['The access registry blocks this address.'] },
    tokens: [token({ pendingChange: true })],
  });
  assert.equal(d.action.kind, 'stop');
  // Eligibility must outrank even a pending corporate action: data about
  // assets you cannot hold is trivia.
  assert.match(d.action.reason, /nothing actionable/);
});

test('a scheduled corporate action outranks everything else', () => {
  const d = decide({
    ...rich,
    tokens: [
      token({ ticker: 'MSFT', balancesNeedScaling: true }),
      token({ ticker: 'AAPL', pendingChange: true, scheduledMultiplier: '1.5', effectiveAt: '2026-12-01T00:00:00.000Z' }),
    ],
  });
  assert.equal(d.action.kind, 'buy');
  assert.equal((d.action as any).params.symbol, 'AAPL');
  assert.equal(d.priority, 'high');
  assert.match(d.observation, /scheduled/);
});

test('a stale multiplier sends it to holdings, not to flow', () => {
  // The problem is that a number is wrong, so the fix is to re-read the number.
  const d = decide({ ...rich, tokens: [token({ ticker: 'AAPL', multiplier: '1.000566', balancesNeedScaling: true })] });
  assert.equal(d.action.kind, 'buy');
  assert.equal((d.action as any).resource, '/api/rwa/holdings');
  assert.match(d.observation, /1\.000566/);
});

test('skips a halted token instead of buying frozen history', () => {
  const d = decide({
    ...rich,
    tokens: [token({ ticker: 'SPY', transferable: false, paused: { token: true, oracle: false, global: false } })],
  });
  assert.equal(d.action.kind, 'skip');
  assert.equal(d.priority, 'low');
});

test('routine sampling is labelled as routine, not dressed up', () => {
  const d = decide({ ...rich, tokens: [token()] });
  assert.equal(d.action.kind, 'buy');
  assert.equal(d.priority, 'normal');
  assert.match((d.action as any).reason, /routine/);
});

test('does not buy the same token twice in a cycle', () => {
  const d = decide({ ...rich, tokens: [token({ ticker: 'NVDA' })], seen: ['NVDA'] });
  assert.equal(d.action.kind, 'skip');
  assert.match(d.action.reason, /same data twice/);
});

test('every decision names the observation that caused it', () => {
  // The whole difference between a task and a decision, and the thing a
  // watcher on the stage page is actually reading.
  const cases = [
    decide({ floatRemaining: 0, perCallCeiling: 0.05 }),
    decide({ ...rich, tokens: [token({ pendingChange: true, scheduledMultiplier: '2' })] }),
    decide({ ...rich, tokens: [token({ balancesNeedScaling: true, multiplier: '1.5' })] }),
    decide({ ...rich, tokens: [token({ transferable: false })] }),
    decide({ ...rich, tokens: [token()] }),
  ];
  for (const d of cases) {
    assert.ok(d.observation.length > 20, `thin observation: ${d.observation}`);
    assert.ok((d.action as any).reason.length > 20, 'every action needs a stated reason');
  }
});

console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
