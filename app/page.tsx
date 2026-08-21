"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import CanvasSequenceManager, { AnimationLayer } from "@/components/CanvasSequenceManager";
import { markIntroSeen } from "@/lib/intro";

/**
 * Semua sekuens diputar 30fps, termasuk telkom yang aslinya dirender 24fps —
 * memotong ~3 detik dari total tanpa terasa dipercepat.
 */
const FPS = 30;

const OUTRO_FRAMES = 115;
const T1_FRAMES = 179;
const T2_FRAMES = 177;
const T3_FRAMES = 240;

/**
 * Titik mulai tiap segmen, dihitung dari jumlah frame supaya tidak pernah
 * melenceng kalau salah satu sekuens diganti. Jam timeline mulai dari 0 saat
 * opening selesai.
 *
 *   outro     0 s      -> 3,83 s
 *   telkom 2  3,83 s   -> 9,73 s  lalu FREEZE menunggu telkom 3
 *   telkom 3  3,83 s   -> 11,83 s
 *   telkom 1  11,83 s  -> 17,80 s   (baru muncul setelah 2 & 3 sampai akhir)
 *
 * Ditambah opening 5,13 s, totalnya ~23 detik sampai pop up.
 */
const OUTRO_AT = 0;
const SIDES_AT = OUTRO_FRAMES / FPS;
const CENTER_AT = SIDES_AT + Math.max(T2_FRAMES, T3_FRAMES) / FPS;

/** Folder outro & telkom 1-indexed: index internal 0 → file 0001.webp. */
const oneIndexed = (index: number) => `${(index + 1).toString().padStart(4, "0")}.webp`;

// Didefinisikan di luar komponen supaya identitas array-nya tetap. Kalau dibuat
// ulang tiap render, effect di CanvasSequenceManager akan memulai animasi dari
// frame nol setiap kali ada state yang berubah.
const INTRO_LAYERS: AnimationLayer[] = [
  {
    folderPath: "/opening-frames",
    frameCount: 154, // 00000-frame.webp .. 00153-frame.webp (0-indexed)
    filenameFormat: (index) => `${index.toString().padStart(5, "0")}-frame.webp`,
    zIndex: 10,
    fit: "cover",
    mobileFit: "contain", // jangan crop logonya di layar tegak
    noDecimate: true, // cuma 2 MB, dan playback 30fps harus mulus
    fps: FPS,
  },
];

// Ukuran & posisi tiap layer dihitung dari kotak alpha frame terakhirnya, bukan
// dari ukuran frame mentah — tiap sekuens punya margin transparan yang beda:
//   telkom 1  isi 98.7% x 55.6% frame  (margin besar atas & bawah)
//   telkom 2  isi 71.7% x 95.0% frame  (menempel kiri & bawah)
//   telkom 3  isi 66.3% x 96.1% frame  (agak ke tengah; setelah flipX: 14.2%-80.5%)
// Tinggi kotak selalu 9/16 dari lebarnya supaya rasio frame terjaga dan `contain`
// tidak menyisakan celah.
// Angka HP dihitung untuk rasio layar HP nyata (~0.465: iPhone 390x844,
// Android 412x915), BUKAN untuk rasio referensi 1080x1920 (0.5625) — tidak ada
// HP modern yang seselebar itu, jadi memakai angka referensi apa adanya membuat
// gedungnya duduk terlalu rendah dengan celah kosong di atas.
//
// `top` gedung samping di desktop diukur terhadap ATAP telkom 1 di posisi x-nya,
// bukan terhadap batas atas isinya. Atap itu melengkung: di pita tepi (x 0-8% dan
// x 92-100%) tingginya 33% frame, sementara 22.5% yang terbaca sebagai batas atas
// isi cuma papan nama di tengah. Mengacu ke 22.5% membuat gedung samping berhenti
// ~25-43 px di atas atap dan menyisakan celah gelap di kiri & kanan.
//
// Di desktop keduanya dijangkarkan lewat `bottom` ber-calc, bukan `top` tetap,
// supaya jaraknya ke atap tidak bergantung rasio layar. Tinggi telkom 1 dalam vw
// tapi `bottom`-nya dalam vh, jadi garis atapnya bergerak terhadap tinggi
// viewport: nilai `top` tetap yang pas di 16:9 menyisakan celah ~48 px di laptop
// 16:10. calc-nya menurunkan garis atap itu sendiri —
//   atap   = 118.5vh - 66.9% x 56.8vw     (frame telkom 1 dihitung dari bawah)
//   bottom = 38vw - 18.5vh - 45px         (45px = seberapa dalam ia tertanam)
// sehingga tumpangannya tetap 45 px di rasio desktop mana pun.
//
// Suku pertama calc telkom 3 sedikit lebih kecil (37.43vw) karena isinya berhenti
// di 97.8% tinggi frame, bukan 100% seperti telkom 2 — angkanya ikut tingginya,
// jadi kalau ukuran desktop telkom 3 diubah, suku itu perlu dihitung ulang:
// 38vw - 2.2% x (tinggi barunya dalam vw).
const TIMELINE_LAYERS: AnimationLayer[] = [
  {
    // Menghilangkan logo Tell Me U JKT. Frame 0001-nya persis sama dengan frame
    // terakhir opening, jadi peralihannya tidak kelihatan.
    folderPath: "/outro",
    frameCount: OUTRO_FRAMES, // 0001.webp .. 0115.webp
    filenameFormat: oneIndexed,
    zIndex: 20,
    fit: "cover",
    mobileFit: "contain",
    startAt: OUTRO_AT,
    fps: FPS,
    hideAfterEnd: true,
  },
  {
    // Menara putih, kiri atas.
    folderPath: "/telkom 2",
    frameCount: T2_FRAMES,
    filenameFormat: oneIndexed,
    zIndex: 22,
    fit: "contain",
    startAt: SIDES_AT,
    fps: FPS,
    hideBeforeStart: true,
    className:
      "!w-[117.3vw] !h-[66vw] !left-[-35vw] !top-[17.8vh] md:!w-[48vw] md:!h-[27vw] md:!left-[0vw] md:!top-auto md:!bottom-[calc(38vw_-_18.5vh_-_45px)]",
  },
  {
    // Gedung kaca, kanan atas. Sumbernya menghadap ke kanan, jadi dicermin
    // supaya kanopinya mengarah ke dalam sesuai layout.
    folderPath: "/telkom 3",
    frameCount: T3_FRAMES,
    filenameFormat: oneIndexed,
    zIndex: 21,
    fit: "contain",
    flipX: true,
    startAt: SIDES_AT,
    fps: FPS,
    hideBeforeStart: true,
    className:
      "!w-[103.6vw] !h-[58.3vw] !right-[-43.5vw] !top-[21.8vh] md:!w-[46vw] md:!h-[25.9vw] md:!right-[-7vw] md:!top-auto md:!bottom-[calc(37.43vw_-_18.5vh_-_45px)]",
  },
  {
    // Gedung merah lebar di tengah, muncul paling akhir dan paling depan.
    folderPath: "/telkom 1",
    frameCount: T1_FRAMES,
    filenameFormat: oneIndexed,
    zIndex: 30,
    fit: "contain",
    startAt: CENTER_AT,
    fps: FPS,
    hideBeforeStart: true,
    className:
      "!w-[264vw] !h-[148.5vw] !left-[-82vw] !bottom-[-1vh] md:!w-[101vw] md:!h-[56.8vw] md:!left-[-0.5vw] md:!bottom-[-18.5vh]",
  },
];

function LandingContent() {
  const [buffer, setBuffer] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [preload, setPreload] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // Halaman ini tidak punya apa pun untuk di-scroll. Dulu tingginya 560vh untuk
  // mendorong animasi; sekarang animasinya jalan sendiri, jadi scrollbar-nya
  // dimatikan supaya tidak ada area kosong yang bisa digeser.
  useEffect(() => {
    const root = document.documentElement;
    const prevRoot = root.style.overflow;
    const prevBody = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = prevRoot;
      document.body.style.overflow = prevBody;
    };
  }, []);

  // Pop up menyusul sedetik setelah animasi beku, supaya komposisi ketiga gedung
  // sempat terbaca dulu sebelum ditutupi.
  useEffect(() => {
    if (!finished) return;
    const timer = window.setTimeout(() => setShowPopup(true), 900);
    return () => window.clearTimeout(timer);
  }, [finished]);

  const showLoader = !introDone && buffer < 1;
  const showPreload = introDone && preload < 1;

  return (
    <main className="page relative w-full h-[100dvh] overflow-hidden" suppressHydrationWarning>
      {/* Latar sama dengan halaman /login */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(circle at 12% 8%, rgba(200, 30, 35, 0.16), transparent 38%),
            radial-gradient(circle at 88% 55%, rgba(200, 30, 35, 0.12), transparent 42%),
            #060607
          `,
        }}
      />

      {/*
        Semua canvas dibungkus satu wrapper supaya bisa diblur sekaligus di akhir.
        Blur-nya SENGAJA tidak dianimasikan: mem-blur elemen selebar layar itu
        operasi termahal yang ada di halaman ini, dan menganimasikannya berarti
        menghitungnya ulang tiap frame. Sekali pasang cuma sekali bayar.
      */}
      <div
        className="fixed inset-0 z-0"
        style={{ filter: finished ? "blur(10px)" : undefined }}
      >
        <CanvasSequenceManager
          introLayers={INTRO_LAYERS}
          timelineLayers={TIMELINE_LAYERS}
          onBufferProgress={setBuffer}
          onPreloadProgress={setPreload}
          onIntroComplete={() => {
            setIntroDone(true);
            // Ditandai di sini, bukan di akhir pop up: begitu bagian branding
            // sudah ditonton, reload berikutnya mendarat langsung di /login
            // alih-alih memutar 154 frame lagi.
            markIntroSeen();
          }}
          onTimelineComplete={() => setFinished(true)}
        />
      </div>

      {/* Bar loading tipis selama frame opening diunduh */}
      {showLoader && (
        <div className="fixed bottom-10 left-0 right-0 z-40 flex flex-col items-center gap-2">
          <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-brand-red)] transition-[width] duration-300"
              style={{ width: `${Math.round(buffer * 100)}%` }}
            />
          </div>
          <span className="text-white/40 text-[10px] font-medium tracking-widest uppercase">
            Memuat {Math.round(buffer * 100)}%
          </span>
        </div>
      )}

      {/*
        Bar kedua: mengunduh SELURUH frame outro + gedung selagi opening diputar.
        Kalau opening habis sebelum unduhannya penuh, frame terakhir opening
        ditahan sampai 100% — lebih baik menunggu sebentar daripada animasinya
        jalan setengah terunduh lalu jadi slow-mo.
      */}
      {showPreload && (
        <div className="fixed bottom-10 left-0 right-0 z-40 flex flex-col items-center gap-2">
          <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-brand-red)] transition-[width] duration-300"
              style={{ width: `${Math.round(preload * 100)}%` }}
            />
          </div>
          <span className="text-white/40 text-[10px] font-medium tracking-widest uppercase">
            Menyiapkan animasi {Math.round(preload * 100)}%
          </span>
        </div>
      )}

      {/* Pop up sambutan di akhir sekuens */}
      {showPopup && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-black/40 pointer-events-auto" />

          <div
            className="relative z-10 pointer-events-auto flex flex-col items-center gap-6 p-8 sm:p-10 rounded-[2rem] w-[90%] max-w-sm"
            style={{
              background: "rgba(12, 12, 14, 0.7)",
              boxShadow:
                "0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              // Dibaca dari properti kustom supaya device lemah bisa mematikannya
              // lewat satu aturan di globals.css — style inline tidak bisa
              // ditimpa selector biasa, tapi properti kustomnya bisa.
              backdropFilter: "var(--panel-blur, blur(24px))",
              WebkitBackdropFilter: "var(--panel-blur, blur(24px))",
            }}
          >
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            <div className="relative z-10 w-24 h-24 mb-1">
              <Image
                src="/logo.png"
                alt="Tell Me U Logo"
                fill
                className="object-contain drop-shadow-2xl"
              />
            </div>

            <div className="text-center space-y-2 relative z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
                Selamat Datang
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-[260px] mx-auto font-medium">
                Rumah digital mahasiswa Telkom University Jakarta. Masuk dulu, lalu
                jelajahi karya, event, dan teman-teman satu kampus.
              </p>
            </div>

            <Link
              href="/login"
              onClick={markIntroSeen}
              className="group relative mt-4 w-full flex items-center justify-center overflow-hidden rounded-xl bg-[#c81e2c] px-8 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.03] hover:bg-[#e62837] shadow-[0_8px_20px_rgba(200,30,44,0.4)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s] ease-in-out" />
              <span className="relative z-10 flex items-center gap-2 tracking-wide text-[15px]">
                Lanjutkan ke Login
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </span>
            </Link>
          </div>
        </motion.div>
      )}
    </main>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060607]" />}>
      <LandingContent />
    </Suspense>
  );
}
