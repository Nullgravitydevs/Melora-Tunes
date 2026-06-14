import type { NextConfig } from "next";

const isElectronBuild = process.env.IS_ELECTRON_BUILD === 'true';
const isCapBuild = process.env.IS_CAP_BUILD === 'true';

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: isCapBuild, // Disable PWA for Capacitor builds (native app handles it)
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  output: isElectronBuild ? 'standalone' : isCapBuild ? 'export' : undefined,
  assetPrefix: undefined,
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg"],
  turbopack: {},
  // Rewrites & headers are NOT supported in static export mode
  ...(isCapBuild ? {} : {
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
  }),
};

export default withPWA(nextConfig);
