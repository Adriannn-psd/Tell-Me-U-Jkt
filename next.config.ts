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
  // Next hanya memberi cache panjang untuk /_next/static, bukan untuk file di
  // public/. Tanpa ini, 865 frame animasi landing page kena revalidasi jaringan
  // satu-satu setiap kali user scroll balik atau membuka halamannya lagi.
  //
  // Aturannya menyasar ekstensi, bukan nama folder: tiga folder telkom
  // mengandung spasi (jadi "/telkom%201/0001.webp" di URL), yang membuat pola
  // source berbasis path rapuh. Saat ini tidak ada .webp lain di public/.
  async headers() {
    return [
      {
        source: "/:path*.webp",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};
export default nextConfig;
