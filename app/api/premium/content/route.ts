import { NextRequest, NextResponse } from 'next/server';
import { withMultiChainPayment } from '@/lib/x402/multi-chain-middleware';

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '1';

  // Simulate premium content
  const premiumContent = {
    id,
    title: 'Exclusive Premium Content',
    content: `
      This is premium content that requires payment to access.
      
      Welcome to the future of content monetization with x402 protocol!
      
      Key benefits:
      - No subscriptions required
      - Pay only for what you consume
      - Instant access with crypto payments
      - Complete privacy (no email or account needed)
      
      This content is exclusive and valuable. Thank you for supporting
      independent creators through micropayments!
    `,
    author: 'Payless Team',
    publishedAt: new Date().toISOString(),
    category: 'Technology',
    wordCount: 500,
  };

  await new Promise(resolve => setTimeout(resolve, 500));

  return NextResponse.json({
    success: true,
    data: premiumContent,
  });
}

export const GET = withMultiChainPayment(handler);

