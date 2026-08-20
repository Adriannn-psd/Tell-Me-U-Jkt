// Penanda "user sudah pernah menonton animasi opening".
//
// Disimpan sebagai cookie, bukan localStorage, supaya middleware.ts bisa
// membacanya di server dan me-redirect `/` ke `/login` sebelum HTML dikirim —
// kalau pakai localStorage, halaman harus dirender dulu lalu redirect dari
// client, dan user melihat kedip.

export const INTRO_COOKIE = "tmuj_intro_seen";

// Naikkan versinya kalau animasinya diganti: semua orang otomatis dianggap
// belum pernah menonton dan kebagian sekali lagi, tanpa perlu menghapus cookie
// lama di browser siapa pun.
export const INTRO_VERSION = "v1";

export function hasSeenIntro(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes(`${INTRO_COOKIE}=${INTRO_VERSION}`);
}

export function markIntroSeen(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${INTRO_COOKIE}=${INTRO_VERSION}; path=/; max-age=31536000; SameSite=Lax`;
}
