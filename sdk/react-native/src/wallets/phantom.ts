import { WalletAdapter, PhantomProvider } from '../types';
import { Linking } from 'react-native';

/**
 * Phantom Mobile Wallet Adapter for React Native
 */
export class PhantomWalletAdapter implements WalletAdapter {
  public publicKey: string = '';
  public network: 'solana' = 'solana';
  private provider?: PhantomProvider;
  private deepLinkScheme: string;

  constructor(deepLinkScheme: string = 'paylessapp') {
    this.deepLinkScheme = deepLinkScheme;
  }

  /**
   * Connect to Phantom wallet
   */
  async connect(): Promise<void> {
    try {
      // Build Phantom deep link for connection
      const url = this.buildPhantomUrl('connect', {
        app_url: this.deepLinkScheme,
        cluster: 'mainnet-beta',
      });

      // Open Phantom app
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        throw new Error('Phantom wallet is not installed. Please install Phantom from the App Store or Google Play.');
      }

      await Linking.openURL(url);

      // Wait for response (implement deep link listener in your app)
      // This is a simplified version - you need to implement deep link handling
      throw new Error('Please implement deep link handling to complete Phantom connection');
    } catch (error) {
      throw new Error(`Failed to connect to Phantom: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign a message with Phantom wallet
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // Build Phantom deep link for signing
      const messageBase58 = Buffer.from(message).toString('base64');
      const url = this.buildPhantomUrl('signMessage', {
        message: messageBase58,
        display: 'utf8',
      });

      await Linking.openURL(url);

      // Wait for response (implement deep link listener in your app)
      throw new Error('Please implement deep link handling to complete message signing');
    } catch (error) {
      throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect from Phantom wallet
   */
  async disconnect(): Promise<void> {
    this.publicKey = '';
    this.provider = undefined;

    const url = this.buildPhantomUrl('disconnect', {});
    await Linking.openURL(url).catch(() => {
      // Ignore errors on disconnect
    });
  }

  /**
   * Build Phantom deep link URL
   */
  private buildPhantomUrl(action: string, params: Record<string, string>): string {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    return `phantom://v1/${action}?${queryString}`;
  }

  /**
   * Handle deep link response from Phantom
   * Call this method when your app receives a deep link response
   */
  handleDeepLinkResponse(url: string): void {
    try {
      const params = new URL(url).searchParams;
      
      if (params.has('public_key')) {
        this.publicKey = params.get('public_key') || '';
      }
      
      // Handle other response types (signature, etc.)
    } catch (error) {
      console.error('Failed to parse Phantom deep link response:', error);
    }
  }
}

/**
 * Create a Phantom wallet adapter
 */
export function createPhantomWallet(deepLinkScheme?: string): PhantomWalletAdapter {
  return new PhantomWalletAdapter(deepLinkScheme);
}

