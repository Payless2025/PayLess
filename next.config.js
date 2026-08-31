/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Runs once per server start — installs the shared replay/subscription stores.
  experimental: {
    instrumentationHook: true,
  },

  // Note: there is deliberately no `env` block. Inlining values at build time
  // is what made a changed environment variable look like it had no effect —
  // the build had already baked the old one in. Server code reads process.env
  // at request time instead, and anything the browser needs is NEXT_PUBLIC_.

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

    config.externals.push('pino-pretty', 'encoding');

    return config;
  },
};

module.exports = nextConfig;
