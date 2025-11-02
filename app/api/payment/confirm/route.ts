import { NextRequest, NextResponse } from 'next/server';
import { getTransactions } from '@/lib/x402/analytics';
import { PaymentConfirmationResponse } from '@/lib/x402/types';

/**
 * GET /api/payment/confirm
 * Query payment confirmations
 * 
 * Query parameters:
 * - signature: Payment signature to look up
 * - nonce: Payment nonce to look up
 * - walletAddress: Filter by wallet address
 * - startDate: Start date filter (timestamp)
 * - endDate: End date filter (timestamp)
 * - status: Filter by status (confirmed, pending, failed)
 * - limit: Maximum number of results to return
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Parse query parameters
    const signature = searchParams.get('signature') || undefined;
    const nonce = searchParams.get('nonce') || undefined;
    const walletAddress = searchParams.get('walletAddress') || undefined;
    const startDate = searchParams.get('startDate') 
      ? parseInt(searchParams.get('startDate')!) 
      : undefined;
    const endDate = searchParams.get('endDate') 
      ? parseInt(searchParams.get('endDate')!) 
      : undefined;
    const status = searchParams.get('status') as 'confirmed' | 'pending' | 'failed' | undefined;
    const limit = searchParams.get('limit') 
      ? parseInt(searchParams.get('limit')!) 
      : 100;

    // Get transactions from store (converted to confirmations format)
    const transactions = getTransactions({
      status: status === 'confirmed' ? 'completed' : status as any,
      fromAddress: walletAddress,
      limit: limit + 1,
    });

    // Prepare response
    const hasMore = transactions.length > limit;
    const response = {
      confirmations: transactions.slice(0, limit),
      total: transactions.length,
      hasMore,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Payment Confirm] Error:', error);
    return NextResponse.json(
      { error: 'Failed to query payment confirmations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payment/confirm
 * Verify if a specific payment was confirmed
 * 
 * Body:
 * - signature: Payment signature
 * - nonce: Payment nonce
 * - walletAddress: Wallet address
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { signature, nonce, walletAddress } = body;

    if (!signature && !nonce) {
      return NextResponse.json(
        { error: 'Either signature or nonce is required' },
        { status: 400 }
      );
    }

    // Get transactions and find matching one
    const transactions = getTransactions({
      fromAddress: walletAddress,
      limit: 1000,
    });

    let confirmation = null;

    // Try to find by signature (transaction hash)
    if (signature) {
      confirmation = transactions.find(tx => tx.transactionHash === signature);
    }

    if (!confirmation) {
      return NextResponse.json({
        confirmed: false,
        message: 'No confirmation found for the provided payment details',
      });
    }

    // If wallet address provided, verify it matches
    if (walletAddress && confirmation.fromAddress !== walletAddress) {
      return NextResponse.json({
        confirmed: false,
        message: 'Wallet address does not match the payment confirmation',
      });
    }

    return NextResponse.json({
      confirmed: true,
      confirmation,
      message: 'Payment confirmed successfully',
    });
  } catch (error) {
    console.error('[Payment Confirm] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment confirmation' },
      { status: 500 }
    );
  }
}

