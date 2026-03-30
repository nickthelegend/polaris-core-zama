import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      },
      {
        protocol: 'https',
        hostname: 'fonts.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'github.githubassets.com',
      },
      {
        protocol: 'https',
        hostname: 'www.adobe.com',
      },
      { protocol: 'https', 
        hostname: 'upload.wikimedia.org' },
    ],
  },

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
      buffer: require.resolve("buffer"),
    };

    // Stub out React Native / non-browser transitive deps that can't be
    // resolved in a web build. These are pulled in by @metamask/sdk (via
    // RainbowKit), @privy-io/react-auth, and optionally @zama-fhe/relayer-sdk.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      '@farcaster/mini-app-solana': false,
      '@zama-fhe/relayer-sdk': false,
    };

    return config;
  },
}

export default nextConfig
