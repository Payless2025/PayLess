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
        title: 'Three ways to pay for one request',
        note: 'Send the transfer and show the receipt, sign an authorisation and let a facilitator broadcast it, or sign a ceiling and be charged what the work actually cost. USDG on this chain implements neither EIP-3009 nor EIP-2612, checked by scanning the dispatch table behind its proxy, so the gasless routes run through Permit2 and the canonical x402 proxies instead.',
      },
      {
        title: 'A wallet the chain can refuse',
        note: 'An agent holds a session key; the money sits in a contract that answers the signature check itself. Per-call ceiling, allowed recipients, allowed facilitator, expiry, all enforced by consensus rather than by our process. A payment inside the policy settles and one over it reverts before anything moves. A leaked session key cannot drain the wallet, though it can spend the day float within policy until the operator revokes it.',
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
        title: 'Reference agent, running live',
        note: 'An agent that reads a price off a 402 and pays it with nobody approving the transaction. Its per-call ceiling is enforced by the policy wallet contract rather than by our code: a payment inside the limit settles, and one over it reverts before any money moves. It runs at /agent, reporting every step it takes, including the ones that fail.',
      },
      {
        title: 'A facilitator anyone can run',
        note: 'Verifying and settling x402 payments so a seller never touches a chain: two HTTP calls and no RPC, no replay ledger, no key. The protocol is specified, the implementation is in the repository, and swapping our URL for your own is one string. It also reports its own health with a reason per check, because a payment service that can only say up will say up while it is quietly out of gas.',
      },
      {
        title: 'A catalogue agents can read before spending',
        note: 'Every priced endpoint published at /.well-known/x402 in the shape production x402 facilitators already use: what it returns, what it costs in base units, which schemes it accepts, and whether the amount is a price or a ceiling. Learning what five endpoints cost used to mean calling five of them and reading five rejections.',
      },
      {
        title: 'Corporate actions on tokenised equities',
        note: 'The stock tokens carry a scaling multiplier the issuer adjusts, and every change is announced on chain with an effective date. So a scheduled adjustment is visible before it lands, and a token already off 1 means a raw balanceOf does not match the issuer figure. Reported as numbers and timestamps only: a multiplier moving is a fact, naming it a split is paperwork we do not have. Data that cannot exist on a chain without transfer-gated equities.',
      },
      {
        title: 'Proof of wallet ownership',
        note: 'Token gating used to trust an address in a header, which is a claim rather than a proof. Access now needs a signature over a challenge this server issued, traded for a short-lived token. Writing a whale address into a header no longer opens anything.',
      },
      {
        title: 'Shared replay and subscription stores',
        note: 'Both ledgers sit behind Upstash Redis, claimed with SET NX so the server decides the winner. Without them a receipt could be spent once per warm serverless instance; the app now fails closed if the ledger is unreachable.',
      },
      {
        title: 'Storage that survives a scale-out',
        note: 'Payment links, webhooks and streams left the per-instance maps they were born in. A link created by one machine used to be missing from the next, so whether it worked depended on which one answered. Each collection now reports whether it is shared or per-instance rather than leaving anyone to find out.',
      },
      {
        title: 'Published SDK on npm',
        note: 'npm i payless. One wrapper prices any fetch-style route handler, with settlement verification and replay protection built in.',
      },
      {
        title: 'Recurring payments, collecting',
        note: 'The commitment is an ERC-20 allowance rather than a card on file: the payer approves a spend limit, we may collect the plan amount once per period and never more than was approved, and cancelling is approve(0) from their own wallet, immediate, and not something we can block. The collector runs as a separate worker holding the only key that can pull funds, and its first collections have settled on chain.',
      },
      {
        title: 'Twelve paid endpoints that return real output',
        note: 'Live reads from Robinhood Chain (token metadata, balances, receipts, transfer history, corporate actions and transfer eligibility), plus market data and QR generation. Transfer history is metered rather than fixed price, because the size of the answer is not knowable before the query runs. Anything that would return placeholder data is free and labelled demo until a real provider sits behind it.',
      },
    ],
  },
];

const inProgress: Item[] = [
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
        note: 'One transfer, several recipients, settled together, so an API can pay its upstream out of the same payment that paid it.',
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
        title: 'Sub-agent budget delegation',
        note: 'A budget belongs to a process today, so an agent that spawns five helpers has five budgets. The limit should follow the work rather than the process: a parent granting a child a share of its own ceiling, with the arithmetic on chain where neither can edit it.',
      },
      {
        title: 'Rate limiting and API keys per tier',
        note: 'Paying for a response and hammering an endpoint are different problems. x402 only solves the first.',
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
          description="What Payless does today, what is being built next, and what it will not do. Dates are deliberately absent. Things move here when they ship."
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
