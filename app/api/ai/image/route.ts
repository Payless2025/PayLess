import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  const body = await req.json();
  const { prompt, size = '1024x1024' } = body;

  if (!prompt) {
    return NextResponse.json(
      { error: 'Prompt is required' },
      { status: 400 }
    );
  }

  // Simulate image generation (in production, call DALL-E/Midjourney/etc)
  const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(prompt)}/1024/1024`;

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  return NextResponse.json({
    success: true,
    data: {
      prompt,
      imageUrl,
      size,
      timestamp: new Date().toISOString(),
    },
  });
}

export const POST = withX402Payment(handler);

