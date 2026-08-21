/**
 * Deteksi device yang tidak sanggup menanggung efek berat, lalu tandai di <html>
 * sebagai `data-lowfx`.
 *
 * Yang paling mahal di app ini adalah `backdrop-filter: blur()` pada overlay
 * selebar layar — ada 26 tempat, dan tiap satunya memaksa compositor membaca
 * lalu mem-blur seluruh halaman di belakangnya. Di HP RAM kecil / CPU rendah itu
 * yang membuat "buka fitur" terasa berat.
 *
 * Penandanya sengaja satu atribut di <html>, bukan context React: CSS bisa
 * membacanya sendiri, jadi ke-26 overlay ikut tertangani tanpa perlu menyentuh
 * 26 file — termasuk overlay baru yang ditambahkan nanti.
 */

export const LOWFX_ATTR = "data-lowfx";

/**
 * `deviceMemory` (GB, dibulatkan browser ke 0.25/0.5/1/2/4/8) hanya ada di
 * Chromium; di Safari selalu undefined, jadi patokannya jatuh ke jumlah core dan
 * preferensi sistem. Ambangnya 4 karena HP kelas bawah umumnya melapor <= 4 GB
 * dan <= 4 core.
 */
export function isLowEndDevice(): boolean {
  if (typeof window === "undefined") return false;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };

  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return true;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) {
    return true;
  }
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;

  return false;
}

export function applyLowFxFlag(): void {
  if (typeof document === "undefined") return;
  if (isLowEndDevice()) {
    document.documentElement.setAttribute(LOWFX_ATTR, "");
  } else {
    document.documentElement.removeAttribute(LOWFX_ATTR);
  }
}
