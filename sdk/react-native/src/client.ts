import { 
  PaylessConfig, 
  ApiRequestOptions, 
  ApiResponse, 
  WalletAdapter, 
  PaymentProof,
  BlockchainNetwork 
} from './types';
import { 
  createSolanaPaymentProof, 
  createEvmPaymentProof,
  createMockPaymentProof, 
  paymentProofToHeader 
} from './payment';

const DEFAULT_TOKEN_ADDRESSES = {
  solana: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
  bsc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC on BSC
};

/**
 * Payless API Client for React Native
 */
export class PaylessClient {
  private config: Required<PaylessConfig>;
  private wallet?: WalletAdapter;

  constructor(config: PaylessConfig) {
    const network = config.network || 'solana';
    this.config = {
      walletAddress: config.walletAddress,
      network,
      rpcUrl: config.rpcUrl || this.getDefaultRpcUrl(network),
      tokenAddress: config.tokenAddress || DEFAULT_TOKEN_ADDRESSES[network],
      facilitatorUrl: config.facilitatorUrl || 'https://facilitator.x402.org',
      walletConnectProjectId: config.walletConnectProjectId || '',
    };
  }

  /**
   * Get default RPC URL for network
   */
  private getDefaultRpcUrl(network: BlockchainNetwork): string {
    switch (network) {
      case 'solana':
        return 'https://api.mainnet-beta.solana.com';
      case 'ethereum':
        return 'https://eth.llamarpc.com';
      case 'bsc':
        return 'https://bsc-dataseed1.binance.org';
      default:
        return '';
    }
  }

  /**
   * Connect a wallet for signing payments
   */
  connectWallet(wallet: WalletAdapter): void {
    if (wallet.network !== this.config.network) {
      console.warn(
        `Wallet network (${wallet.network}) does not match client network (${this.config.network})`
      );
    }
    this.wallet = wallet;
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    if (this.wallet?.disconnect) {
      await this.wallet.disconnect();
    }
    this.wallet = undefined;
  }

  /**
   * Get connected wallet
   */
  getWallet(): WalletAdapter | undefined {
    return this.wallet;
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    return !!this.wallet;
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
            data: paymentInfo,
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
        'DEMO_ADDRESS',
        this.config.walletAddress,
        amount,
        this.config.tokenAddress,
        this.config.network
      );
    }

    // Create payment proof based on network
    switch (this.config.network) {
      case 'solana':
        return createSolanaPaymentProof(
          this.wallet.publicKey,
          this.config.walletAddress,
          amount,
          this.config.tokenAddress,
          this.wallet.signMessage as (message: Uint8Array) => Promise<Uint8Array>
        );
      
      case 'ethereum':
      case 'bsc':
        return createEvmPaymentProof(
          this.wallet.publicKey,
          this.config.walletAddress,
          amount,
          this.config.tokenAddress,
          this.config.network,
          this.wallet.signMessage as (message: string) => Promise<string>
        );
      
      default:
        throw new Error(`Unsupported network: ${this.config.network}`);
    }
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

  /**
   * Get client configuration
   */
  getConfig(): Required<PaylessConfig> {
    return { ...this.config };
  }
}

/**
 * Create a Payless client instance
 */
export function createClient(config: PaylessConfig): PaylessClient {
  return new PaylessClient(config);
}

