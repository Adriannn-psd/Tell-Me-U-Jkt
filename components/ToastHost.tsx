"use client";

import { useEffect, useState } from "react";
import {
  dismissToast,
  flushQueuedToast,
  subscribeToasts,
  type ToastItem,
} from "@/lib/toast";

/**
 * Satu-satunya tempat toast digambar. Dipasang sekali di app/layout.tsx supaya
 * pesan tetap tampil walaupun komponen yang memicunya sudah dilepas — misalnya
 * modal upload yang menutup dirinya sendiri setelah berhasil.
 *
 * Posisinya di atas BottomNav (tinggi 72px + margin 16px, lihat
 * components/BottomNav.tsx) supaya tidak menutupi tombol navigasi di HP, dan
 * z-index-nya di atas semua modal (yang memakai z-50 sampai z-[100]).
 */
export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToasts(setItems);
    // Pesan yang dititipkan sebelum halaman ini dimuat ulang — lihat
    // toast.successAfterReload di lib/toast.ts.
    flushQueuedToast();
    return unsubscribe;
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[104px] z-[200] flex flex-col items-center gap-2 px-4 md:bottom-6"
      role="status"
      aria-live="polite"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => dismissToast(item.id)}
          aria-label={`Tutup pesan: ${item.message}`}
          className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-[#2a2a30] bg-[#1c1c1e]/95 px-4 py-3 text-left shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              item.kind === "success"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-[var(--color-brand-red)]/15 text-[var(--color-brand-red)]"
            }`}
            aria-hidden="true"
          >
            {item.kind === "success" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
          </span>

          <span className="text-sm font-medium leading-relaxed text-white">
            {item.message}
          </span>
        </button>
      ))}
    </div>
  );
}
