"use client";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/* ── Scroll-triggered section wrapper ────────────────────────── */
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Feature Bento Card ──────────────────────────────────────── */
function BentoCard({ emoji, title, desc, gradient, span = false }: { emoji: string; title: string; desc: string; gradient: string; span?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`group relative rounded-3xl border border-white/[0.06] overflow-hidden cursor-default ${span ? "md:col-span-2" : ""}`}
      style={{ background: "linear-gradient(135deg, rgba(28,28,30,0.9), rgba(10,10,11,0.95))" }}
    >
      {/* Gradient blob */}
      <div className={`absolute -top-12 -right-12 w-32 md:w-40 h-32 md:h-40 rounded-full blur-[50px] opacity-0 group-hover:opacity-40 transition-opacity duration-700 ${gradient}`} />
      
      <div className="relative z-10 p-5 md:p-7 h-full flex flex-col">
        <div className="text-3xl md:text-4xl mb-4 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
          {emoji}
        </div>
        <h3 className="text-base md:text-lg font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-[var(--color-brand-red)] transition-all duration-500">{title}</h3>
        <p className="text-xs md:text-sm text-[#8e8e93] leading-relaxed flex-1">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ── Hall of Fame Card ───────────────────────────────────────── */
function HoFCard({ name, prodi, ig, href, image, delay }: { name: string; prodi: string; ig: string; href: string; image: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <Link href={href} target="_blank" className="block">
        <motion.div
          whileHover={{ y: -2 }}
          className="group relative bg-gradient-to-br from-white/[0.06] to-transparent rounded-2xl p-[1px] overflow-hidden"
        >
          <div className="relative bg-[#111114] rounded-2xl p-4 md:p-5 flex items-center gap-3 md:gap-4 overflow-hidden">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 overflow-hidden">
              <img src={image} alt={name} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-xs md:text-sm truncate">{name}</p>
              <p className="text-[10px] md:text-[11px] text-[#6c6c72] mt-0.5 truncate">{prodi}</p>
              <span className="text-[10px] md:text-[11px] text-[var(--color-brand-red)] mt-1 inline-block truncate">
                {ig}
              </span>
            </div>
          </div>
        </motion.div>
      </Link>
    </Reveal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ABOUT PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg)] font-sans">
      <Sidebar />
      <Header />

      {/* Global animations for effects */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-slow { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-20px) scale(1.02)} }
        @keyframes float-medium { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-15px) scale(0.98)} }
        @keyframes pulse-glow { 0%,100%{opacity:0.15;transform:scale(1)} 50%{opacity:0.25;transform:scale(1.1)} }
      ` }} />

      <main className="flex-1 w-full pb-28 md:pb-12 text-white overflow-x-hidden md:pl-[260px]">
          
          {/* ──────────────────────────────────────────────────────
              1 · HERO
          ────────────────────────────────────────────────────── */}
          <section className="relative px-4 sm:px-6 md:px-8 pt-6 sm:pt-10 md:pt-16 pb-12 sm:pb-16 md:pb-24 overflow-hidden flex flex-col items-center justify-center min-h-[70vh]">
            {/* Ambient orbs - Scaled for mobile */}
            <div className="absolute top-[-10%] left-[-20%] w-[150vw] sm:w-[500px] h-[150vw] sm:h-[500px] rounded-full bg-[var(--color-brand-red)] opacity-[0.06] blur-[80px] sm:blur-[120px]" style={{ animation: "pulse-glow 8s ease-in-out infinite" }} />
            <div className="absolute bottom-[-10%] right-[-20%] w-[120vw] sm:w-[400px] h-[120vw] sm:h-[400px] rounded-full bg-blue-500 opacity-[0.04] blur-[80px] sm:blur-[100px]" style={{ animation: "pulse-glow 10s ease-in-out infinite 2s" }} />

            <div className="relative z-10 w-full max-w-3xl mx-auto text-center mt-4 md:mt-0">
              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-[2.2rem] sm:text-[2.5rem] md:text-[3.5rem] font-extrabold leading-[1.15] md:leading-[1.1] tracking-tight mb-4 md:mb-6 px-2"
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-[#5a5a5f]">
                  Rumah Digital Mahasiswa
                </span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-brand-red)] via-[#ff6b3a] to-[var(--color-brand-red)] whitespace-nowrap">
                  Tel-U Jkt.
                </span>
              </motion.h1>

              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-[#8e8e93] text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto space-y-3 md:space-y-4 px-2"
              >
                <p>
                  Halo, TelUtizen! Sebagai sesama maba, aku paham banget gimana seru dan deg-degannya masa transisi ke dunia kampus. Dari repotnya nyari teman kelompok Ospek, mutualan, sampai bingung pamerin karya.
                </p>
                <p>
                  <strong className="text-white/80">Tell Me U Jkt</strong> lahir dari keresahan itu — satu rumah digital di mana kita bisa terhubung, berkolaborasi, dan saling support produktivitas.
                </p>
              </motion.div>

              {/* Scroll cue */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-8 md:mt-12 flex flex-col items-center gap-2"
              >
                <span className="text-[9px] md:text-[10px] uppercase tracking-[2px] md:tracking-[3px] text-[#5a5a5f]">Scroll</span>
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="w-[1px] h-6 md:h-8 bg-gradient-to-b from-[var(--color-brand-red)]/60 to-transparent"
                />
              </motion.div>
            </div>
          </section>

          {/* ──────────────────────────────────────────────────────
              2 · FEATURES
          ────────────────────────────────────────────────────── */}
          <section className="px-4 sm:px-6 md:px-8 py-10 md:py-16 max-w-4xl mx-auto w-full">
            <Reveal>
              <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-10 px-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <h2 className="text-[10px] md:text-xs font-bold tracking-[2px] md:tracking-[4px] uppercase text-[#5a5a5f] shrink-0 text-center">Kenapa Tell Me U?</h2>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
              </div>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 px-2 sm:px-0">
              <Reveal delay={0.1}>
                <BentoCard emoji="🤝" title="Koneksi Tanpa Batas" desc="Cari partner nugas atau teman nongkrong yang sefrekuensi? Tinggal swipe di fitur Mutualan!" gradient="bg-blue-500" />
              </Reveal>
              <Reveal delay={0.2}>
                <BentoCard emoji="🚀" title="Produktivitas Terpusat" desc="Pantau to-do list Ospek, kalender akademik, sampai jalan pintas (SSO) ke portal kampus dalam satu dashboard." gradient="bg-purple-500" />
              </Reveal>
              <Reveal delay={0.3}>
                <BentoCard emoji="🎨" title="Ruang Berkarya" desc="Buat galeri personalmu. Upload hasil desain, tugas kuliah, atau project isengmu di Feed Karya. Bebas!" gradient="bg-pink-500" />
              </Reveal>
              <Reveal delay={0.4}>
                <BentoCard emoji="📸" title="Album Kolaboratif" desc="Nggak ada lagi drama foto kepanitiaan atau acara makrab yang tercecer. Kumpulkan dokumentasinya di satu tempat." gradient="bg-orange-500" />
              </Reveal>
            </div>
          </section>

          {/* ──────────────────────────────────────────────────────
              3 · DEVELOPER
          ────────────────────────────────────────────────────── */}
          <section className="px-4 sm:px-6 md:px-8 py-10 md:py-16 w-full">
            <div className="max-w-4xl mx-auto w-full">
              <Reveal>
                <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-10 px-2">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                  <h2 className="text-[10px] md:text-xs font-bold tracking-[2px] md:tracking-[4px] uppercase text-[#5a5a5f] shrink-0 text-center">Who's Behind This?</h2>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="relative rounded-[24px] md:rounded-[28px] overflow-hidden mx-2 sm:mx-0">
                  <div className="absolute inset-0 rounded-[24px] md:rounded-[28px] bg-gradient-to-br from-[var(--color-brand-red)]/30 via-transparent to-white/[0.06] p-[1px]" />

                  <div className="relative bg-gradient-to-br from-[#141417] via-[#111114] to-[#0d0d0f] rounded-[24px] md:rounded-[28px] p-5 sm:p-8 md:p-10 overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start">
                      
                      {/* Avatar */}
                      <motion.div whileHover={{ scale: 1.05 }} className="relative shrink-0">
                        <div className="absolute -inset-[2px] md:-inset-[3px] rounded-3xl md:rounded-[28px] bg-gradient-to-br from-[var(--color-brand-red)] via-[#ff6b3a] to-[var(--color-brand-red)] opacity-60 blur-sm" />
                        {/* Smaller on mobile (w-28 h-28), larger on desktop */}
                        <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl md:rounded-[24px] overflow-hidden border-2 border-[#2a2a30] bg-[#1c1c1e]">
                          <img
                            src="/adrian.jpg"
                            alt="Adrian Adiputra"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                            }}
                          />
                          <div className="hidden w-full h-full bg-gradient-to-br from-[var(--color-brand-red)]/20 to-[#1c1c1e] flex items-center justify-center">
                            <span className="text-3xl md:text-5xl font-bold text-white/30">A</span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Info */}
                      <div className="flex-1 text-center md:text-left min-w-0">
                        <div className="inline-flex items-center gap-1.5 md:gap-2 px-2.5 py-1 md:px-3 rounded-full bg-[var(--color-brand-red)]/10 border border-[var(--color-brand-red)]/20 mb-2 md:mb-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-red)]" />
                          <span className="text-[9px] md:text-[10px] font-semibold text-[var(--color-brand-red)] uppercase tracking-wider">Creator & Developer</span>
                        </div>
                        
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-1">Adrian Adiputra</h3>
                        <p className="text-xs sm:text-sm text-[#6c6c72] mb-4 md:mb-5">DKV · Telkom University Jakarta</p>

                        <div className="text-[#9c9ca3] text-xs sm:text-sm leading-relaxed space-y-2 md:space-y-3 mb-5 md:mb-7">
                          <p>
                            Saat ini aku adalah mahasiswa baru <strong className="text-white/80">Desain Komunikasi Visual (DKV)</strong> di Telkom University Jakarta. Sebelumnya punya latar belakang <strong className="text-white/80">RPL/PPLG</strong> saat SMK.
                          </p>
                          <p>
                            Aplikasi ini adalah bentuk eksplorasiku yang menggabungkan programming, dan desain grafis. <strong className="text-white/80">Mari berteman!</strong>
                          </p>
                        </div>

                        {/* Social */}
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                          {[
                            { href: "https://www.instagram.com/adriannn.psd/", color: "hover:bg-gradient-to-br hover:from-[#f09433] hover:via-[#e6683c] hover:to-[#bc1888]", icon: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></> },
                            { href: "https://www.linkedin.com/in/adrian-adiputra/", color: "hover:bg-[#0077b5]", icon: <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></> },
                            { href: "https://github.com/Dryn2007/", color: "hover:bg-white hover:text-black", icon: <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/> },
                            { href: "https://discord.com/users/byte_maverick", color: "hover:bg-[#5865F2]", icon: <path d="M20.32 4.37A19.8 19.8 0 0 0 15.39 3c-.21.38-.46.88-.63 1.28a18.4 18.4 0 0 0-5.52 0C9.07 3.88 8.82 3.38 8.61 3A19.74 19.74 0 0 0 3.68 4.37 20.3 20.3 0 0 0 .12 17.76a19.9 19.9 0 0 0 6.07 3.08 14.6 14.6 0 0 0 1.31-2.14 12.9 12.9 0 0 1-2.07-.99l.5-.39a14.18 14.18 0 0 0 12.14 0l.5.39c-.66.39-1.35.72-2.07.99a14.6 14.6 0 0 0 1.31 2.14 19.87 19.87 0 0 0 6.07-3.08A20.27 20.27 0 0 0 20.32 4.37zM8.02 15.09c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42 2.17 1.09 2.15 2.42c0 1.34-.95 2.42-2.15 2.42zm7.96 0c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42 2.17 1.09 2.15 2.42c0 1.34-.95 2.42-2.15 2.42z"/> },
                          ].map((s, i) => (
                            <Link key={i} href={s.href} target="_blank"
                              className={`w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#6c6c72] hover:text-white hover:border-transparent transition-all duration-300 ${s.color}`}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]">
                                {s.icon}
                              </svg>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* ──────────────────────────────────────────────────────
              4 · HALL OF FAME
          ────────────────────────────────────────────────────── */}
          <section className="px-4 sm:px-6 md:px-8 py-10 md:py-16 w-full">
            <div className="max-w-4xl mx-auto w-full">
              <Reveal>
                <div className="flex items-center gap-2 md:gap-3 mb-4 px-2">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                  <h2 className="text-[10px] md:text-xs font-bold tracking-[2px] md:tracking-[4px] uppercase text-[#5a5a5f] shrink-0 text-center">Hall of Fame</h2>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="text-center text-[#6c6c72] text-xs md:text-sm max-w-lg mx-auto mb-6 md:mb-8 px-4">
                  Aplikasi ini nggak akan bisa rilis tanpa bantuan dan dukungan luar biasa dari teman-teman di balik layar.
                </p>
              </Reveal>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 px-2 sm:px-0 max-w-2xl mx-auto">
                <HoFCard name="Gwen" prodi="Prodi: Sisfor" ig="@21www_n" href="https://www.instagram.com/21www_n/" image="/gwen.jpg" delay={0.2} />
                <HoFCard name="Aidan" prodi="Prodi: DKV" ig="@idanzthemeneng" href="https://www.instagram.com/idanzthemeneng/" image="/aidan.jpg" delay={0.3} />
              </div>
            </div>
          </section>

          {/* ──────────────────────────────────────────────────────
              5 · QRIS
          ────────────────────────────────────────────────────── */}
          <section className="px-4 sm:px-6 md:px-8 py-10 md:py-16 w-full">
            <div className="max-w-4xl mx-auto w-full">
              <Reveal>
                <div className="relative rounded-[24px] md:rounded-[32px] overflow-hidden mx-2 sm:mx-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-brand-red)]/40 via-orange-500/30 to-[var(--color-brand-red)]/40 rounded-[24px] md:rounded-[32px] p-[1px]" />

                  <div className="relative bg-[#0e0e10] rounded-[24px] md:rounded-[32px] p-6 sm:p-8 md:p-12 text-center overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] sm:w-[500px] h-[150vw] sm:h-[500px] rounded-full bg-[var(--color-brand-red)] opacity-[0.05] blur-[100px]" />
                    
                    <div className="relative z-10 max-w-md mx-auto">
                      <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} className="text-4xl md:text-5xl mb-4 md:mb-6 inline-block">
                        ☕
                      </motion.div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-1 md:mb-2 tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#8e8e93]">Traktir Admin Kopi</span>
                      </h2>
                      <p className="text-xs md:text-sm text-[#5a5a5f] font-medium mb-4 md:mb-6">& Dukung Server</p>

                      <p className="text-[#8e8e93] text-xs md:text-sm leading-relaxed mb-6 md:mb-8 px-2">
                        Biar web ini tetap bebas iklan dan servernya selalu online, dukungan sekecil apa pun bakal sangat berarti!
                      </p>

                      <motion.div whileHover={{ scale: 1.02 }} className="inline-block">
                        <div className="bg-white p-3 md:p-4 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                          <div className="w-40 h-40 md:w-52 md:h-52 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
                            <img src="/qris.png" alt="QRIS" className="w-full h-full object-contain" onError={(e) => {
                                e.currentTarget.style.display = "none";
                                (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                              }}
                            />
                            <div className="hidden flex-col items-center justify-center gap-1 text-gray-300 p-2 text-center">
                              <span className="text-[10px]">QRIS Belum Ada</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                      <p className="mt-5 text-[10px] md:text-[11px] text-[#3a3a3d] italic">Terima kasih atas dukunganmu, TelUtizen!</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          <div className="max-w-xs mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
      </main>
      <BottomNav />
    </div>
  );
}

