"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React from "react";

export function useProfileCheck() {
  const { data: session } = useSession();

  if (!session) {
    return { isComplete: true, missingInfo: [] }; // Don't block if not logged in (handled by other auth flows if needed)
  }

  const isVerified = session.user?.isVerified;
  const hasKelas = !!session.user?.kelas;
  const hasInstagram = !!session.user?.instagram;

  const isComplete = isVerified && hasKelas && hasInstagram;

  let missingInfo = [];
  if (!isVerified) missingInfo.push("memverifikasi SKL");
  if (isVerified && !hasKelas) missingInfo.push("memilih Kelas");
  if (isVerified && !hasInstagram) missingInfo.push("menambahkan Username IG");

  return { isComplete, missingInfo };
}

interface ProfileLockOverlayProps {
  onClose: () => void;
  missingInfo: string[];
}

export default function ProfileLockOverlay({ onClose, missingInfo }: ProfileLockOverlayProps) {
  const router = useRouter();

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in pointer-events-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--color-bg)] w-full max-w-lg rounded-3xl border border-[var(--color-border-color)] p-8 relative flex flex-col items-center text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 p-2 text-[var(--color-text-3)] hover:text-white transition rounded-full hover:bg-white/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        
        <div className="w-20 h-20 bg-[var(--color-brand-red)]/10 rounded-full flex items-center justify-center mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-[var(--color-brand-red)]">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0110 0v4"></path>
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3">Akses Terkunci</h2>
        <p className="text-[var(--color-text-2)] text-base mb-8">
          Kamu harus <strong>{missingInfo.join(" & ")}</strong> kamu terlebih dahulu untuk dapat menggunakan fitur ini.
        </p>
        
        <button 
          onClick={() => {
            onClose();
            router.push("/profile");
          }} 
          className="w-full bg-[var(--color-brand-red)] text-white font-bold py-4 rounded-xl hover:bg-red-600 transition text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,59,48,0.3)]"
        >
          Lengkapi Profil Sekarang
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        
        <button onClick={onClose} className="mt-4 text-[var(--color-text-3)] hover:text-white transition text-sm font-medium px-4 py-2">
          Nanti Saja
        </button>
      </div>
    </div>
  );
}
