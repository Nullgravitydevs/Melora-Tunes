import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: false, // Enable in dev so user can test "Add to Home Screen" behavior
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  output: process.env.IS_ELECTRON_BUILD === 'true' ? 'standalone' : undefined,
  // Only use relative paths for Electron build
  assetPrefix: undefined,
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg"],
  turbopack: {},
  async rewrites() {
    return [
      {
        source: '/api/proxy',
        destination: 'https://www.jiosaavn.com/api.php',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/service-worker.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
