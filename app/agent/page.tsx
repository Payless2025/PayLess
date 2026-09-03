'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Tick {
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

interface State {
  configured: boolean;
  policyWallet: string | null;
  floatUSDG: string;
  capUSDG: string;
}

const WALLET_EXPLORER = 'https://robinhoodchain.blockscout.com/address';

export default function AgentStage() {
  const [state, setState] = useState<State | null>(null);
  const [feed, setFeed] = useState<Tick[]>([]);
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false);

  const loadState = useCallback(async () => {
    try {
      const s = await fetch('/api/agent/state').then((r) => r.json());
      if (s.success) setState(s);
    } catch {
      /* leave last known state */
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const tick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/agent/tick', { method: 'POST' });
      const t: Tick = await res.json();
      setFeed((f) => [t, ...f].slice(0, 30));
      loadState();
    } catch {
      /* ignore a single failed turn */
    } finally {
      setBusy(false);
    }
  }, [busy, loadState]);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(tick, 22_000);
    return () => clearInterval(id);
  }, [auto, tick]);

  const floatNum = state ? Number(state.floatUSDG) : 0;
  const capNum = state ? Number(state.capUSDG) : 0;
  const drained = state?.configured && floatNum <= 0;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-bg pt-20">
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-text">Agent stage</h1>
            <p className="mt-2 text-sm text-text-muted">
              An agent that holds only a session key. Its money lives in a contract that refuses any
              payment outside its policy. Every purchase below is a real transaction you can open on
              the explorer.
            </p>
          </div>

          {/* The wallet, read from chain */}
          <div className="bg-surface border border-line rounded p-6 mb-6">
            {state?.configured ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-text-faint">
                    Policy wallet · on chain
                  </h3>
                  {state.policyWallet && (
                    <a
                      href={`${WALLET_EXPLORER}/${state.policyWallet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-accent hover:underline"
                    >
                      {state.policyWallet.slice(0, 6)}…{state.policyWallet.slice(-4)} →
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="font-mono text-3xl tnum text-text">{state.floatUSDG}</p>
                    <p className="mt-1 text-xs text-text-muted">USDG float — the day&apos;s whole budget</p>
                  </div>
                  <div>
                    <p className="font-mono text-3xl tnum text-text">{state.capUSDG}</p>
                    <p className="mt-1 text-xs text-text-muted">USDG per-call cap — enforced by the contract</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-text-faint">
                  Watch the float. It can fall as the agent spends, but no single payment can cross the
                  cap, and nothing can move it above the float. Both limits are the contract&apos;s, not ours.
                </p>
              </>
            ) : (
              <p className="font-mono text-sm text-text-faint">
                The stage agent is not configured on this server yet.
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={tick}
              disabled={busy || !state?.configured || !!drained}
              className="px-4 py-2 rounded bg-accent text-bg font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'buying…' : 'Buy one'}
            </button>
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} disabled={!state?.configured || !!drained} />
              auto every 22s
            </label>
            {drained && (
              <span className="text-xs text-text-faint">
                float is empty — this is the demo, not a bug. it refills daily.
              </span>
            )}
          </div>

          {/* The feed */}
          <div className="space-y-3">
            {feed.length === 0 && (
              <p className="text-sm text-text-faint">No purchases yet. Press “Buy one.”</p>
            )}
            {feed.map((t, i) => (
              <div key={`${t.at}-${i}`} className={`border rounded p-4 ${t.ok ? 'border-line bg-surface' : 'border-line bg-surface-raised'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-mono text-xs uppercase tracking-widest ${t.ok ? 'text-accent' : 'text-text-faint'}`}>
                    {t.ok ? 'paid' : t.step}
                  </span>
                  <span className="font-mono text-xs text-text-faint">{new Date(t.at).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-text">{t.detail}</p>
                {t.ok && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-text-muted">
                    {t.rows !== undefined && <span>{t.rows} rows</span>}
                    {t.ceiling && <span>ceiling {t.ceiling}</span>}
                    {t.charged && <span className="text-text">charged {t.charged}</span>}
                    {t.explorer && (
                      <a href={t.explorer} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        verify tx →
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
