import { useState, useEffect } from "react";
import PhotoDetailModal from "./PhotoDetailModal";

export default function BoardDetail({ 
  board, 
  onScan 
}: { 
  board: { id: string, name: string, count: number },
  onScan: () => void 
}) {
  const [scannedFriends, setScannedFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

  // Sheets state
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [creatingSheet, setCreatingSheet] = useState(false);

  useEffect(() => {
    fetchBoardDetail();
    checkSheet();
  }, [board.id]);

  const fetchBoardDetail = async () => {
    try {
      const res = await fetch(`/api/ospek/board/${encodeURIComponent(board.id)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setScannedFriends(data.scans);
      }
    } catch (err) {
      console.error("Failed to fetch board details", err);
    } finally {
      setLoading(false);
    }
  };

  const checkSheet = async () => {
    try {
      const res = await fetch(`/api/ospek/sheets?type=kelas&value=${encodeURIComponent(board.id)}`);
      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setSheetUrl(data.url);
      }
    } catch {}
  };

  const handleCreateSheet = async () => {
    setCreatingSheet(true);
    try {
      const res = await fetch("/api/ospek/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "kelas", value: board.id }),
      });
      const data = await res.json();
      const finalUrl = data.spreadsheetUrl || data.url;
      if (res.ok && data.success && finalUrl) {
        setSheetUrl(finalUrl);
        window.open(finalUrl, "_blank");
      } else {
        alert(data.error || "Gagal membuat spreadsheet");
      }
    } catch {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setCreatingSheet(false);
    }
  };

  const handlePhotoDeleted = (id: string) => {
    setScannedFriends(prev => prev.filter(f => f.id !== id));
    setSelectedPhoto(null);
  };

  return (
    <>
      <div className="px-5 md:px-0 pt-6 pb-28 w-full animate-in fade-in slide-in-from-right-4 duration-300 min-h-screen">
      {/* Header Info */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">{board.name}</h1>
          <p className="text-[var(--color-text-2)] text-sm font-medium">
            {scannedFriends.length} teman terscan
          </p>
        </div>
        
        {/* Sheets Button */}
        {sheetUrl ? (
          <a 
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#0f9d58] border border-[#0f9d58]/50 text-white hover:bg-[#0b8a4a] transition px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M19 11V9h-5V4h-2v5H7v2h5v5h2v-5h5z"/>
              <path d="M4 3h16c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm0 2v14h16V5H4z"/>
            </svg>
            Buka Sheet
          </a>
        ) : (
          <button 
            onClick={handleCreateSheet}
            disabled={creatingSheet}
            className="bg-[var(--color-surface)] border border-[var(--color-border-color)] text-[var(--color-text-2)] hover:text-white hover:border-[var(--color-text-3)] transition px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {creatingSheet ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/>
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75"/>
                </svg>
                Membuat...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#0f9d58]">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="8" y1="13" x2="16" y2="13"/>
                  <line x1="8" y1="17" x2="16" y2="17"/>
                </svg>
                Export ke Sheets
              </>
            )}
          </button>
        )}
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="animate-spin w-8 h-8 text-[var(--color-brand-red)] mb-4" viewBox="0 0 24 24" fill="none">
             <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/>
             <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75"/>
          </svg>
          <p className="text-[var(--color-text-2)] text-sm">Memuat data...</p>
        </div>
      ) : scannedFriends.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {scannedFriends.map((friend, i) => (
            <div 
              key={friend.id} 
              className="flex flex-col gap-1.5 group cursor-pointer"
              onClick={() => setSelectedPhoto(friend)}
            >
              <div 
                className="aspect-square rounded-2xl overflow-hidden relative border border-[var(--color-border-color)] group-hover:border-[var(--color-brand-red)] transition bg-[#1a1a1c]"
              >
                {friend.photoUrl ? (
                  <img src={friend.photoUrl} alt={friend.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 opacity-20 mix-blend-overlay flex items-center justify-center" style={{ backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][i % 5]}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-1/3 h-1/3">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-[11px] text-white font-bold truncate leading-tight">{friend.scannedName || friend.name}</p>
                {friend.scannedIg && (
                  <p className="text-[9px] text-[var(--color-brand-red)] font-medium truncate">@{friend.scannedIg}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-[var(--color-surface)] rounded-full flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-[var(--color-text-3)]">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <h3 className="text-white font-bold mb-1">Belum Ada Foto</h3>
          <p className="text-[var(--color-text-2)] text-sm max-w-[200px]">Mulai scan QR teman kamu untuk menambah mutualan.</p>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-10">
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

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <PhotoDetailModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onDeleted={handlePhotoDeleted}
        />
      )}
    </>
  );
}
