'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Page, PageHeader, Container, Panel, Stat, Empty, Mono } from '@/components/ui';

interface SeriesDay {
  date: string;
  settlements: number;
  volumeUSDG: string;
  sellers: number;
  facilitators: number;
  schemes: Record<string, number>;
}

interface Stats {
  series: SeriesDay[];
  totals: {
    settlements: number;
    volumeUSDG: string;
    sellers: number;
    facilitators: number;
    schemes: Record<string, number>;
    days: number;
  };
  coverage: {
    lowestBlockScanned: string | null;
    highestBlockScanned: string | null;
    reachedGenesis: boolean;
    lastPassAt: string | null;
    note: string;
  };
  source: string;
  retrievedAt: string;
}

const AXIS = '#ffffff80';
const GRID = '#ffffff14';
const LINE = '#8B5CF6';

function shortDate(d: string) {
  return d.slice(5);
}

export default function X402Page() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/discovery/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d);
        else setError(d.error || 'Could not load the settlement history.');
      })
      .catch(() => setError('Could not reach the API.'))
      .finally(() => setLoading(false));
  }, []);

  const series = stats?.series ?? [];
  const hasData = series.length > 0;

  const chartData = series.map((d) => ({
    date: shortDate(d.date),
    settlements: d.settlements,
    volume: Number(d.volumeUSDG),
    sellers: d.sellers,
  }));

  return (
    <Page>
      <Header />
      <PageHeader
        eyebrow="Robinhood Chain · 4663"
        title="x402 on this chain"
        description="Every settlement that has passed through the canonical x402 proxies, read from the chain rather than from our own traffic. Nobody signs up for this, and nobody can list themselves into it."
      />

      <Container className="space-y-6">
        {loading && (
          <Panel>
            <Empty>Reading the settlement history…</Empty>
          </Panel>
        )}

        {error && (
          <Panel title="Unavailable">
            <Empty>{error}</Empty>
          </Panel>
        )}

        {stats && (
          <>
            <Panel title="Totals" aside={<Mono className="text-text-faint">{stats.totals.days} days indexed</Mono>}>
              <div className="grid grid-cols-2 gap-6 p-4 md:grid-cols-4">
                <Stat label="Settlements" value={stats.totals.settlements.toLocaleString()} />
                <Stat label="Volume" value={stats.totals.volumeUSDG} sub="USDG" />
                <Stat label="Sellers" value={stats.totals.sellers} sub="distinct addresses paid" />
                <Stat label="Facilitators" value={stats.totals.facilitators} sub="distinct broadcasters" />
              </div>
            </Panel>

            {/*
              Coverage sits above the charts, not in a footnote. A chart of a
              partially scanned history and a chart of a young chain are the
              same picture, and only one of them is true.
            */}
            <Panel title="Coverage">
              <div className="space-y-2 p-4 text-sm leading-relaxed text-text-muted">
                <p>{stats.coverage.note}</p>
                <div className="flex flex-wrap gap-x-8 gap-y-1 pt-1 font-mono text-xs text-text-faint">
                  <span>
                    scanned blocks{' '}
                    <span className="text-text-muted">
                      {stats.coverage.lowestBlockScanned ?? '—'} → {stats.coverage.highestBlockScanned ?? '—'}
                    </span>
                  </span>
                  <span>
                    reached genesis{' '}
                    <span className="text-text-muted">{stats.coverage.reachedGenesis ? 'yes' : 'not yet'}</span>
                  </span>
                  {stats.coverage.lastPassAt && (
                    <span>
                      last pass <span className="text-text-muted">{stats.coverage.lastPassAt.slice(0, 16).replace('T', ' ')}</span>
                    </span>
                  )}
                </div>
              </div>
            </Panel>

            {!hasData && (
              <Panel title="Settlements per day">
                <Empty>
                  No days indexed yet. The scanner walks history in bounded passes, and this fills in
                  as it runs. An empty chart here is our index being new, not the chain being quiet.
                </Empty>
              </Panel>
            )}

            {hasData && (
              <>
                <Panel title="Settlements per day">
                  <div className="p-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                        <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickLine={false} />
                        <YAxis stroke={AXIS} fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: '#0b0b0e',
                            border: '1px solid #ffffff1a',
                            borderRadius: 4,
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="settlements" fill={LINE} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>

                <div className="grid gap-6 md:grid-cols-2">
                  <Panel title="Volume per day · USDG">
                    <div className="p-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                          <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickLine={false} />
                          <YAxis stroke={AXIS} fontSize={11} tickLine={false} width={70} />
                          <Tooltip
                            contentStyle={{
                              background: '#0b0b0e',
                              border: '1px solid #ffffff1a',
                              borderRadius: 4,
                              fontSize: 12,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="volume"
                            stroke={LINE}
                            fill={LINE}
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  <Panel title="Distinct sellers per day">
                    <div className="p-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                          <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickLine={false} />
                          <YAxis stroke={AXIS} fontSize={11} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              background: '#0b0b0e',
                              border: '1px solid #ffffff1a',
                              borderRadius: 4,
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="sellers" fill="#22d3ee" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>
                </div>

                <Panel title="By scheme">
                  <div className="divide-y divide-line">
                    {Object.entries(stats.totals.schemes)
                      .sort((a, b) => b[1] - a[1])
                      .map(([scheme, count]) => (
                        <div key={scheme} className="flex items-center justify-between px-4 py-3">
                          <Mono className="text-text">{scheme}</Mono>
                          <Mono className="tnum text-text-muted">{count.toLocaleString()}</Mono>
                        </div>
                      ))}
                    {Object.keys(stats.totals.schemes).length === 0 && (
                      <Empty>No settlements indexed yet.</Empty>
                    )}
                  </div>
                </Panel>
              </>
            )}

            <Panel title="Where this comes from">
              <div className="space-y-2 p-4 text-sm leading-relaxed text-text-muted">
                <p>{stats.source}</p>
                <p>
                  Both proxies are checkable on chain:{' '}
                  <Mono className="text-text">0x402085c2…0001</Mono> for <Mono>exact</Mono> and{' '}
                  <Mono className="text-text">0x4020A4f3…0002</Mono> for <Mono>upto</Mono>. The raw
                  series is served free at <Mono className="text-text">/api/discovery/stats</Mono>,
                  and the addresses being paid are listed at{' '}
                  <Mono className="text-text">/api/discovery/sellers</Mono>.
                </p>
              </div>
            </Panel>
          </>
        )}
      </Container>
      <Footer />
    </Page>
  );
}
