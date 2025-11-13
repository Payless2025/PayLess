import { NextRequest, NextResponse } from 'next/server';
import { 
  getTransactions, 
  getAllTransactions, 
  generateMockTransactions,
  type Transaction 
} from '@/lib/x402/analytics';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    
    // Generate mock data if needed
    if (getAllTransactions().length === 0) {
      generateMockTransactions(50);
    }

    // Parse filters from query params
    const filters: {
      status?: Transaction['status'];
      chain?: Transaction['chain'];
      fromAddress?: string;
      toAddress?: string;
      limit?: number;
      offset?: number;
      startDate?: number;
      endDate?: number;
      search?: string;
    } = {};

    const status = searchParams.get('status');
    if (status && ['pending', 'completed', 'failed'].includes(status)) {
      filters.status = status as Transaction['status'];
    }

    const chain = searchParams.get('chain');
    if (chain && ['solana', 'bsc', 'ethereum'].includes(chain)) {
      filters.chain = chain as Transaction['chain'];
    }

    const fromAddress = searchParams.get('from');
    if (fromAddress) {
      filters.fromAddress = fromAddress;
    }

    const toAddress = searchParams.get('to');
    if (toAddress) {
      filters.toAddress = toAddress;
    }

    const limit = searchParams.get('limit');
    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    const offset = searchParams.get('offset');
    if (offset) {
      filters.offset = parseInt(offset, 10);
    }

    const startDate = searchParams.get('startDate');
    if (startDate) {
      filters.startDate = parseInt(startDate, 10);
    }

    const endDate = searchParams.get('endDate');
    if (endDate) {
      filters.endDate = parseInt(endDate, 10);
    }

    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }

    // Get filtered transactions
    let transactions = getTransactions(filters);

    // Apply date range filter if provided
    if (filters.startDate || filters.endDate) {
      transactions = transactions.filter(tx => {
        if (filters.startDate && tx.timestamp < filters.startDate) return false;
        if (filters.endDate && tx.timestamp > filters.endDate) return false;
        return true;
      });
    }

    // Apply search filter if provided
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      transactions = transactions.filter(tx => 
        tx.id.toLowerCase().includes(searchLower) ||
        tx.transactionHash?.toLowerCase().includes(searchLower) ||
        tx.description?.toLowerCase().includes(searchLower) ||
        tx.fromAddress.toLowerCase().includes(searchLower) ||
        tx.toAddress.toLowerCase().includes(searchLower)
      );
    }

    // Calculate stats
    const totalTransactions = transactions.length;
    const totalAmount = transactions
      .filter(tx => tx.status === 'completed')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    return NextResponse.json({
      success: true,
      count: transactions.length,
      total: totalAmount.toFixed(2),
      transactions,
      filters,
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch payment history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Export transactions as CSV or JSON
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { format = 'json', filters = {} } = body;

    // Get filtered transactions
    let transactions = getTransactions(filters);

    // Apply additional filters if needed
    if (filters.startDate || filters.endDate) {
      transactions = transactions.filter(tx => {
        if (filters.startDate && tx.timestamp < filters.startDate) return false;
        if (filters.endDate && tx.timestamp > filters.endDate) return false;
        return true;
      });
    }

    if (format === 'csv') {
      // Convert to CSV
      const headers = [
        'ID',
        'Date',
        'Amount',
        'Currency',
        'Chain',
        'Status',
        'From',
        'To',
        'Transaction Hash',
        'Description',
      ];

      const rows = transactions.map(tx => [
        tx.id,
        new Date(tx.timestamp).toISOString(),
        tx.amount,
        tx.currency,
        tx.chain,
        tx.status,
        tx.fromAddress,
        tx.toAddress,
        tx.transactionHash || '',
        tx.description || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payless-history-${Date.now()}.csv"`,
        },
      });
    }

    // Return as JSON
    return NextResponse.json({
      success: true,
      count: transactions.length,
      transactions,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error exporting payment history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export payment history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

