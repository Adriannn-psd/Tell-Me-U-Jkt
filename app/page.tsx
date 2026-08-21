"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import CanvasSequenceManager, { AnimationLayer } from "@/components/CanvasSequenceManager";
import { useLandingVoice, VoiceName } from "@/lib/useLandingVoice";

/**
 * Opening dan outro diputar 30fps, sesuai rendernya.
 */
const FPS = 30;

/**
 * Gedung diputar 60fps. Angkanya bukan cuma soal cepat: di HP frame dilompati
 * 2-2, jadi jumlah frame BERBEDA yang benar-benar terlihat per detik itu
 * setengah dari fps ini. Di 45fps hasilnya 22,5 gambar/detik — persis yang
 * terbaca sebagai "frame by frame". Di 60fps jadi 30 gambar/detik, dan
 * gerakannya sekaligus jadi lebih cepat: bagian gedung turun dari 9,3 detik
 * jadi 7,0 detik.
 *
 * Menaikkannya lagi ke atas 60 tidak menambah kemulusan (layar HP mentok di
 * 60Hz) dan malah menambah beban decode, jadi berhenti di sini.
 */
const TELKOM_FPS = 60;

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
 *   telkom 2  3,83 s   -> 6,78 s   lalu FREEZE menunggu telkom 3
 *   telkom 3  3,83 s   -> 7,83 s
 *   telkom 1  7,83 s   -> 10,82 s  (baru muncul setelah 2 & 3 sampai akhir)
 *
 * Ditambah opening 5,13 s, totalnya ~16 detik sampai gedung beku — lalu
 * langsung disusul layar loading 3 detik menuju /login.
 */
const OUTRO_AT = 0;
const SIDES_AT = OUTRO_FRAMES / FPS;
const CENTER_AT = SIDES_AT + Math.max(T2_FRAMES, T3_FRAMES) / TELKOM_FPS;

/**
 * Suara "telkom" dibunyikan 10 frame setelah gedung kiri & kanan muncul, bukan
 * saat gedung tengah mulai. Dihitung dalam frame (bukan detik) supaya tetap di
 * titik gambar yang sama kalau TELKOM_FPS diubah lagi.
 */
const TELKOM_CUE_AT = SIDES_AT + 10 / TELKOM_FPS;

/**
 * Lama layar loading akhir sebelum pindah sendiri ke /login. Angka yang sama
 * dipakai untuk durasi animasi bar-nya, lewat properti kustom --tmuj-outro-ms,
 * supaya bar tidak pernah selesai lebih dulu atau ketinggalan dari pindahnya
 * halaman.
 */
const REDIRECT_AFTER_MS = 3000;

/** Tombol "Lewati" muncul setelah animasi berjalan sekian lama. */
const SKIP_AFTER_MS = 3000;

/**
 * Suara menempel pada jam animasi, bukan pada timer sendiri.
 *
 *   welcome  -> saat frame pertama opening digambar (lewat onIntroStart)
 *   telyu    -> detik 0 timeline, yaitu saat outro mulai
 *   telkom   -> 10 frame setelah gedung kiri & kanan muncul (4,00 s timeline /
 *               9,13 s absolut). Klipnya 5,16 s, jadi berhenti di 14,29 s —
 *               masih ~4,7 detik sebelum pop up, dan tidak menabrak telyu yang
 *               selesai di 8,20 s.
 */
const TIMELINE_CUES: { at: number; name: VoiceName }[] = [
  { at: OUTRO_AT, name: "telyu" },
  { at: TELKOM_CUE_AT, name: "telkom" },
];

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
    // Tanpa ini, di HP frame dilompati 2-2 sehingga yang terlihat cuma 15 gambar
    // berbeda per detik — separuh dari gedung (60fps dilompati 2-2 = 30 gambar),
    // dan itulah yang terbaca sebagai "frame by frame" persis di bagian ini.
    // Semua 115 frame dipakai supaya angkanya sama dengan gedung: 30 gambar/detik.
    //
    // Biayanya kecil dan aman, tidak seperti kalau dilakukan pada sekuens gedung:
    // set 960px-nya cuma 1,6 MB untuk 115 frame (opening 1,5 MB untuk 154 frame
    // sudah lama begitu tanpa masalah), dan segmen ini diputar SENDIRI — gedung
    // baru mulai tepat saat outro habis, jadi tidak ada dua sekuens yang
    // di-decode 30x per detik pada waktu yang sama.
    noDecimate: true,
  },
  {
    // Menara putih, kiri atas.
    folderPath: "/telkom 2",
    frameCount: T2_FRAMES,
    filenameFormat: oneIndexed,
    zIndex: 22,
    fit: "contain",
    startAt: SIDES_AT,
    fps: TELKOM_FPS,
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
    fps: TELKOM_FPS,
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
    fps: TELKOM_FPS,
    hideBeforeStart: true,
    className:
      "!w-[264vw] !h-[148.5vw] !left-[-82vw] !bottom-[-1vh] md:!w-[101vw] md:!h-[56.8vw] md:!left-[-0.5vw] md:!bottom-[-18.5vh]",
  },
];

function LandingContent() {
  const [load, setLoad] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const voice = useLandingVoice();
  const stopVoice = voice.stopAll;
  const router = useRouter();

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

  // Tombol lewati dihitung dari saat animasi MULAI, bukan dari saat halaman
  // dibuka: kalau dihitung dari awal, di koneksi lambat tombolnya sudah muncul
  // sementara yang terlihat masih bar loading.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setCanSkip(true), SKIP_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [playing]);

  // /login diambil di depan supaya perpindahan di akhir tidak menambah jeda
  // sendiri: tanpa ini, tiga detik loading habis lalu masih harus menunggu
  // bundle halaman login diunduh.
  useEffect(() => {
    router.prefetch("/login");
  }, [router]);

  // Layar loading akhir tampil BERSAMAAN dengan gelapnya latar, tidak menunggu
  // apa pun, lalu pindah sendiri ke /login tiga detik kemudian — tidak ada
  // tombol yang perlu ditekan.
  //
  // `replace`, bukan `push`: kalau user menekan tombol back dari /login, yang
  // pantas muncul adalah halaman sebelum animasi, bukan animasi yang sudah
  // selesai dan akan langsung memindahkannya lagi.
  useEffect(() => {
    if (!finished) return;
    const timer = window.setTimeout(() => {
      stopVoice();
      router.replace("/login");
    }, REDIRECT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [finished, router, stopVoice]);

  const showLoader = load < 1;

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
        Canvas-nya dibiarkan apa adanya di akhir — TIDAK diblur. Mem-blur elemen
        selebar layar adalah operasi termahal di halaman ini, dan di HP hasilnya
        terasa seperti animasi yang menggantung sebelum layar berikutnya muncul.
        Yang menutupinya sekarang cuma lapisan gelap, yang biayanya satu kali
        penggambaran warna.
      */}
      <div className="fixed inset-0 z-0">
        <CanvasSequenceManager
          introLayers={INTRO_LAYERS}
          timelineLayers={TIMELINE_LAYERS}
          cues={TIMELINE_CUES}
          onLoadProgress={setLoad}
          onIntroStart={() => {
            setPlaying(true);
            voice.play("welcome");
          }}
          onCue={(name) => voice.play(name as VoiceName)}
          onTimelineComplete={() => setFinished(true)}
        />
      </div>

      {/*
        Satu bar loading untuk SEMUA sekuens. Dulu ada dua — opening diunduh
        dan diputar dulu sementara sisanya menyusul di belakang — jadi loading
        terlihat dua kali, dan kalau unduhan kedua kalah cepat frame terakhir
        opening tertahan diam. Sekarang sekali tunggu di depan; setelah bar ini
        penuh tidak ada lagi jeda sampai pop up.

        pointer-events-none supaya sentuhan tetap sampai ke window listener yang
        meng-unlock audio — di HP, sentuhan pertama itulah izin autoplay-nya.
      */}
      {showLoader && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 px-10 text-center pointer-events-none">
          <svg
            className="w-9 h-9 text-[var(--color-brand-red)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11 5 6 9H3v6h3l5 4V5z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>

          <p className="text-white/70 text-sm font-medium max-w-[240px] leading-relaxed">
            Besarkan volume untuk mendengar audio
          </p>

          <div className="flex flex-col items-center gap-2">
            <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-brand-red)] transition-[width] duration-300"
                style={{ width: `${Math.round(load * 100)}%` }}
              />
            </div>
            <span className="text-white/40 text-[10px] font-medium tracking-widest uppercase">
              Menyiapkan animasi {Math.round(load * 100)}%
            </span>
          </div>
        </div>
      )}

      {/*
        Browser HP menolak autoplay bersuara sampai ada sentuhan. Kalau itu yang
        terjadi, hook-nya menahan cue terakhir dan petunjuk ini muncul; sentuhan
        di mana saja langsung memutarnya, di-seek sesuai keterlambatannya.
      */}
      {voice.blocked && !showLoader && !finished && (
        <div className="fixed top-6 left-0 right-0 z-40 flex justify-center px-6 pointer-events-none">
          <span className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-[11px] font-medium text-white/70">
            <svg
              className="w-4 h-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M11 5 6 9H3v6h3l5 4V5z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            </svg>
            Ketuk layar untuk mendengar audio
          </span>
        </div>
      )}

      {/*
        Lewati animasi. Muncul 3 detik setelah animasi mulai dan hilang begitu
        layar loading akhir mengambil alih — di titik itu halaman sudah menuju
        /login sendiri, jadi tombolnya tidak ada gunanya lagi.
      */}
      {canSkip && !finished && (
        <motion.div
          className="fixed bottom-8 left-0 right-0 z-40 flex justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Link
            href="/login"
            onClick={voice.stopAll}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-5 py-2.5 text-xs font-semibold tracking-wide text-white/80 transition-colors hover:bg-black/70 hover:text-white"
          >
            Lewati animasi
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h13m0 0-5-5m5 5-5 5" />
            </svg>
          </Link>
        </motion.div>
      )}

      {/*
        Layar penutup. Muncul PERSIS saat gedung terakhir beku — latarnya
        digelapkan, bukan diblur, dan gelapnya ikut naik bersama isinya dalam satu
        fade 450 ms, jadi tidak ada lagi jeda "sudah gelap tapi belum ada apa-apa"
        seperti versi sebelumnya.

        Animasinya sengaja cuma menyentuh opacity dan transform — dua properti
        yang bisa dikerjakan compositor tanpa layout atau repaint — supaya di HP
        lemah tidak ada satu pun frame yang tersendat. Tidak ada backdrop-filter
        di sini, itu justru yang membuat versi lamanya berat.

        Durasi bar dan durasi timer pindah halaman dibaca dari satu angka yang
        sama (REDIRECT_AFTER_MS), lewat properti kustom, supaya bar tidak pernah
        penuh sebelum waktunya atau masih setengah jalan saat halaman berganti.
      */}
      {finished && (
        <div
          className="tmuj-outro fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 px-10 bg-[#060607]/90"
          style={{ "--tmuj-outro-ms": `${REDIRECT_AFTER_MS}ms` } as CSSProperties}
          role="status"
          aria-live="polite"
        >
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Cincin berputar: satu elemen, satu transform rotate. */}
            <svg
              className="tmuj-outro-ring absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
              <circle
                cx="50"
                cy="50"
                r="46"
                stroke="var(--color-brand-red)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="72 217"
              />
            </svg>

            <div className="relative w-16 h-16">
              <Image
                src="/logo.png"
                alt="Tell Me U Jakarta"
                fill
                sizes="64px"
                priority
                className="object-contain drop-shadow-2xl"
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-white/70 text-sm font-medium">Menyiapkan halaman masuk</p>

            <div className="w-44 h-[3px] rounded-full bg-white/10 overflow-hidden">
              <div className="tmuj-outro-bar h-full w-full rounded-full bg-[var(--color-brand-red)]" />
            </div>
          </div>
        </div>
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
