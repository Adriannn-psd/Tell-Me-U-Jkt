"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

/**
 * Pemutar cue suara untuk animasi landing.
 *
 * Kenapa tidak sekadar `new Audio(src).play()`:
 *
 * 1. **Autoplay diblokir.** Halaman ini mulai memutar tanpa ada satu klik pun,
 *    jadi `play()` pertama hampir pasti ditolak di HP. Cue yang gagal disimpan
 *    sebagai `pending`, lalu sentuhan pertama di mana saja memutarnya —
 *    di-seek sejauh keterlambatannya, supaya suara tetap sinkron dengan gambar
 *    alih-alih mulai dari nol saat animasinya sudah jauh di depan.
 *
 * 2. **iOS meng-unlock per elemen, bukan per halaman.** Satu elemen yang sudah
 *    pernah diputar lewat gesture tidak membuat elemen lain ikut boleh
 *    berbunyi. Maka pada gesture pertama SEMUA elemen di-`play()` lalu langsung
 *    di-`pause()` — cuma untuk menandainya sebagai sudah diizinkan — supaya cue
 *    kedua dan ketiga nanti bisa dimulai sendiri tanpa sentuhan lagi.
 *
 * 3. **Tidak ada jalur bisu sama sekali.** `muted`, `defaultMuted`, dan `volume`
 *    ditegaskan setiap kali sebuah cue dimulai, dan sesi audio iOS diminta
 *    bertipe "playback" supaya tombol silent fisik iPhone tidak membungkamnya.
 *    Priming pun dilakukan bersuara, bukan muted — lihat alasannya di bawah.
 */
export function useLandingVoice() {
  const elements = useRef<Partial<Record<VoiceName, HTMLAudioElement>>>({});
  const pending = useRef<Pending | null>(null);
  const primed = useRef(false);

  /** True selama ada cue yang tertahan karena browser menolak autoplay. */
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    preferPlaybackSession();

    const created: Partial<Record<VoiceName, HTMLAudioElement>> = {};
    VOICE_NAMES.forEach((name) => {
      const el = new Audio(VOICE_SRC[name]);
      el.preload = "auto";
      // Tidak pakai loop dan tidak pakai autoplay: tiap cue diputar sekali,
      // tepat saat segmen animasinya mulai.
      forceAudible(el);
      el.load();
      created[name] = el;
    });
    elements.current = created;

    return () => {
      Object.values(created).forEach((el) => {
        el.pause();
        // Melepas sumbernya menghentikan unduhan yang mungkin masih jalan saat
        // user menekan "Lewati" di tengah animasi.
        el.src = "";
      });
      elements.current = {};
      pending.current = null;
    };
  }, []);

  const play = useCallback((name: VoiceName) => {
    const el = elements.current[name];
    if (!el) return;
    // Ditegaskan ulang tiap kali, bukan cuma saat dibuat: ekstensi browser,
    // kontrol media OS, dan tab-mute bawaan browser bisa mengubah nilai ini di
    // belakang kode, dan gejalanya sama seperti audio yang gagal dimuat.
    forceAudible(el);
    el.currentTime = 0;
    el.play().then(
      () => {
        pending.current = null;
        setBlocked(false);
      },
      () => {
        // Cue terbaru yang menang: kalau user baru menyentuh layar di detik ke-13,
        // yang pantas dibunyikan adalah suara gedung, bukan sambutan pembuka.
        pending.current = { name, at: performance.now() };
        setBlocked(true);
      }
    );
  }, []);

  useEffect(() => {
    const unlock = () => {
      // Sesi audio disetel lagi di dalam gesture: di iOS penyetelan sebelum ada
      // interaksi kadang tidak digubris.
      preferPlaybackSession();

      const waiting = pending.current;
      pending.current = null;
      setBlocked(false);

      if (!primed.current) {
        primed.current = true;
        VOICE_NAMES.forEach((name) => {
          const el = elements.current[name];
          if (!el) return;
          // Yang sedang berbunyi atau yang justru mau dibunyikan jangan disentuh.
          if (!el.paused) return;
          if (waiting && name === waiting.name) return;
          // Priming HARUS bersuara. Memutarnya dalam keadaan muted memang lolos
          // tanpa terdengar, tapi di iOS izin yang didapat pun cuma untuk
          // pemutaran muted — cue berikutnya akan ditolak lagi.
          forceAudible(el);
          el.play().then(
            () => {
              el.pause();
              el.currentTime = 0;
            },
            () => {}
          );
        });
      }

      if (!waiting) return;
      const el = elements.current[waiting.name];
      if (!el) return;
      const late = (performance.now() - waiting.at) / 1000;
      // Sudah lewat durasinya — memutarnya sekarang cuma jadi suara nyasar di
      // atas segmen animasi yang salah.
      if (Number.isFinite(el.duration) && late >= el.duration) return;
      forceAudible(el);
      el.currentTime = Math.max(0, late);
      el.play().catch(() => {});
    };

    // Listener dibiarkan terpasang, tidak `once`: percobaan unlock pertama bisa
    // saja tetap ditolak, dan cue berikutnya masih butuh sentuhan.
    //
    // `touchstart` ikut didengarkan walau `pointerdown` seharusnya menutupinya:
    // di beberapa WebView Android lama pointer event tidak dianggap gesture yang
    // sah untuk mengizinkan audio, sementara touch event iya. Pemanggilan
    // gandanya tidak berbahaya, dijaga oleh flag `primed`.
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  /** Hentikan semuanya — dipakai saat animasi dilewati. */
  const stopAll = useCallback(() => {
    pending.current = null;
    setBlocked(false);
    Object.values(elements.current).forEach((el) => {
      el.pause();
      el.currentTime = 0;
    });
  }, []);

  return { play, stopAll, blocked };
}
