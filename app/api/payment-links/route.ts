import { NextRequest, NextResponse } from 'next/server';
import { 
  createPaymentLink, 
  listPaymentLinks, 
  deletePaymentLink,
  getPaymentLink,
  generatePaymentLinkUrl 
} from '@/lib/x402/payment-links';
import { provenAddress, proofConfigured } from '@/lib/x402/wallet-proof';
import { getAddress, isAddress } from 'viem';

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

    // Deleting used to need nothing but the id, so anyone could delete
    // anyone's link. The wallet that receives the payments is the natural
    // owner, and destroying the link now requires proving control of it.
    const link = getPaymentLink(linkId);
    if (!link) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }

    const proof = provenAddress(req.headers);
    if (proof.address === null) {
      return NextResponse.json(
        {
          error: 'Deleting a payment link requires proving you control its recipient wallet.',
          reason: proof.reason,
          howTo: proofConfigured()
            ? 'POST {"address":"<recipient>"} to /api/auth/challenge, sign it, POST to /api/auth/verify, then retry with "Authorization: Bearer <token>".'
            : 'This server has no PAYLESS_AUTH_SECRET configured, so proofs cannot be issued yet.',
        },
        { status: 401 }
      );
    }
    if (!isAddress(link.recipientAddress) || getAddress(link.recipientAddress) !== proof.address) {
      return NextResponse.json(
        { error: 'This link pays a different wallet than the one you proved.' },
        { status: 403 }
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

