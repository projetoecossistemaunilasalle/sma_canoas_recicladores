import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || "http://backend:3001";

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
        destination: `${backendUrl}/:path*`,
      },
      {
        source: "/api",
        destination: `${backendUrl}`,
      },
    ];
  },
};

export default nextConfig;
