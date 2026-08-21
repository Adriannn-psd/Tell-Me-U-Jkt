import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { GuestProvider } from "@/components/GuestProvider";
import GlobalScrollRestorer from "@/components/GlobalScrollRestorer";
import LowFxFlag from "@/components/LowFxFlag";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tell-me-u-jkt.vercel.app'),
  title: "Tell Me U Jkt - Portal Interaktif Mahasiswa",
  description: "Platform sosial eksklusif untuk dokumentasi, radar kampus, dan pengalaman digital mahasiswa Telkom University Jakarta.",
  openGraph: {
    title: "Tell Me U Jkt",
    description: "Jelajahi karya, temukan event seru, dan rasakan pengalaman digital tanpa batas bersama mahasiswa Telkom University Jakarta.",
    siteName: "Tell Me U Jkt",
  }
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="bg-[var(--color-bg)] min-h-screen overflow-x-hidden text-white" suppressHydrationWarning>
        <GlobalScrollRestorer />
        <LowFxFlag />
        <AuthProvider>
          <GuestProvider>
            {children}
          </GuestProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
