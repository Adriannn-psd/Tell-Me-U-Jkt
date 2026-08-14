"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";

export interface AnimationLayer {
  folderPath: string;
  frameCount: number;
  zIndex: number;
  className?: string;
  fit: "contain" | "cover";
  mobileFit?: "contain" | "cover";
  opacity?: (latest: number) => number;
  filenameFormat?: (index: number) => string; 
  
  // Scroll mapping
  startProgress?: number; // Global scroll progress (0.0 to 1.0) where this layer starts
  endProgress?: number;   // Global scroll progress (0.0 to 1.0) where this layer finishes
  hideBeforeStart?: boolean; // If true, canvas is opacity 0 before startProgress
  hideAfterEnd?: boolean;    // If true, canvas is opacity 0 after endProgress
  transform?: (progress: number) => string; // Dynamic CSS transform based on layer progress (0 to 1)
  customProgress?: (globalProgress: number) => number; // Optional function to fully control frame progress
}

interface CanvasSequenceManagerProps {
  introLayers: AnimationLayer[];
  scrollLayers: AnimationLayer[];
  onIntroComplete?: () => void;
}

export default function CanvasSequenceManager({
  introLayers,
  scrollLayers,
  onIntroComplete
}: CanvasSequenceManagerProps) {
  const [phase, setPhase] = useState<"intro" | "scroll">("intro");
  
  const introImagesRef = useRef<HTMLImageElement[][]>([]);
  const scrollImagesRef = useRef<HTMLImageElement[][]>([]);
  
  const introCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const scrollCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const { scrollYProgress } = useScroll();

  const loadImagesForLayer = (layer: AnimationLayer, isIntro: boolean): HTMLImageElement[] => {
    const images: HTMLImageElement[] = [];
    // Assume images might start at 0 or 1, we load up to frameCount
    for (let i = 0; i <= layer.frameCount; i++) {
      const img = new Image();
      let filename = "";
      if (layer.filenameFormat) {
        filename = layer.filenameFormat(i);
      } else {
        // default padded format, e.g. 00001.png or 00000-frame.png
        filename = `${i.toString().padStart(5, "0")}-frame.webp`;
      }
      const url = `${layer.folderPath}/${filename}`;
      (img as any).dataset_src = url;
      
      // Preload the first 30 frames for both intro and scroll to avoid network bottleneck
      if (i < 30) {
        img.src = url;
      }
      
      images.push(img);
    }
    return images;
  };

  // Preload
  useEffect(() => {
    introLayers.forEach((layer, idx) => {
      introImagesRef.current[idx] = loadImagesForLayer(layer, true);
    });
    scrollLayers.forEach((layer, idx) => {
      scrollImagesRef.current[idx] = loadImagesForLayer(layer, false);
    });
  }, [introLayers, scrollLayers]);

  // Intro Auto-play logic
  useEffect(() => {
    if (introLayers.length === 0) {
      setPhase("scroll");
      onIntroComplete?.();
      return;
    }

    let currentFrame = 0;
    const maxIntroFrames = Math.max(...introLayers.map((l) => l.frameCount));
    let animationFrameId: number;
    let lastTime = performance.now();
    const fps = 30;
    const interval = 1000 / fps;

    const playIntro = (time: number) => {
      if (currentFrame >= maxIntroFrames) {
        setPhase("scroll");
        onIntroComplete?.();
        return;
      }

      const deltaTime = time - lastTime;
      if (deltaTime > interval) {
        // Ensure all layers have the current frame loaded before advancing
        let allReady = true;
        introLayers.forEach((layer, idx) => {
          const progress = currentFrame / maxIntroFrames;
          const layerFrame = Math.min(layer.frameCount, Math.floor(progress * layer.frameCount));
          const img = introImagesRef.current[idx][layerFrame];
          if (!img || !img.complete) allReady = false;
        });

        if (allReady) {
          introLayers.forEach((layer, idx) => {
            const progress = currentFrame / maxIntroFrames;
            const layerFrame = Math.min(layer.frameCount, Math.floor(progress * layer.frameCount));
            const currentFit = (window.innerWidth < 1024 && layer.mobileFit) ? layer.mobileFit : layer.fit;
            drawFrame(introCanvasRefs.current[idx], layerFrame, introImagesRef.current[idx], currentFit);
          });
          currentFrame++;
        }
        lastTime = time - (deltaTime % interval);
      }
      animationFrameId = requestAnimationFrame(playIntro);
    };

    setTimeout(() => {
      animationFrameId = requestAnimationFrame(playIntro);
    }, 500);

    return () => cancelAnimationFrame(animationFrameId);
  }, [introLayers]);

  const drawFrame = (
    canvas: HTMLCanvasElement | null,
    frameIndex: number,
    images: HTMLImageElement[],
    fit: "contain" | "cover"
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Look ahead and lazily preload next 30 frames to avoid lag
    const preloadAhead = 30;
    for (let i = frameIndex; i < frameIndex + preloadAhead && i < images.length; i++) {
      const imgToPreload = images[i];
      if (!imgToPreload.src && (imgToPreload as any).dataset_src) {
        imgToPreload.src = (imgToPreload as any).dataset_src;
      }
    }

    const img = images[frameIndex];
    if (!img || !img.complete) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Only resize if changed to avoid expensive DOM operations
    if (canvas.width !== Math.ceil(rect.width * dpr) || canvas.height !== Math.ceil(rect.height * dpr)) {
      canvas.width = Math.ceil(rect.width * dpr);
      canvas.height = Math.ceil(rect.height * dpr);
      ctx.scale(dpr, dpr);
    }
    
    // Completely clear canvas avoiding any transform/scaling artifacts
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const imgRatio = img.width / img.height;
    const canvasRatio = rect.width / rect.height;
    
    let drawWidth = rect.width;
    let drawHeight = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (fit === "contain") {
      if (imgRatio > canvasRatio) {
        drawWidth = rect.width;
        drawHeight = drawWidth / imgRatio;
        offsetY = (rect.height - drawHeight) / 2;
      } else {
        drawHeight = rect.height;
        drawWidth = drawHeight * imgRatio;
        offsetX = (rect.width - drawWidth) / 2;
      }
    } else {
      if (imgRatio > canvasRatio) {
        drawHeight = rect.height;
        drawWidth = drawHeight * imgRatio;
        offsetX = (rect.width - drawWidth) / 2;
      } else {
        drawWidth = rect.width;
        drawHeight = drawWidth / imgRatio;
        offsetY = (rect.height - drawHeight) / 2;
      }
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  // Draw initial scroll frames when phase changes
  useEffect(() => {
    if (phase === "scroll") {
      const latest = scrollYProgress.get();
      scrollLayers.forEach((layer, idx) => {
        const canvas = scrollCanvasRefs.current[idx];
        if (!canvas) return;

        const start = layer.startProgress ?? 0;
        const end = layer.endProgress ?? 1;

        let opacity = 1;
        if (latest < start && layer.hideBeforeStart) opacity = 0;
        else if (latest > end && layer.hideAfterEnd) opacity = 0;
        else if (layer.opacity) opacity = layer.opacity(latest);
        canvas.style.opacity = opacity.toString();

        if (opacity === 0) return;

        let layerProgress = 0;
        if (layer.customProgress) {
          layerProgress = layer.customProgress(latest);
        } else {
          if (latest <= start) layerProgress = 0;
          else if (latest >= end) layerProgress = 1;
          else layerProgress = (latest - start) / (end - start);
        }

        if (layer.transform) {
          canvas.style.transform = layer.transform(layerProgress);
        }

        const frameIndex = Math.floor(layerProgress * (layer.frameCount - 1));
        const safeFrameIndex = Math.max(0, Math.min(layer.frameCount - 1, frameIndex));
        const currentFit = (window.innerWidth < 1024 && layer.mobileFit) ? layer.mobileFit : layer.fit;
        drawFrame(canvas, safeFrameIndex, scrollImagesRef.current[idx], currentFit);
      });
    }
  }, [phase, scrollLayers, scrollYProgress]);

  // Scroll logic
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (phase !== "scroll") return;

    scrollLayers.forEach((layer, idx) => {
      const canvas = scrollCanvasRefs.current[idx];
      if (!canvas) return;

      const start = layer.startProgress ?? 0;
      const end = layer.endProgress ?? 1;

      // Opacity handling
      let opacity = 1;
      if (latest < start && layer.hideBeforeStart) opacity = 0;
      else if (latest > end && layer.hideAfterEnd) opacity = 0;
      else if (layer.opacity) opacity = layer.opacity(latest);
      canvas.style.opacity = opacity.toString();

      if (opacity === 0) return; // Don't bother drawing if hidden

      // Calculate progress WITHIN the layer's defined range
      let layerProgress = 0;
      if (layer.customProgress) {
        layerProgress = layer.customProgress(latest);
      } else {
        if (latest <= start) {
          layerProgress = 0;
        } else if (latest >= end) {
          layerProgress = 1;
        } else {
          layerProgress = (latest - start) / (end - start);
        }
      }

      if (layer.transform) {
        canvas.style.transform = layer.transform(layerProgress);
      }

      const frameIndex = Math.floor(layerProgress * (layer.frameCount - 1));
      
      // Ensure we don't exceed array bounds
      const safeFrameIndex = Math.max(0, Math.min(layer.frameCount - 1, frameIndex));
      const currentFit = (window.innerWidth < 1024 && layer.mobileFit) ? layer.mobileFit : layer.fit;
      drawFrame(canvas, safeFrameIndex, scrollImagesRef.current[idx], currentFit);
    });
  });

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      {/* Intro layers remain mounted but are hidden after intro finishes */}
      {introLayers.map((layer, idx) => (
        <canvas
          key={`intro-${idx}`}
          ref={(el) => {
            introCanvasRefs.current[idx] = el;
          }}
          className={`absolute w-full h-full ${layer.className || ""}`}
          style={{ 
            zIndex: layer.zIndex,
            opacity: phase === "intro" ? 1 : 0,
            transition: "opacity 0ms"
          }}
        />
      ))}

      {/* Scroll layers are only visible when in scroll phase */}
      {scrollLayers.map((layer, idx) => (
        <canvas
          key={`scroll-${idx}`}
          ref={(el) => {
            scrollCanvasRefs.current[idx] = el;
          }}
          className={`absolute w-full h-full ${layer.className || ""}`}
          style={{ 
            zIndex: layer.zIndex,
            opacity: phase === "scroll" && !layer.hideBeforeStart ? 1 : 0,
            transition: "opacity 0ms"
          }}
        />
      ))}
    </div>
  );
}
