import type { NextConfig } from "next";
import { BACKEND_URL } from "./lib/constants";

const nextConfig: NextConfig = {
  output: "standalone",
  // Server Actions default to a 1MB request body cap — too small for
  // announcements' base64-encoded images (up to ~1.37MB each, 3 per post).
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
      {
        source: "/api",
        destination: BACKEND_URL,
      },
    ];
  },
};

export default nextConfig;
