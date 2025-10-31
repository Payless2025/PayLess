/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    WALLET_ADDRESS: process.env.WALLET_ADDRESS,
    FACILITATOR_URL: process.env.FACILITATOR_URL,
    NETWORK: process.env.NETWORK,
    RPC_URL: process.env.RPC_URL,
    USDC_MINT: process.env.USDC_MINT,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    // Ignore node-specific modules
    config.externals.push('pino-pretty', 'encoding');
    
    return config;
  },
}

module.exports = nextConfig

