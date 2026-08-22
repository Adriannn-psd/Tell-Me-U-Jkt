"use client";

/**
 * Konfirmasi "yakin mau membuang isian ini?" untuk modal yang berisi form.
 *
 * Dipasang DI DALAM kartu modalnya, bukan sebagai lapisan baru di atas layar,
 * supaya form yang sedang dipertaruhkan tetap terlihat samar di belakangnya —
 * user bisa menimbang apa yang akan hilang tanpa menutup pertanyaannya dulu.
 * Karena itu kartu induknya wajib `relative`, dan `radiusClass` harus disamakan
 * dengan sudut kartu itu supaya lapisan ini tidak menyembul di pojok.
 *
 * Aksi utamanya sengaja "Lanjut mengisi", bukan "Buang". Yang memunculkan dialog
 * ini hampir selalu sentuhan nyasar, jadi tombol yang paling besar dan paling
 * gampang ditekan harus mengembalikan user ke tempatnya semula; membuang isian
 * disediakan sebagai teks kecil yang perlu diniatkan.
 */
export default function DiscardConfirm({
  onKeep,
  onDiscard,
  description,
  radiusClass = "rounded-[24px]",
}: {
  /** Menutup pertanyaan ini dan meninggalkan form apa adanya. */
  onKeep: () => void;
  /** Benar-benar menutup modalnya. Pemanggil yang bertanggung jawab mengosongkan isian. */
  onDiscard: () => void;
  /** Sebutkan field yang akan hilang, supaya user tahu taruhannya. */
  description: string;
  /** Sudut kartu induknya, mis. "rounded-2xl". */
  radiusClass?: string;
}) {
  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 ${radiusClass} bg-[var(--color-bg)]/95 px-8 text-center`}
      role="alertdialog"
      aria-modal="true"
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-bold text-white">Buang isian ini?</h3>
        <p className="text-sm leading-relaxed text-[var(--color-text-2)]">
          {description}
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <button
          onClick={onKeep}
          className="w-full rounded-xl bg-[var(--color-brand-red)] py-3.5 font-bold text-white transition hover:bg-red-600"
        >
          Lanjut mengisi
        </button>
        <button
          onClick={onDiscard}
          className="w-full rounded-xl py-3 text-sm font-semibold text-[var(--color-text-3)] transition hover:text-white"
        >
          Buang saja
        </button>
      </div>
    </div>
  );
}
