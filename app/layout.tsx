import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { GuestProvider } from "@/components/GuestProvider";
import GlobalScrollRestorer from "@/components/GlobalScrollRestorer";
import LowFxFlag from "@/components/LowFxFlag";
import ToastHost from "@/components/ToastHost";
import ConfirmHost from "@/components/ConfirmHost";

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
      <body className="bg-[var(--color-bg)] min-h-screen overflow-x-hidden text-[var(--color-text-1)]" suppressHydrationWarning>
        {/*
          Tema dipasang di sini, sebagai skrip biasa yang jalan saat HTML masih
          dibaca — bukan di useEffect. Effect berjalan SETELAH gambar pertama,
          jadi user mode terang akan melihat kedipan gelap dulu tiap kali buka
          halaman. Kunci localStorage-nya harus sama dengan THEME_STORAGE_KEY di
          lib/theme.ts.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('tmuj_tema');if(t!=='light'&&t!=='dark'){t='dark'}var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t;if(t==='light'){var m=document.querySelector('meta[name="theme-color"]');if(m){m.setAttribute('content','#f1f1f5')}}}catch(e){}`,
          }}
        />
        <GlobalScrollRestorer />
        <LowFxFlag />
        <AuthProvider>
          <GuestProvider>
            {children}
          </GuestProvider>
        </AuthProvider>
        {/*
          Di luar provider dan di paling bawah body: toast tidak butuh sesi
          maupun status tamu, dan menaruhnya terakhir membuatnya menang urutan
          tumpuk melawan modal tanpa perlu menaikkan z-index lebih jauh.
        */}
        <ToastHost />
        {/* Menunggu jawaban, jadi digambar paling akhir dan paling atas. */}
        <ConfirmHost />
      </body>
    </html>
  );
}
