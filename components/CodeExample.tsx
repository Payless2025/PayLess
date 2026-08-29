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
    <section id="code" className="py-24 bg-payless-dark border-t border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            One wrapper on the handler you already wrote
          </h2>
          <p className="text-lg text-gray-400">
            Your route keeps its signature. The price is the second argument.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Server-side code */}
          <div className="rounded-xl bg-black/40 border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <span className="font-mono text-xs tracking-wide text-gray-500">
                app/api/your-endpoint/route.ts
              </span>
              <button
                onClick={copyToClipboard}
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                aria-label="Copy server example"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-payless-cyan" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
            <pre className="p-5 text-sm leading-relaxed text-gray-300 overflow-x-auto">
              <code>{codeExample}</code>
            </pre>
          </div>

          {/* Client-side code */}
          <div className="rounded-xl bg-black/40 border border-white/10 overflow-hidden">
            <div className="flex items-center px-5 py-3 border-b border-white/10">
              <span className="font-mono text-xs tracking-wide text-gray-500">
                caller side
              </span>
            </div>
            <pre className="p-5 text-sm leading-relaxed text-gray-300 overflow-x-auto">
              <code>{clientExample}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
