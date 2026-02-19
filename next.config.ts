import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.modogestor.com.br",
      },
      {
        protocol: "https",
        hostname: "modogestor.com.br",
      },
    ],
  },
  transpilePackages: ["lucide-react"],
};

export default nextConfig;
