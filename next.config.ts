import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@taiwu/shared"],
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",").map(s => s.trim()) ?? [
    "localhost",
    "172.28.105.125",
    "192.168.0.106",
    "172.28.43.55",
    "172.28.55.57",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
    ],
    formats: ["image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lottie-react"],
  },
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
