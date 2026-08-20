"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll, useSpring } from "framer-motion";

export interface AnimationLayer {
  /** Folder di /public, mis. "/telkom 1". Spasi dibiarkan — browser yang meng-encode. */
  folderPath: string;
  /** Jumlah file yang benar-benar ada. Frame di-index internal 0..frameCount-1. */
  frameCount: number;
  /** Ubah index internal jadi nama file (folder di repo ini campur 0- & 1-indexed). */
  filenameFormat: (index: number) => string;
  zIndex: number;
  className?: string;
  fit: "contain" | "cover";
  mobileFit?: "contain" | "cover";
  /** Cermin horizontal. Dipakai telkom 3 supaya kanopinya menghadap ke dalam. */
  flipX?: boolean;
  /** Jangan lompati frame di HP — untuk sekuens ringan yang harus mulus 30fps. */
  noDecimate?: boolean;

  // ---- pemetaan scroll (hanya dipakai scrollLayers) ----
  /** Progress scroll global (0..1) tempat layer ini mulai bergerak. */
  startProgress?: number;
  /** Progress scroll global tempat layer ini sampai frame terakhir. */
  endProgress?: number;
  /** Sembunyikan sebelum startProgress. Default: tampil menahan frame 0. */
  hideBeforeStart?: boolean;
  /** Sembunyikan setelah endProgress. Default: FREEZE di frame terakhir. */
  hideAfterEnd?: boolean;
}

interface CanvasSequenceManagerProps {
  introLayers: AnimationLayer[];
  scrollLayers: AnimationLayer[];
  /** Dipanggil sekali setelah frame terakhir opening digambar. */
  onIntroComplete?: () => void;
  /** 0..1 — seberapa penuh buffer awal opening. Untuk bar loading. */
  onBufferProgress?: (ratio: number) => void;
}

type FrameEntry = { img: HTMLImageElement; ready: boolean };
type LayerStore = Map<number, FrameEntry>;

const INTRO_FPS = 30;
/** Frame opening yang harus siap sebelum animasi mulai, supaya tidak tersendat. */
const INTRO_BUFFER = 45;
const LOOKAHEAD_INTRO = 40;
const LOOKAHEAD_SCROLL = 24;
const LOOKBEHIND_SCROLL = 8;
/** Di bawah lebar ini frame dilompati 2-2 (kecuali layer ber-noDecimate). */
const MOBILE_BREAKPOINT = 768;

export default function CanvasSequenceManager({
  introLayers,
  scrollLayers,
  onIntroComplete,
  onBufferProgress,
}: CanvasSequenceManagerProps) {
  // Tanpa layer opening tidak ada yang perlu diputar, jadi langsung masuk fase
  // scroll dari initializer — bukan lewat setState di dalam effect.
  const [phase, setPhase] = useState<"intro" | "scroll">(
    introLayers.length === 0 ? "scroll" : "intro"
  );

  const introStores = useRef<LayerStore[]>([]);
  const scrollStores = useRef<LayerStore[]>([]);
  const introCanvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const scrollCanvases = useRef<(HTMLCanvasElement | null)[]>([]);

  // Prop callback disimpan di ref supaya effect opening tidak perlu memasukkan
  // keduanya ke dependency — kalau ikut, satu re-render parent akan memulai
  // ulang animasi dari frame nol.
  const onIntroCompleteRef = useRef(onIntroComplete);
  const onBufferProgressRef = useRef(onBufferProgress);
  useEffect(() => {
    onIntroCompleteRef.current = onIntroComplete;
    onBufferProgressRef.current = onBufferProgress;
  }, [onIntroComplete, onBufferProgress]);

  // Ditentukan sekali saat mount. Sengaja tidak ikut berubah saat window
  // di-resize: mengganti langkah frame di tengah animasi membuang frame yang
  // sudah di-cache tanpa manfaat visual apa pun.
  const isMobile = useRef(false);
  const drawScheduled = useRef(false);
  const latestProgress = useRef(0);
  // Diisi fungsi gambar terbaru di bawah; requestDraw memanggilnya lewat ref
  // supaya requestDraw sendiri bisa stabil (deps kosong).
  const drawRef = useRef<() => void>(() => {});

  const { scrollYProgress } = useScroll();
  // Spring tipis: cukup untuk menghaluskan scroll wheel yang melompat, tapi
  // tidak sampai terasa tertinggal dari jari.
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 400,
    damping: 90,
    restDelta: 0.001,
  });

  /** Kumpulkan beberapa event scroll jadi satu gambar per frame layar. */
  const requestDraw = useCallback(() => {
    if (drawScheduled.current) return;
    drawScheduled.current = true;
    requestAnimationFrame(() => {
      drawScheduled.current = false;
      drawRef.current();
    });
  }, []);

  const stepFor = useCallback((layer: AnimationLayer) => {
    return layer.noDecimate || !isMobile.current ? 1 : 2;
  }, []);

  /** Buat + mulai muat satu frame kalau belum ada. */
  const ensure = useCallback(
    (
      store: LayerStore,
      layer: AnimationLayer,
      index: number,
      onReady?: () => void
    ): FrameEntry | undefined => {
      if (index < 0 || index >= layer.frameCount) return undefined;
      const existing = store.get(index);
      if (existing) return existing;

      const img = new Image();
      const entry: FrameEntry = { img, ready: false };
      store.set(index, entry);
      img.src = `${layer.folderPath}/${layer.filenameFormat(index)}`;

      const markReady = () => {
        if (entry.ready) return;
        entry.ready = true;
        onReady?.();
      };

      // decode() memindahkan kerja decode WebP 1280x720 keluar dari drawImage,
      // jadi frame baru tidak menahan main thread saat digambar.
      if (typeof img.decode === "function") {
        img.decode().then(markReady, () => {
          if (img.complete && img.naturalWidth > 0) markReady();
        });
      } else {
        img.onload = markReady;
      }
      return entry;
    },
    []
  );

  /** Muat jendela frame di sekitar index yang sedang dipakai. */
  const preload = useCallback(
    (
      store: LayerStore,
      layer: AnimationLayer,
      center: number,
      ahead: number,
      behind: number,
      onReady?: () => void
    ) => {
      const step = stepFor(layer);
      const last = layer.frameCount - 1;
      for (let i = center - behind; i <= center + ahead; i++) {
        if (i < 0 || i > last) continue;
        // Frame yang dilompati tidak pernah diminta ke jaringan — hematnya di
        // kuota, bukan cuma di layar. Frame terakhir selalu dikecualikan supaya
        // freeze di akhir memakai frame yang benar.
        if (i % step !== 0 && i !== last) continue;
        ensure(store, layer, i, onReady);
      }
    },
    [ensure, stepFor]
  );

  /** Progress 0..1 → index frame, dibulatkan ke langkah yang dipakai device ini. */
  const pickFrame = useCallback(
    (layer: AnimationLayer, progress: number) => {
      const last = layer.frameCount - 1;
      const raw = Math.round(progress * last);
      if (raw >= last) return last;
      if (raw <= 0) return 0;
      const step = stepFor(layer);
      return Math.min(last, Math.round(raw / step) * step);
    },
    [stepFor]
  );

  const doDraw = useCallback(
    (canvas: HTMLCanvasElement, img: HTMLImageElement, layer: AnimationLayer) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== Math.ceil(w * dpr) || canvas.height !== Math.ceil(h * dpr)) {
        canvas.width = Math.ceil(w * dpr);
        canvas.height = Math.ceil(h * dpr);
      }

      // Transform di-set ulang penuh tiap gambar, bukan ditumpuk: dengan begitu
      // skala DPR dan cermin flipX tidak pernah saling menempel antar frame.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const fit = isMobile.current && layer.mobileFit ? layer.mobileFit : layer.fit;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const boxRatio = w / h;
      const fitToWidth = fit === "contain" ? imgRatio > boxRatio : imgRatio <= boxRatio;

      const drawW = fitToWidth ? w : h * imgRatio;
      const drawH = fitToWidth ? w / imgRatio : h;
      const offsetX = (w - drawW) / 2;
      const offsetY = (h - drawH) / 2;

      if (layer.flipX) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    },
    []
  );

  /**
   * Gambar satu layer. Kalau frame yang diminta belum siap, pakai frame terdekat
   * yang sudah siap supaya canvas tidak pernah berkedip kosong saat scroll cepat.
   */
  const drawLayer = useCallback(
    (
      canvas: HTMLCanvasElement | null,
      store: LayerStore,
      layer: AnimationLayer,
      index: number
    ) => {
      if (!canvas) return;
      const wanted = store.get(index);
      if (wanted?.ready) {
        doDraw(canvas, wanted.img, layer);
        return;
      }
      for (let i = index - 1; i >= 0; i--) {
        const entry = store.get(i);
        if (entry?.ready) {
          doDraw(canvas, entry.img, layer);
          return;
        }
      }
      for (let i = index + 1; i < layer.frameCount; i++) {
        const entry = store.get(i);
        if (entry?.ready) {
          doDraw(canvas, entry.img, layer);
          return;
        }
      }
    },
    [doDraw]
  );

  const drawScrollLayers = useCallback(() => {
    const latest = latestProgress.current;
    scrollLayers.forEach((layer, idx) => {
      const canvas = scrollCanvases.current[idx];
      const store = scrollStores.current[idx];
      if (!canvas || !store) return;

      const start = layer.startProgress ?? 0;
      const end = layer.endProgress ?? 1;

      const hidden =
        (latest < start && layer.hideBeforeStart) ||
        (latest > end && layer.hideAfterEnd);
      canvas.style.opacity = hidden ? "0" : "1";
      if (hidden) return;

      const progress =
        latest <= start ? 0 : latest >= end ? 1 : (latest - start) / (end - start);
      const frame = pickFrame(layer, progress);

      preload(store, layer, frame, LOOKAHEAD_SCROLL, LOOKBEHIND_SCROLL, requestDraw);
      drawLayer(canvas, store, layer, frame);
    });
  }, [scrollLayers, pickFrame, preload, drawLayer, requestDraw]);

  // Dipasang lewat effect, bukan saat render, dan sengaja dideklarasikan di atas
  // effect-effect yang memanggil requestDraw supaya ref-nya sudah terisi.
  useEffect(() => {
    drawRef.current = drawScrollLayers;
  }, [drawScrollLayers]);

  // ---- Tentukan langkah frame + siapkan store scroll ----
  useEffect(() => {
    isMobile.current = window.innerWidth < MOBILE_BREAKPOINT;
    scrollStores.current = scrollLayers.map(() => new Map());
    // Frame pertama tiap scroll layer dimuat lebih dulu supaya pergantian dari
    // opening ke bagian scroll tidak sempat memperlihatkan canvas kosong.
    scrollLayers.forEach((layer, idx) => {
      ensure(scrollStores.current[idx], layer, 0);
    });
  }, [scrollLayers, ensure]);

  // ---- Opening: autoplay 30fps ----
  useEffect(() => {
    if (introLayers.length === 0) {
      onIntroCompleteRef.current?.();
      return;
    }

    const stores = introLayers.map(() => new Map<number, FrameEntry>());
    introStores.current = stores;

    const totalFrames = Math.max(...introLayers.map((l) => l.frameCount));
    const bufferTarget = Math.min(INTRO_BUFFER, totalFrames);
    let readyCount = 0;
    let lastReportedPercent = -1;
    let started = false;
    let currentFrame = 0;
    let outroWarmed = false;
    let rafId = 0;
    let lastTick = 0;

    const countReady = () => {
      readyCount++;
      const percent = Math.min(100, Math.round((readyCount / bufferTarget) * 100));
      // Lapor hanya saat angka bulatnya berubah: tiap laporan memicu re-render
      // parent, dan 154 frame x re-render tidak ada gunanya.
      if (percent !== lastReportedPercent) {
        lastReportedPercent = percent;
        onBufferProgressRef.current?.(percent / 100);
      }
    };

    introLayers.forEach((layer, idx) => {
      preload(stores[idx], layer, 0, INTRO_BUFFER, 0, countReady);
    });

    const tick = (now: number) => {
      // Tunggu buffer awal terisi, kalau tidak frame-frame pertama tersendat.
      if (!started) {
        if (readyCount >= bufferTarget) {
          started = true;
          lastTick = now;
        } else {
          rafId = requestAnimationFrame(tick);
          return;
        }
      }

      const interval = 1000 / INTRO_FPS;
      const elapsed = now - lastTick;

      if (elapsed >= interval) {
        let allReady = true;
        introLayers.forEach((layer, idx) => {
          const frame = Math.min(layer.frameCount - 1, currentFrame);
          preload(stores[idx], layer, frame, LOOKAHEAD_INTRO, 0, countReady);
          if (!stores[idx].get(frame)?.ready) allReady = false;
          drawLayer(introCanvases.current[idx], stores[idx], layer, frame);
        });

        // Mulai menyiapkan sekuens scroll pertama sebelum opening habis, tapi
        // jangan lebih awal — request-nya akan berebut bandwidth dengan opening.
        if (!outroWarmed && currentFrame > totalFrames * 0.7 && scrollLayers[0]) {
          outroWarmed = true;
          preload(scrollStores.current[0], scrollLayers[0], 0, LOOKAHEAD_SCROLL, 0);
        }

        // Frame hanya maju kalau gambarnya memang sudah ada, jadi saat jaringan
        // lambat animasi ikut melambat alih-alih melompat-lompat.
        if (allReady) currentFrame++;
        lastTick = now - (elapsed % interval);
      }

      if (currentFrame >= totalFrames) {
        onBufferProgressRef.current?.(1);
        onIntroCompleteRef.current?.();
        setPhase("scroll");
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // scrollLayers hanya dipakai untuk memanaskan outro; kalau ikut jadi
    // dependency, animasi opening bisa dimulai ulang di tengah jalan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introLayers, preload, drawLayer]);

  // ---- Bagian scroll ----
  useEffect(() => {
    if (phase !== "scroll") return;
    latestProgress.current = smoothProgress.get();
    requestDraw();
  }, [phase, smoothProgress, requestDraw]);

  useMotionValueEvent(smoothProgress, "change", (latest) => {
    latestProgress.current = latest;
    if (phase !== "scroll") return;
    requestDraw();
  });

  // Canvas memakai ukuran CSS-nya, jadi tiap resize harus digambar ulang.
  useEffect(() => {
    let timer: number | undefined;
    const onResize = () => {
      // Digambar ulang setelah jeda, bukan langsung: satu rAF sesudah event
      // resize masih bisa membaca layout lama, sehingga backing store canvas
      // dibuat seukuran viewport baru tapi gambarnya dihitung dari ukuran lama
      // — hasilnya komposisi menempel di kiri atas. Jeda ini juga meredam
      // puluhan event saat jendela di-drag.
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(requestDraw, 180);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [requestDraw]);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      {introLayers.map((layer, idx) => (
        <canvas
          key={`intro-${idx}`}
          ref={(el) => {
            introCanvases.current[idx] = el;
          }}
          className={`absolute w-full h-full ${layer.className || ""}`}
          style={{ zIndex: layer.zIndex, opacity: phase === "intro" ? 1 : 0 }}
        />
      ))}

      {scrollLayers.map((layer, idx) => (
        <canvas
          key={`scroll-${idx}`}
          ref={(el) => {
            scrollCanvases.current[idx] = el;
          }}
          className={`absolute w-full h-full ${layer.className || ""}`}
          style={{
            zIndex: layer.zIndex,
            opacity: phase === "scroll" && !layer.hideBeforeStart ? 1 : 0,
          }}
        />
      ))}
    </div>
  );
}
