import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "researchonly.io",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
