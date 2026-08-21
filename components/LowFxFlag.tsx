"use client";

import { useEffect } from "react";
import { applyLowFxFlag } from "@/lib/lowfx";

/**
 * Memasang penanda `data-lowfx` di <html>. Tidak merender apa pun.
 *
 * Dipasang lewat effect, bukan saat SSR, karena patokannya (`deviceMemory`,
 * `hardwareConcurrency`, `prefers-reduced-motion`) hanya ada di browser. Efeknya
 * jadi menyala sesaat setelah hidrasi — dan itu tidak masalah: yang disasar
 * adalah overlay modal, yang baru muncul setelah user menekan sesuatu.
 *
 * Ikut memperbarui saat preferensi reduce-motion diubah di tengah sesi.
 */
export default function LowFxFlag() {
  useEffect(() => {
    applyLowFxFlag();
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const onChange = () => applyLowFxFlag();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return null;
}
