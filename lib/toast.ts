"use client";

/**
 * Notifikasi kecil (toast) untuk menggantikan `alert()`.
 *
 * `alert()` di HP memunculkan kotak abu-abu bawaan browser dengan judul
 * "beta-tell-me-u-jkt.vercel.app menyatakan" — namanya sendiri lebih besar
 * daripada pesannya, dan tampilannya sama sekali di luar tema aplikasi. Lebih
 * dari itu `alert()` MEMBLOKIR: progress bar upload berhenti di 90% selama
 * kotaknya masih terbuka, jadi kelihatan seperti gagal padahal sudah selesai.
 *
 * State-nya disimpan di module scope, bukan React context, supaya pemanggilnya
 * cuma perlu `import { toast }` — tanpa hook, tanpa provider, dan tetap bisa
 * dipanggil dari luar komponen. Yang menggambarnya satu-satunya adalah
 * components/ToastHost.tsx yang dipasang sekali di app/layout.tsx.
 */

export type ToastKind = "success" | "error";
export type ToastItem = { id: number; kind: ToastKind; message: string };

/** Sisa umur toast di layar. Error dibiarkan lebih lama: biasanya ada yang harus dibaca dan diperbaiki. */
const LIFETIME_MS: Record<ToastKind, number> = {
  success: 4000,
  error: 6000,
};

/**
 * Pesan yang harus bertahan melewati satu kali muat ulang halaman. Dipakai
 * jalur upload karya, yang memang me-reload halaman supaya karya baru muncul —
 * tanpa titipan ini, toast "berhasil" ikut hilang bersama halamannya dan user
 * tidak pernah tahu uploadnya sukses.
 */
const QUEUE_KEY = "tmuj_toast_setelah_reload";

/** Maksimal tiga sekaligus; sisanya menggeser yang paling tua supaya tidak menumpuk sampai menutupi layar. */
const MAX_VISIBLE = 3;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<(items: ToastItem[]) => void>();

function emit() {
  listeners.forEach((listener) => listener(items));
}

function push(kind: ToastKind, message: string) {
  const text = message.trim();
  if (!text) return;

  // Pesan yang sama tidak ditumpuk, cuma disegarkan umurnya. Menekan tombol
  // simpan tiga kali dengan form yang masih kosong seharusnya menghasilkan satu
  // peringatan, bukan tiga peringatan identik.
  const item: ToastItem = { id: nextId++, kind, message: text };
  items = [...items.filter((i) => i.message !== text), item].slice(-MAX_VISIBLE);
  emit();

  if (typeof window !== "undefined") {
    window.setTimeout(() => dismissToast(item.id), LIFETIME_MS[kind]);
  }
}

export function dismissToast(id: number) {
  const next = items.filter((i) => i.id !== id);
  if (next.length === items.length) return;
  items = next;
  emit();
}

export function subscribeToasts(listener: (items: ToastItem[]) => void) {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),

  /**
   * Menitipkan pesan sukses untuk ditampilkan SETELAH halaman dimuat ulang.
   * Dipanggil tepat sebelum `window.location.reload()`.
   */
  successAfterReload(message: string) {
    try {
      sessionStorage.setItem(QUEUE_KEY, message);
    } catch {
      // Mode privat di sebagian browser melarang sessionStorage. Kehilangan satu
      // pesan konfirmasi bukan alasan untuk menggagalkan seluruh jalur upload.
    }
  },
};

/** Dipanggil sekali oleh ToastHost saat halaman baru selesai dimuat. */
export function flushQueuedToast() {
  try {
    const message = sessionStorage.getItem(QUEUE_KEY);
    if (!message) return;
    sessionStorage.removeItem(QUEUE_KEY);
    push("success", message);
  } catch {
    // Sama seperti di atas: diam-diam saja.
  }
}
