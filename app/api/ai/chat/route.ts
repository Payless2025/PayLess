import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  const body = await req.json();
  const { message, model = 'gpt-4' } = body;

  if (!message) {
    return NextResponse.json(
      { error: 'Message is required' },
      { status: 400 }
    );
  }

  // Simulate AI response (in production, call OpenAI/Claude/etc)
  const responses = [
    `As an AI assistant, I understand your query: "${message}". Here's my thoughtful response...`,
    `That's an interesting question about "${message}". Let me explain...`,
    `Based on your input "${message}", I can provide the following insights...`,
  ];

  const response = responses[Math.floor(Math.random() * responses.length)];

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));

  return NextResponse.json({
    success: true,
    data: {
      message: response,
      model,
      tokens: Math.floor(Math.random() * 1000) + 100,
      timestamp: new Date().toISOString(),
    },
  });
}

export const POST = withX402Payment(handler);

