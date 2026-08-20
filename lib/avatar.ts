import { optimizeCloudinaryUrl } from "./cloudinary";

/**
 * Penulis ulang URL avatar. Kembaran optimizeCloudinaryUrl: fungsi murni,
 * dipagari per-host, aman dipanggil dengan input sampah.
 *
 * Kenapa ada: provider Discord Auth.js menyusun URL `.gif` untuk avatar Nitro
 * (hash diawali `a_`), padahal `.gif` TIDAK tersedia untuk semua avatar animasi
 * — sebagian membalas HTTP 415, jadi gambarnya rusak total. `.webp` tersedia
 * untuk semuanya, dan cuma `.webp` yang menerima `?size=` — satu-satunya cara
 * menekan ukuran (avatar animasi 134 KB @128px vs 350 KB @256px, dan `.gif`
 * selalu ukuran asli).
 *
 * Penanda animasi (`a_`) ada di dalam hash, bagian dari path — bukan di
 * ekstensi. Jadi URL `.webp` statis yang tersimpan di DB tetap membawa
 * informasi "ini bisa dianimasikan" untuk dibaca saat render.
 */

// Sengaja hanya /avatars/<id>/<hash>. Avatar default (/embed/avatars/N.png) dan
// widget-avatars punya bentuk URL berbeda dan tidak menerima ?size=.
const DISCORD_AVATAR_RE =
  /^https?:\/\/cdn\.discordapp\.com\/avatars\/(\d+)\/([A-Za-z0-9_-]+)/;

// Discord hanya menerima pangkat dua. Batas atas 1024 = ukuran unggah maksimal
// avatar; di atas itu cuma di-upscale, buang-buang byte.
const DISCORD_SIZES = [16, 32, 64, 128, 256, 512, 1024] as const;

/** CSS px → ?size= yang valid, sudah dikali 2 untuk layar retina. */
function discordSize(cssPx: number): number {
  const wanted = Math.round(cssPx * 2);
  return DISCORD_SIZES.find((s) => s >= wanted) ?? 1024;
}

/** true kalau ini avatar Discord yang punya versi animasi (hash diawali `a_`). */
export function isAnimatedAvatar(url: string | null | undefined): boolean {
  const match = DISCORD_AVATAR_RE.exec(url ?? "");
  return match ? match[2].startsWith("a_") : false;
}

/**
 * @param url  URL apa adanya dari DB / sesi
 * @param size ukuran tampil dalam CSS px (pakai breakpoint terbesar)
 * @param animated minta versi bergerak — diabaikan kalau avatarnya statis
 */
export function avatarSrc(
  url: string | null | undefined,
  options: { size?: number; animated?: boolean } = {}
): string {
  if (!url) return "";

  const { size = 40, animated = false } = options;

  const match = DISCORD_AVATAR_RE.exec(url);
  if (match) {
    const [, userId, hash] = match;
    // Disusun ulang dari nol, jadi idempoten: ekstensi & query lama dibuang,
    // termasuk kalau URL-nya sudah pernah lewat fungsi ini.
    const query = `?size=${discordSize(size)}`;
    const motion = animated && hash.startsWith("a_") ? "&animated=true" : "";
    return `https://cdn.discordapp.com/avatars/${userId}/${hash}.webp${query}${motion}`;
  }

  // Avatar hasil unggah sendiri — tanpa ini dikirim w_1080 untuk kotak 24px.
  if (url.includes("res.cloudinary.com")) {
    return optimizeCloudinaryUrl(url, { width: Math.round(size * 2) });
  }

  // Avatar default Discord, widget-avatars, Supabase, dicebear, dll.
  return url;
}
