"use client";

import { useEffect, useState } from "react";
import { subscribeTheme, toggleTheme, type Theme } from "@/lib/theme";

/**
 * Tombol ganti tema. Ikonnya menunjukkan tema yang AKAN dipakai kalau ditekan
 * (bulan = "pindah ke gelap"), bukan tema sekarang — itu yang bikin tombol
 * seperti ini gampang dibaca sekali lihat.
 *
 * Kelasnya sengaja sama dengan tombol Edit Profil di sebelahnya
 * (app/profile/page.tsx) supaya tingginya sebaris.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  // Awalnya "dark" supaya render server dan render pertama klien sama; effect di
  // bawah langsung menyelaraskannya dengan yang sudah dipasang skrip inline.
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => subscribeTheme(setTheme), []);

  const menujuTerang = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={menujuTerang ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      title={menujuTerang ? "Mode terang" : "Mode gelap"}
      className={`bg-[var(--color-surface)] border border-[#3a3a3d] hover:bg-[#2a2a30] transition p-2.5 rounded-xl flex items-center justify-center ${className}`}
    >
      {menujuTerang ? (
        // Matahari: menekan ini membuat tampilan terang.
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-white"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Bulan: menekan ini kembali ke gelap.
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-white"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
