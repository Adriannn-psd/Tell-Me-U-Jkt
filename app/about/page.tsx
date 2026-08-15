"use client";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col md:flex-row font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col relative w-full md:w-[calc(100%-260px)] md:ml-[260px] min-h-screen">
        <Header />
        
        <main className="flex-1 p-5 md:p-8 md:pt-10 max-w-4xl mx-auto w-full pb-24 md:pb-12 text-white">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-12"
          >
            {/* 1. Hero Section */}
            <section className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#8e8e93] mb-6 tracking-tight">
                Tell Me U Jkt: Lebih Dari Sekadar Web Kampus.
              </h1>
              <div className="text-[var(--color-text-2)] text-base leading-relaxed space-y-4 max-w-3xl">
                <p>
                  Halo, TelUtizen! Selamat datang di Tell Me U Jkt. Sebagai sesama mahasiswa baru (Maba), aku paham banget gimana seru dan deg-degannya masa transisi ke dunia kampus. Dari repotnya nyari teman kelompok Ospek, <i>mutualan</i> biar nambah relasi, nyari info jadwal, sampai bingung di mana mau pamerin karya-karya kita.
                </p>
                <p>
                  Tell Me U Jkt lahir dari keresahan itu. Aku ingin membangun satu "rumah digital" di mana kita bisa terhubung, berkolaborasi, dan saling <i>support</i> produktivitas dengan aman dan praktis.
                </p>
              </div>
            </section>

            {/* 2. Nilai Tambah & Manfaat */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[var(--color-brand-red)]/20 text-[var(--color-brand-red)] flex items-center justify-center text-sm shrink-0">?</span>
                Kenapa Harus Pakai Tell Me U Jkt?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1c1c1e] border border-[#2a2a30] p-5 rounded-2xl">
                  <div className="text-2xl mb-3">🤝</div>
                  <h3 className="font-bold mb-2">Koneksi Tanpa Batas</h3>
                  <p className="text-sm text-[var(--color-text-3)] leading-relaxed">Cari partner nugas atau teman nongkrong yang sefrekuensi? Tinggal <i>swipe</i> di fitur Mutualan!</p>
                </div>
                <div className="bg-[#1c1c1e] border border-[#2a2a30] p-5 rounded-2xl">
                  <div className="text-2xl mb-3">🚀</div>
                  <h3 className="font-bold mb-2">Produktivitas Terpusat</h3>
                  <p className="text-sm text-[var(--color-text-3)] leading-relaxed">Pantau <i>to-do list</i> Ospek, kalender akademik, sampai jalan pintas (SSO) ke portal kampus dalam satu <i>dashboard</i>.</p>
                </div>
                <div className="bg-[#1c1c1e] border border-[#2a2a30] p-5 rounded-2xl">
                  <div className="text-2xl mb-3">🎨</div>
                  <h3 className="font-bold mb-2">Ruang Berkarya</h3>
                  <p className="text-sm text-[var(--color-text-3)] leading-relaxed">Buat galeri personalmu. Upload hasil desain, tugas kuliah, atau <i>project</i> isengmu di Feed Karya. Mau <i>setting</i> publik atau privat? Bebas!</p>
                </div>
                <div className="bg-[#1c1c1e] border border-[#2a2a30] p-5 rounded-2xl">
                  <div className="text-2xl mb-3">📸</div>
                  <h3 className="font-bold mb-2">Album Kolaboratif</h3>
                  <p className="text-sm text-[var(--color-text-3)] leading-relaxed">Nggak ada lagi drama foto kepanitiaan atau acara makrab yang tercecer. Kumpulkan dokumentasinya di satu tempat yang rapi dan aman.</p>
                </div>
              </div>
            </section>

            {/* 3. Perkenalan Diri */}
            <section className="bg-gradient-to-br from-[#1c1c1e] to-[#0a0a0b] border border-[#2a2a30] rounded-3xl p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-brand-red)]/10 rounded-full blur-[80px]"></div>
              
              <h2 className="text-2xl font-bold mb-8 relative z-10">Who&apos;s Behind This?</h2>
              
              <div className="flex flex-col md:flex-row gap-8 relative z-10">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl overflow-hidden shrink-0 border-2 border-[var(--color-brand-red)]/30 shadow-2xl mx-auto md:mx-0 bg-[#2a2a30] flex items-center justify-center">
                  {/* Avatar/Foto Placeholder - ganti src dengan foto asli */}
                  <img src="/adrian.jpg" alt="Adrian Adiputra" className="w-full h-full object-cover" onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }} />
                  <span className="hidden text-4xl font-bold text-[#8e8e93]">A</span>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold text-white mb-1">Adrian Adiputra</h3>
                  <p className="text-[var(--color-brand-red)] text-sm font-semibold mb-4">Creator & Developer Tell Me U Jkt</p>
                  
                  <div className="text-[var(--color-text-2)] text-sm leading-relaxed space-y-3 mb-6">
                    <p>
                      Kenalin, aku Adrian! Saat ini aku adalah mahasiswa baru program studi Desain Komunikasi Visual (DKV) di Telkom University Jakarta. Sebelum mendalami desain di bangku kuliah, aku punya latar belakang jurusan Pengembangan Perangkat Lunak dan Gim (PPLG) saat SMK.
                    </p>
                    <p>
                      Aplikasi ini adalah bentuk eksplorasiku yang menggabungkan kecintaan pada dunia <i>programming</i>, desain grafis, dan videografi. Harapanku, Tell Me U Jkt nggak cuma jadi alat bantu tugas, tapi bener-bener jadi wadah berekspresi yang seru buat kita semua. Mari berteman!
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <Link href="https://instagram.com/adrian.adiputra" target="_blank" className="w-10 h-10 rounded-full bg-[#2a2a30] flex items-center justify-center hover:bg-[var(--color-brand-red)] hover:text-white transition-colors text-[var(--color-text-2)]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                    </Link>
                    <Link href="https://linkedin.com/in/adrianadiputra" target="_blank" className="w-10 h-10 rounded-full bg-[#2a2a30] flex items-center justify-center hover:bg-[#0077b5] hover:text-white transition-colors text-[var(--color-text-2)]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                    </Link>
                    <Link href="https://github.com/adrianadiputra" target="_blank" className="w-10 h-10 rounded-full bg-[#2a2a30] flex items-center justify-center hover:bg-white hover:text-black transition-colors text-[var(--color-text-2)]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                    </Link>
                    <Link href="#" className="w-10 h-10 rounded-full bg-[#2a2a30] flex items-center justify-center hover:bg-[#5865F2] hover:text-white transition-colors text-[var(--color-text-2)]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M2 12h20M12 2v20M8 8l8 8M16 8l-8 8"/></svg>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Apresiasi (Hall of Fame) */}
            <section className="bg-[#1c1c1e] border border-[#2a2a30] rounded-3xl p-6 md:p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 text-yellow-500 mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <h2 className="text-2xl font-bold mb-3">Special Thanks & Hall of Fame</h2>
                <p className="text-[var(--color-text-3)] text-sm max-w-xl mx-auto">
                  Aplikasi ini nggak akan bisa rilis tanpa bantuan dan dukungan luar biasa dari teman-teman di balik layar. Terima kasih yang sebesar-besarnya untuk:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="bg-[#2a2a30] rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#3a3a3d] flex items-center justify-center text-xl shrink-0">✨</div>
                  <div>
                    <p className="font-bold text-white text-sm">[Isi Nama Orang Pertama]</p>
                    <p className="text-[11px] text-[var(--color-text-3)] mt-0.5">Prodi: [Isi Program Studi]</p>
                    <Link href="#" className="text-[11px] text-[var(--color-brand-red)] hover:underline mt-1 block">
                      Instagram: [@username_ig_1]
                    </Link>
                  </div>
                </div>
                
                <div className="bg-[#2a2a30] rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#3a3a3d] flex items-center justify-center text-xl shrink-0">✨</div>
                  <div>
                    <p className="font-bold text-white text-sm">[Isi Nama Orang Kedua]</p>
                    <p className="text-[11px] text-[var(--color-text-3)] mt-0.5">Prodi: [Isi Program Studi]</p>
                    <Link href="#" className="text-[11px] text-[var(--color-brand-red)] hover:underline mt-1 block">
                      Instagram: [@username_ig_2]
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. Dukungan (Support the Admin) */}
            <section className="bg-[#1c1c1e] border border-[var(--color-brand-red)]/30 rounded-3xl p-6 md:p-8 text-center relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--color-brand-red)]/10 rounded-full blur-[100px] z-0"></div>
              
              <div className="relative z-10 max-w-lg mx-auto">
                <h2 className="text-2xl font-bold mb-4 flex justify-center items-center gap-2">
                  Traktir Admin Kopi & Dukung Server ☕
                </h2>
                <p className="text-[var(--color-text-2)] text-sm leading-relaxed mb-6">
                  Suka dengan Tell Me U Jkt dan merasa terbantu? Biar <i>web</i> ini tetap berjalan lancar, bebas iklan, dan servernya selalu <i>online</i>, dukungan sekecil apa pun dari kamu bakal sangat berarti!
                  <br/><br/>
                  Kamu bisa bantu berdonasi lewat <i>scan</i> QRIS di bawah ini untuk bantu biaya pemeliharaan <i>server</i> dan traktir aku kopi buat nemenin ngoding <i>update</i> fitur selanjutnya.
                </p>
                
                <div className="bg-white p-4 rounded-2xl inline-block mb-3 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  {/* QRIS Placeholder */}
                  <div className="w-48 h-48 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 overflow-hidden relative">
                    <img src="/qris.png" alt="QRIS" className="w-full h-full object-contain" onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }} />
                    <span className="hidden text-xs text-center p-4">Tempatkan Gambar Barcode QRIS di sini (/qris.png)</span>
                  </div>
                </div>
                
                <p className="text-[11px] text-[var(--color-text-3)] italic">
                  *Terima kasih atas dukunganmu, TelUtizen!*
                </p>
              </div>
            </section>

          </motion.div>
        </main>
        
        <BottomNav />
      </div>
    </div>
  );
}
