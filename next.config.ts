import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dev browser may open via 127.0.0.1 while Next binds localhost — allow both.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
