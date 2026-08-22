"use client";

/**
 * Dialog konfirmasi (ya/tidak) untuk menggantikan `confirm()`.
 *
 * Sama seperti `alert()`, kotak `confirm()` bawaan browser di HP muncul dengan
 * judul "beta-tell-me-u-jkt.vercel.app" dan tombol bahasa sistem — di luar tema
 * aplikasi, dan memblokir halaman selama masih terbuka.
 *
 * Bedanya dengan lib/toast.ts: yang ini harus MENGEMBALIKAN jawaban, bukan cuma
 * memberitahu. Jadi API-nya sebuah Promise, supaya pemanggilnya tetap sesingkat
 * `confirm()` yang digantikannya:
 *
 *     if (!(await confirmAction({ title: "Hapus tugas ini?" }))) return;
 *
 * State-nya di module scope (bukan React context) supaya pemanggil cuma perlu
 * satu import, tanpa hook dan tanpa provider. Yang menggambarnya satu-satunya
 * adalah components/ConfirmHost.tsx yang dipasang sekali di app/layout.tsx.
 */

export type ConfirmRequest = {
  title: string;
  description?: string;
  /** Label tombol yang melanjutkan aksi. Sebutkan aksinya ("Hapus tugas"), jangan "OK". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Aksinya menghapus/tidak bisa dibatalkan — tombol lanjutnya digambar merah. */
  destructive?: boolean;
};

/** Yang dilihat ConfirmHost: permintaan + id untuk key React. Tanpa `resolve`. */
export type ConfirmView = ConfirmRequest & { id: number };

type Pending = ConfirmView & { resolve: (answer: boolean) => void };

let pending: Pending | null = null;
let nextId = 1;
const listeners = new Set<(view: ConfirmView | null) => void>();

/** `resolve` sengaja tidak ikut keluar: penggambar tidak boleh menjawab diam-diam. */
function toView(): ConfirmView | null {
  if (!pending) return null;
  const { id, title, description, confirmLabel, cancelLabel, destructive } = pending;
  return { id, title, description, confirmLabel, cancelLabel, destructive };
}

function emit() {
  const view = toView();
  listeners.forEach((listener) => listener(view));
}

/**
 * Menampilkan dialog dan menunggu jawabannya: `true` kalau user memilih
 * melanjutkan, `false` kalau membatalkan (termasuk lewat Escape atau menyentuh
 * area gelap di luar dialog).
 */
export function confirmAction(request: ConfirmRequest): Promise<boolean> {
  // Satu dialog pada satu waktu. Kalau ada yang menumpuk — misalnya tombol
  // hapus tersentuh dua kali — permintaan kedua langsung dianggap dibatalkan
  // supaya tidak ada Promise yang menggantung tanpa pernah dijawab.
  if (pending) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    pending = { ...request, id: nextId++, resolve };
    emit();
  });
}

/** Dipanggil ConfirmHost saat user menekan salah satu tombol. */
export function answerConfirm(answer: boolean) {
  const current = pending;
  if (!current) return;

  // Dikosongkan dulu sebelum resolve: penanganan jawabannya sering langsung
  // membuka dialog berikutnya, dan itu harus lolos dari penjagaan di atas.
  pending = null;
  emit();
  current.resolve(answer);
}

export function subscribeConfirm(listener: (view: ConfirmView | null) => void) {
  listeners.add(listener);
  listener(toView());
  return () => {
    listeners.delete(listener);
  };
}
