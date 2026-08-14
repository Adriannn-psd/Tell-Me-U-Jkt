import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { GuestProvider } from "@/components/GuestProvider";
import GlobalScrollRestorer from "@/components/GlobalScrollRestorer";

export const metadata: Metadata = {
  title: "Tell Me U Jkt",
  description: "Selamat datang di Tell Me U JKT",
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
        <AuthProvider>
          <GuestProvider>
            {children}
          </GuestProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
