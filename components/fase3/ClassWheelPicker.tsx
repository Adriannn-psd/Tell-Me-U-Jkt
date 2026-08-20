"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  KELAS_MIDDLE,
  KELAS_NUMBERS,
  KELAS_TAIL_MAX_LENGTH,
  KELAS_YEARS,
  buildKelas,
  normalizeSegment,
} from "@/lib/kelas";

const ITEM_HEIGHT = 44; // px — samakan dengan h-11 di item roda

/**
 * Satu roda scroll ala iOS: 3 item terlihat, yang di tengah = terpilih.
 * Snap-nya murni CSS (`snap-y snap-mandatory`), jadi drag mouse, swipe di HP,
 * dan wheel mouse semuanya jalan tanpa library.
 */
function Wheel({
  items,
  value,
  onChange,
  label,
}: {
  items: readonly string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  // Hindari loop: scroll terprogram (scrollTo) jangan dianggap input user
  const isSyncingRef = useRef(false);

  const index = Math.max(0, items.indexOf(value));

  const scrollToIndex = useCallback((i: number, behavior: ScrollBehavior) => {
    const el = ref.current;
    if (!el) return;
    isSyncingRef.current = true;
    el.scrollTo({ top: i * ITEM_HEIGHT, behavior });
    // lepaskan flag setelah animasi snap kelar
    window.setTimeout(() => {
      isSyncingRef.current = false;
    }, behavior === "smooth" ? 350 : 50);
  }, []);

  // Posisikan roda saat pertama render / kalau value diganti dari luar
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (Math.round(el.scrollTop / ITEM_HEIGHT) !== index) {
      scrollToIndex(index, "auto");
    }
  }, [index, scrollToIndex]);

  const handleScroll = () => {
    if (isSyncingRef.current) return;
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const el = ref.current;
      if (!el) return;
      const i = Math.round(el.scrollTop / ITEM_HEIGHT);
      const next = items[Math.min(items.length - 1, Math.max(0, i))];
      if (next && next !== value) onChange(next);
    });
  };

  useEffect(
    () => () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    },
    []
  );

  const move = (delta: number) => {
    const i = Math.min(items.length - 1, Math.max(0, index + delta));
    if (items[i] !== value) onChange(items[i]);
    scrollToIndex(i, "smooth");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    }
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      className="relative h-[132px] w-16 overflow-y-auto snap-y snap-mandatory rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-red)]"
      style={{
        // scrollbar sudah disembunyikan global di app/globals.css, ini untuk Firefox
        scrollbarWidth: "none",
        maskImage:
          "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
      }}
    >
      {/* padding atas/bawah 1 item supaya item pertama & terakhir bisa ke tengah */}
      <div style={{ height: ITEM_HEIGHT }} aria-hidden />
      {items.map((item) => (
        <div
          key={item}
          role="option"
          aria-selected={item === value}
          onClick={() => move(items.indexOf(item) - index)}
          className={`flex h-11 cursor-pointer snap-center items-center justify-center font-mono text-lg transition-colors ${
            item === value
              ? "font-bold text-white"
              : "text-[var(--color-text-3)]"
          }`}
        >
          {item}
        </div>
      ))}
      <div style={{ height: ITEM_HEIGHT }} aria-hidden />
    </div>
  );
}

function FixedSegment({ text }: { text: string }) {
  return (
    <div className="flex h-11 items-center justify-center rounded-xl bg-[var(--color-surface-2)] px-3 font-mono text-lg font-bold text-white">
      {text}
    </div>
  );
}

export default function ClassWheelPicker({
  prefix,
  tahun,
  nomor,
  manual,
  onChange,
  disabled,
}: {
  prefix: string;
  tahun: string;
  nomor: string;
  manual: boolean;
  onChange: (next: { tahun: string; nomor: string; manual: boolean }) => void;
  disabled?: boolean;
}) {
  const preview = buildKelas(prefix, tahun, nomor || "??");

  const enterManual = () => {
    // mulai dari kosong supaya user tidak mengira "01" sudah benar
    onChange({ tahun, nomor: "", manual: true });
  };

  const exitManual = () => {
    onChange({ tahun, nomor: KELAS_NUMBERS[0], manual: false });
  };

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : ""}>
      <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-[var(--color-border-color)] bg-[var(--color-bg)] p-3 sm:gap-2 sm:p-4">
        <FixedSegment text={prefix} />
        <span className="font-mono text-lg text-[var(--color-text-3)]">-</span>

        <div className="relative">
          {/* band highlight di tengah */}
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 h-11 -translate-y-1/2 rounded-lg border-y border-[rgba(229,39,31,0.35)] bg-[rgba(229,39,31,0.08)]"
            aria-hidden
          />
          <Wheel
            items={KELAS_YEARS}
            value={tahun}
            onChange={(v) => onChange({ tahun: v, nomor, manual })}
            label="Tahun angkatan"
          />
        </div>

        <span className="font-mono text-lg text-[var(--color-text-3)]">-</span>
        <FixedSegment text={KELAS_MIDDLE} />
        <span className="font-mono text-lg text-[var(--color-text-3)]">-</span>

        {manual ? (
          <input
            type="text"
            autoFocus
            value={nomor}
            onChange={(e) =>
              onChange({ tahun, nomor: normalizeSegment(e.target.value), manual: true })
            }
            maxLength={KELAS_TAIL_MAX_LENGTH}
            placeholder="GAB01"
            aria-label="Kode kelas manual"
            className="h-11 w-24 rounded-xl border border-[var(--color-brand-red)] bg-[var(--color-surface)] px-2 text-center font-mono text-lg font-bold uppercase text-white outline-none placeholder:text-[var(--color-text-3)] placeholder:font-normal"
          />
        ) : (
          <div className="relative">
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 h-11 -translate-y-1/2 rounded-lg border-y border-[rgba(229,39,31,0.35)] bg-[rgba(229,39,31,0.08)]"
              aria-hidden
            />
            <Wheel
              items={KELAS_NUMBERS}
              value={nomor}
              onChange={(v) => onChange({ tahun, nomor: v, manual: false })}
              label="Nomor kelas"
            />
          </div>
        )}
      </div>

      <div className="mt-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-3)]">
          Kelas kamu
        </p>
        <p className="mt-1 font-mono text-base font-bold text-white sm:text-lg">
          {preview}
        </p>
      </div>

      <div className="mt-3 flex justify-center">
        {manual ? (
          <button
            type="button"
            onClick={exitManual}
            className="text-xs font-bold text-[var(--color-text-2)] underline decoration-dotted underline-offset-4 transition hover:text-white"
          >
            Balik ke pilihan
          </button>
        ) : (
          <button
            type="button"
            onClick={enterManual}
            className="text-xs font-bold text-[var(--color-text-2)] underline decoration-dotted underline-offset-4 transition hover:text-white"
          >
            Kelas mu tidak ada?
          </button>
        )}
      </div>

      {manual && (
        <p className="mt-2 text-center text-[11px] leading-relaxed text-[var(--color-text-3)]">
          Ketik kode kelas persis seperti di jadwal (mis. <span className="font-mono">GAB01</span>).
          Otomatis jadi huruf kapital, maks {KELAS_TAIL_MAX_LENGTH} karakter.
        </p>
      )}
    </div>
  );
}
