'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const codeExample = `import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  // Your API logic here
  const data = await processRequest(req);
  return NextResponse.json({ data });
}

// Add payment requirement - that's it!
export const POST = withX402Payment(handler, "0.01");`;

const clientExample = `// Client makes request
const response = await fetch('/api/your-endpoint', {
  method: 'POST',
  headers: {
    'X-Payment': signedPayment // Auto-handled by x402 SDK
  },
  body: JSON.stringify({ data })
});`;

export default function CodeExample() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="code" className="py-24 bg-surface border-t border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
            One wrapper on the handler you already wrote
          </h2>
          <p className="text-lg text-text-muted">
            Your route keeps its signature. The price is the second argument.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Server-side code */}
          <div className="rounded border border-line bg-bg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-line">
              <span className="font-mono text-xs tracking-wide text-text-faint">
                app/api/your-endpoint/route.ts
              </span>
              <button
                onClick={copyToClipboard}
                className="p-1.5 rounded hover:bg-surface-raised transition-colors"
                aria-label="Copy server example"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-accent" />
                ) : (
                  <Copy className="w-4 h-4 text-text-faint" />
                )}
              </button>
            </div>
            <pre className="p-5 text-sm leading-relaxed text-text-muted overflow-x-auto">
              <code>{codeExample}</code>
            </pre>
          </div>

          {/* Client-side code */}
          <div className="rounded border border-line bg-bg overflow-hidden">
            <div className="flex items-center px-5 py-3 border-b border-line">
              <span className="font-mono text-xs tracking-wide text-text-faint">
                caller side
              </span>
            </div>
            <pre className="p-5 text-sm leading-relaxed text-text-muted overflow-x-auto">
              <code>{clientExample}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
