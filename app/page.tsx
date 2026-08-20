"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import CanvasSequenceManager, { AnimationLayer } from "@/components/CanvasSequenceManager";
import { markIntroSeen } from "@/lib/intro";

/**
 * Panjang area scroll yang mendorong seluruh sekuens. Di viewport 1080px ini
 * jadi ~7-9 px scroll per frame — terasa perlahan, bukan melesat.
 */
const SCROLL_HEIGHT = "560vh";

/** Titik-titik di garis waktu scroll (0..1 dari seluruh area di atas). */
const OUTRO_END = 0.17;
const SIDE_START = 0.19; // telkom 2 & 3 mulai merakit
const SIDE_END = 0.55; // keduanya selesai serentak lalu freeze
const CENTER_START = 0.57; // telkom 1 baru muncul setelah itu
const CENTER_END = 0.9;
const BLUR_START = 0.9;
const BLUR_END = 0.96;
const POPUP_AT = 0.94;
const HINT_HIDE_AT = 0.02;

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
  },
];

// Ukuran & posisi tiap layer dihitung dari kotak alpha frame terakhirnya, bukan
// dari ukuran frame mentah — tiap sekuens punya margin transparan yang beda:
//   telkom 1  isi 98.7% x 55.6% frame  (margin besar atas & bawah)
//   telkom 2  isi 71.7% x 95.0% frame  (menempel kiri & bawah)
//   telkom 3  isi 66.3% x 96.1% frame  (agak ke tengah; setelah flipX: 14.2%-80.5%)
// Tinggi kotak selalu 9/16 dari lebarnya supaya rasio frame terjaga dan `contain`
// tidak menyisakan celah.
const SCROLL_LAYERS: AnimationLayer[] = [
  {
    // Menghilangkan logo Tell Me U JKT. Frame 0001-nya persis sama dengan frame
    // terakhir opening, jadi peralihannya tidak kelihatan.
    folderPath: "/outro",
    frameCount: 115, // 0001.webp .. 0115.webp
    filenameFormat: oneIndexed,
    zIndex: 20,
    fit: "cover",
    mobileFit: "contain",
    startProgress: 0,
    endProgress: OUTRO_END,
    hideAfterEnd: true,
  },
  {
    // Menara putih, kiri atas.
    folderPath: "/telkom 2",
    frameCount: 177,
    filenameFormat: oneIndexed,
    zIndex: 22,
    fit: "contain",
    startProgress: SIDE_START,
    endProgress: SIDE_END,
    hideBeforeStart: true,
    className:
      "!w-[65vw] !h-[36.6vw] !left-[5vw] !top-[18vh] md:!w-[42vw] md:!h-[23.6vw] md:!left-[3vw] md:!top-[3vh]",
  },
  {
    // Gedung kaca, kanan atas. Sumbernya menghadap ke kanan, jadi dicermin
    // supaya kanopinya mengarah ke dalam sesuai layout.
    folderPath: "/telkom 3",
    frameCount: 240,
    filenameFormat: oneIndexed,
    zIndex: 21,
    fit: "contain",
    flipX: true,
    startProgress: SIDE_START,
    endProgress: SIDE_END,
    hideBeforeStart: true,
    className:
      "!w-[66vw] !h-[37.1vw] !right-[-12vw] !top-[21vh] md:!w-[40vw] md:!h-[22.5vw] md:!right-[-7vw] md:!top-[5vh]",
  },
  {
    // Gedung merah lebar di tengah, muncul paling akhir dan paling depan.
    folderPath: "/telkom 1",
    frameCount: 179,
    filenameFormat: oneIndexed,
    zIndex: 30,
    fit: "contain",
    startProgress: CENTER_START,
    endProgress: CENTER_END,
    hideBeforeStart: true,
    className:
      "!w-[222vw] !h-[125vw] !left-[-61vw] !bottom-[-1vh] md:!w-[101vw] md:!h-[56.8vw] md:!left-[-0.5vw] md:!bottom-[-18.5vh]",
  },
];

function LandingContent() {
  const [buffer, setBuffer] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [hintHidden, setHintHidden] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const { scrollYProgress } = useScroll();

  // Blur digerakkan langsung oleh motion value, bukan state: kalau lewat state,
  // setiap event scroll memicu re-render halaman.
  //
  // `blurGate` menahannya di 0 selama opening. Gerbangnya harus berupa motion
  // value juga, bukan percabangan di JSX: mengganti style.filter dari string
  // statis ke motion value setelah render pertama tidak pernah ter-bind, jadi
  // blur-nya diam di blur(0px) selamanya.
  const blurGate = useMotionValue(0);
  const blurPx = useTransform(scrollYProgress, [BLUR_START, BLUR_END], [0, 10], {
    clamp: true,
  });
  const blurFilter = useTransform(
    [blurPx, blurGate],
    ([px, gate]: number[]) => `blur(${px * gate}px)`
  );

  // Animasi ini dipetakan ke posisi scroll, jadi mendarat di tengah halaman
  // sama dengan mendarat di tengah animasi. Selalu mulai dari atas.
  //
  // useLayoutEffect, bukan useEffect: browser memulihkan posisi scroll sebelum
  // effect mana pun jalan, dan ini mengembalikannya sebelum frame pertama
  // dilukis supaya tidak terlihat melompat.
  useLayoutEffect(() => {
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Kunci scroll selama opening supaya user tidak mendahului animasinya.
  // Dipasang di html sekaligus body: overflow:hidden di body saja masih
  // menyisakan html sebagai elemen yang bisa di-scroll di sebagian browser.
  useEffect(() => {
    if (introDone) return;
    const root = document.documentElement;
    const prevRoot = root.style.overflow;
    const prevBody = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = prevRoot;
      document.body.style.overflow = prevBody;
    };
  }, [introDone]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // Selama opening, apa pun yang dibaca dari posisi scroll diabaikan. Browser
    // sempat memulihkan posisi scroll kunjungan sebelumnya sebelum kode ini
    // mengembalikannya ke atas, dan framer sudah mengukur posisi itu — tanpa
    // gerbang ini, satu nilai palsu di awal cukup untuk mematikan ikon scroll
    // (dan sempat memunculkan pop up) padahal user belum menggeser apa pun.
    if (!introDone) return;
    // React membatalkan re-render kalau nilainya sama, jadi kedua setState ini
    // hanya benar-benar bekerja saat ambangnya dilewati.
    setHintHidden((hidden) => hidden || latest > HINT_HIDE_AT);
    setShowPopup(latest >= POPUP_AT);
  });

  const showLoader = !introDone && buffer < 1;
  const showHint = introDone && !hintHidden;

  return (
    <main className="page relative" suppressHydrationWarning>
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

      {/* Semua canvas dibungkus satu wrapper supaya bisa diblur sekaligus di akhir */}
      <motion.div className="fixed inset-0 z-0" style={{ filter: blurFilter }}>
        <CanvasSequenceManager
          introLayers={INTRO_LAYERS}
          scrollLayers={SCROLL_LAYERS}
          onBufferProgress={setBuffer}
          onIntroComplete={() => {
            // Dikembalikan ke atas sekali lagi, dan sengaja SEBELUM introDone
            // dibuka. history.scrollRestoration hanya bisa disetel setelah
            // hidrasi, jadi pada muat pertama browser sudah lebih dulu
            // memulihkan posisi scroll dokumen sebelumnya; kalau tidak
            // dinolkan di sini, bagian scroll mulai dari tengah animasi.
            window.scrollTo({ top: 0, behavior: "instant" });
            setIntroDone(true);
            blurGate.set(1);
            // Ditandai di sini, bukan di akhir pop up: begitu bagian branding
            // sudah ditonton, reload berikutnya mendarat langsung di /login
            // alih-alih memutar 154 frame lagi.
            markIntroSeen();
          }}
        />
      </motion.div>

      {/* Bar loading tipis selama buffer frame awal terisi */}
      {showLoader && (
        <div className="fixed bottom-10 left-0 right-0 z-40 flex flex-col items-center gap-2">
          <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-brand-red)] transition-all duration-300"
              style={{ width: `${Math.round(buffer * 100)}%` }}
            />
          </div>
          <span className="text-white/40 text-[10px] font-medium tracking-widest uppercase">
            Memuat {Math.round(buffer * 100)}%
          </span>
        </div>
      )}

      {/* Ajakan scroll setelah opening selesai — pelan, sesuai permintaan */}
      {showHint && (
        <motion.div
          className="fixed bottom-10 left-0 right-0 z-40 flex flex-col items-center gap-2 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <span className="text-white/50 text-[11px] font-medium tracking-[0.2em] uppercase">
            Scroll ke bawah
          </span>
          <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6 text-white/70"
            animate={{ y: [0, 10, 0], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </motion.svg>
        </motion.div>
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
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
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

      {/* Pendorong scroll — tinggi inilah yang menentukan kecepatan animasinya */}
      <div aria-hidden style={{ height: SCROLL_HEIGHT }} />
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
