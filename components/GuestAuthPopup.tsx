"use client";

import { signIn } from "next-auth/react";
import { useEffect } from "react";
import Image from "next/image";

interface GuestAuthPopupProps {
  onClose: () => void;
}

export default function GuestAuthPopup({ onClose }: GuestAuthPopupProps) {
  // Prevent scrolling when popup is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-3xl p-6 relative overflow-hidden"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.05)"
        }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-hover)] text-white hover:bg-[var(--color-surface-hover-2)] transition"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-red)]/10 flex items-center justify-center mb-4">
            <Image src="/logo.png" alt="Logo" width={40} height={40} className="drop-shadow-md" />
          </div>
          <h3 className="text-xl font-extrabold text-white mb-2">Mode Tamu</h3>
          <p className="text-sm text-[var(--color-text-2)] mb-6 leading-relaxed">
            Anda sedang menjelajah sebagai tamu. Silakan login untuk melihat karya pengguna, berinteraksi, dan bergabung dengan komunitas Tel-U JKT.
          </p>

          <button
            onClick={() => {
              // Delete guest cookie
              document.cookie = "guest_mode=; path=/; max-age=0";
              signIn("discord");
            }}
            className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-[#5865F2]/20"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.33-.35-.76-.53-1.09a.09.09 0 0 0-.07-.03c-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.12-.09.23-.19.35-.29.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.12.1.24.2.35.29.03.03.03.09-.01.11-.52.3-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.01.02.04.03.07.02 1.71-.53 3.44-1.33 5.24-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z" />
            </svg>
            Login dengan Discord
          </button>

          <p className="text-xs text-[var(--color-text-3)] mt-4">
            Belum punya akun?{" "}
            <a 
              href="https://discord.com/register" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#5865F2] font-semibold hover:underline"
            >
              Buat akun Discord
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
