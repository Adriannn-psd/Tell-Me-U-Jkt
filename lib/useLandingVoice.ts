"use client";

import { useCallback, useEffect } from "react";

/**
 * Tiga potongan suara yang menempel di animasi landing page. Nama file dibuat
 * lowercase tanpa spasi supaya URL-nya tidak perlu di-encode, dan formatnya mp3
 * — bukan .opus seperti aslinya — karena Safari (iOS maupun macOS) tidak bisa
 * memutar Opus di dalam container Ogg sama sekali, sementara mp3 jalan di semua
 * browser yang dipakai orang. Selisih ukurannya cuma puluhan KB.
 */
const VOICE_SRC = {
  welcome: "/voice/welcome.mp3",
  telyu: "/voice/telyu-tizen.mp3",
  telkom: "/voice/telkom.mp3",
} as const;

export type VoiceName = keyof typeof VOICE_SRC;

const VOICE_NAMES = Object.keys(VOICE_SRC) as VoiceName[];

type Pending = { name: VoiceName; at: number };

/*
 * State-nya milik DOKUMEN, bukan komponen — ini bagian terpenting dari file ini.
 *
 * Izin autoplay bersuara itu melekat pada dokumen (Chrome: "sudah pernah ada
 * interaksi di halaman ini") dan, di iOS, pada ELEMEN yang pernah diputar dari
 * dalam handler gesture. Kalau elemennya dibuat ulang setiap kali komponen
 * landing dipasang, izin yang sudah didapat dari klik tombol logout ikut hangus,
 * dan user disuruh mengetuk layar lagi padahal baru saja mengklik sesuatu.
 *
 * Karena itu elemennya hidup di module scope, dibuat sekali, dan dipakai ulang
 * lintas navigasi selama dokumennya sama.
 */
let elements: Partial<Record<VoiceName, HTMLAudioElement>> | null = null;
let pending: Pending | null = null;
let primed = false;
let unlockAttached = false;

/**
 * Safari 16.4+ (iOS 17) memperkenalkan `navigator.audioSession`. Menyetelnya ke
 * "playback" membuat audio halaman ini MENGABAIKAN tombol silent fisik di iPhone
 * — tanpa itu, HP yang ring switch-nya digeser ke silent tetap membisukan
 * elemen <audio> walaupun kodenya sudah benar dan volumenya penuh. Di browser
 * yang belum punya API-nya, blok ini tidak melakukan apa-apa.
 */
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

function preferPlaybackSession() {
  try {
    const nav = navigator as AudioSessionNavigator;
    if (nav.audioSession) nav.audioSession.type = "playback";
  } catch {
    // Beberapa browser mengekspos propertinya tapi menolak nilainya. Bukan
    // masalah: ini cuma pengerasan, bukan syarat suara bisa keluar.
  }
}

/** Tidak ada jalur "bisu" di halaman ini: tiap elemen dipaksa penuh volume. */
function forceAudible(el: HTMLAudioElement) {
  el.muted = false;
  el.defaultMuted = false;
  el.volume = 1;
}

function ensureElements() {
  if (elements) return elements;

  preferPlaybackSession();

  const created: Partial<Record<VoiceName, HTMLAudioElement>> = {};
  VOICE_NAMES.forEach((name) => {
    const el = new Audio(VOICE_SRC[name]);
    // preload "auto" walaupun elemennya mungkin dibuat dari tombol logout: file
    // yang diminta di sini persis file yang dibutuhkan satu detik kemudian.
    el.preload = "auto";
    forceAudible(el);
    el.load();
    created[name] = el;
  });

  elements = created;
  attachUnlock();
  return elements;
}

/**
 * Sentuhan/klik/tombol apa pun di dokumen ini dianggap izin: cue yang tertahan
 * dibunyikan, dan semua elemen ditandai boleh berbunyi.
 *
 * Listener-nya sengaja tidak pernah dilepas — umurnya seumur dokumen, sama
 * seperti izin audionya sendiri, dan melepasnya saat komponen landing dilepas
 * justru membuang izin yang masih berguna kalau user kembali ke "/" tanpa
 * memuat ulang halaman.
 */
function attachUnlock() {
  if (unlockAttached || typeof window === "undefined") return;
  unlockAttached = true;

  const unlock = () => {
    primeLandingVoice();

    const waiting = pending;
    pending = null;
    if (!waiting || !elements) return;

    const el = elements[waiting.name];
    if (!el) return;
    const late = (performance.now() - waiting.at) / 1000;
    // Sudah lewat durasinya — memutarnya sekarang cuma jadi suara nyasar di
    // atas segmen animasi yang salah.
    if (Number.isFinite(el.duration) && late >= el.duration) return;
    forceAudible(el);
    el.currentTime = Math.max(0, late);
    el.play().catch(() => {});
  };

  // touchstart ikut didengarkan selain pointerdown: di sebagian WebView Android
  // lama pointer event tidak dihitung sebagai gesture yang mengizinkan audio.
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("touchstart", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
}

/**
 * Menukar satu gesture yang SUDAH terjadi menjadi izin audio, tanpa mengeluarkan
 * suara apa pun.
 *
 * Dipanggil dari dalam handler klik — misalnya tombol logout di
 * components/Header.tsx — sebelum halaman berpindah ke "/". Karena perpindahannya
 * soft navigation (dokumennya tidak diganti), izin yang didapat di sini masih
 * berlaku saat animasi mulai, sehingga suara pembuka bisa langsung berbunyi
 * tanpa user perlu mengetuk apa pun lagi.
 *
 * Harus dipanggil SINKRON di dalam handler: iOS cuma menghitung `play()` yang
 * terjadi di dalam gesture, bukan yang menyusul setelah `await`.
 */
export function primeLandingVoice() {
  const els = ensureElements();
  preferPlaybackSession();
  if (primed) return;
  primed = true;

  VOICE_NAMES.forEach((name) => {
    const el = els[name];
    if (!el) return;
    // Yang sedang berbunyi jangan disentuh.
    if (!el.paused) return;
    // Priming HARUS bersuara. Memutarnya dalam keadaan muted memang lolos tanpa
    // terdengar, tapi di iOS izin yang didapat pun cuma untuk pemutaran muted —
    // cue berikutnya akan ditolak lagi.
    forceAudible(el);
    el.play().then(
      () => {
        el.pause();
        el.currentTime = 0;
      },
      () => {
        // Gagal berarti belum ada izin sama sekali; biarkan gesture berikutnya
        // mencoba lagi, jangan dianggap sudah beres.
        primed = false;
      }
    );
  });
}

function playVoice(name: VoiceName) {
  const els = ensureElements();
  const el = els[name];
  if (!el) return;
  // Ditegaskan ulang tiap kali, bukan cuma saat dibuat: ekstensi browser,
  // kontrol media OS, dan tab-mute bawaan browser bisa mengubah nilai ini di
  // belakang kode, dan gejalanya sama seperti audio yang gagal dimuat.
  forceAudible(el);
  el.currentTime = 0;
  el.play().then(
    () => {
      pending = null;
    },
    () => {
      // Cue terbaru yang menang: kalau user baru menyentuh layar di detik ke-13,
      // yang pantas dibunyikan adalah suara gedung, bukan sambutan pembuka.
      //
      // Tidak ada apa pun yang ditampilkan ke user di sini — tidak ada petunjuk
      // "ketuk layar". Sentuhan pertama untuk alasan apa pun (menekan tombol
      // lewati, menggeser, sekadar menyentuh) yang akan membunyikannya, di-seek
      // sesuai keterlambatannya, dan kalau tidak ada sentuhan sama sekali
      // animasinya tetap jalan tanpa suara.
      pending = { name, at: performance.now() };
    }
  );
}

function stopAllVoices() {
  pending = null;
  if (!elements) return;
  Object.values(elements).forEach((el) => {
    el.pause();
    el.currentTime = 0;
  });
}

/**
 * Pemutar cue suara untuk animasi landing. Elemennya tidak dibuat maupun dibuang
 * oleh hook ini — lihat catatan module scope di atas; hook ini cuma menyalakan
 * mesinnya lalu menyerahkan dua fungsi.
 *
 * Tidak ada state "audio terhalang" yang dikembalikan, karena tidak ada satu pun
 * UI yang memintanya: halaman ini tidak pernah menyuruh user mengetuk layar.
 * Kalau autoplay ditolak, cue-nya ditahan diam-diam dan dibunyikan pada sentuhan
 * pertama yang kebetulan terjadi.
 *
 * Audio TIDAK dihentikan saat komponennya dilepas, karena setiap jalan keluar
 * dari halaman ini (tombol lewati, pindah otomatis ke /login) sudah memanggil
 * `stopAll` sendiri, sementara menghentikannya di cleanup akan ikut membunuh
 * suara yang baru mulai pada remount ganda React di mode development.
 */
export function useLandingVoice() {
  // Elemennya disiapkan (dan listener unlock dipasang) begitu halaman landing
  // dipasang, kalau tombol logout belum melakukannya lebih dulu.
  useEffect(() => {
    ensureElements();
  }, []);

  const play = useCallback((name: VoiceName) => playVoice(name), []);
  const stopAll = useCallback(() => stopAllVoices(), []);

  return { play, stopAll };
}
