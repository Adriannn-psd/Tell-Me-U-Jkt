"use client";

import { useEffect, useRef, useState } from "react";
import {
  answerConfirm,
  subscribeConfirm,
  type ConfirmView,
} from "@/lib/confirm";

/**
 * Satu-satunya tempat dialog konfirmasi digambar. Dipasang sekali di
 * app/layout.tsx, sesudah ToastHost.
 *
 * z-index-nya di atas toast (z-[200]) karena dialog ini menunggu jawaban:
 * apa pun yang lewat, dia tidak boleh ketutupan. Menyentuh area gelap dan
 * menekan Escape sama-sama berarti "batal" — arah yang aman, karena
 * pemakainya sejauh ini semua aksi hapus.
 */
export default function ConfirmHost() {
  const [view, setView] = useState<ConfirmView | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => subscribeConfirm(setView), []);

  // Fokus dipindahkan ke tombol batal, bukan tombol hapus: menekan Enter
  // karena refleks tidak boleh langsung menghapus sesuatu.
  useEffect(() => {
    if (view) cancelRef.current?.focus();
  }, [view]);

  useEffect(() => {
    if (!view) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        answerConfirm(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view]);

  if (!view) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-5">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => answerConfirm(false)}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={view.description ? "confirm-description" : undefined}
        className="relative w-full max-w-sm rounded-3xl border border-[var(--color-border-color)] bg-[var(--color-surface)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.7)] animate-in zoom-in-95 fade-in duration-200"
      >
        <h2 id="confirm-title" className="text-lg font-bold leading-tight text-white">
          {view.title}
        </h2>

        {view.description && (
          <p
            id="confirm-description"
            className="mt-2 text-sm leading-relaxed text-[var(--color-text-2)]"
          >
            {view.description}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => answerConfirm(true)}
            className={`w-full rounded-xl py-3.5 font-bold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
              view.destructive
                ? "bg-[var(--color-brand-red)] hover:bg-red-600"
                : "bg-[var(--color-surface-2)] hover:bg-[#2a2a30] border border-[var(--color-border-color)]"
            }`}
          >
            {view.confirmLabel || "Lanjutkan"}
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={() => answerConfirm(false)}
            className="w-full rounded-xl py-3 text-sm font-semibold text-[var(--color-text-3)] transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {view.cancelLabel || "Batal"}
          </button>
        </div>
      </div>
    </div>
  );
}
