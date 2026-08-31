/**
 * Chain configuration for Payless
 *
 * Payless settles exclusively on Robinhood Chain — an EVM (Arbitrum Orbit) L2
 * that uses ETH for gas. Network parameters:
 *   https://robinhood.com/us/en/support/articles/robinhood-chain-mainnet/
 *
 * Every value below can be overridden with an environment variable so the same
 * build can be pointed at the testnet without a code change.
 */

export enum SupportedChain {
  ROBINHOOD = 'robinhood',
}

export interface ChainConfig {
  id: string;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: string;
    public: string[];
  };
  blockExplorers: {
    default: string;
  };
  testnet: boolean;
  icon: string;
  walletAddress: string; // Your wallet address on this chain
  paymentTokens: PaymentToken[];
}

export interface PaymentToken {
  symbol: string;
  name: string;
  address: string; // ERC-20 contract address
  decimals: number;
  icon?: string;
}

// Canonical Robinhood Chain token contracts.
// Source: https://docs.robinhood.com/chain/contracts/
export const USDG_ADDRESS = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
export const WETH_ADDRESS = '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73';

/**
 * $PAYLESS — the project's own token on Robinhood Chain.
 *
 * A contract address is public by definition, so it lives in code rather than
 * in an environment variable: one source of truth for both the footer and token
 * gating, and nothing to forget to set on a new deploy. When the token is
 * redeployed, change it here. `PAYLESS_TOKEN_ADDRESS` still overrides it for
 * testing against another deployment.
 *
 * Redeployed 2026-08-31. The previous contract at
 * 0xB8A30979F583a8c5340dC1B58203De7569AAe806 is superseded — same name and
 * symbol, so always check the address.
 */
export const PAYLESS_TOKEN = {
  address:
    process.env.PAYLESS_TOKEN_ADDRESS ||
    process.env.NEXT_PUBLIC_PAYLESS_TOKEN_ADDRESS ||
    '0x18644D2828C9FD107e8fAEB1F2f978957eA5BD74',
  symbol: 'PAYLESS',
  decimals: process.env.PAYLESS_TOKEN_DECIMALS
    ? Number(process.env.PAYLESS_TOKEN_DECIMALS)
    : 18,
  totalSupply: 1_000_000_000,
};

export const ROBINHOOD_CHAIN_ID =
  process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID || process.env.ROBINHOOD_CHAIN_ID || '4663';

export const ROBINHOOD_RPC_URL =
  process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ||
  process.env.ROBINHOOD_RPC_URL ||
  'https://rpc.mainnet.chain.robinhood.com';

export const ROBINHOOD_EXPLORER_URL =
  process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL ||
  process.env.ROBINHOOD_EXPLORER_URL ||
  'https://robinhoodchain.blockscout.com';

export const ROBINHOOD_CONFIG: ChainConfig = {
  id: ROBINHOOD_CHAIN_ID,
  name: 'Robinhood Chain',
  shortName: 'Robinhood',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: ROBINHOOD_RPC_URL,
    public: ['https://rpc.mainnet.chain.robinhood.com'],
  },
  blockExplorers: {
    default: ROBINHOOD_EXPLORER_URL,
  },
  testnet: process.env.ROBINHOOD_NETWORK === 'testnet',
  icon: '🪶',
  walletAddress:
    process.env.ROBINHOOD_WALLET_ADDRESS || process.env.WALLET_ADDRESS || '',
  paymentTokens: [
    {
      symbol: 'USDG',
      name: 'Global Dollar',
      address: process.env.USDG_ADDRESS || USDG_ADDRESS,
      decimals: 6,
    },
    {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      address: process.env.WETH_ADDRESS || WETH_ADDRESS,
      decimals: 18,
    },
  ],
};

// All supported chains
export const SUPPORTED_CHAINS: Record<SupportedChain, ChainConfig> = {
  [SupportedChain.ROBINHOOD]: ROBINHOOD_CONFIG,
};

// Default chain
export const DEFAULT_CHAIN = SupportedChain.ROBINHOOD;

// The token payments are denominated in
export const DEFAULT_PAYMENT_TOKEN = ROBINHOOD_CONFIG.paymentTokens[0];

// Get chain configuration
export function getChainConfig(chain: SupportedChain = DEFAULT_CHAIN): ChainConfig {
  return SUPPORTED_CHAINS[chain];
}

// Get all active chains
export function getActiveChains(): ChainConfig[] {
  return [ROBINHOOD_CONFIG];
}

// Check if chain is supported
export function isChainSupported(chainId: string): boolean {
  return Object.values(SUPPORTED_CHAINS).some((config) => config.id === chainId);
}

// Get chain by ID
export function getChainById(chainId: string): ChainConfig | undefined {
  return Object.values(SUPPORTED_CHAINS).find((config) => config.id === chainId);
}

// Look up a payment token by symbol (case-insensitive)
export function getPaymentToken(symbol: string): PaymentToken | undefined {
  return ROBINHOOD_CONFIG.paymentTokens.find(
    (token) => token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}
