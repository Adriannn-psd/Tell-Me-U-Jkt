"use client";

import { Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import LoginPanel from "@/components/LoginPanel";
import "@/app/login.css";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

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

  return (
    <main className="page" style={{ height: "100vh", position: "relative" }} suppressHydrationWarning>
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
      
      <div className="flex w-full h-full items-center justify-center">
        <div className="login-container pointer-events-auto">
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
            <div className="decor decor-icon decor-icon-1" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="url(#uGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div className="decor decor-icon decor-icon-2" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="url(#uGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <div className="decor decor-icon decor-icon-3" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="url(#uGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
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
    <Suspense fallback={<div className="min-h-screen bg-[#060607]" />}>
      <LoginContent />
    </Suspense>
  );
}
