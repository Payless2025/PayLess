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
    <section className="py-24 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple Integration
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Add payments to your serverless functions in minutes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Server-side code */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25"></div>
            <div className="relative bg-slate-900 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-purple-400">SERVER (API ROUTE)</span>
                <button
                  onClick={copyToClipboard}
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
              <pre className="text-sm text-gray-300 overflow-x-auto">
                <code>{codeExample}</code>
              </pre>
            </div>
          </div>

          {/* Client-side code */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-25"></div>
            <div className="relative bg-slate-900 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-blue-400">CLIENT (YOUR APP)</span>
              </div>
              <pre className="text-sm text-gray-300 overflow-x-auto">
                <code>{clientExample}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="text-4xl font-bold text-purple-400 mb-2">1 min</div>
            <div className="text-gray-300">Setup Time</div>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl font-bold text-blue-400 mb-2">0%</div>
            <div className="text-gray-300">Protocol Fees</div>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl font-bold text-green-400 mb-2">2 sec</div>
            <div className="text-gray-300">Settlement Time</div>
          </div>
        </div>
      </div>
    </section>
  );
}

