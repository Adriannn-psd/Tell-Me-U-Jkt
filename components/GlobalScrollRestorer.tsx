"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function GlobalScrollRestorer() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;

    // Jangan terapkan di halaman profile, dan jangan di landing page: animasi
    // openingnya dipetakan ke posisi scroll, jadi memulihkan posisi lama sama
    // dengan mendarat di tengah-tengah animasi.
    if (pathname.startsWith('/profile') || pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    const savedPos = sessionStorage.getItem(`scrollPos-${pathname}`);
    const targetScroll = savedPos ? parseInt(savedPos, 10) : 0;
    
    let attempts = 0;
    
    const tryScroll = () => {
      if (attempts > 10) return; // Maksimal 1 detik
      attempts++;
      
      window.scrollTo({ top: targetScroll, behavior: 'instant' });
      
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (Math.abs(window.scrollY - targetScroll) <= 5 || window.scrollY >= maxScroll - 5) {
        return;
      }
      
      setTimeout(tryScroll, 100);
    };
    
    // Berikan jeda kecil sebelum percobaan pertama agar DOM sempat update
    setTimeout(tryScroll, 50);

    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        sessionStorage.setItem(`scrollPos-${pathname}`, window.scrollY.toString());
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}
