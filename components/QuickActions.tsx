"use client";

import { useState } from "react";
import UploadMediaModal from "@/components/fase3/UploadMediaModal";
import PortalKampusModal from "@/components/fase3/PortalKampusModal";
import KalenderTerdekat from "@/components/fase3/KalenderTerdekat";
import Link from "next/link";
import { useScrollState } from "./ScrollContext";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/components/GuestProvider";

export default function QuickActions() {
  const [isUploading, setIsUploading] = useState(false);
  const [showPortal, setShowPortal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [showKalenderModal, setShowKalenderModal] = useState(false);
  const { isScrolledPastHero } = useScrollState();
  const { isGuest, showLoginPopup } = useGuest();

  return (
    <div className="px-5 md:px-7 md:py-7 md:bg-[#1c1c1e] md:border md:border-[#2a2a30] md:rounded-[28px] md:shadow-xl pt-[22px] pb-0">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden md:block w-5 h-5 text-[var(--color-brand-red)]">
            <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <h2 className="text-white text-[16.5px] md:text-[17px] font-bold">Aksi Cepat</h2>
        </div>
        <button onClick={() => setShowAllModal(true)} className="text-[var(--color-brand-red)] text-[12.5px] md:text-[13px] font-bold cursor-pointer hover:underline">Lihat Semua</button>
      </div>
      
      {/*
        Dulu <motion.div layout>. Layout animation memaksa framer mengukur ulang
        posisi tiap anak pada setiap render lalu menganimasikannya — padahal grid
        ini isinya tetap dan tidak pernah berpindah. Biaya ukur-ulangnya nyata di
        CPU lemah, manfaatnya nol.
      */}
      <div className="grid grid-cols-4 md:grid-cols-2 gap-2 md:gap-3 text-center">
        {/* Portal Kampus (Always shown) */}
        <div id="portal-btn" onClick={() => setShowPortal(true)} className="flex flex-col items-center gap-1.5 cursor-pointer group">
          <div className="w-[50px] h-[50px] md:w-full md:h-[130px] rounded-[14px] md:rounded-[20px] bg-[var(--color-surface)] border border-[var(--color-border-color)] flex md:flex-col items-center justify-center gap-2 md:gap-3 group-hover:bg-[#2a2a30] transition shadow-sm hover:shadow-md">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] md:w-8 md:h-8 text-white">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span className="hidden md:block text-[11px] md:text-[13px] text-[var(--color-text-2)] font-medium group-hover:text-white transition">Portal Kampus</span>
          </div>
          <span className="md:hidden text-[9px] text-[var(--color-text-2)] font-medium leading-[1.1] group-hover:text-white transition">Portal Kampus</span>
        </div>

        {/* Drop Memory (Always shown) */}
        <Link href={isGuest ? "#" : "/drop-memory"} onClick={(e) => { if (isGuest) { e.preventDefault(); showLoginPopup(); } }} className="flex flex-col items-center gap-1.5 cursor-pointer group">
          <div className="w-[50px] h-[50px] md:w-full md:h-[130px] rounded-[14px] md:rounded-[20px] bg-[var(--color-surface)] border border-[var(--color-border-color)] flex md:flex-col items-center justify-center gap-2 md:gap-3 group-hover:bg-[#2a2a30] transition shadow-sm hover:shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-6 h-6 bg-gradient-to-bl from-[var(--color-brand-red)] to-transparent opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] md:w-8 md:h-8 text-[var(--color-brand-red)]">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="hidden md:block text-[11px] md:text-[13px] text-[var(--color-text-2)] font-medium group-hover:text-white transition">Drop Memory</span>
          </div>
          <span className="md:hidden text-[9px] text-[var(--color-text-2)] font-medium leading-[1.1] group-hover:text-white transition">Drop<br/>Memory</span>
        </Link>

        {/* Cari Partner (Always shown) */}
        <Link href={isGuest ? "#" : "/partner"} onClick={(e) => { if (isGuest) { e.preventDefault(); showLoginPopup(); } }} className="flex flex-col items-center gap-1.5 cursor-pointer group">
          <div className="w-[50px] h-[50px] md:w-full md:h-[130px] rounded-[14px] md:rounded-[20px] bg-[var(--color-surface)] border border-[var(--color-border-color)] flex md:flex-col items-center justify-center gap-2 md:gap-3 group-hover:bg-[#2a2a30] transition shadow-sm hover:shadow-md">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] md:w-8 md:h-8 text-[var(--color-brand-red)]">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="hidden md:block text-[11px] md:text-[13px] text-[var(--color-text-2)] font-medium group-hover:text-white transition">Cari Partner</span>
          </div>
          <span className="md:hidden text-[9px] text-[var(--color-text-2)] font-medium leading-[1.1] group-hover:text-white transition">Cari Partner</span>
        </Link>

        {/* Kalender (Shown on Mobile Only) */}
        <div onClick={() => setShowKalenderModal(true)} className="md:hidden flex flex-col items-center gap-1.5 cursor-pointer group">
          <div className="w-[50px] h-[50px] rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border-color)] flex items-center justify-center gap-2 group-hover:bg-[#2a2a30] transition shadow-sm hover:shadow-md">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-[var(--color-brand-red)]">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <span className="text-[9px] text-[var(--color-text-2)] font-medium leading-[1.1] group-hover:text-white transition">Kalender</span>
        </div>

        {/* Upload Karya (Shown on Desktop Only to complete the 2x2 grid) */}
        <div onClick={() => isGuest ? showLoginPopup() : setIsUploading(true)} className="hidden md:flex flex-col items-center gap-2 cursor-pointer group">
          <div className="w-full h-[130px] rounded-[20px] bg-[var(--color-surface)] border border-[var(--color-border-color)] flex flex-col items-center justify-center gap-3 group-hover:bg-[#2a2a30] transition shadow-sm hover:shadow-md">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-[var(--color-brand-red)]">
              <path d="M7 18a4 4 0 0 1-1-7.87A5.5 5.5 0 0 1 16.9 8H17a4 4 0 0 1 1 7.9" />
              <path d="M12 11.5v7M9 14.5l3-3 3 3" />
            </svg>
            <span className="text-[13px] text-[var(--color-text-2)] font-medium group-hover:text-white transition">Upload Karya</span>
          </div>
        </div>
      </div>

      {isUploading && <UploadMediaModal onClose={() => setIsUploading(false)} />}
      {showPortal && <PortalKampusModal onClose={() => setShowPortal(false)} />}
      
      {/* Lihat Semua Modal */}
      <AnimatePresence>
        {showAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 md:px-0">
            {/*
              Scrim ber-blur TIDAK dianimasikan opacity-nya. Menganimasikan
              opacity elemen ber-backdrop-filter memaksa browser mem-blur ulang
              seluruh halaman di belakangnya tiap frame fade — inilah yang
              membuat "buka fitur" tersendat di HP. Panelnya tetap beranimasi.
            */}
            <div
              onClick={() => setShowAllModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-[#1c1c1e] border border-[#2a2a30] rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white text-lg font-bold">Semua Aksi Cepat</h3>
                <button onClick={() => setShowAllModal(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              {/* Kotak ikonnya dibuat ikut lebar kolom (dulu paten 70px sementara
                  kolomnya cuma ~68px di HP 320px, jadi grid-nya kelebihan lebar). */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {/* Modal Items */}
                <div onClick={() => { setShowAllModal(false); setShowPortal(true); }} className="flex flex-col items-center gap-2 cursor-pointer group">
                  <div className="w-full max-w-[70px] aspect-square rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-color)] flex items-center justify-center group-hover:bg-[#2a2a30] transition">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-2)] font-medium text-center">Portal Kampus</span>
                </div>

                <Link href={isGuest ? "#" : "/partner"} onClick={(e) => { setShowAllModal(false); if (isGuest) { e.preventDefault(); showLoginPopup(); } }} className="flex flex-col items-center gap-2 cursor-pointer group">
                  <div className="w-full max-w-[70px] aspect-square rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-color)] flex items-center justify-center group-hover:bg-[#2a2a30] transition">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[var(--color-brand-red)]">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-2)] font-medium text-center">Cari Partner</span>
                </Link>

                <Link href={isGuest ? "#" : "/drop-memory"} onClick={(e) => { setShowAllModal(false); if (isGuest) { e.preventDefault(); showLoginPopup(); } }} className="flex flex-col items-center gap-2 cursor-pointer group">
                  <div className="w-full max-w-[70px] aspect-square rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-color)] flex items-center justify-center group-hover:bg-[#2a2a30] transition relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-6 h-6 bg-gradient-to-bl from-[var(--color-brand-red)] to-transparent opacity-20"></div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[var(--color-brand-red)]">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-2)] font-medium text-center">Drop Memory</span>
                </Link>

                <div onClick={() => { setShowAllModal(false); isGuest ? showLoginPopup() : setIsUploading(true); }} className="flex flex-col items-center gap-2 cursor-pointer group">
                  <div className="w-full max-w-[70px] aspect-square rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-color)] flex items-center justify-center group-hover:bg-[#2a2a30] transition">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[var(--color-brand-red)]">
                      <path d="M7 18a4 4 0 0 1-1-7.87A5.5 5.5 0 0 1 16.9 8H17a4 4 0 0 1 1 7.9" />
                      <path d="M12 11.5v7M9 14.5l3-3 3 3" />
                    </svg>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-2)] font-medium text-center">Upload Karya</span>
                </div>
                
                {/* Dynamic Widgets Links */}
                <Link href="/tracker" onClick={() => setShowAllModal(false)} className="flex flex-col items-center gap-2 cursor-pointer group">
                  <div className="w-full max-w-[70px] aspect-square rounded-2xl bg-gradient-to-br from-[#ff3b30]/10 to-transparent border border-white/5 flex items-center justify-center group-hover:bg-white/5 transition relative overflow-hidden">
                     <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff3b30] to-[#ff8c00] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                     </div>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-2)] font-medium text-center">To-Do</span>
                </Link>

                <Link href="/radar" onClick={() => setShowAllModal(false)} className="flex flex-col items-center gap-2 cursor-pointer group">
                  <div className="w-full max-w-[70px] aspect-square rounded-2xl bg-gradient-to-br from-[#30d158]/10 to-transparent border border-white/5 flex items-center justify-center group-hover:bg-white/5 transition relative overflow-hidden">
                     <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#30d158] to-[#28a745] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                     </div>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-2)] font-medium text-center">Radar Kampus</span>
                </Link>

                <div onClick={() => { setShowAllModal(false); setShowKalenderModal(true); }} className="flex flex-col items-center gap-2 cursor-pointer group">
                  <div className="w-full max-w-[70px] aspect-square rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-color)] flex items-center justify-center gap-2 group-hover:bg-[#2a2a30] transition">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[var(--color-brand-red)]">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-2)] font-medium text-center">Kalender</span>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kalender Modal (Mobile Only) */}
      <AnimatePresence>
        {showKalenderModal && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
            <div
              onClick={() => setShowKalenderModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full bg-[#1c1c1e] rounded-t-3xl pt-2 pb-32 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-[#3a3a3d] rounded-full mx-auto mb-4" />
              
              <div className="px-5">
                <KalenderTerdekat isModal={true} onClose={() => setShowKalenderModal(false)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
