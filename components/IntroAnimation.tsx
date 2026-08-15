"use client";

import { useRef, useEffect } from "react";

interface IntroAnimationProps {
  onComplete: () => void;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      onComplete();
    };

    // If video finishes playing naturally
    video.addEventListener("ended", handleEnded);
    
    // Fallback in case video fails to load or play automatically
    const timeout = setTimeout(() => {
      if (video.readyState < 3 || video.paused) {
        onComplete();
      }
    }, 6000);

    return () => {
      video.removeEventListener("ended", handleEnded);
      clearTimeout(timeout);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--color-bg)] flex flex-col items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        muted
        playsInline
        src="/intro.mp4"
      />
    </div>
  );
}
