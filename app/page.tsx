"use client";

import Link from "next/link";
import Image from "next/image";
import "./login.css";
import { Suspense, useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent, useTransform } from "framer-motion";
import CanvasSequenceManager, { AnimationLayer } from "@/components/CanvasSequenceManager";

function LandingContent() {
  const { scrollYProgress } = useScroll();
  const opacityScrollText = useTransform(scrollYProgress, [0, 0.05], [1, 0]);
  const [showLoginUI, setShowLoginUI] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);

  // Trigger login UI when scroll reaches 85% (when reverse starts)
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest > 0.85 && !showLoginUI) {
      setShowLoginUI(true);
    } else if (latest <= 0.85 && showLoginUI) {
      setShowLoginUI(false);
    }
  });

  // Reset scroll to top on reload so animations play from the start
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
      
      const forceScroll = () => {
        window.scrollTo({ top: 0, behavior: "instant" });
      };

      // Next.js client-side navigation can be stubborn. Try multiple times to override it.
      forceScroll();
      const t1 = setTimeout(forceScroll, 50);
      const t2 = setTimeout(forceScroll, 150);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, []);

  // Intro layers
  const introLayers: AnimationLayer[] = [
    {
      folderPath: `/opening-frames`,
      frameCount: 154,
      zIndex: 10,
      fit: "cover",
      mobileFit: "contain",
      filenameFormat: (index) => `${index.toString().padStart(5, "0")}-frame.webp`
    }
  ];

  // Scroll layers
  const scrollLayers: AnimationLayer[] = [
    {
      // 0.0 to 0.2: Outro (menghilangkan logo telkom)
      folderPath: `/outro`,
      frameCount: 116,
      zIndex: 20,
      fit: "cover",
      mobileFit: "contain",
      startProgress: 0.0,
      endProgress: 0.2,
      hideAfterEnd: true,
      filenameFormat: (index) => `${(index + 1).toString().padStart(4, "0")}.webp`
    },
    {
      // 0.5 to 0.8: Telkom 1
      folderPath: `/telkom 1`,
      frameCount: 179,
      zIndex: 30,
      fit: "cover",
      mobileFit: "contain",
      startProgress: 0.5,
      endProgress: 0.99,
      hideBeforeStart: true,
      hideAfterEnd: true,
      customProgress: (latest) => {
        if (latest < 0.5) return 0;
        if (latest <= 0.7) return (latest - 0.5) / 0.2; // Forward (finishes at 0.7)
        if (latest <= 0.85) return 1; // Freeze for 15% scroll
        return 1 - ((latest - 0.85) / 0.14); // Reverse finishes at 0.99
      },
      className: "!w-[180vw] md:!w-full !h-[100vh] top-[5vh] left-[-40vw] md:left-0",
      filenameFormat: (index) => `${(index + 1).toString().padStart(4, "0")}.webp`
    },
    {
      // 0.2 to 0.5: Telkom 2
      folderPath: `/telkom 2`,
      frameCount: 177,
      zIndex: 25,
      fit: "contain",
      startProgress: 0.2,
      endProgress: 0.99,
      hideBeforeStart: true,
      hideAfterEnd: true,
      customProgress: (latest) => {
        if (latest < 0.2) return 0;
        if (latest <= 0.5) return (latest - 0.2) / 0.3; // Forward (finishes at 0.5)
        if (latest <= 0.85) return 1; // Hold and freeze until 0.85
        return 1 - ((latest - 0.85) / 0.14); // Reverse finishes at 0.99
      },
      opacity: (latest) => {
        // Redup perlahan saat telkom 1 (mulai 0.5) muncul
        if (latest < 0.5) return 1;
        if (latest >= 0.5 && latest < 0.55) return 1 - ((latest - 0.5) / 0.05) * 0.7; // 1 -> 0.3
        if (latest >= 0.85) return 0; // Sembunyikan total saat login UI muncul untuk kurangi LAG
        return 0.3; // opacity redup
      },
      className: "!w-[130vw] md:!w-[50vw] !h-[100vh] top-[-15vh] md:top-[-5vh] left-[-35vw] md:left-[-5vw]",
      filenameFormat: (index) => `${(index + 1).toString().padStart(4, "0")}.webp`
    },
    {
      // 0.5 to 0.8: Telkom 3 (Kanan pojok, paling dalam/belakang)
      folderPath: `/telkom 3`,
      frameCount: 240,
      zIndex: 22,
      fit: "contain",
      startProgress: 0.2,
      endProgress: 0.99,
      hideBeforeStart: true,
      hideAfterEnd: true,
      customProgress: (latest) => {
        if (latest < 0.2) return 0;
        if (latest <= 0.5) return (latest - 0.2) / 0.3; // Forward (finishes at 0.5)
        if (latest <= 0.85) return 1; // Hold and freeze until 0.85
        return 1 - ((latest - 0.85) / 0.14); // Reverse finishes at 0.99
      },
      opacity: (latest) => {
        // Redup perlahan saat telkom 1 (mulai 0.5) muncul
        if (latest < 0.5) return 1;
        if (latest >= 0.5 && latest < 0.55) return 1 - ((latest - 0.5) / 0.05) * 0.7; // 1 -> 0.3
        if (latest >= 0.85) return 0; // Sembunyikan total saat login UI muncul untuk kurangi LAG
        return 0.3; // opacity redup
      },
      className: "!w-[130vw] md:!w-[50vw] !h-[100vh] top-[-15vh] md:top-[-5vh] right-[-35vw] md:right-[-5vw]",
      filenameFormat: (index) => `${(index + 1).toString().padStart(4, "0")}.webp`
    }
  ];

  return (
    <main className="page" style={{ height: "400vh", position: "relative" }} suppressHydrationWarning>
      {/* Background elements to ensure smooth blending if needed */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(circle at 12% 8%, rgba(200, 30, 35, 0.16), transparent 38%),
            radial-gradient(circle at 88% 55%, rgba(200, 30, 35, 0.12), transparent 42%),
            #060607
          `
        }}
      />

      {/* The intelligent multi-layer canvas manager */}
      <CanvasSequenceManager
        introLayers={introLayers}
        scrollLayers={scrollLayers}
        onIntroComplete={() => setIntroFinished(true)}
      />

      {/* Scroll Down Indicator */}
      {introFinished && (
        <motion.div
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center justify-center text-white/50"
          style={{ opacity: opacityScrollText }}
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-sm tracking-widest uppercase mb-2">Scroll Down</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </motion.div>
      )}

      {/* Go to Login Button Section */}
      {showLoginUI && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Subtle backdrop overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" />
          
          <div className="relative z-10 pointer-events-auto flex flex-col items-center gap-6 p-8 sm:p-10 rounded-[2rem] w-[90%] max-w-sm" style={{
            background: 'rgba(12, 12, 14, 0.7)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)'
          }}>
            {/* Subtle top highlight */}
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10 w-24 h-24 mb-1">
              <Image src="/logo.png" alt="Tell Me U Logo" fill className="object-contain drop-shadow-2xl" />
            </div>

            <div className="text-center space-y-2 relative z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">Selamat Datang</h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-[260px] mx-auto font-medium">Mulai eksplorasi dan bangun relasi bersama mahasiswa Telkom University Jakarta.</p>
            </div>
            
            <Link 
              href="/login" 
              className="group relative mt-4 w-full flex items-center justify-center overflow-hidden rounded-xl bg-[#c81e2c] px-8 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.03] hover:bg-[#e62837] shadow-[0_8px_20px_rgba(200,30,44,0.4)]"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s] ease-in-out" />
              <span className="relative z-10 flex items-center gap-2 tracking-wide text-[15px]">
                Lanjutkan ke Login
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </Link>
          </div>
        </motion.div>
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
