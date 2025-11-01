import { NextRequest, NextResponse } from 'next/server';
import { 
  createPaymentLink, 
  listPaymentLinks, 
  deletePaymentLink,
  generatePaymentLinkUrl 
} from '@/lib/x402/payment-links';

/**
 * GET /api/payment-links - List all payment links
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recipientAddress = searchParams.get('recipientAddress') || undefined;

    const links = listPaymentLinks(recipientAddress);

    return NextResponse.json({
      success: true,
      links: links.map(link => ({
        ...link,
        url: generatePaymentLinkUrl(link.id),
      })),
      total: links.length,
    });
  } catch (error) {
    console.error('Error listing payment links:', error);
    return NextResponse.json(
      { error: 'Failed to list payment links' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payment-links - Create a new payment link
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, description, chains, recipientAddress, expiresIn, metadata } = body;

    // Validate required fields
    if (!amount || !recipientAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, recipientAddress' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number' },
        { status: 400 }
      );
    }

    // Create payment link
    const link = createPaymentLink({
      amount: amountNum.toString(),
      description,
      chains,
      recipientAddress,
      expiresIn,
      metadata,
    });

    const url = generatePaymentLinkUrl(link.id);

    return NextResponse.json({
      success: true,
      link: {
        ...link,
        url,
      },
      message: 'Payment link created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment link:', error);
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payment-links?id={linkId} - Delete payment link
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get('id');

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      );
    }

    const deleted = deletePaymentLink(linkId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment link deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting payment link:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment link' },
      { status: 500 }
    );
  }
}

