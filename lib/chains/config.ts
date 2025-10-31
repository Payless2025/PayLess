/**
 * Multi-chain configuration for Payless
 * Supports Solana, BSC, and more
 */

export enum SupportedChain {
  SOLANA = 'solana',
  BSC = 'bsc',
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
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
  address: string; // Token contract address
  decimals: number;
  icon?: string;
}

// Solana Configuration
export const SOLANA_CONFIG: ChainConfig = {
  id: 'solana-mainnet',
  name: 'Solana Mainnet',
  shortName: 'Solana',
  nativeCurrency: {
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9,
  },
  rpcUrls: {
    default: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    public: [
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com',
    ],
  },
  blockExplorers: {
    default: 'https://solscan.io',
  },
  testnet: false,
  icon: '☀️',
  walletAddress: process.env.SOLANA_WALLET_ADDRESS || process.env.WALLET_ADDRESS || '',
  paymentTokens: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      decimals: 6,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      decimals: 6,
    },
  ],
};

// BSC Configuration
export const BSC_CONFIG: ChainConfig = {
  id: '56', // BSC Mainnet Chain ID
  name: 'BNB Smart Chain',
  shortName: 'BSC',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: {
    default: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org',
    public: [
      'https://bsc-dataseed1.binance.org',
      'https://bsc-dataseed2.binance.org',
      'https://bsc-dataseed3.binance.org',
    ],
  },
  blockExplorers: {
    default: 'https://bscscan.com',
  },
  testnet: false,
  icon: '🟡',
  walletAddress: process.env.BSC_WALLET_ADDRESS || process.env.WALLET_ADDRESS || '',
  paymentTokens: [
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0x55d398326f99059fF775485246999027B3197955',
      decimals: 18,
    },
    {
      symbol: 'BUSD',
      name: 'Binance USD',
      address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      decimals: 18,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      decimals: 18,
    },
  ],
};

// Ethereum Configuration (for future)
export const ETHEREUM_CONFIG: ChainConfig = {
  id: '1',
  name: 'Ethereum Mainnet',
  shortName: 'Ethereum',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    public: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
    ],
  },
  blockExplorers: {
    default: 'https://etherscan.io',
  },
  testnet: false,
  icon: '⟠',
  walletAddress: process.env.ETHEREUM_WALLET_ADDRESS || process.env.WALLET_ADDRESS || '',
  paymentTokens: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
    },
  ],
};

// Polygon Configuration (for future)
export const POLYGON_CONFIG: ChainConfig = {
  id: '137',
  name: 'Polygon Mainnet',
  shortName: 'Polygon',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: {
    default: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    public: [
      'https://polygon-rpc.com',
      'https://rpc-mainnet.matic.network',
    ],
  },
  blockExplorers: {
    default: 'https://polygonscan.com',
  },
  testnet: false,
  icon: '🟣',
  walletAddress: process.env.POLYGON_WALLET_ADDRESS || process.env.WALLET_ADDRESS || '',
  paymentTokens: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      decimals: 6,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      decimals: 6,
    },
  ],
};

// All supported chains
export const SUPPORTED_CHAINS: Record<SupportedChain, ChainConfig> = {
  [SupportedChain.SOLANA]: SOLANA_CONFIG,
  [SupportedChain.BSC]: BSC_CONFIG,
  [SupportedChain.ETHEREUM]: ETHEREUM_CONFIG,
  [SupportedChain.POLYGON]: POLYGON_CONFIG,
};

// Default chain
export const DEFAULT_CHAIN = SupportedChain.SOLANA;

// Get chain configuration
export function getChainConfig(chain: SupportedChain): ChainConfig {
  return SUPPORTED_CHAINS[chain];
}

// Get all active chains (currently Solana and BSC)
export function getActiveChains(): ChainConfig[] {
  return [
    SUPPORTED_CHAINS[SupportedChain.SOLANA],
    SUPPORTED_CHAINS[SupportedChain.BSC],
  ];
}

// Check if chain is supported
export function isChainSupported(chainId: string): boolean {
  return Object.values(SUPPORTED_CHAINS).some(config => config.id === chainId);
}

// Get chain by ID
export function getChainById(chainId: string): ChainConfig | undefined {
  return Object.values(SUPPORTED_CHAINS).find(config => config.id === chainId);
}

