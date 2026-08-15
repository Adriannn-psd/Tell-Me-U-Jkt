"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll, useMotionValueEvent, useSpring, useMotionValue, animate } from "framer-motion";

export interface AnimationLayer {
  videoPath?: string;
  zIndex: number;
  className?: string;
  fit: "contain" | "cover";
  mobileFit?: "contain" | "cover";
  opacity?: (latest: number) => number;
  
  // Scroll mapping
  startProgress?: number; // Global scroll progress (0.0 to 1.0) where this layer starts
  endProgress?: number;   // Global scroll progress (0.0 to 1.0) where this layer finishes
  hideBeforeStart?: boolean; // If true, video is opacity 0 before startProgress
  hideAfterEnd?: boolean;    // If true, video is opacity 0 after endProgress
  transform?: (progress: number) => string; // Dynamic CSS transform based on layer progress (0 to 1)
  customProgress?: (globalProgress: number) => number; // Optional function to fully control frame progress
}

interface CanvasSequenceManagerProps {
  introLayers: AnimationLayer[];
  scrollLayers: AnimationLayer[];
  onIntroComplete?: () => void;
  onScrollLayersComplete?: () => void;
  skipIntro?: boolean;
  loopIntro?: boolean;
  autoPlayScrollLayers?: boolean;
  autoPlayDuration?: number;
}

export default function CanvasSequenceManager({
  introLayers,
  scrollLayers,
  onIntroComplete,
  onScrollLayersComplete,
  skipIntro = false,
  loopIntro = false,
  autoPlayScrollLayers = false,
  autoPlayDuration = 10
}: CanvasSequenceManagerProps) {
  const [phase, setPhase] = useState<"intro" | "scroll">(skipIntro ? "scroll" : "intro");
  
  const introVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const scrollVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const { scrollYProgress: rawScrollYProgress } = useScroll();
  const autoProgress = useMotionValue(0);

  useEffect(() => {
    if (autoPlayScrollLayers && phase === "scroll") {
      const controls = animate(autoProgress, 1, {
        duration: autoPlayDuration,
        ease: "easeInOut",
        onComplete: () => {
          onScrollLayersComplete?.();
        }
      });
      return controls.stop;
    }
  }, [autoPlayScrollLayers, autoPlayDuration, phase, autoProgress, onScrollLayersComplete]);

  const effectiveProgress = autoPlayScrollLayers ? autoProgress : rawScrollYProgress;

  const scrollYProgress = useSpring(effectiveProgress, {
    stiffness: 400,
    damping: 90,
    restDelta: 0.001
  });

  // Intro Logic
  useEffect(() => {
    if (skipIntro || introLayers.length === 0) {
      setPhase("scroll");
      onIntroComplete?.();
      return;
    }

    if (phase === "intro") {
      let completedCount = 0;
      
      const handleEnded = () => {
        completedCount++;
        if (completedCount >= introLayers.length) {
          if (!loopIntro) {
            setPhase("scroll");
            onIntroComplete?.();
          }
        }
      };

      introVideoRefs.current.forEach(video => {
        if (video) {
          video.addEventListener('ended', handleEnded);
          video.play().catch(e => console.log("AutoPlay blocked", e));
        }
      });

      // Fallback
      const timeout = setTimeout(() => {
        setPhase("scroll");
        onIntroComplete?.();
      }, 8000);

      return () => {
        introVideoRefs.current.forEach(video => {
          if (video) video.removeEventListener('ended', handleEnded);
        });
        clearTimeout(timeout);
      };
    }
  }, [introLayers, skipIntro, phase, loopIntro, onIntroComplete]);

  // Scroll Sync Logic
  const syncScrollLayers = (latest: number) => {
    if (phase !== "scroll") return;

    scrollLayers.forEach((layer, idx) => {
      const video = scrollVideoRefs.current[idx];
      if (!video) return;

      const start = layer.startProgress ?? 0;
      const end = layer.endProgress ?? 1;

      // Opacity handling
      let opacity = 1;
      if (latest < start && layer.hideBeforeStart) opacity = 0;
      else if (latest > end && layer.hideAfterEnd) opacity = 0;
      else if (layer.opacity) opacity = layer.opacity(latest);
      video.style.opacity = opacity.toString();

      if (opacity === 0) return; // Don't bother seeking if hidden

      // Calculate progress WITHIN the layer's defined range
      let layerProgress = 0;
      if (layer.customProgress) {
        layerProgress = layer.customProgress(latest);
      } else {
        if (latest <= start) layerProgress = 0;
        else if (latest >= end) layerProgress = 1;
        else layerProgress = (latest - start) / (end - start);
      }

      if (layer.transform) {
        video.style.transform = layer.transform(layerProgress);
      }

      // Seek video
      if (video.duration) {
        // Fast, accurate seeking because we encoded videos with -g 1 (intra-only)
        video.currentTime = layerProgress * video.duration;
      }
    });
  };

  useMotionValueEvent(scrollYProgress, "change", syncScrollLayers);

  // Initialize scroll layers
  useEffect(() => {
    if (phase === "scroll") {
      syncScrollLayers(scrollYProgress.get());
    }
  }, [phase]);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      {/* Intro layers */}
      {introLayers.map((layer, idx) => {
        return (
          <video
            key={`intro-${idx}`}
            ref={(el) => {
              introVideoRefs.current[idx] = el;
            }}
            src={layer.videoPath}
            className={`absolute w-full h-full ${layer.className || ""}`}
            style={{ 
              zIndex: layer.zIndex,
              opacity: phase === "intro" ? 1 : 0,
              transition: "opacity 0.3s ease-out",
              objectFit: layer.fit,
              border: "5px solid red",
              backgroundColor: "rgba(0, 255, 0, 0.2)"
            }}
            muted
            playsInline
            autoPlay
            loop={loopIntro}
            preload="auto"
          />
        );
      })}

      {/* Scroll layers */}
      {scrollLayers.map((layer, idx) => {
        return (
          <video
            key={`scroll-${idx}`}
            ref={(el) => {
              scrollVideoRefs.current[idx] = el;
            }}
            src={layer.videoPath}
            className={`absolute w-full h-full ${layer.className || ""}`}
            style={{ 
              zIndex: layer.zIndex,
              opacity: phase === "scroll" && !layer.hideBeforeStart ? 1 : 0,
              transition: "opacity 0.1s ease-out",
              objectFit: layer.fit,
              border: "5px solid blue",
              backgroundColor: "rgba(0, 0, 255, 0.2)"
            }}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={(e) => {
              // Force browser to decode the first frame
              e.currentTarget.currentTime = 0.01;
            }}
          />
        );
      })}
      
      {/* DEBUG OVERLAY - REMOVE LATER */}
      <div className="absolute top-4 left-4 bg-black/80 text-white p-4 font-mono text-xs z-50 pointer-events-auto rounded">
        <div>DEBUG: CanvasSequenceManager Mounted</div>
        <div>Phase: {phase}</div>
        <div>Intro videos: {introLayers.length}</div>
        <div>Scroll videos: {scrollLayers.length}</div>
      </div>
    </div>
  );
}
