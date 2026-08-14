import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
    proxyClientMaxBodySize: "100mb",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "aovrjliwjbfmwajhjwvb.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "cdn.discordapp.com" }
    ],
  },
};
export default nextConfig;
