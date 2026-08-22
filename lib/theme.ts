"use client";

/**
 * Pilihan tema terang/gelap.
 *
 * Aplikasi ini lahir gelap: tokennya di app/globals.css, dan 1000+ tempat
 * memanggilnya lewat `var(--color-…)`. Jadi temanya tidak diganti per komponen,
 * melainkan dengan menulis `data-theme` di elemen <html>; seluruh token ikut
 * berubah dari satu tempat (lihat app/theme-light.css).
 *
 * Pola state-nya sama seperti lib/toast.ts dan lib/confirm.ts: module scope,
 * tanpa provider, jadi tombolnya cuma perlu satu import.
 *
 * PENTING: nilai awal harus sudah terpasang SEBELUM halaman digambar, kalau
 * tidak user mode terang akan melihat kedipan gelap dulu. Itu dikerjakan skrip
 * kecil inline di app/layout.tsx — kunci localStorage dan nama atribut di sana
 * harus sama dengan yang di file ini.
 */

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "tmuj_tema";

/** Warna bilah status browser di HP, mengikuti --color-bg tiap tema. */
const THEME_COLOR: Record<Theme, string> = {
  dark: "#0a0a0b",
  light: "#f1f1f5",
};

let current: Theme = "dark";
const listeners = new Set<(theme: Theme) => void>();

function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  // Supaya scrollbar, teks terpilih, dan kontrol form bawaan (date picker,
  // dropdown) ikut terang — itu digambar browser, di luar jangkauan CSS kita.
  root.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[theme]);
}

/**
 * Membaca tema yang sudah dipasang skrip inline di <html>. Dipanggil komponen
 * saat mount: sumber kebenarannya DOM, bukan variabel di modul ini, karena
 * skrip inline berjalan lebih dulu.
 */
export function syncThemeFromDocument(): Theme {
  if (typeof document !== "undefined") {
    const fromDom = document.documentElement.dataset.theme;
    if (isTheme(fromDom)) current = fromDom;
  }
  return current;
}

export function getTheme(): Theme {
  return current;
}

export function setTheme(theme: Theme) {
  current = theme;
  apply(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Mode privat di sebagian browser melarang localStorage. Temanya tetap
    // berubah untuk sesi ini, cuma tidak diingat setelah tab ditutup.
  }
  listeners.forEach((listener) => listener(theme));
}

export function toggleTheme() {
  setTheme(current === "dark" ? "light" : "dark");
}

export function subscribeTheme(listener: (theme: Theme) => void) {
  listeners.add(listener);
  listener(syncThemeFromDocument());
  return () => {
    listeners.delete(listener);
  };
}
