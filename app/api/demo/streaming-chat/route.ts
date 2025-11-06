import { NextRequest, NextResponse } from 'next/server';
import { withPaymentStreaming } from '@/lib/x402/payment-streaming';

/**
 * Demo: Streaming AI Chat API
 * Charges per second of conversation time
 * Rate: 0.001 SOL per second (~$0.0002/sec at current prices)
 */
export const POST = withPaymentStreaming(
  async (req: Request, stream) => {
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock AI response
    const responses = [
      "That's an interesting question! Let me think...",
      "Based on the data, I'd say...",
      "From my analysis, it appears that...",
      "Great point! Here's what I found...",
      "Let me break that down for you...",
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];

    return NextResponse.json({
      success: true,
      message: response,
      stream: {
        id: stream.streamId,
        status: stream.status,
        duration: Math.floor((Date.now() - stream.startTime) / 1000),
        cost: Math.floor((Date.now() - stream.startTime) / 1000) * stream.ratePerSecond,
        ratePerSecond: stream.ratePerSecond,
      },
      note: 'This is a demo. Real implementation would include actual AI processing.',
    });
  },
  {
    serviceId: 'streaming-chat-demo',
    recipientAddress: '9aXHxhNtiAjbysGFmm4RG4hVDMtvhMMQfKpT2xQ7GLg1',
    ratePerSecond: 1_000_000, // 0.001 SOL per second
    chain: 'solana',
  }
);

