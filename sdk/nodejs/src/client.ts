import { PaylessConfig, ApiRequestOptions, ApiResponse, WalletAdapter, PaymentProof } from './types';
import { createPaymentProof, createMockPaymentProof, paymentProofToHeader } from './payment';

const DEFAULT_CONFIG = {
  network: 'mainnet-beta' as const,
  usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Solana USDC
  facilitatorUrl: 'https://facilitator.x402.org',
};

/**
 * Payless API Client
 */
export class PaylessClient {
  private config: Required<PaylessConfig>;
  private wallet?: WalletAdapter;

  constructor(config: PaylessConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      rpcUrl: config.rpcUrl || `https://api.${config.network || 'mainnet-beta'}.solana.com`,
    };
  }

  /**
   * Connect a wallet for signing payments
   */
  connectWallet(wallet: WalletAdapter): void {
    this.wallet = wallet;
  }

  /**
   * Make a request to a Payless-protected API endpoint
   */
  async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const {
        method = 'GET',
        headers = {},
        body,
        paymentAmount,
      } = options;

      // Validate endpoint
      if (!endpoint) {
        return {
          success: false,
          error: 'Endpoint is required',
          status: 400,
        };
      }

      // First, try without payment to see if it's required
      let response = await this.makeHttpRequest(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      // If payment is required (402 status), create payment and retry
      if (response.status === 402) {
        const paymentInfo = await response.json().catch(() => ({}));
        const amount = paymentAmount || paymentInfo.payment?.amount;

        if (!amount) {
          return {
            success: false,
            error: 'Payment amount not specified. Please provide paymentAmount option.',
            status: 402,
          };
        }

        // Create payment proof
        try {
          const paymentProof = await this.createPayment(amount);
          const paymentHeader = paymentProofToHeader(paymentProof);

          // Retry with payment
          response = await this.makeHttpRequest(endpoint, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'X-Payment': paymentHeader,
              ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
          });
        } catch (paymentError) {
          return {
            success: false,
            error: `Payment creation failed: ${paymentError instanceof Error ? paymentError.message : 'Unknown error'}`,
            status: 402,
          };
        }
      }

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? (typeof data === 'object' ? data.error : data) || `Request failed with status ${response.status}` : undefined,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: `Request error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 0,
      };
    }
  }

  /**
   * Make a GET request
   */
  async get<T = any>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Make a POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * Create a payment proof
   */
  private async createPayment(amount: string): Promise<PaymentProof> {
    if (!this.wallet) {
      // If no wallet connected, create mock payment for testing
      return createMockPaymentProof(
        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Demo address
        this.config.walletAddress,
        amount,
        this.config.usdcMint
      );
    }

    return createPaymentProof(
      this.wallet.publicKey,
      this.config.walletAddress,
      amount,
      this.config.usdcMint,
      this.wallet.signMessage
    );
  }

  /**
   * Make HTTP request
   */
  private async makeHttpRequest(endpoint: string, options: RequestInit): Promise<Response> {
    // Handle relative URLs
    const url = endpoint.startsWith('http') ? endpoint : endpoint;
    
    return fetch(url, options);
  }

  /**
   * Get API information
   */
  async getApiInfo(): Promise<ApiResponse> {
    return this.get('/api/info');
  }

  /**
   * Get API health status
   */
  async getHealth(): Promise<ApiResponse> {
    return this.get('/api/health');
  }
}

/**
 * Create a Payless client instance
 */
export function createClient(config: PaylessConfig): PaylessClient {
  return new PaylessClient(config);
}

