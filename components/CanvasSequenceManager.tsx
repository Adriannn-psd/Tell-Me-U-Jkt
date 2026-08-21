"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  /** Jangan lompati frame di HP — untuk sekuens ringan yang harus mulus. */
  noDecimate?: boolean;
  /** Detik ke berapa (dari awal timeline) layer ini mulai diputar. */
  startAt?: number;
  /** Frame per detik saat diputar. */
  fps?: number;
  /** Sembunyikan sebelum startAt. Default: tampil menahan frame 0. */
  hideBeforeStart?: boolean;
  /** Sembunyikan setelah frame terakhir. Default: FREEZE di frame terakhir. */
  hideAfterEnd?: boolean;
}

interface CanvasSequenceManagerProps {
  /** Diputar lebih dulu, selagi sisa aset diunduh di belakang. */
  introLayers: AnimationLayer[];
  /** Diputar otomatis setelah SEMUA asetnya selesai diunduh. */
  timelineLayers: AnimationLayer[];
  /** 0..1 — unduhan opening, sebelum apa pun diputar. */
  onBufferProgress?: (ratio: number) => void;
  /** Dipanggil sekali setelah frame terakhir opening digambar. */
  onIntroComplete?: () => void;
  /** 0..1 — unduhan seluruh sekuens timeline. */
  onPreloadProgress?: (ratio: number) => void;
  /** Dipanggil sekali saat semua segmen timeline sampai frame terakhirnya. */
  onTimelineComplete?: () => void;
}

type FrameSource = ImageBitmap | HTMLImageElement;
type FrameEntry = { src?: FrameSource; ready: boolean };
type LayerStore = Map<number, FrameEntry>;

const INTRO_FPS = 30;
/** Di bawah lebar ini: pakai frame 960px dan lompati frame 2-2. */
const MOBILE_BREAKPOINT = 768;
/** Folder frame versi HP, dibuat oleh scripts/make-mobile-frames.js. */
const MOBILE_FOLDER_SUFFIX = "-960";
/** Unduhan paralel. Cukup untuk memenuhi bandwidth tanpa membuka ratusan koneksi. */
const DOWNLOAD_CONCURRENCY = 6;
/** Frame yang di-decode di depan posisi sekarang (~0,4 detik runway di 30fps). */
const DECODE_AHEAD = 12;
/** Frame di belakang yang masih ditahan sebelum dilepas. */
const KEEP_BEHIND = 2;
/**
 * Di HP, mem-blit ke 3x kepadatan piksel tidak menambah apa pun yang terlihat
 * untuk gedung yang di-zoom besar, tapi biaya fill-rate-nya naik 2,25x.
 */
const MOBILE_MAX_DPR = 2;

export default function CanvasSequenceManager({
  introLayers,
  timelineLayers,
  onBufferProgress,
  onIntroComplete,
  onPreloadProgress,
  onTimelineComplete,
}: CanvasSequenceManagerProps) {
  /**
   * buffering → opening diunduh, belum ada yang diputar
   * intro     → opening diputar, sisa aset diunduh di belakang
   * hold      → opening habis; kalau unduhan belum penuh, frame terakhirnya ditahan
   *
   * Fase timeline TIDAK ikut di sini: begitu `introDone` dan `assetsReady`
   * dua-duanya true, timeline pasti sedang jalan — jadi bisa diturunkan, tidak
   * perlu state sendiri.
   */
  const [phase, setPhase] = useState<"buffering" | "intro" | "hold">(
    introLayers.length === 0 ? "hold" : "buffering"
  );
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  /**
   * Sekali true, tidak pernah kembali false. Effect timeline bergantung pada ini
   * dan BUKAN pada `phase` — kalau bergantung pada `phase`, `setPhase("timeline")`
   * di dalamnya akan memicu effect itu dijalankan ulang, cleanup-nya membatalkan
   * rAF yang baru saja dimulai, dan animasinya tidak pernah jalan.
   */
  const [introDone, setIntroDone] = useState(introLayers.length === 0);

  const introStores = useRef<LayerStore[]>([]);
  const timelineStores = useRef<LayerStore[]>([]);
  const introCanvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const timelineCanvases = useRef<(HTMLCanvasElement | null)[]>([]);

  // Prop callback disimpan di ref supaya effect animasi tidak perlu memasukkannya
  // ke dependency — kalau ikut, satu re-render parent akan memulai ulang animasi
  // dari frame nol.
  const cb = useRef({
    onBufferProgress,
    onIntroComplete,
    onPreloadProgress,
    onTimelineComplete,
  });
  useEffect(() => {
    cb.current = {
      onBufferProgress,
      onIntroComplete,
      onPreloadProgress,
      onTimelineComplete,
    };
  }, [onBufferProgress, onIntroComplete, onPreloadProgress, onTimelineComplete]);

  // Ditentukan sekali saat mount. Sengaja tidak ikut berubah saat window
  // di-resize: mengganti set frame di tengah animasi membuang yang sudah
  // di-cache tanpa manfaat visual apa pun.
  const isMobile = useRef(false);
  /** Apakah folder frame 960px benar-benar ada. Diprobe sekali saat mount. */
  const useMobileFrames = useRef(false);
  /**
   * Beres saat probe di atas sudah menjawab. Kedua tahap unduhan menunggunya
   * sebelum menyusun URL — kalau tidak, opening bisa diunduh sebagai 1280px lalu
   * di-decode dari URL 960px (atau sebaliknya), sehingga seluruh preload
   * terbuang dan pemutaran justru menyentuh jaringan.
   */
  const frameSetProbed = useRef<Promise<void> | null>(null);
  /** Unduhan timeline sudah 100%. */
  const [assetsReady, setAssetsReady] = useState(timelineLayers.length === 0);

  const stepFor = useCallback((layer: AnimationLayer) => {
    return layer.noDecimate || !isMobile.current ? 1 : 2;
  }, []);

  const folderFor = useCallback((layer: AnimationLayer) => {
    return useMobileFrames.current
      ? `${layer.folderPath}${MOBILE_FOLDER_SUFFIX}`
      : layer.folderPath;
  }, []);

  const urlFor = useCallback(
    (layer: AnimationLayer, index: number) =>
      `${folderFor(layer)}/${layer.filenameFormat(index)}`,
    [folderFor]
  );

  /** Index frame yang benar-benar dipakai device ini (mengikuti langkah). */
  const snapToStep = useCallback(
    (layer: AnimationLayer, raw: number) => {
      const last = layer.frameCount - 1;
      if (raw >= last) return last;
      if (raw <= 0) return 0;
      const step = stepFor(layer);
      return Math.min(last, Math.round(raw / step) * step);
    },
    [stepFor]
  );

  /** Semua index yang akan dipakai layer ini, dari awal sampai akhir. */
  const indicesFor = useCallback(
    (layer: AnimationLayer) => {
      const step = stepFor(layer);
      const last = layer.frameCount - 1;
      const out: number[] = [];
      for (let i = 0; i <= last; i += step) out.push(i);
      // Frame terakhir selalu ikut walau tidak jatuh di kelipatan langkah —
      // freeze di akhir harus memakai frame yang benar.
      if (out[out.length - 1] !== last) out.push(last);
      return out;
    },
    [stepFor]
  );

  // ---- Decode & pelepasan ----

  const decode = useCallback(async (url: string): Promise<FrameSource> => {
    // createImageBitmap men-decode di luar main thread, jadi main thread cuma
    // mem-blit. Ini yang membuat 3 sekuens bisa diputar bersamaan di CPU lemah.
    // Filenya sudah ada di cache disk (immutable), jadi fetch di sini tidak
    // menyentuh jaringan.
    if (typeof createImageBitmap === "function") {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) throw new Error(`frame ${url}: ${res.status}`);
      return await createImageBitmap(await res.blob());
    }
    const img = new Image();
    img.src = url;
    if (typeof img.decode === "function") {
      await img.decode();
    } else {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`frame ${url} gagal`));
      });
    }
    return img;
  }, []);

  const ensure = useCallback(
    (store: LayerStore, layer: AnimationLayer, index: number) => {
      if (index < 0 || index >= layer.frameCount) return;
      if (store.has(index)) return;
      const entry: FrameEntry = { ready: false };
      store.set(index, entry);
      decode(urlFor(layer, index)).then(
        (src) => {
          // Bisa saja sudah dilepas selagi decode berjalan.
          if (store.get(index) !== entry) {
            if ("close" in src) src.close();
            return;
          }
          entry.src = src;
          entry.ready = true;
        },
        () => {
          store.delete(index);
        }
      );
    },
    [decode, urlFor]
  );

  const releaseEntry = useCallback((entry: FrameEntry) => {
    const src = entry.src;
    entry.src = undefined;
    entry.ready = false;
    if (!src) return;
    if ("close" in src) src.close();
    else src.src = "";
  }, []);

  /**
   * Lepas frame yang sudah dilewati. Ini yang membuat memori berbatas: timeline
   * lurus satu arah, jadi frame di belakang tidak akan dipakai lagi. Tanpa ini
   * 865 frame menumpuk sampai ratusan MB dan HP RAM kecil kehabisan.
   */
  const releaseBefore = useCallback(
    (store: LayerStore, layer: AnimationLayer, current: number) => {
      const last = layer.frameCount - 1;
      const cutoff = current - KEEP_BEHIND;
      if (cutoff <= 0) return;
      store.forEach((entry, index) => {
        // Frame terakhir dipertahankan: dia yang dipakai freeze di akhir.
        if (index >= cutoff || index === last) return;
        releaseEntry(entry);
        store.delete(index);
      });
    },
    [releaseEntry]
  );

  /** Siapkan jendela frame di depan posisi sekarang. */
  const ensureWindow = useCallback(
    (store: LayerStore, layer: AnimationLayer, from: number) => {
      const step = stepFor(layer);
      const last = layer.frameCount - 1;
      for (let n = 0; n <= DECODE_AHEAD; n++) {
        const i = from + n * step;
        if (i > last) break;
        ensure(store, layer, i);
      }
      // Frame terakhir disiapkan lebih awal supaya freeze tidak pernah kosong.
      ensure(store, layer, last);
    },
    [ensure, stepFor]
  );

  // ---- Menggambar ----

  const doDraw = useCallback(
    (canvas: HTMLCanvasElement, src: FrameSource, layer: AnimationLayer) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const rawDpr = window.devicePixelRatio || 1;
      const dpr = isMobile.current ? Math.min(rawDpr, MOBILE_MAX_DPR) : rawDpr;

      if (canvas.width !== Math.ceil(w * dpr) || canvas.height !== Math.ceil(h * dpr)) {
        canvas.width = Math.ceil(w * dpr);
        canvas.height = Math.ceil(h * dpr);
      }

      // Transform di-set ulang penuh tiap gambar, bukan ditumpuk: dengan begitu
      // skala DPR dan cermin flipX tidak pernah saling menempel antar frame.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const srcW = "naturalWidth" in src ? src.naturalWidth : src.width;
      const srcH = "naturalHeight" in src ? src.naturalHeight : src.height;
      if (!srcW || !srcH) return;

      const fit = isMobile.current && layer.mobileFit ? layer.mobileFit : layer.fit;
      const imgRatio = srcW / srcH;
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
      ctx.drawImage(src, offsetX, offsetY, drawW, drawH);
    },
    []
  );

  // ---- Probe set frame HP + siapkan store ----
  // Jalan lebih dulu daripada kedua tahap unduhan (keduanya menunggu
  // frameSetProbed), dan dipasang sinkron di sini supaya promise-nya sudah ada
  // sebelum effect mana pun membacanya.
  useEffect(() => {
    isMobile.current = window.innerWidth < MOBILE_BREAKPOINT;
    introStores.current = introLayers.map(() => new Map());
    timelineStores.current = timelineLayers.map(() => new Map());

    const probeLayer = timelineLayers[0] ?? introLayers[0];
    if (!isMobile.current || !probeLayer) {
      frameSetProbed.current = Promise.resolve();
      return;
    }

    // Satu probe menentukan set frame untuk seluruh sesi. Kalau folder 960px
    // belum digenerate, jatuh ke frame 1280px — animasinya tetap jalan, cuma
    // lebih berat.
    const url = `${probeLayer.folderPath}${MOBILE_FOLDER_SUFFIX}/${probeLayer.filenameFormat(0)}`;
    frameSetProbed.current = fetch(url, { method: "HEAD" }).then(
      (res) => {
        useMobileFrames.current = res.ok;
      },
      () => {
        useMobileFrames.current = false;
      }
    );
  }, [introLayers, timelineLayers]);

  // ---- Tahap 1: unduh opening penuh, lalu putar ----
  useEffect(() => {
    if (introLayers.length === 0) return;
    let cancelled = false;
    let rafId = 0;

    const run = async () => {
      // Tunggu set frame ditentukan, supaya yang diunduh dan yang di-decode
      // nanti menunjuk folder yang sama.
      await frameSetProbed.current;
      if (cancelled) return;

      const stores = introStores.current;
      const jobs = introLayers.flatMap((layer) =>
        indicesFor(layer).map((i) => ({ layer, i }))
      );
      let done = 0;
      let lastPercent = -1;

      // Opening cuma ~2 MB, jadi dituntaskan seluruhnya sebelum diputar. Dengan
      // begitu jam pemutarannya tidak pernah perlu menunggu unduhan.
      //
      // Hanya diunduh ke cache disk, TIDAK di-decode: men-decode 154 frame
      // 1280x720 sekaligus berarti menahan ~570 MB bitmap, langsung menghabisi
      // HP RAM kecil. Decode-nya diserahkan ke jendela geser saat diputar.
      await pool(jobs, DOWNLOAD_CONCURRENCY, async ({ layer, i }) => {
        if (cancelled) return;
        try {
          const res = await fetch(urlFor(layer, i), { cache: "force-cache" });
          await res.arrayBuffer();
        } catch {
          // Satu frame gagal tidak boleh menggantung seluruh animasi.
        }
        done++;
        const percent = Math.round((done / jobs.length) * 100);
        if (percent !== lastPercent) {
          lastPercent = percent;
          cb.current.onBufferProgress?.(percent / 100);
        }
      });
      if (cancelled) return;

      // Tunggu frame-frame awal benar-benar ter-decode sebelum jam mulai.
      introLayers.forEach((layer, idx) => ensureWindow(stores[idx], layer, 0));
      await waitReady(stores, introLayers, 4);
      if (cancelled) return;

      cb.current.onBufferProgress?.(1);
      setPhase("intro");

      const totalFrames = Math.max(...introLayers.map((l) => l.frameCount));
      const t0 = performance.now();
      const lastDrawn = introLayers.map(() => -1);

      const tick = (now: number) => {
        if (cancelled) return;
        const frame = Math.floor(((now - t0) / 1000) * INTRO_FPS);

        if (frame >= totalFrames) {
          cb.current.onIntroComplete?.();
          setPhase("hold");
          setIntroDone(true);
          return;
        }

        introLayers.forEach((layer, idx) => {
          const canvas = introCanvases.current[idx];
          const store = stores[idx];
          if (!canvas || !store) return;
          const wanted = Math.min(layer.frameCount - 1, frame);
          ensureWindow(store, layer, wanted);
          if (lastDrawn[idx] !== wanted) {
            const entry = store.get(wanted);
            if (entry?.ready && entry.src) {
              doDraw(canvas, entry.src, layer);
              lastDrawn[idx] = wanted;
            }
          }
          releaseBefore(store, layer, wanted);
        });

        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    };

    run();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [introLayers, indicesFor, urlFor, ensureWindow, releaseBefore, doDraw]);

  // ---- Tahap 2: unduh SEMUA frame timeline, jalan selagi opening diputar ----
  useEffect(() => {
    if (timelineLayers.length === 0) return;
    let cancelled = false;

    const run = async () => {
      await frameSetProbed.current;
      // Menunggu opening mulai diputar dulu supaya request-nya tidak berebut
      // bandwidth dengan unduhan opening.
      while (!cancelled && phaseRef.current === "buffering") {
        await sleep(80);
      }
      if (cancelled) return;

      const jobs = timelineLayers.flatMap((layer) =>
        indicesFor(layer).map((i) => ({ layer, i }))
      );
      let done = 0;
      let lastPercent = -1;

      // Hanya diunduh ke cache disk, TIDAK di-decode dan TIDAK disimpan. Ini
      // yang memenuhi "semua aset sudah terunduh di awal" tanpa menahan ratusan
      // bitmap di memori: decode baru terjadi saat frame-nya mau digambar, dan
      // waktu itu sudah tidak menyentuh jaringan lagi.
      await pool(jobs, DOWNLOAD_CONCURRENCY, async ({ layer, i }) => {
        if (cancelled) return;
        try {
          const res = await fetch(urlFor(layer, i), { cache: "force-cache" });
          await res.arrayBuffer();
        } catch {
          // Satu frame gagal tidak boleh menggantung seluruh animasi.
        }
        done++;
        const percent = Math.round((done / jobs.length) * 100);
        if (percent !== lastPercent) {
          lastPercent = percent;
          cb.current.onPreloadProgress?.(percent / 100);
        }
      });
      if (cancelled) return;
      cb.current.onPreloadProgress?.(1);
      setAssetsReady(true);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [timelineLayers, indicesFor, urlFor]);

  // ---- Tahap 3: putar timeline ----
  // Sengaja bergantung pada `introDone`/`assetsReady` (sekali true, selamanya
  // true) dan BUKAN pada `phase`, supaya setPhase di dalamnya tidak memicu
  // effect ini dijalankan ulang dan membatalkan rAF-nya sendiri.
  useEffect(() => {
    if (timelineLayers.length === 0) return;
    if (!introDone || !assetsReady) return;

    const stores = timelineStores.current;
    const lastDrawn = timelineLayers.map(() => -1);
    const t0 = performance.now();
    let rafId = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      const t = (now - t0) / 1000;
      let allDone = true;

      timelineLayers.forEach((layer, idx) => {
        const canvas = timelineCanvases.current[idx];
        const store = stores[idx];
        if (!canvas || !store) return;

        const last = layer.frameCount - 1;
        const local = t - (layer.startAt ?? 0);

        if (local < 0) {
          allDone = false;
          if (layer.hideBeforeStart) canvas.style.opacity = "0";
          // Disiapkan lebih dulu supaya frame pertamanya tidak telat.
          ensureWindow(store, layer, 0);
          return;
        }
        canvas.style.opacity = "1";

        const raw = Math.floor(local * (layer.fps ?? INTRO_FPS));
        if (raw < last) allDone = false;
        const wanted = snapToStep(layer, raw);

        // Outro berakhir dengan menghilangkan logo, jadi frame terakhirnya
        // disembunyikan alih-alih dibiarkan menutupi gedung di belakangnya.
        if (raw >= last && layer.hideAfterEnd) {
          canvas.style.opacity = "0";
          releaseBefore(store, layer, wanted);
          return;
        }

        ensureWindow(store, layer, wanted);
        if (lastDrawn[idx] !== wanted) {
          const entry = store.get(wanted);
          if (entry?.ready && entry.src) {
            doDraw(canvas, entry.src, layer);
            lastDrawn[idx] = wanted;
          }
          // Kalau frame-nya belum ter-decode, jam TIDAK ditahan. Frame ini
          // dilewati dan frame berikutnya yang sudah siap yang digambar —
          // animasinya tetap selesai tepat waktu alih-alih jadi slow-mo.
        }
        releaseBefore(store, layer, wanted);
      });

      if (allDone) {
        cb.current.onTimelineComplete?.();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [
    introDone,
    assetsReady,
    timelineLayers,
    ensureWindow,
    releaseBefore,
    snapToStep,
    doDraw,
  ]);

  // ---- Gambar ulang saat resize ----
  useEffect(() => {
    let timer: number | undefined;
    const redraw = () => {
      // Semua canvas digambar ulang dari frame yang terakhir tergambar. Dipakai
      // terutama untuk fase `done`, saat tidak ada rAF yang berjalan lagi.
      const paint = (
        layers: AnimationLayer[],
        stores: LayerStore[],
        canvases: (HTMLCanvasElement | null)[]
      ) => {
        layers.forEach((layer, idx) => {
          const canvas = canvases[idx];
          const store = stores[idx];
          if (!canvas || !store) return;
          let best = -1;
          store.forEach((entry, index) => {
            if (entry.ready && index > best) best = index;
          });
          const entry = best >= 0 ? store.get(best) : undefined;
          if (entry?.src) doDraw(canvas, entry.src, layer);
        });
      };
      paint(introLayers, introStores.current, introCanvases.current);
      paint(timelineLayers, timelineStores.current, timelineCanvases.current);
    };

    const onResize = () => {
      // Digambar ulang setelah jeda, bukan langsung: satu rAF sesudah event
      // resize masih bisa membaca layout lama, sehingga backing store canvas
      // dibuat seukuran viewport baru tapi gambarnya dihitung dari ukuran lama
      // — hasilnya komposisi menempel di kiri atas. Jeda ini juga meredam
      // puluhan event saat jendela di-drag.
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(redraw, 180);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [introLayers, timelineLayers, doDraw]);

  // ---- Lepas semua saat unmount ----
  useEffect(() => {
    const intro = introStores;
    const timeline = timelineStores;
    return () => {
      [...intro.current, ...timeline.current].forEach((store) => {
        store.forEach((entry) => {
          const src = entry.src;
          if (!src) return;
          if ("close" in src) src.close();
          else src.src = "";
        });
        store.clear();
      });
    };
  }, []);

  // Canvas opening tetap terlihat sampai timeline benar-benar mulai — itulah yang
  // menahan frame terakhir opening selama unduhan belum penuh.
  const introVisible = !(introDone && assetsReady);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      {introLayers.map((layer, idx) => (
        <canvas
          key={`intro-${idx}`}
          ref={(el) => {
            introCanvases.current[idx] = el;
          }}
          className={`absolute w-full h-full ${layer.className || ""}`}
          style={{ zIndex: layer.zIndex, opacity: introVisible ? 1 : 0 }}
        />
      ))}

      {timelineLayers.map((layer, idx) => (
        <canvas
          key={`timeline-${idx}`}
          ref={(el) => {
            timelineCanvases.current[idx] = el;
          }}
          className={`absolute w-full h-full ${layer.className || ""}`}
          style={{
            zIndex: layer.zIndex,
            opacity: introVisible || layer.hideBeforeStart ? 0 : 1,
          }}
        />
      ))}
    </div>
  );
}

// ---- Pembantu ----

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Jalankan `work` untuk tiap item, maksimal `limit` sekaligus. */
async function pool<T>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<void>
) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      await work(items[index]);
    }
  });
  await Promise.all(runners);
}

/** Tunggu `count` frame pertama tiap layer benar-benar siap dipakai. */
async function waitReady(
  stores: LayerStore[],
  layers: AnimationLayer[],
  count: number
) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const semua = layers.every((layer, idx) => {
      const store = stores[idx];
      const target = Math.min(count, layer.frameCount);
      let ready = 0;
      for (let i = 0; i < target; i++) if (store.get(i)?.ready) ready++;
      return ready >= target;
    });
    if (semua) return;
    await sleep(50);
  }
}
