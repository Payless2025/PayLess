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
}

module.exports = nextConfig

