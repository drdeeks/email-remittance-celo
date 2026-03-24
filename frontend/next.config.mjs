/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'porto/internal': false,
      '@safe-global/safe-apps-sdk': false,
      '@safe-global/safe-apps-provider': false,
      '@coinbase/wallet-sdk': false,
      'pino-pretty': false,
      '@react-native-async-storage/async-storage': false,
    };
    config.ignoreWarnings = [
      { module: /node_modules\/wagmi/ },
      { module: /node_modules\/@rainbow-me/ },
      { module: /node_modules\/@walletconnect/ },
      { module: /node_modules\/@metamask/ },
    ];
    return config;
  },
};

export default nextConfig;
