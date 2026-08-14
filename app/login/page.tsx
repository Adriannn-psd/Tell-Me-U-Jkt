"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import "./login.css";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent, useTransform } from "framer-motion";
import CanvasSequenceManager, { AnimationLayer } from "@/components/CanvasSequenceManager";
import LoginPanel from "@/components/LoginPanel";
import "./login.css";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
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
      // Use setTimeout to ensure it overrides any browser or Next.js auto-scrolling
      const timeoutId = setTimeout(() => {
        window.scrollTo(0, 0);
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  const getErrorMessage = () => {
    if (error === "NotInServer") {
      return "Kamu harus join server Discord Tel-U JKT terlebih dahulu sebelum bisa login.";
    }
    if (error === "ServerError") {
      return "Terjadi kesalahan saat login. Silakan coba lagi.";
    }
    if (error) {
      return "Login gagal. Silakan coba lagi.";
    }
    return null;
  };

  const errorMessage = getErrorMessage();

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
    <main className="page" style={{ height: "400vh", position: "relative" }}>
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

      {/* Floating Login UI Overlay */}
      <div
        className={`fixed inset-0 z-50 pointer-events-none transition-opacity duration-700 ease-in-out ${showLoginUI ? "opacity-100" : "opacity-0"}`}
      >
        <div className={`login-container pointer-events-auto transform transition-transform duration-700 ease-out ${showLoginUI ? "translate-y-0 scale-100" : "translate-y-10 scale-95"}`}>
          <section className="brand-panel">
            <div className="decor decor-ring" aria-hidden="true"></div>
            <div className="decor decor-sphere decor-sphere-1" aria-hidden="true"></div>
            <div className="decor decor-sphere decor-sphere-2" aria-hidden="true"></div>
            <svg className="decor decor-swoosh" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 150 Q150 20 400 90" fill="none" stroke="#c81e2c" strokeWidth="1.5" />
            </svg>
            <div className="decor decor-u" aria-hidden="true">
              <svg viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="uGrad" x1="10%" y1="0%" x2="90%" y2="100%">
                    <stop offset="0%" stopColor="#4a4a4d" />
                    <stop offset="30%" stopColor="#9c161b" />
                    <stop offset="65%" stopColor="#d42128" />
                    <stop offset="100%" stopColor="#1c0405" />
                  </linearGradient>
                </defs>
                <path d="M35 20 L35 170 Q35 265 120 265 Q205 265 205 170 L205 20"
                  fill="none" stroke="url(#uGrad)" strokeWidth="55" strokeLinecap="round" />
              </svg>
            </div>

            {/* Social & Community Icons */}
            {/* 1. Heart (Mutualan) */}
            <div className="decor decor-icon decor-icon-1" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="url(#uGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>

            {/* 2. Camera (Galeri/Momen) */}
            <div className="decor decor-icon decor-icon-2" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="url(#uGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>

            {/* 3. Notepad (Akademik/Catatan) */}
            <div className="decor decor-icon decor-icon-3" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="url(#uGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
            </div>

            <div className="brand-logo">
              <Image src="/logo.png" alt="Tell Me U Logo" width={192} height={210} className="shield-logo object-contain drop-shadow-2xl" />
              <div className="brand-text">
                <span className="line1">Tell Me U</span>
                <span className="line2">Jkt</span>
              </div>
            </div>
          </section>

          <LoginPanel errorMessage={errorMessage} showGuestOption={true} />
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
