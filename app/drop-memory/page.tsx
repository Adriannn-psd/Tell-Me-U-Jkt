"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { useGuest } from "@/components/GuestProvider";
import ProfileLockOverlay, { useProfileCheck } from "@/components/ProfileLockOverlay";

interface Memory {
  id: string;
  title: string;
  description: string;
  privacy: "Publik" | "Khusus Kelas Saya" | "Khusus Prodi Saya";
  target_group?: string; // class name or prodi name
  user_name: string;
  created_at: string;
  image_url?: string;
  likes: number;
}

function DropMemoryContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isGuest, showLoginPopup } = useGuest();
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    if (isGuest) {
      setMemories([
        {
          id: "1",
          title: "Hari Pertama Kuliah",
          description: "Kenalan sama temen-temen baru di kelas IF-46-01!",
          privacy: "Khusus Kelas Saya",
          target_group: "IF-46-01",
          user_name: "Budi Santoso",
          created_at: new Date().toISOString(),
          image_url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop",
          likes: 12
        },
        {
          id: "2",
          title: "Kunjungan Industri",
          description: "Seru banget bisa liat langsung proses kerja di Tech Company.",
          privacy: "Khusus Prodi Saya",
          target_group: "S1 Teknologi Informasi",
          user_name: "Anisa",
          created_at: new Date(Date.now() - 86400000).toISOString(),
          likes: 45
        }
      ]);
    } else if (session?.user) {
      setMemories([]);
    }
  }, [isGuest, session]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"Publik" | "Khusus Kelas Saya" | "Khusus Prodi Saya">("Khusus Kelas Saya");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isComplete, missingInfo } = useProfileCheck();
  const [showLock, setShowLock] = useState(false);

  // Filter state
  const [activeTab, setActiveTab] = useState<"Semua" | "Kelas Saya" | "Prodi Saya">("Semua");

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      router.replace(pathname);
      if (isGuest) {
        showLoginPopup();
      } else if (!isComplete) {
        setShowLock(true);
      } else {
        setShowCreateModal(true);
      }
    }
  }, [searchParams, pathname, router, isGuest, isComplete, showLoginPopup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const newMemory: Memory = {
        id: Math.random().toString(),
        title,
        description,
        privacy,
        target_group: privacy === "Khusus Kelas Saya" ? "S1 TI 01" : privacy === "Khusus Prodi Saya" ? "Teknologi Informasi" : undefined,
        user_name: session?.user?.name || "Anonymous",
        created_at: new Date().toISOString(),
        likes: 0
      };
      setMemories([newMemory, ...memories]);
      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      setIsSubmitting(false);
    }, 1000);
  };

  const filteredMemories = activeTab === "Semua" 
    ? memories 
    : memories.filter(m => m.privacy === `Khusus ${activeTab}`);

  return (
    <div className="bg-[#121212] min-h-screen text-white font-sans flex flex-col">
      <Sidebar />
      <Header />
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-5 md:px-8 py-6 pb-28 md:pb-10 md:pt-6 md:pl-[260px] relative">
        {isGuest && (
          <div 
            className="fixed inset-0 z-[100] bg-black/40 cursor-pointer flex items-center justify-center p-4"
            onClickCapture={(e) => {
              e.preventDefault();
              e.stopPropagation();
              showLoginPopup();
            }}
          >
            <div className="bg-[#1c1c1e]/90 backdrop-blur-md border border-[#2a2a30] px-6 py-5 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
              <h3 className="text-lg font-bold text-white mb-1">Pratinjau Mode Tamu</h3>
              <p className="text-[var(--color-text-3)] text-xs leading-relaxed">Ini hanya tampilan contoh. Klik di mana saja untuk Login dan membagikan memori.</p>
            </div>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-2 mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-[var(--color-brand-red)]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              Drop Memory
            </h1>
            <p className="text-[var(--color-text-2)] text-sm">Bagikan momen serumu ke kelas atau prodi kamu secara eksklusif.</p>
          </div>
          
          <button 
            onClick={() => {
              if (isGuest) {
                showLoginPopup();
              } else if (!isComplete) {
                setShowLock(true);
              } else {
                setShowCreateModal(true);
              }
            }}
            className="hidden md:flex bg-[var(--color-brand-red)] hover:bg-red-600 text-white font-bold px-5 py-3 rounded-xl transition shadow-md items-center gap-2 w-full md:w-auto justify-center"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Drop Baru
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {(["Semua", "Kelas Saya", "Prodi Saya"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab 
                  ? "bg-white text-black shadow-md transform scale-105" 
                  : "bg-[#1c1c1e] text-[var(--color-text-2)] border border-[#2a2a30] hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Feed */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
          {filteredMemories.map(m => (
            <div key={m.id} className="bg-[#1c1c1e] rounded-xl md:rounded-2xl border border-[#2a2a30] overflow-hidden shadow-sm flex flex-col">
              {m.image_url && (
                <div className="w-full h-24 md:h-48 bg-[#2a2a30]">
                  <img src={m.image_url} alt={m.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-3 md:p-5 flex-1 flex flex-col">
                <div className="flex flex-col md:flex-row md:justify-between items-start mb-2 gap-1 md:gap-0">
                  <h2 className="text-[14px] md:text-lg font-bold text-white line-clamp-2">{m.title}</h2>
                  <div className="flex items-center gap-1 bg-[#2a2a30] px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium text-[var(--color-brand-red)] shrink-0">
                    {m.privacy === "Khusus Kelas Saya" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 md:w-3 md:h-3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
                    {m.privacy === "Khusus Prodi Saya" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 md:w-3 md:h-3"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>}
                    {m.privacy === "Publik" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 md:w-3 md:h-3"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
                    <span className="truncate max-w-[80px] md:max-w-none">{m.target_group}</span>
                  </div>
                </div>
                
                <p className="text-[var(--color-text-2)] text-[11px] md:text-sm mb-4 leading-relaxed flex-1 line-clamp-3">
                  {m.description}
                </p>
                
                <div className="flex justify-between items-center border-t border-[#2a2a30] pt-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[var(--color-brand-red)] to-orange-500"></div>
                    <span className="text-xs font-medium text-white">{m.user_name}</span>
                  </div>
                  <div className="flex gap-4">
                    <button className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-2)] hover:text-white transition">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                      {m.likes}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-[#1c1c1e] w-full max-w-lg rounded-2xl md:rounded-3xl border border-[#2a2a30] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-8 duration-300">
            <div className="p-5 md:p-6 border-b border-[#2a2a30] flex justify-between items-center bg-[#1c1c1e] sticky top-0 z-10">
              <h2 className="text-lg md:text-xl font-bold text-white">Drop Memory Baru</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 bg-[#2a2a30] hover:bg-white/20 rounded-full text-white transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 md:p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-2)] mb-2">Judul Momen</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Keseruan Makrab 2024"
                    className="w-full bg-[#121212] border border-[#2a2a30] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-brand-red)] transition"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-2)] mb-2">Cerita / Deskripsi</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ceritakan momennya..."
                    rows={4}
                    className="w-full bg-[#121212] border border-[#2a2a30] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-brand-red)] transition resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-2)] mb-2">Siapa yang bisa melihat ini?</label>
                  <div className="grid grid-cols-1 gap-2">
                    {(["Publik", "Khusus Kelas Saya", "Khusus Prodi Saya"] as const).map(option => (
                      <label 
                        key={option} 
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${privacy === option ? 'border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10' : 'border-[#2a2a30] bg-[#121212] hover:border-white/20'}`}
                      >
                        <input
                          type="radio"
                          name="privacy"
                          value={option}
                          checked={privacy === option}
                          onChange={() => setPrivacy(option)}
                          className="w-4 h-4 text-[var(--color-brand-red)] bg-black border-gray-600 focus:ring-red-600 focus:ring-2"
                        />
                        <span className="text-sm font-medium text-white">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[var(--color-brand-red)] hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl py-3.5 transition shadow-md"
                  >
                    {isSubmitting ? "Mengunggah..." : "Drop Memory Sekarang"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLock && <ProfileLockOverlay missingInfo={missingInfo} onClose={() => setShowLock(false)} />}

      <BottomNav />
    </div>
  );
}

export default function DropMemoryPage() {
  return (
    <Suspense fallback={<div className="flex-1 w-full min-h-[50vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div></div>}>
      <DropMemoryContent />
    </Suspense>
  );
}
