import { NextRequest, NextResponse } from 'next/server';
import {
  createStream,
  getWalletStreams,
  StreamConfig,
  BillingInterval,
  getStreamMetrics,
} from '@/lib/x402/payment-streaming';
import { SupportedChain } from '@/lib/chains/config';

/**
 * POST /api/streams - Create a new payment stream
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, config, initialBalance } = body;

    // Validation
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!config || !config.ratePerInterval || !config.billingInterval || !config.serviceName) {
      return NextResponse.json(
        { error: 'Invalid stream configuration. Required: ratePerInterval, billingInterval, serviceName' },
        { status: 400 }
      );
    }

    // Set defaults
    const streamConfig: StreamConfig = {
      ratePerInterval: config.ratePerInterval,
      billingInterval: config.billingInterval as BillingInterval,
      chain: config.chain || SupportedChain.SOLANA,
      serviceName: config.serviceName,
      description: config.description,
      minBalance: config.minBalance,
      maxDuration: config.maxDuration,
    };

    // Create stream
    const stream = createStream(
      walletAddress,
      streamConfig,
      initialBalance || 0
    );

    return NextResponse.json({
      success: true,
      stream,
      message: 'Payment stream created successfully',
    });
  } catch (error) {
    console.error('Create stream error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment stream' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/streams?wallet=xxx - Get streams for a wallet
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('wallet');
    const getMetrics = searchParams.get('metrics') === 'true';

    if (getMetrics) {
      const metrics = getStreamMetrics();
      return NextResponse.json({
        success: true,
        metrics,
      });
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const streams = getWalletStreams(walletAddress);

    return NextResponse.json({
      success: true,
      streams,
      count: streams.length,
    });
  } catch (error) {
    console.error('Get streams error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streams' },
      { status: 500 }
    );
  }
}
