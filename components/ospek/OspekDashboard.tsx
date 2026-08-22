import { useState, useMemo } from "react";
import { toast } from "@/lib/toast";

export default function OspekDashboard({ 
  boards, 
  totalScanned,
  onOpenBoard, 
  onScan 
}: { 
  boards: { id: string, name: string, count: number }[],
  totalScanned: number,
  onOpenBoard: (id: string) => void,
  onScan: () => void
}) {
  const [filterProdi, setFilterProdi] = useState("all");
  const [sortBy, setSortBy] = useState<"most" | "least" | "az">("most");
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Extract unique prodi from board names (kelas biasanya diawali singkatan prodi)
  const prodiList = useMemo(() => {
    const set = new Set<string>();
    boards.forEach(b => {
      // Ambil prefix dari nama kelas: "DKV-A" -> "DKV", "TI-A" -> "TI"
      const prefix = b.name.split("-")[0];
      if (prefix) set.add(prefix);
    });
    return Array.from(set).sort();
  }, [boards]);

  const filteredAndSorted = useMemo(() => {
    let result = [...boards];

    // Filter by prodi prefix
    if (filterProdi !== "all") {
      result = result.filter(b => b.name.startsWith(filterProdi + "-") || b.name.startsWith(filterProdi));
    }

    // Sort
    if (sortBy === "most") result.sort((a, b) => b.count - a.count);
    else if (sortBy === "least") result.sort((a, b) => a.count - b.count);
    else if (sortBy === "az") result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [boards, filterProdi, sortBy]);

  const handleExport = async (type: "gabungan" | "prodi", value: string = "") => {
    try {
      setIsExporting(type === "prodi" ? `prodi-${value}` : "gabungan");
      const res = await fetch("/api/ospek/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value }),
      });
      
      const data = await res.json();
      if (res.ok && data.success && data.spreadsheetUrl) {
        window.open(data.spreadsheetUrl, "_blank");
      } else {
        toast.error(data.error || "Gagal meng-export data. Pastikan Google API sudah dikonfigurasi.");
      }
    } catch (err) {
      console.error("Export error", err);
      toast.error("Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="px-5 md:px-8 lg:px-10 pt-6 pb-20 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 lg:items-start w-full">
        
        {/* Left Column: Sticky Summary & Scanner CTA */}
        <div className="w-full lg:w-[380px] shrink-0 lg:sticky lg:top-24">
          <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">
            Dashboard <span className="text-[var(--color-brand-red)]">Mutualan</span>
          </h1>
          <p className="text-[var(--color-text-2)] text-sm md:text-base mb-6">
            Kumpulkan foto sebanyak-banyaknya bersama teman baru selama masa Ospek!
          </p>
          
          <div className="bg-[var(--color-surface)] border border-[rgba(229,39,31,0.2)] rounded-2xl p-6 relative overflow-hidden shadow-[0_8px_30px_rgba(229,39,31,0.1)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-brand-red)] opacity-15 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="flex items-end gap-3 relative z-10">
              <span className="text-6xl font-black text-white">{totalScanned}</span>
              <span className="text-[var(--color-text-2)] text-sm md:text-base pb-2.5 font-semibold">teman terscan</span>
            </div>
            <p className="text-xs md:text-sm text-[var(--color-text-3)] mt-2 font-medium">dari {boards.length} kelas aktif</p>
          </div>

          {/* Desktop Scanner CTA */}
          <button 
            onClick={onScan}
            className="hidden lg:flex w-full mt-6 bg-[var(--color-brand-red)] text-white py-4 rounded-2xl items-center justify-center gap-3 font-bold text-lg hover:bg-red-600 transition shadow-[0_8px_30px_rgba(229,39,31,0.4)] hover:scale-[1.02] active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M4 7V4h3"/>
              <path d="M9 20h3"/>
              <path d="M20 17v3h-3"/>
              <path d="M20 7V4h-3"/>
              <path d="M4 17v3h3"/>
              <path d="M12 9v6"/>
              <path d="M9 12h6"/>
            </svg>
            Scan QR Code
          </button>
        </div>

        {/* Right Column: Boards */}
        <div className="flex-1 w-full min-w-0">
          
          {/* Header + Filters + Export */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg md:text-xl font-bold text-white">Papan Kelas / Prodi</h2>
              <div className="flex gap-2">
                {filterProdi !== "all" && (
                  <button 
                    onClick={() => handleExport("prodi", filterProdi)}
                    disabled={isExporting !== null}
                    className="text-xs md:text-sm font-bold px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-color)] text-[var(--color-text-2)] hover:text-white transition disabled:opacity-50"
                  >
                    {isExporting === `prodi-${filterProdi}` ? "Mengekspor..." : `Export Prodi ${filterProdi}`}
                  </button>
                )}
                <button 
                  onClick={() => handleExport("gabungan")}
                  disabled={isExporting !== null}
                  className="text-xs md:text-sm font-bold px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-[var(--color-brand-red)] text-white hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 md:w-4 md:h-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {isExporting === "gabungan" ? "Mengekspor..." : "Export Semua"}
                </button>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {/* Filter Prodi */}
              <select
                value={filterProdi}
                onChange={(e) => setFilterProdi(e.target.value)}
                className="bg-[var(--color-surface)] border border-[var(--color-border-color)] text-[var(--color-text-2)] text-xs md:text-sm font-bold px-3 py-2 md:px-4 md:py-2.5 rounded-xl appearance-none cursor-pointer focus:border-[var(--color-brand-red)] focus:outline-none transition"
              >
                <option value="all">Semua Prodi</option>
                {prodiList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[var(--color-surface)] border border-[var(--color-border-color)] text-[var(--color-text-2)] text-xs md:text-sm font-bold px-3 py-2 md:px-4 md:py-2.5 rounded-xl appearance-none cursor-pointer focus:border-[var(--color-brand-red)] focus:outline-none transition"
              >
                <option value="most">Terbanyak</option>
                <option value="least">Paling Sedikit</option>
                <option value="az">A-Z</option>
              </select>
            </div>
          </div>

          {/* Grid of Boards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5 mb-8">
            {filteredAndSorted.map(board => (
              <div 
                key={board.id}
                onClick={() => onOpenBoard(board.id)}
                className="bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl p-4 md:p-5 cursor-pointer hover:border-[var(--color-brand-red)] hover:bg-[#1f1f23] transition group flex flex-col min-h-[130px] md:min-h-[150px] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-4 -mt-4 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center mb-3 md:mb-4 group-hover:bg-[#2a2a30] transition relative z-10">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-6 md:h-6 text-[var(--color-text-2)] group-hover:text-white transition">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white text-[14px] md:text-[15px] leading-tight mb-2 line-clamp-2 relative z-10">{board.name}</h3>
                <div className="mt-auto relative z-10">
                  <span className="text-xs md:text-sm font-semibold text-[var(--color-brand-red)]">{board.count}</span>
                  <span className="text-xs md:text-sm font-medium text-[var(--color-text-3)]"> teman terscan</span>
                </div>
              </div>
            ))}

            {filteredAndSorted.length === 0 && (
              <div className="col-span-full py-10 text-center text-[var(--color-text-3)] text-sm">
                Tidak ada kelas yang cocok dengan filter.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Floating Action Button for Scanning (Mobile Only) */}
      <div className="fixed bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 z-10 lg:hidden">
        <button 
          onClick={onScan}
          className="w-16 h-16 bg-[var(--color-brand-red)] text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(229,39,31,0.6)] hover:scale-105 active:scale-95 transition-transform border-4 border-[var(--color-bg)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <path d="M4 7V4h3"/>
            <path d="M9 20h3"/>
            <path d="M20 17v3h-3"/>
            <path d="M20 7V4h-3"/>
            <path d="M4 17v3h3"/>
            <path d="M12 9v6"/>
            <path d="M9 12h6"/>
          </svg>
        </button>
      </div>

    </div>
  );
}
