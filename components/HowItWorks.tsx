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
    title: 'The caller signs',
    body: 'The wallet signs the payment message with personal_sign. Nothing is broadcast yet — this is an authorization, not a transaction.',
    code: `X-Payment: {"from":"0x…","amount":"0.01",
  "token":"USDG","chainId":"4663",
  "signature":"0x…"}`,
  },
  {
    n: '04',
    title: 'Payless recovers the signer',
    body: 'Address, amount, token, chain and a five-minute freshness window are all checked before your handler is ever called.',
    code: `HTTP/1.1 200 OK
x-payment-chain: robinhood

{ "city": "Istanbul", "temperature": 22 }`,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-payless-dark-bg border-t border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How a paid request works
          </h2>
          <p className="text-lg text-gray-400">
            Four steps, all of them in{' '}
            <code className="text-payless-cyan text-base">lib/x402/middleware.ts</code>. No
            facilitator required, no account anywhere in the loop.
          </p>
        </div>

        <ol className="space-y-px">
          {steps.map((step) => (
            <li
              key={step.n}
              className="grid md:grid-cols-[auto_1fr_1.1fr] gap-x-8 gap-y-4 items-start border-t border-white/10 py-8"
            >
              <span className="font-mono text-sm text-payless-cyan/60 pt-1">{step.n}</span>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed">{step.body}</p>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-black/40 border border-white/10 p-4 text-xs leading-relaxed text-gray-300">
                <code>{step.code}</code>
              </pre>
            </li>
          ))}
        </ol>

        <p className="border-t border-white/10 pt-8 text-sm text-gray-500 max-w-2xl">
          The signature proves the caller authorized the amount. Verifying that the transfer
          settled on-chain, and rejecting a reused nonce, are still on the roadmap — see{' '}
          <a
            href="https://github.com/Payless2025/PayLess/blob/master/docs/ROBINHOOD_CHAIN.md"
            className="text-payless-cyan hover:underline"
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
