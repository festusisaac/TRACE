import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phones on the same network are a different origin from localhost. Without
  // this, Next blocks the dev connection and the complaint form reloads.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
  cacheComponents: true,
  devIndicators: false,
  serverExternalPackages: ["@libsql/client"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
