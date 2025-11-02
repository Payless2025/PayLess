import { NextResponse } from 'next/server';
import { getTransactions } from '@/lib/x402/analytics';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') as any,
      chain: searchParams.get('chain') as any,
      fromAddress: searchParams.get('from') || undefined,
      toAddress: searchParams.get('to') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const transactions = getTransactions(filters);

    return NextResponse.json({
      success: true,
      transactions,
      total: transactions.length,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transactions',
      },
      { status: 500 }
    );
  }
}

