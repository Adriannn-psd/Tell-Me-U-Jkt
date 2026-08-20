// ---- Format Kelas: JS1DKV-26-REG-01 ----
// Satu-satunya sumber kebenaran format kelas di web. Dipakai UI (picker) DAN
// API (validasi + penyusunan), jadi jangan duplikasi konstanta di tempat lain.
//
// Bot Discord (E:\Kodingan\BOT DEKVEE\cogs\autogate.py) sengaja TIDAK menyalin
// daftar prefix ini — dia baca kolom `prodi` dari DB dan memakai regex longgar,
// jadi menambah prodi/tahun baru cukup diedit di file ini. Yang perlu ditambah
// di bot cuma warna role kalau ada PRODI baru (CLASS_ROLE_COLORS).

// Nama prodi resmi (persis seperti yang ditulis deduceProdiFromJurusan() di
// app/api/verify/route.ts dan ROLE_TO_PRODI di auth.ts) → prefix kelas.
export const PRODI_CLASS_PREFIX: Record<string, string> = {
  "Desain Komunikasi Visual": "JS1DKV",
  "Sistem Informasi": "JS1SI",
  "Teknologi Informasi": "JS1TI",
  "Informatika": "JS1IF",
  "Teknik Telekomunikasi": "JS1TT",
};

export const PREFIX_TO_PRODI: Record<string, string> = Object.fromEntries(
  Object.entries(PRODI_CLASS_PREFIX).map(([prodi, prefix]) => [prefix, prodi])
);

/** Segmen tahun yang bisa di-scroll user. */
export const KELAS_YEARS = ["23", "24", "25", "26"] as const;
export const KELAS_DEFAULT_YEAR = "26";

/** Segmen tengah, paten untuk semua prodi. */
export const KELAS_MIDDLE = "REG";

/** Segmen akhir yang bisa di-scroll user (01–10 untuk semua prodi). */
export const KELAS_NUMBERS = Array.from({ length: 10 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
export const KELAS_DEFAULT_NUMBER = "01";

/** Panjang maksimal segmen akhir hasil input manual (mis. "GAB01"). */
export const KELAS_TAIL_MAX_LENGTH = 10;

const PREFIX_ALTERNATION = Object.values(PRODI_CLASS_PREFIX)
  .map((p) => p.replace(/^JS1/, ""))
  .join("|");

export const KELAS_PATTERN = new RegExp(
  `^JS1(?:${PREFIX_ALTERNATION})-(?:${KELAS_YEARS.join("|")})-${KELAS_MIDDLE}-[A-Z0-9]{1,${KELAS_TAIL_MAX_LENGTH}}$`
);

/**
 * Prodi (dari SKL) → prefix kelas. Toleran huruf besar/kecil dan variasi
 * penulisan, meneruskan logika getProdiAcronym() yang lama di /profile.
 * `null` kalau prodi tidak dikenal — pemanggil wajib menolak, jangan menebak.
 */
export function prefixForProdi(prodi?: string | null): string | null {
  if (!prodi) return null;

  const exact = PRODI_CLASS_PREFIX[prodi];
  if (exact) return exact;

  const p = prodi.toLowerCase();
  if (p.includes("sistem informasi")) return "JS1SI";
  if (p.includes("teknologi informasi")) return "JS1TI";
  if (p.includes("informatika")) return "JS1IF";
  if (p.includes("komunikasi visual") || p.includes("dkv")) return "JS1DKV";
  if (p.includes("telekomunikasi")) return "JS1TT";
  return null;
}

/** "JS1DKV-26-REG-01" → "JS1DKV". `null` kalau formatnya bukan kelas. */
export function prefixOfKelas(kelas?: string | null): string | null {
  if (!kelas) return null;
  const prefix = kelas.split("-")[0];
  return prefix && PREFIX_TO_PRODI[prefix] ? prefix : null;
}

/**
 * "JS1DKV-26-REG-01" → "Desain Komunikasi Visual".
 * Dipakai untuk mengunci prodi: kelas yang sudah paten menentukan prodi mana
 * yang boleh dipakai saat verifikasi SKL ulang.
 */
export function prodiForKelas(kelas?: string | null): string | null {
  const prefix = prefixOfKelas(kelas);
  return prefix ? PREFIX_TO_PRODI[prefix] : null;
}

/** Rapikan input user: KAPITAL semua, buang selain A-Z dan 0-9. */
export function normalizeSegment(raw?: string | null): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function buildKelas(prefix: string, tahun: string, tail: string): string {
  return `${prefix}-${tahun}-${KELAS_MIDDLE}-${tail}`;
}

export function isValidKelas(kelas?: string | null): boolean {
  return !!kelas && KELAS_PATTERN.test(kelas);
}

export function isValidKelasYear(tahun?: string | null): boolean {
  return !!tahun && (KELAS_YEARS as readonly string[]).includes(tahun);
}
