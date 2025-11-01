import { NextRequest, NextResponse } from 'next/server';
import { getPaymentLink, completePaymentLink } from '@/lib/x402/payment-links';

/**
 * GET /api/payment-links/[id] - Get payment link details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const link = getPaymentLink(params.id);

    if (!link) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      link,
    });
  } catch (error) {
    console.error('Error fetching payment link:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment link' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payment-links/[id]/complete - Mark payment as completed
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { transactionSignature, paidBy, paidChain } = body;

    if (!transactionSignature || !paidBy || !paidChain) {
      return NextResponse.json(
        { error: 'Missing required fields: transactionSignature, paidBy, paidChain' },
        { status: 400 }
      );
    }

    const completed = completePaymentLink(
      params.id,
      transactionSignature,
      paidBy,
      paidChain
    );

    if (!completed) {
      return NextResponse.json(
        { error: 'Payment link not found or already completed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment completed successfully',
    });
  } catch (error) {
    console.error('Error completing payment:', error);
    return NextResponse.json(
      { error: 'Failed to complete payment' },
      { status: 500 }
    );
  }
}

