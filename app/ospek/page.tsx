"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OspekDashboard from "@/components/ospek/OspekDashboard";
import BoardDetail from "@/components/ospek/BoardDetail";
import ScannerCameraModal from "@/components/ospek/ScannerCameraModal";
import PreviewConfirmModal from "@/components/ospek/PreviewConfirmModal";
import MyQRCodeModal from "@/components/ospek/MyQRCodeModal";
import Sidebar from "@/components/Sidebar";
import { useSession } from "next-auth/react";
import { useGuest } from "@/components/GuestProvider";

export type ModalState = null | "scanner" | "preview" | "myQr";
export type CurrentView = "dashboard" | "boardDetail";

export default function OspekPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user;
  
  const displayName = user?.fullName || user?.name || "User";
  const dbUsername = user?.dbUsername || user?.name || "user";
  const initial = displayName.charAt(0).toUpperCase();
  const [currentView, setCurrentView] = useState<CurrentView>("dashboard");
  const [activeModal, setActiveModal] = useState<ModalState>(null);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const { isGuest, showLoginPopup } = useGuest();

  // Data for scan session
  const [scanSession, setScanSession] = useState<{scannedId: string, photoBase64: string} | null>(null);

  // Data for boards
  const [boards, setBoards] = useState<{ id: string, name: string, count: number }[]>([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [loading, setLoading] = useState(true);

  // Checking strict gates (SKL, Kelas, IG)
  const isVerified = user?.isVerified;
  const hasKelas = !!user?.kelas;
  const hasInstagram = !!user?.instagram;
  const canAccessOspek = !isGuest && isVerified && hasKelas && hasInstagram;

  useEffect(() => {
    if (status === "loading") return;
    if (!user && !isGuest) return; 
    
    if (canAccessOspek) {
      const fetchLeaderboard = async () => {
        try {
          const res = await fetch("/api/ospek/leaderboard");
          const data = await res.json();
          if (res.ok && data.success) {
            setBoards(data.boards);
            setTotalScanned(data.totalScanned || 0);
          }
        } catch (err) {
          console.error("Failed to fetch leaderboard", err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchLeaderboard();
    } else {
      setLoading(false);
    }
  }, [status, user, canAccessOspek, activeModal]);

  const openBoard = (id: string) => {
    setSelectedBoard(id);
    setCurrentView("boardDetail");
  };

  const closeBoard = () => {
    setSelectedBoard(null);
    setCurrentView("dashboard");
  };



  // Gate the page
  if (!canAccessOspek && status === "authenticated") {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--color-bg)] text-white items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--color-brand-red)] rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none" />
        
        <div className="bg-[var(--color-surface)] border border-[var(--color-border-color)] p-8 rounded-3xl max-w-sm w-full relative z-10 shadow-2xl">
          <div className="w-16 h-16 bg-[var(--color-bg)] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[var(--color-border-color)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M12 8v4"/>
              <path d="M12 16h.01"/>
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold mb-2 text-white">Akses Terkunci</h2>
          <p className="text-[var(--color-text-3)] text-sm mb-6">
            {isGuest ? (
              "Login terlebih dahulu untuk membuka fitur OSPEK dan berpartisipasi."
            ) : (
              <>
                Lengkapi data kamu terlebih dahulu untuk membuka fitur OSPEK:
                <br/><br/>
                <span className="text-left block space-y-2 px-2">
                  <span className={`block ${isVerified ? "text-green-400" : "text-[var(--color-text-2)]"}`}>
                    {isVerified ? "✓" : "○"} Verifikasi Identitas
                  </span>
                  <span className={`block ${hasKelas ? "text-green-400" : "text-[var(--color-text-2)]"}`}>
                    {hasKelas ? "✓" : "○"} Pilih Kelas
                  </span>
                  <span className={`block ${hasInstagram ? "text-green-400" : "text-[var(--color-text-2)]"}`}>
                    {hasInstagram ? "✓" : "○"} Tautkan Instagram
                  </span>
                </span>
              </>
            )}
          </p>
          {isGuest ? (
            <button onClick={() => showLoginPopup()} className="block w-full text-center bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition shadow-[0_4px_14px_rgba(229,39,31,0.4)]">
              Login Sekarang
            </button>
          ) : (
            <Link href="/profile" className="block w-full text-center bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition shadow-[0_4px_14px_rgba(229,39,31,0.4)]">
              Ke Profil Sekarang
            </Link>
          )}
          <Link href="/" className="block w-full bg-transparent text-[var(--color-text-2)] py-3 mt-3 rounded-xl font-bold text-sm hover:text-white transition">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-[var(--color-bg)] text-white">
      <Sidebar />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-bg)]/80 backdrop-blur-md border-b border-[var(--color-border-color)] md:w-[calc(100%-260px)] md:ml-[260px]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentView === "boardDetail" ? (
              <button 
                onClick={closeBoard}
                className="w-9 h-9 rounded-full bg-[var(--color-surface)] border border-[var(--color-border-color)] flex items-center justify-center cursor-pointer hover:bg-[#2a2a30] transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </button>
            ) : (
              <Link href="/">
                <div className="w-9 h-9 shrink-0 flex items-center justify-center cursor-pointer opacity-80 hover:opacity-100 transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px]">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </div>
              </Link>
            )}
            <div className="leading-[1.1]">
              <span className="text-[var(--color-brand-red)] font-extrabold text-[14.5px] block">OSPEK MODE</span>
              <span className="text-white font-bold text-[16.5px] block">Tell Me U Jkt</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveModal("myQr")}
              className="w-10 h-10 rounded-full border-[1.5px] border-[var(--color-brand-red)] flex items-center justify-center bg-[rgba(229,39,31,0.1)] hover:bg-[rgba(229,39,31,0.2)] transition text-[var(--color-brand-red)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px]">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <path d="M3 14h7v7H3z" />
                <path d="M11 11h2v2h-2z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto flex flex-col relative z-0 md:pl-[260px] pb-24 md:pb-10">
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
              <p className="text-[var(--color-text-3)] text-xs leading-relaxed">Ini hanya tampilan contoh. Klik di mana saja untuk Login dan membuka fitur OSPEK yang sebenarnya.</p>
            </div>
          </div>
        )}

        {(status === "loading" || (canAccessOspek && loading)) ? (
          <div className="flex-1 w-full min-h-[50vh] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : currentView === "dashboard" ? (
          <OspekDashboard 
            boards={isGuest ? [
              { id: "dummy1", name: "Sistem Informasi", count: 1250 },
              { id: "dummy2", name: "Teknik Informatika", count: 980 },
              { id: "dummy3", name: "Desain Komunikasi Visual", count: 850 },
              { id: "dummy4", name: "Ilmu Komunikasi", count: 640 }
            ] : boards} 
            totalScanned={isGuest ? 3720 : totalScanned}
            onOpenBoard={openBoard} 
            onScan={() => setActiveModal("scanner")} 
          />
        ) : currentView === "boardDetail" && selectedBoard ? (
          <BoardDetail 
            board={boards.find(b => b.id === selectedBoard) || { id: selectedBoard, name: selectedBoard, count: 0 }} 
            onScan={() => setActiveModal("scanner")} 
          />
        ) : null}
      </main>

      {/* Modals */}
      {activeModal === "scanner" && (
        <ScannerCameraModal 
          onClose={() => setActiveModal(null)} 
          onCapture={(scannedId, photoBase64) => {
            setScanSession({ scannedId, photoBase64 });
            setActiveModal("preview");
          }} 
        />
      )}
      
      {activeModal === "preview" && scanSession && (
        <PreviewConfirmModal 
          onClose={() => {
            setActiveModal(null);
            setScanSession(null);
          }} 
          onRetake={() => {
            setScanSession(null);
            setActiveModal("scanner");
          }}
          scanSession={scanSession}
        />
      )}
      
      {activeModal === "myQr" && (
        <MyQRCodeModal 
          onClose={() => setActiveModal(null)}
          discordId={user?.discordId || ""}
          displayName={displayName}
          dbUsername={dbUsername}
          initial={initial}
        />
      )}

    </div>
  );
}
