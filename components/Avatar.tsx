"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { avatarSrc, isAnimatedAvatar } from "@/lib/avatar";

/**
 * Batas ukuran versi bergerak. Avatar animasi 30–70× lebih berat dari statis
 * (49–134 KB vs ~1,9 KB), jadi jangan ikut membesar sampai 256/512 walau
 * kotaknya besar — di lingkaran ber-`object-cover` bedanya tidak kelihatan.
 */
const ANIMATED_MAX_SIZE = 128;

/**
 * Beberapa pemanggil mengisi field avatar dengan huruf inisial, bukan URL
 * (`avatar: p.author?.avatar_url || "U"` di app/karya/page.tsx & components/Feed.tsx).
 */
function hasRealSrc(src: string | null | undefined): src is string {
  return typeof src === "string" && src.trim().length > 2;
}

/**
 * Isi bagian DALAM wrapper avatar bulat — sengaja tidak membawa wrapper sendiri,
 * supaya cincin gradien, border, posisi absolut, dan <Link> di tiap pemanggil
 * tetap seperti aslinya. Selalu mengisi penuh (`h-full w-full`).
 *
 * Avatar Nitro (animasi) default-nya DIAM dan baru bergerak saat di-hover
 * (di HP: saat di-tap), meniru Discord sendiri — biar feed berisi 20 avatar
 * tidak menarik ~1 MB dan tidak menjalankan 20 animasi sekaligus.
 */
export default function Avatar({
  src,
  size,
  alt = "",
  fallback = null,
  animate = "hover",
  animatedSize,
  className = "",
  onClick,
  title,
}: {
  src: string | null | undefined;
  /** Ukuran tampil dalam CSS px — pakai breakpoint TERBESAR (`w-16 md:w-24` → 96). */
  size: number;
  alt?: string;
  /** JSX yang dipakai kalau tidak ada avatar (biasanya inisial huruf). */
  fallback?: ReactNode;
  /** "hover" (default) = diam sampai disentuh · "always" = langsung bergerak. */
  animate?: "hover" | "always";
  /** Naikkan batas ukuran versi bergerak, mis. untuk modal preview. */
  animatedSize?: number;
  /** Kelas tambahan untuk <img>-nya (border, rounded, cursor). */
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  const [hot, setHot] = useState(false);
  const [animatedReady, setAnimatedReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // URL yang sudah terbukti gagal dimuat — bukan boolean, supaya statusnya
  // otomatis lupa sendiri begitu `src` berganti (mis. user baru mengunggah
  // avatar baru) tanpa perlu useEffect penyetel-ulang.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  // Sentuhan tidak punya "keluar dari area" yang wajar: sekali di-tap, biarkan
  // terus bergerak — user memang sengaja menyuruhnya bergerak.
  const latchedRef = useRef(false);

  // Dihitung sebelum semua early-return karena useEffect di bawah butuh ini
  // sebagai dependensi. avatarSrc() aman dipanggil dengan src kosong.
  const staticSrc = hasRealSrc(src) ? avatarSrc(src, { size }) : "";

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /**
   * `onError` saja TIDAK cukup, dan ini sudah dibuktikan gagal sekali: halaman
   * ini dirender di server, jadi <img>-nya sudah ada di HTML dan browser sempat
   * gagal memuatnya SEBELUM React hydrate. Event error-nya lewat sebelum ada
   * yang mendengarkan, dan gambar rusaknya bertahan di layar.
   *
   * Jadi begitu node-nya terpasang, statusnya diperiksa sekali secara langsung:
   * `complete` tapi `naturalWidth === 0` cuma mungkin berarti pemuatannya sudah
   * selesai dengan gagal. Kalau ternyata masih dalam perjalanan, `onError`
   * yang mengambil alih.
   */
  useEffect(() => {
    const node = imgRef.current;
    if (node && node.complete && node.naturalWidth === 0) setFailedSrc(staticSrc);
  }, [staticSrc]);

  if (!hasRealSrc(src)) return <>{fallback}</>;

  const imgClassName = `h-full w-full object-cover ${className}`.trim();

  /**
   * URL yang ada tapi mati harus jatuh ke `fallback` juga, bukan cuma URL yang
   * kosong. Tanpa ini browser melukis teks `alt` mentah di atas cincin gradien
   * pemanggilnya — itu yang terjadi pada avatar Discord yang hash-nya sudah
   * basi: pemiliknya ganti foto, hash lama langsung 404, dan `users.avatar_url`
   * baru diperbarui saat dia login lagi (callback `signIn` di auth.ts).
   *
   * Yang dipantau cukup versi statisnya. Versi bergerak berasal dari hash yang
   * sama, jadi kalau yang statis 404 yang bergerak pasti ikut; dan sebaliknya
   * kalau cuma yang bergerak gagal, yang statis tetap terlihat karena memang
   * tidak pernah dilepas dari DOM.
   */
  if (failedSrc === staticSrc) return <>{fallback}</>;

  // `always` hanya dipakai di avatar besar yang pasti terlihat (header profil,
  // modal preview) — jangan ditunda-tunda.
  const loading = animate === "always" ? "eager" : "lazy";
  const markFailed = () => setFailedSrc(staticSrc);

  // Avatar statis (mayoritas): satu <img> biasa, tanpa lapisan kedua.
  if (!isAnimatedAvatar(src)) {
    return (
      <img
        ref={imgRef}
        src={staticSrc}
        alt={alt}
        title={title}
        width={size}
        height={size}
        loading={loading}
        decoding="async"
        onError={markFailed}
        onClick={onClick}
        className={imgClassName}
      />
    );
  }

  const wantsMotion = !reducedMotion && (animate === "always" || hot);
  const motionSrc = avatarSrc(src, {
    size: Math.min(size, (animatedSize ?? ANIMATED_MAX_SIZE) / 2),
    animated: true,
  });

  const warmUp = () => setHot(true);
  const coolDown = () => {
    if (!latchedRef.current) setHot(false);
  };

  return (
    <span
      className="relative block h-full w-full"
      onPointerEnter={(e) => {
        if (e.pointerType === "touch") latchedRef.current = true;
        warmUp();
      }}
      onPointerLeave={coolDown}
      onFocus={warmUp}
      onBlur={coolDown}
    >
      {/*
        Versi statis TIDAK pernah dilepas dari DOM. Ia yang tampil lebih dulu
        (~1,9 KB) dan tetap menutupi celah selagi file animasi diunduh, jadi
        hover pertama tidak pernah berkedip putih. Hover berikutnya instan
        karena file animasinya sudah masuk cache browser.
      */}
      <img
        ref={imgRef}
        src={staticSrc}
        alt={alt}
        title={title}
        width={size}
        height={size}
        loading={loading}
        decoding="async"
        onError={markFailed}
        onClick={onClick}
        className={imgClassName}
      />
      {wantsMotion && (
        <img
          key={motionSrc}
          src={motionSrc}
          alt=""
          aria-hidden
          width={size}
          height={size}
          decoding="async"
          onLoad={() => setAnimatedReady(true)}
          onClick={onClick}
          className={`absolute inset-0 transition-opacity duration-150 ${
            animatedReady ? "opacity-100" : "opacity-0"
          } ${imgClassName}`}
        />
      )}
    </span>
  );
}
