import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Page, PageHeader, Container } from '@/components/ui';

interface Item {
  title: string;
  note?: string;
}

interface Group {
  heading: string;
  items: Item[];
}

const shipped: Group[] = [
  {
    heading: 'Payments',
    items: [
      {
        title: 'x402 payment middleware',
        note: 'One wrapper around a route handler sets its price and enforces it.',
      },
      {
        title: 'USDG settlement on Robinhood Chain',
        note: 'The receipt is the payment. Every request is paid for by a verified ERC-20 transfer, not by a signature.',
      },
      {
        title: 'Replay protection and a freshness window',
        note: 'A settled transaction buys exactly one response, and only within 30 minutes of being mined.',
      },
      {
        title: 'Payment links',
        note: 'Shareable URLs with a QR code, for taking a payment without writing any code.',
      },
      {
        title: 'Payment streaming',
        note: 'Per-second, per-minute and per-hour billing for metered services.',
      },
      {
        title: 'Token-gated access',
        note: 'Holder tiers resolved from an on-chain balanceOf. No allowlist to maintain.',
      },
    ],
  },
  {
    heading: 'Platform',
    items: [
      {
        title: 'Webhooks',
        note: 'Signed deliveries with retry and backoff, plus a delivery log.',
      },
      {
        title: 'Analytics and payment history',
        note: 'Revenue, endpoint and status breakdowns, exportable as CSV or JSON.',
      },
      {
        title: 'Playground',
        note: 'Fire real 402s at live endpoints and copy the generated client code.',
      },
      {
        title: 'MCP server for paying agents',
        note: 'npx payless-mcp gives any MCP client four tools, of which exactly one can move money. The spending limit is checked in the tool before a transaction is signed, so the model cannot see it, raise it, or argue with it. Four agent payments have settled on chain under it.',
      },
      {
        title: 'Shared replay and subscription stores',
        note: 'Both ledgers sit behind Upstash Redis, claimed with SET NX so the server decides the winner. Without them a receipt could be spent once per warm serverless instance; the app now fails closed if the ledger is unreachable.',
      },
      {
        title: 'Published SDK on npm',
        note: 'npm i payless — one wrapper prices any fetch-style route handler, with settlement verification and replay protection built in.',
      },
      {
        title: 'Nine paid endpoints that return real output',
        note: 'Live reads from Robinhood Chain — token metadata, balances and receipts — plus market data and QR generation. Anything that would return placeholder data is free and labelled demo until a real provider sits behind it.',
      },
    ],
  },
];

const inProgress: Item[] = [
  {
    title: 'Recurring payments',
    note: 'The commitment is an ERC-20 allowance rather than a card on file. The payer approves a spend limit, we may collect the plan amount once per period and never more than was approved, and cancelling is approve(0) from their own wallet — immediate, and not something we can block.',
  },
  { title: 'Email receipts and payment alerts' },
  {
    title: 'Deeper merchant dashboard',
    note: 'Per-endpoint revenue, repeat payers, and why failed payments failed.',
  },
];

const planned: Group[] = [
  {
    heading: 'Payments',
    items: [
      {
        title: 'Payment splits',
        note: 'One transfer, several recipients, settled together — so an API can pay its upstream out of the same payment that paid it.',
      },
      {
        title: 'Escrow',
        note: 'Funds held on chain and released on delivery, for the trades instant settlement does not suit.',
      },
      {
        title: 'USD-denominated pricing',
        note: 'Price in dollars, settle in USDG, conversion handled server-side.',
      },
      { title: 'Batch settlement' },
    ],
  },
  {
    heading: 'Platform',
    items: [
      {
        title: 'Rate limiting and API keys per tier',
        note: 'Paying for a response and hammering an endpoint are different problems. x402 only solves the first.',
      },
      {
        title: 'Persistent storage for links, streams and webhooks',
        note: 'The same in-memory caveat as above, applied to everything else that outlives a single request.',
      },
      {
        title: 'Real providers behind the demo endpoints',
        note: 'The AI, weather, stock and news routes stay free while their output is simulated. Each one gets a price the day it is wired to a genuine upstream, and not before.',
      },
    ],
  },
  {
    heading: 'Integrations',
    items: [
      { title: 'Flutter SDK' },
      { title: 'WordPress and WooCommerce plugin' },
      { title: 'Shopify app' },
    ],
  },
];

const notDoing: Item[] = [
  {
    title: 'Other chains',
    note: 'Payless settled on Solana, BSC and Ethereum before this. Four chains meant four signature schemes and four token registries for a product that needs one dollar to work. Robinhood Chain has a native one.',
  },
  {
    title: 'Custody',
    note: 'Payments go from payer to merchant wallet. Payless never holds funds, so there is no balance to withdraw and nothing to freeze.',
  },
  {
    title: 'Protocol fees',
    note: 'There is no cut to take. If that ever changes it will be an announcement, not a quiet config edit.',
  },
  {
    title: 'Accounts',
    note: 'No email, no OAuth, no login standing between you and your revenue. A wallet address is the whole identity.',
  },
];

function ItemList({ items, dot }: { items: Item[]; dot: string }) {
  return (
    <ul>
      {items.map((item) => (
        <li
          key={item.title}
          className="flex gap-3 border-b border-line py-3 last:border-0"
        >
          <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          <div>
            <div className="text-sm text-text">{item.title}</div>
            {item.note && (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-muted">
                {item.note}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Section({
  label,
  summary,
  children,
}: {
  label: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-10 first:border-0 first:pt-0">
      <div className="mb-6">
        <h2 className="font-mono text-xs uppercase tracking-widest text-text-faint">
          {label}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          {summary}
        </p>
      </div>
      {children}
    </section>
  );
}

function GroupedList({ groups, dot }: { groups: Group[]; dot: string }) {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.heading}>
          <h3 className="mb-1 text-sm font-medium text-text">{group.heading}</h3>
          <ItemList items={group.items} dot={dot} />
        </div>
      ))}
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <Page>
      <Header />
      <div className="pt-14">
        <PageHeader
          title="Roadmap"
          description="What Payless does today, what is being built next, and what it will not do. Dates are deliberately absent — things move here when they ship."
        />
      </div>

      <Container>
        <Section
          label="Shipped"
          summary="Live on Robinhood Chain now, settling in USDG. All of it is in the repository under an MIT licence."
        >
          <GroupedList groups={shipped} dot="bg-ok" />
        </Section>

        <Section
          label="In progress"
          summary="Being worked on now. The first one is a correctness gap we would rather state plainly than leave in a source comment."
        >
          <ItemList items={inProgress} dot="bg-warn" />
        </Section>

        <Section
          label="Planned"
          summary="Agreed on and specified, not yet started. Roughly in the order we expect to build them."
        >
          <GroupedList groups={planned} dot="bg-text-faint" />
        </Section>

        <Section
          label="Not doing"
          summary="Decisions already made, so nobody has to ask twice."
        >
          <ItemList items={notDoing} dot="bg-line-strong" />
        </Section>

        <p className="border-t border-line pt-6 text-xs text-text-muted">
          Last updated 31 August 2026.{' '}
          <a
            href="https://github.com/Payless2025/PayLess"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Open an issue
          </a>{' '}
          if something here is wrong or missing.
        </p>
      </Container>

      <Footer />
    </Page>
  );
}
