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

/**
 * Penanda waktu di jam timeline (detik, 0 = frame pertama outro). Dipakai untuk
 * memicu suara tepat saat sebuah segmen gambar mulai, bukan lewat setTimeout
 * terpisah yang jamnya bisa melenceng dari jam animasi.
 */
export interface TimelineCue {
  at: number;
  name: string;
}

interface CanvasSequenceManagerProps {
  /** Diputar lebih dulu. */
  introLayers: AnimationLayer[];
  /** Diputar langsung menyambung setelah intro habis. */
  timelineLayers: AnimationLayer[];
  /**
   * Cue di jam timeline. Masing-masing dipicu sekali, pada tick pertama yang
   * waktunya sudah melewati `at`. Harus punya identitas stabil (definisikan di
   * luar komponen) — ia masuk dependency effect timeline.
   */
  cues?: TimelineCue[];
  /**
   * 0..1 — SATU unduhan untuk semua sekuens, opening maupun timeline, sebelum
   * ada satu frame pun yang diputar. Dulu unduhannya dua tahap dan masing-masing
   * punya bar sendiri, jadi loading-nya terlihat dua kali.
   */
  onLoadProgress?: (ratio: number) => void;
  /** Dipanggil sekali, tepat sebelum frame pertama opening digambar. */
  onIntroStart?: () => void;
  /** Dipanggil sekali setelah frame terakhir opening digambar. */
  onIntroComplete?: () => void;
  /** Dipanggil saat sebuah cue timeline terlewati. */
  onCue?: (name: string) => void;
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
/**
 * Runway decode di depan posisi sekarang, diukur dalam DETIK — bukan jumlah
 * frame. Kalau diukur dalam frame, menaikkan fps otomatis memperpendek waktu
 * yang tersedia buat men-decode: 12 frame itu 0,4 detik di 30fps tapi cuma 0,27
 * detik di 45fps, dan gedung yang dipercepat langsung mulai kehilangan frame.
 */
const DECODE_AHEAD_SECONDS = 0.45;
/**
 * Seberapa awal sebelum `startAt` sebuah layer boleh membuka jendela decode
 * penuhnya. Sebelum ambang ini cuma dua frame yang disiapkan.
 */
const WARM_LEAD_SECONDS = 1.2;
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
  cues,
  onLoadProgress,
  onIntroStart,
  onIntroComplete,
  onCue,
  onTimelineComplete,
}: CanvasSequenceManagerProps) {
  /**
   * Satu-satunya state fase yang tersisa. Sekali true tidak pernah kembali
   * false, dan effect timeline bergantung padanya — kalau bergantung pada state
   * yang bolak-balik, cleanup-nya akan membatalkan rAF yang baru saja dimulai
   * dan animasinya tidak pernah jalan.
   *
   * Dulu ada `phase` ("buffering" | "intro" | "hold") dan `assetsReady`
   * terpisah, karena unduhan timeline berlomba dengan pemutaran opening dan
   * frame terakhir opening kadang harus ditahan. Sekarang semua aset sudah
   * lengkap sebelum frame pertama digambar, jadi tidak ada lagi yang perlu
   * ditunggu di tengah jalan.
   */
  const [introDone, setIntroDone] = useState(false);

  const introStores = useRef<LayerStore[]>([]);
  const timelineStores = useRef<LayerStore[]>([]);
  const introCanvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const timelineCanvases = useRef<(HTMLCanvasElement | null)[]>([]);

  // Prop callback disimpan di ref supaya effect animasi tidak perlu memasukkannya
  // ke dependency — kalau ikut, satu re-render parent akan memulai ulang animasi
  // dari frame nol.
  const cb = useRef({
    onLoadProgress,
    onIntroStart,
    onIntroComplete,
    onCue,
    onTimelineComplete,
  });
  useEffect(() => {
    cb.current = {
      onLoadProgress,
      onIntroStart,
      onIntroComplete,
      onCue,
      onTimelineComplete,
    };
  }, [onLoadProgress, onIntroStart, onIntroComplete, onCue, onTimelineComplete]);

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
      // Jumlahnya diturunkan dari fps layer ini, jadi runway-nya tetap ~0,45
      // detik baik di 30fps maupun 45fps. Di HP step-nya 2, jadi jumlah yang
      // sama menutup rentang waktu dua kali lebih panjang — itu memang yang
      // diinginkan, karena HP yang paling butuh kelonggaran decode.
      const fps = layer.fps ?? INTRO_FPS;
      const count = Math.max(4, Math.ceil((DECODE_AHEAD_SECONDS * fps) / step));
      for (let n = 0; n <= count; n++) {
        const i = from + n * step;
        if (i > last) break;
        ensure(store, layer, i);
      }
      // Frame terakhir disiapkan lebih awal supaya freeze tidak pernah kosong.
      ensure(store, layer, last);
    },
    [ensure, stepFor]
  );

  /**
   * Decode beberapa frame pertama sebuah layer, tanpa membuka jendela penuh.
   * Dipakai untuk menyiapkan sambungan antar segmen: cukup supaya frame pertama
   * tidak telat, tanpa menahan puluhan bitmap selama opening diputar.
   */
  const warmFirst = useCallback(
    (store: LayerStore, layer: AnimationLayer, count: number) => {
      const step = stepFor(layer);
      for (let n = 0; n < count; n++) ensure(store, layer, n * step);
    },
    [ensure, stepFor]
  );

  /** Index frame pertama yang benar-benar dipakai layer ini — untuk menunggu. */
  const firstIndices = useCallback(
    (layer: AnimationLayer, count: number) => {
      const step = stepFor(layer);
      const last = layer.frameCount - 1;
      const out: number[] = [];
      for (let n = 0; n < count; n++) {
        const i = n * step;
        if (i > last) break;
        out.push(i);
      }
      return out;
    },
    [stepFor]
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

  /**
   * Gambar frame pertama tiap segmen timeline yang mulai di detik 0, dipanggil
   * SEBELUM `introDone` di-set.
   *
   * Kenapa harus sebelum: begitu introDone true, satu commit React mengubah
   * opacity canvas opening ke 0 dan canvas outro ke 1 sekaligus. Kalau outro
   * baru digambar setelah commit itu (di effect, yang jalan setelah paint), ada
   * satu frame di mana opening sudah hilang tapi outro masih kosong — kedipan
   * hitam tepat di sambungan. Dengan digambar lebih dulu, pertukaran opacity-nya
   * langsung menampilkan gambar yang benar.
   */
  const paintTimelineStart = useCallback(() => {
    timelineLayers.forEach((layer, idx) => {
      if ((layer.startAt ?? 0) > 0) return;
      const canvas = timelineCanvases.current[idx];
      const entry = timelineStores.current[idx]?.get(0);
      if (canvas && entry?.ready && entry.src) doDraw(canvas, entry.src, layer);
    });
  }, [timelineLayers, doDraw]);

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

  // ---- Tahap 1: unduh SEMUA frame sekali, lalu putar opening ----
  useEffect(() => {
    if (introLayers.length === 0 && timelineLayers.length === 0) return;
    let cancelled = false;
    let rafId = 0;

    const run = async () => {
      // Tunggu set frame ditentukan, supaya yang diunduh dan yang di-decode
      // nanti menunjuk folder yang sama.
      await frameSetProbed.current;
      if (cancelled) return;

      const stores = introStores.current;
      // Satu antrean untuk opening DAN seluruh timeline. Urutannya opening dulu,
      // jadi frame yang paling cepat dibutuhkan juga yang paling cepat mendarat
      // di cache.
      const jobs = [...introLayers, ...timelineLayers].flatMap((layer) =>
        indicesFor(layer).map((i) => ({ layer, i }))
      );
      let done = 0;
      let lastPercent = -1;

      // Hanya diunduh ke cache disk, TIDAK di-decode dan TIDAK disimpan:
      // men-decode 865 frame sekaligus berarti menahan miliaran piksel bitmap
      // dan langsung menghabisi HP RAM kecil. Decode-nya diserahkan ke jendela
      // geser saat frame-nya benar-benar mau digambar — dan saat itu sudah tidak
      // menyentuh jaringan lagi.
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
          cb.current.onLoadProgress?.(percent / 100);
        }
      });
      if (cancelled) return;
      cb.current.onLoadProgress?.(1);

      // Decode frame-frame pertama sebelum jam mulai. Yang ikut disiapkan bukan
      // cuma opening, tapi juga segmen timeline yang mulai di detik 0 (outro):
      // frame 0001 outro persis sama dengan frame terakhir opening, jadi kalau
      // ia belum ter-decode saat opening habis, sambungannya berkedip kosong.
      const waitFor: { store: LayerStore; indices: number[] }[] = [];
      introLayers.forEach((layer, idx) => {
        ensureWindow(stores[idx], layer, 0);
        waitFor.push({ store: stores[idx], indices: firstIndices(layer, 4) });
      });
      timelineLayers.forEach((layer, idx) => {
        if ((layer.startAt ?? 0) > 0) return;
        const store = timelineStores.current[idx];
        warmFirst(store, layer, 4);
        waitFor.push({ store, indices: firstIndices(layer, 4) });
      });
      await waitReady(waitFor);
      if (cancelled) return;

      // Suara pembuka dipicu di sini, bukan saat bar loading penuh: frame
      // pertama baru benar-benar digambar setelah decode selesai, dan suara yang
      // mulai sebelum gambarnya terasa mendahului.
      cb.current.onIntroStart?.();

      if (introLayers.length === 0) {
        paintTimelineStart();
        setIntroDone(true);
        return;
      }

      const totalFrames = Math.max(...introLayers.map((l) => l.frameCount));
      const t0 = performance.now();
      const lastDrawn = introLayers.map(() => -1);

      const tick = (now: number) => {
        if (cancelled) return;
        const frame = Math.floor(((now - t0) / 1000) * INTRO_FPS);

        if (frame >= totalFrames) {
          paintTimelineStart();
          cb.current.onIntroComplete?.();
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
  }, [
    introLayers,
    timelineLayers,
    indicesFor,
    urlFor,
    ensureWindow,
    warmFirst,
    firstIndices,
    releaseBefore,
    doDraw,
    paintTimelineStart,
  ]);

  // ---- Tahap 2: putar timeline, menyambung langsung setelah opening ----
  // Sengaja bergantung pada `introDone` (sekali true, selamanya true) supaya
  // setState mana pun di dalamnya tidak memicu effect ini dijalankan ulang dan
  // membatalkan rAF-nya sendiri.
  useEffect(() => {
    if (timelineLayers.length === 0) return;
    if (!introDone) return;

    const stores = timelineStores.current;
    const lastDrawn = timelineLayers.map(() => -1);
    const cueList = cues ?? [];
    const cueFired = cueList.map(() => false);
    const t0 = performance.now();
    let rafId = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      const t = (now - t0) / 1000;
      let allDone = true;

      // Dipicu dari jam yang sama dengan gambarnya. Kalau dipasang sebagai
      // setTimeout terpisah, suara dan gambar punya dua jam yang bisa saling
      // melenceng — terutama di HP, saat tab sempat di-throttle.
      cueList.forEach((cue, idx) => {
        if (cueFired[idx] || t < cue.at) return;
        cueFired[idx] = true;
        cb.current.onCue?.(cue.name);
      });

      timelineLayers.forEach((layer, idx) => {
        const canvas = timelineCanvases.current[idx];
        const store = stores[idx];
        if (!canvas || !store) return;

        const last = layer.frameCount - 1;
        const local = t - (layer.startAt ?? 0);

        if (local < 0) {
          allDone = false;
          if (layer.hideBeforeStart) canvas.style.opacity = "0";
          // Jendela penuh baru dibuka sesaat sebelum layer-nya mulai. Kalau
          // dibuka sejak detik nol, ketiga sekuens gedung menahan window-nya
          // masing-masing selama outro diputar — ratusan MB bitmap untuk frame
          // yang baru dipakai belasan detik kemudian, dan itu persis yang
          // menghabisi HP RAM kecil. Sebelum ambang itu cukup dua frame supaya
          // frame pertamanya tidak telat.
          if (local > -WARM_LEAD_SECONDS) ensureWindow(store, layer, 0);
          else warmFirst(store, layer, 2);
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

    // Tick pertama dijalankan langsung, tidak lewat rAF. Canvas opening baru
    // saja disembunyikan pada commit yang memicu effect ini; kalau menunggu rAF
    // berikutnya, ada satu frame di mana opening sudah hilang tapi outro belum
    // digambar — kedipan kosong di sambungan. tick() sendiri yang menjadwalkan
    // rAF berikutnya, jadi tidak perlu dijadwalkan dua kali di sini.
    tick(performance.now());
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [
    introDone,
    timelineLayers,
    cues,
    ensureWindow,
    warmFirst,
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

  // Canvas opening disembunyikan tepat saat timeline mengambil alih. Frame 0001
  // outro sama dengan frame terakhir opening, jadi peralihannya tidak terlihat.
  const introVisible = !introDone;

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

/**
 * Tunggu index-index tertentu benar-benar siap dipakai. Yang ditunggu adalah
 * daftar index eksplisit, bukan "n frame pertama": di HP frame dilompati 2-2,
 * jadi index ganjil memang tidak akan pernah siap dan menunggunya berarti
 * menggantung sampai batas percobaan habis.
 */
async function waitReady(targets: { store: LayerStore; indices: number[] }[]) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const semua = targets.every((t) =>
      t.indices.every((i) => t.store.get(i)?.ready)
    );
    if (semua) return;
    await sleep(50);
  }
}
