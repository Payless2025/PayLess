const steps = [
  {
    n: '01',
    title: 'The request arrives without payment',
    body: 'Your handler is wrapped once. Payless intercepts before your code runs.',
    code: `GET /api/data/weather?city=Istanbul`,
  },
  {
    n: '02',
    title: 'Payless answers 402',
    body: 'The response carries the price, your address, the chain ID and the tokens you accept.',
    code: `HTTP/1.1 402 Payment Required

{
  "amount": "0.01",
  "currency": "USDG",
  "recipient": "0x…",
  "network": "4663"
}`,
  },
  {
    n: '03',
    title: 'The caller pays on chain',
    body: 'A real USDG transfer on Robinhood Chain. The caller retries with its transaction hash — not a promise to pay, but a receipt.',
    code: `X-Payment: {"from":"0x…","amount":"0.01",
  "token":"USDG","chainId":"4663",
  "transactionHash":"0x13c8…"}`,
  },
  {
    n: '04',
    title: 'Payless reads the receipt',
    body: 'It confirms the transfer landed, paid the right address, cleared the price, and has not been spent before. Only then does your handler run.',
    code: `HTTP/1.1 200 OK
x-payment-chain: robinhood

{ "city": "Istanbul", "temperature": 22 }`,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-bg border-t border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
            How a paid request works
          </h2>
          <p className="text-lg text-text-muted">
            Four steps, all of them in{' '}
            <code className="text-accent text-base">lib/x402/middleware.ts</code>. No
            facilitator required, no account anywhere in the loop.
          </p>
        </div>

        <ol className="space-y-px">
          {steps.map((step) => (
            <li
              key={step.n}
              className="grid md:grid-cols-[auto_1fr_1.1fr] gap-x-8 gap-y-4 items-start border-t border-line py-8"
            >
              <span className="font-mono text-sm text-accent/60 pt-1">{step.n}</span>
              <div>
                <h3 className="text-lg font-semibold text-text mb-2">{step.title}</h3>
                <p className="text-text-muted leading-relaxed">{step.body}</p>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-surface border border-line p-4 text-xs leading-relaxed text-text-muted">
                <code>{step.code}</code>
              </pre>
            </li>
          ))}
        </ol>

        <p className="border-t border-line pt-8 text-sm text-text-faint max-w-2xl">
          The transaction hash is also the replay key: one transfer buys exactly one
          response. Reuse it and the request is rejected. What is still open is a shared
          store for that ledger, so replay protection holds across serverless instances —
          see{' '}
          <a
            href="https://github.com/Payless2025/PayLess/blob/master/docs/ROBINHOOD_CHAIN.md"
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            the chain docs
          </a>
          .
        </p>
      </div>
    </section>
  );
}
