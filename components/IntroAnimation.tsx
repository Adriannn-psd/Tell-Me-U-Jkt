"use client";

import { useEffect, useRef, useState } from "react";

interface IntroAnimationProps {
  onComplete: () => void;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const totalFrames = 154;
  const fps = 30;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let framesLoaded = 0;
    const images: HTMLImageElement[] = [];
    
    // Preload all frames
    for (let i = 0; i <= totalFrames; i++) {
      const img = new Image();
      // Format number to 5 digits, e.g., 00000, 00001
      const frameNumber = i.toString().padStart(5, "0");
      img.src = `/opening-frames/${frameNumber}-frame.png`;
      img.onload = () => {
        framesLoaded++;
        setProgress(Math.floor((framesLoaded / (totalFrames + 1)) * 100));
        
        // If it's the first frame, draw it immediately as a poster
        if (i === 0) {
          drawFrame(img);
        }
      };
      images.push(img);
    }

    let animationFrameId: number;
    let startTime: number | null = null;

    const drawFrame = (img: HTMLImageElement) => {
      // Setup high-res canvas
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Clear canvas
      ctx.fillStyle = "var(--color-bg, #0a0a0a)";
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Calculate 'contain' sizing to keep logo clearly visible and not cropped
      const imgRatio = img.width / img.height;
      const canvasRatio = rect.width / rect.height;
      let drawWidth = rect.width;
      let drawHeight = rect.height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > canvasRatio) {
        // Image is wider than canvas
        drawWidth = rect.width;
        drawHeight = drawWidth / imgRatio;
        offsetY = (rect.height - drawHeight) / 2;
      } else {
        // Image is taller than canvas
        drawHeight = rect.height;
        drawWidth = drawHeight * imgRatio;
        offsetX = (rect.width - drawWidth) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Calculate current frame based on elapsed time and FPS
      const currentFrame = Math.floor(elapsed / (1000 / fps));

      if (currentFrame <= totalFrames) {
        const img = images[currentFrame];
        if (img && img.complete) {
          drawFrame(img);
        }
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Animation finished
        // Wait a small moment before triggering completion to make it smooth
        setTimeout(() => {
          onComplete();
        }, 300);
      }
    };

    // Start animation only when a sufficient number of frames are loaded
    // to prevent stuttering. We'll wait for at least 50% or all of them.
    const checkLoadAndStart = setInterval(() => {
      if (framesLoaded >= totalFrames * 0.8) {
        clearInterval(checkLoadAndStart);
        animationFrameId = requestAnimationFrame(animate);
      }
    }, 100);

    return () => {
      clearInterval(checkLoadAndStart);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--color-bg)] flex flex-col items-center justify-center overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-contain"
      />
      {progress < 80 && (
        <div className="absolute bottom-10 flex flex-col items-center gap-2">
          <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--color-brand-red)] transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-white/40 text-[10px] font-medium tracking-widest uppercase">
            Loading {progress}%
          </span>
        </div>
      )}
    </div>
  );
}
