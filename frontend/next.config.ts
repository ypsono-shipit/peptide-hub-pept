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
  async redirects() {
    return [
      // Old trade terminal → perps; spot is the new primary market surface
      { source: "/trade", destination: "/perps", permanent: false },
      // PLP vault + PEPT stake hidden for now → spot LP earn
      { source: "/liquidity", destination: "/earn", permanent: false },
      { source: "/stake", destination: "/earn", permanent: false },
    ];
  },
};

export default nextConfig;
