import { NextRequest, NextResponse } from 'next/server';
import { withMultiChainPayment } from '@/lib/x402/multi-chain-middleware';
import QRCode from 'qrcode';

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, size = 256, format = 'png' } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'Data is required' },
        { status: 400 }
      );
    }

    // Generate real QR code using qrcode library
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: parseInt(size.toString()),
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        qrCodeBase64: qrCodeDataURL,
        qrCodeUrl: qrCodeDataURL, // Same as base64 for compatibility
        originalData: data,
        size: `${size}x${size}`,
        format,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('QR Code generation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate QR code',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const POST = withMultiChainPayment(handler);

