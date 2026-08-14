"use client";

import { useState, useEffect, Suspense } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import EventCard, { EventData } from "@/components/fase3/EventCard";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import useSWR from "swr";
import FeaturedEventCard from "@/components/fase3/FeaturedEventCard";
import { useGuest } from "@/components/GuestProvider";
import LoginPanel from "@/components/LoginPanel";

const fetcher = (url: string) => fetch(url).then(res => res.json());

function DokumentasiContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { isGuest, showLoginPopup } = useGuest();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [className, setClassName] = useState("");
  const [category, setCategory] = useState("Umum");
  const [uploadPermission, setUploadPermission] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("Semua");
  const [viewMode, setViewMode] = useState<"featured" | "grid">("featured");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("terbaru");
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowCreateModal(true);
      router.replace(pathname);
    }
  }, [searchParams, pathname, router]);

  const { data, error, isLoading, mutate } = useSWR("/api/dokumentasi", fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true
  });

  const allEvents: EventData[] = isGuest ? [
    {
      id: "dummy-1",
      title: "Kegiatan Dummy Mahasiswa",
      description: "Ini adalah konten contoh untuk tamu. Silakan login untuk melihat konten asli.",
      date: "2024-01-01",
      category: "Umum",
      className: "Umum",
      thumbnail: "/images/bg-login.jpg",
      totalPhotos: 5,
      totalComments: 0,
      totalLikes: 10,
      createdAt: new Date().toISOString()
    },
    {
      id: "dummy-2",
      title: "Ospek Dummy",
      description: "Ini adalah konten contoh untuk tamu. Silakan login untuk melihat konten asli.",
      date: "2024-01-02",
      category: "Kepanitiaan",
      className: "Umum",
      thumbnail: "/images/bg-login.jpg",
      totalPhotos: 12,
      totalComments: 2,
      totalLikes: 25,
      createdAt: new Date().toISOString()
    }
  ] : (data?.events || []);
  
  // Filter by category
  const filteredEvents = activeTab === "Semua" 
    ? allEvents 
    : allEvents.filter(e => e.category === activeTab);

  // Sorting
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === "terbaru") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === "terlama") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === "terpopuler") {
      const scoreA = (a.totalLikes || 0) + (a.totalComments || 0);
      const scoreB = (b.totalLikes || 0) + (b.totalComments || 0);
      return scoreB - scoreA;
    }
    return 0;
  });

  // Featured Logic (Top 2 by likes+comments)
  const topEvents = [...filteredEvents].sort((a, b) => {
    const scoreA = (a.totalLikes || 0) + (a.totalComments || 0);
    const scoreB = (b.totalLikes || 0) + (b.totalComments || 0);
    return scoreB - scoreA;
  }).slice(0, 2);
  const featuredEvents = topEvents;
  // Exclude featured from recent if we are in Semua featured mode
  const featuredIds = featuredEvents.map(e => e.id);
  const recentEvents = sortedEvents.filter(e => !featuredIds.includes(e.id)).slice(0, 4);

  // Pagination for Grid mode
  const totalPages = Math.ceil(sortedEvents.length / ITEMS_PER_PAGE);
  const currentGridEvents = sortedEvents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
    if (tab === "Semua") {
      setViewMode("featured");
    } else {
      setViewMode("grid");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "authenticated") return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/dokumentasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          className,
          uploadPermission
        })
      });

      if (res.ok) {
        setShowCreateModal(false);
        setTitle("");
        setDescription("");
        setCategory("Umum");
        setClassName("");
        setUploadPermission("all");
        mutate();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

// Inside DokumentasiContent (this isn't the import area but we can add the check)
  return (
    <div className="flex flex-col min-h-screen">
      <Sidebar />
      <Header />
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-5 md:px-8 py-6 pb-28 md:pb-10 md:pt-6 md:pl-[260px] relative">
        {isGuest && (
          <div 
            className="absolute inset-0 z-40 bg-black/40 cursor-pointer"
            onClickCapture={(e) => {
              e.preventDefault();
              e.stopPropagation();
              showLoginPopup();
            }}
          >
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1c1c1e]/90 backdrop-blur-md border border-[#2a2a30] px-6 py-5 rounded-2xl shadow-2xl max-w-[90vw] sm:max-w-sm w-full animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
              <h3 className="text-lg font-bold text-white mb-1">Pratinjau Mode Tamu</h3>
              <p className="text-[var(--color-text-3)] text-xs leading-relaxed">Ini hanya tampilan contoh. Klik di mana saja untuk Login dan melihat dokumentasi yang sebenarnya.</p>
            </div>
          </div>
        )}

        <div className="sticky top-[60px] md:top-[73px] z-30 bg-[var(--color-bg)]/95 backdrop-blur-md pt-4 md:pt-6 pb-3 md:pb-4 mb-4 md:mb-6 border-b border-[#2a2a30]/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
            <div className="flex items-start justify-between w-full">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white mb-1.5 md:mb-2">Dokumentasi Kegiatan</h1>
                <p className="text-xs md:text-sm text-[var(--color-text-2)] max-w-xl">
                  Jelajahi momen-momen terbaik dari berbagai kegiatan kelas dan kampus.
                </p>
              </div>
              
              {/* Mobile Sort Icon */}
              <div className="relative md:hidden w-8 h-8 mt-1 shrink-0 flex items-center justify-center bg-[#1c1c1e] border border-[#2a2a30] rounded-lg text-[var(--color-text-2)] hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                  <option value="terbaru">Terbaru</option>
                  <option value="terpopuler">Terpopuler</option>
                  <option value="terlama">Terlama</option>
                </select>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 md:mb-8 bg-[rgba(28,28,30,0.4)] p-3 md:p-4 rounded-2xl border border-[#3a3a3d]">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              {/* View Toggle */}
              <div className="flex bg-[#1c1c1e] p-1 rounded-xl border border-[#3a3a3d] shrink-0">
                <button 
                  onClick={() => setViewMode("featured")}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition ${
                    viewMode === "featured" ? "bg-[var(--color-brand-red)] text-white shadow-lg" : "text-[#8e8e93] hover:text-white"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span className="hidden sm:inline">Featured</span>
                </button>
                <button 
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition ${
                    viewMode === "grid" ? "bg-[#3a3a3d] text-white shadow-lg" : "text-[#8e8e93] hover:text-white"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  <span className="hidden sm:inline">Grid All</span>
                </button>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-[1px] h-8 bg-[#3a3a3d]"></div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-2)] bg-[#1c1c1e] px-3 py-2 rounded-xl border border-[#3a3a3d] w-full sm:w-auto shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-white outline-none appearance-none cursor-pointer pr-4 font-medium"
                >
                  <option value="terbaru">Terbaru</option>
                  <option value="terpopuler">Terpopuler</option>
                  <option value="terlama">Terlama</option>
                </select>
              </div>
            </div>
            
            {/* Actions Row */}
            <div className="flex items-center gap-3 w-full md:w-auto mt-1 md:mt-0">
              <button 
                onClick={() => isGuest ? showLoginPopup() : setShowCreateModal(true)}
                className="hidden md:flex w-full md:w-auto items-center justify-center gap-2 bg-[var(--color-brand-red)] hover:bg-red-600 text-white font-bold py-2 md:py-2.5 px-4 md:px-5 rounded-xl transition text-sm md:text-base"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 md:w-5 md:h-5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Buat Kegiatan Baru
              </button>
            </div>
          </div>

          {/* Filters and Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex overflow-x-auto custom-scrollbar pb-2 md:pb-0 gap-3 w-full md:w-auto pr-4 md:pr-0">
              {["Semua", "Kelas", "Prodi", "Kampus", "Organisasi", "Pribadi"].map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-xl border font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                    activeTab === tab 
                      ? "bg-[var(--color-brand-red)]/10 border-[var(--color-brand-red)] text-[var(--color-brand-red)]" 
                      : "bg-[#1c1c1e] border-[#2a2a30] text-[var(--color-text-2)] hover:border-[var(--color-text-3)] hover:text-white"
                  }`}
                >
                  {tab === "Semua" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                  )}
                  {tab === "Kelas" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                  )}
                  {tab === "Prodi" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                  )}
                  {tab === "Kampus" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                  )}
                  {tab === "Organisasi" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  )}
                  {tab === "Pribadi" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  )}
                  {tab}
                </button>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {/* Desktop Select */}
              <select 
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-[#1c1c1e] border border-[#2a2a30] text-white px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--color-brand-red)] transition-colors appearance-none pr-8 relative bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-no-repeat bg-[right_12px_center]"
              >
                <option value="terbaru">Terbaru</option>
                <option value="terpopuler">Terpopuler</option>
                <option value="terlama">Terlama</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-400 py-10 bg-[var(--color-surface)] rounded-2xl border border-red-500/20">
            Gagal memuat dokumentasi
          </div>
        ) : allEvents.length > 0 ? (
          <>
            {viewMode === "featured" && activeTab === "Semua" ? (
              <div className="animate-in fade-in duration-500">
                {/* Featured Section */}
                {featuredEvents.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                    {featuredEvents.map(event => (
                      <FeaturedEventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
                
                {/* Recent Section */}
                {recentEvents.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-brand-red)]"></span>
                        <h2 className="text-lg font-bold text-white">Kegiatan Terbaru</h2>
                        <span className="h-px bg-[#2a2a30] w-12 hidden md:block"></span>
                      </div>
                      
                      <button onClick={() => setViewMode("grid")} className="text-[var(--color-brand-red)] text-sm font-bold flex items-center gap-1 hover:text-red-400 transition group">
                        Lihat Semua
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                      {recentEvents.map(event => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in duration-500">
                {activeTab === "Semua" && (
                   <div className="flex items-center gap-3 mb-6">
                     <button onClick={() => setViewMode("featured")} className="text-[var(--color-text-3)] hover:text-white transition p-2 -ml-2 rounded-full hover:bg-[#2a2a30]">
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                     </button>
                     <h2 className="text-xl font-bold text-white">Semua Kegiatan</h2>
                   </div>
                )}
                
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                  {currentGridEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
                
                {currentGridEvents.length === 0 && (
                   <div className="text-center py-20 text-[var(--color-text-3)]">
                     Tidak ada kegiatan di kategori ini.
                   </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-10">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-xl border border-[#2a2a30] text-white bg-[#1c1c1e] hover:bg-[#2a2a30] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                      Previous
                    </button>
                    <span className="text-white font-medium text-sm">
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-xl border border-[#2a2a30] text-white bg-[#1c1c1e] hover:bg-[#2a2a30] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                    >
                      Next
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-[var(--color-text-3)]">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Belum Ada Dokumentasi</h3>
            <p className="text-[var(--color-text-2)] text-sm max-w-sm mx-auto">
              Jadilah yang pertama membuat album dokumentasi kegiatan kelas atau kampusmu.
            </p>
          </div>
        )}
      </main>

      <BottomNav />

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1c1c1e] w-full max-w-md rounded-2xl border border-[var(--color-border-color)] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[var(--color-border-color)] flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-white">Buat Kegiatan Baru</h2>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-2)] text-white hover:bg-[var(--color-text-3)] transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Nama Event <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Misal: Makrab TI 2026"
                  required
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-text-3)] transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Kategori Kegiatan <span className="text-red-500">*</span></label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-text-3)] transition appearance-none relative bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-no-repeat bg-[right_16px_center]"
                >
                  <option value="Umum">Umum (Tidak terklasifikasi)</option>
                  <option value="Kelas">Kelas</option>
                  <option value="Prodi">Program Studi</option>
                  <option value="Kampus">Kampus (Event Besar)</option>
                  <option value="Organisasi">Organisasi / UKM</option>
                  <option value="Pribadi">Pribadi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Nama Kelas/Organisasi (Opsional)</label>
                <input 
                  type="text" 
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  placeholder={category === "Organisasi" ? "Misal: BEM Kampus" : "Misal: TI-A"}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-text-3)] transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Deskripsi Event</label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ceritakan sedikit tentang kegiatan ini..."
                  rows={3}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-text-3)] transition resize-none custom-scrollbar"
                ></textarea>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-semibold text-white mb-1.5">Siapa yang bisa upload dokumentasi?</label>
                <select 
                  value={uploadPermission}
                  onChange={e => setUploadPermission(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-text-3)] transition appearance-none"
                >
                  <option value="all">Semua Orang</option>
                  <option value="prodi">Satu Program Studi</option>
                  <option value="kelas">Satu Kelas</option>
                  <option value="none">Tidak Ada (Hanya Saya)</option>
                </select>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting || !title}
                  className="w-full bg-[var(--color-brand-red)] hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Menyimpan...
                    </>
                  ) : "Buat Kegiatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DokumentasiPage() {
  return (
    <Suspense fallback={<div className="flex-1 w-full min-h-[50vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div></div>}>
      <DokumentasiContent />
    </Suspense>
  );
}
