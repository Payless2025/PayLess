import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  const body = await req.json();
  const { data, size = '256', format = 'png' } = body;

  if (!data) {
    return NextResponse.json(
      { error: 'Data is required' },
      { status: 400 }
    );
  }

  // Simulate QR code generation (in production, use qrcode library)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=${format}`;

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 500));

  return NextResponse.json({
    success: true,
    data: {
      qrCodeUrl,
      originalData: data,
      size: `${size}x${size}`,
      format,
      timestamp: new Date().toISOString(),
    },
  });
}

export const POST = withX402Payment(handler);

