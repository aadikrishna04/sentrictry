import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Suppress React DevTools extension errors
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Disable error overlay for chrome extension errors
  reactStrictMode: true,
  // Filter out chrome-extension errors in development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Suppress errors from browser extensions
      config.ignoreWarnings = [
        { module: /chrome-extension/ },
        { file: /react_devtools/ },
      ];
    }
    return config;
  },
};

export default nextConfig;

