/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Stub out optional peer deps that wagmi connectors reference but aren't needed
    config.resolve.alias = {
      ...config.resolve.alias,
      'porto/internal': false,
      '@safe-global/safe-apps-sdk': false,
      '@safe-global/safe-apps-provider': false,
      '@coinbase/wallet-sdk': false,
    };
    // Suppress critical dependency warnings from wagmi internals
    config.ignoreWarnings = [
      { module: /node_modules\/wagmi/ },
      { module: /node_modules\/@rainbow-me/ },
    ];
    return config;
  },
};

export default nextConfig;
