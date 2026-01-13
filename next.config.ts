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
  output: process.env.IS_ELECTRON_BUILD === 'true' ? 'export' : undefined,
  // Only use relative paths for Electron build
  assetPrefix: process.env.IS_ELECTRON_BUILD === 'true' ? './' : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  turbopack: {}
};

export default withPWA(nextConfig);
