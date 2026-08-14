"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import UploadMediaModal from "@/components/fase3/UploadMediaModal";
import { useGuest } from "@/components/GuestProvider";

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const { isGuest, showLoginPopup } = useGuest();
  
  const router = useRouter();

  // Smart Button (FAB) dynamic logic based on pathname
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const renderSmartButton = () => {
    if (pathname?.startsWith('/tracker')) {
      return (
        <button onClick={() => isGuest ? showLoginPopup() : router.push('?action=add')} className="relative flex flex-col items-center justify-end flex-1 h-[64px] pb-[6px]">
          <div className="absolute bottom-[30px] w-[56px] h-[56px] rounded-full bg-[var(--color-brand-red)] flex items-center justify-center shadow-[0_0_0_8px_var(--color-bg)] transition-transform hover:scale-105 active:scale-95 z-10 focus:outline-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px]">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-[var(--color-text-2)] leading-none">Tugas</span>
        </button>
      );
    }
    if (pathname?.startsWith('/dokumentasi') || pathname?.startsWith('/drop-memory')) {
      return (
        <button onClick={() => isGuest ? showLoginPopup() : router.push('?action=add')} className="relative flex flex-col items-center justify-end flex-1 h-[64px] pb-[6px]">
          <div className="absolute bottom-[30px] w-[56px] h-[56px] rounded-full bg-[var(--color-brand-red)] flex items-center justify-center shadow-[0_0_0_8px_var(--color-bg)] transition-transform hover:scale-105 active:scale-95 z-10 focus:outline-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px]">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-[var(--color-text-2)] leading-none">Upload</span>
        </button>
      );
    }
    if (pathname?.startsWith('/partner')) {
      return (
        <button onClick={() => isGuest ? showLoginPopup() : router.push('?action=add')} className="relative flex flex-col items-center justify-end flex-1 h-[64px] pb-[6px]">
          <div className="absolute bottom-[30px] w-[56px] h-[56px] rounded-full bg-[var(--color-brand-red)] flex items-center justify-center shadow-[0_0_0_8px_var(--color-bg)] transition-transform hover:scale-105 active:scale-95 z-10 focus:outline-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px]">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-[var(--color-text-2)] leading-none">Partner</span>
        </button>
      );
    }
    
    if (pathname?.startsWith('/profile')) {
      return (
        <button onClick={() => isGuest ? showLoginPopup() : setIsUploading(true)} className="relative flex flex-col items-center justify-end flex-1 h-[64px] pb-[6px]">
          <div className="absolute bottom-[30px] w-[56px] h-[56px] rounded-full bg-[var(--color-brand-red)] flex items-center justify-center shadow-[0_0_0_8px_var(--color-bg)] transition-transform hover:scale-105 active:scale-95 z-10 focus:outline-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px]">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-[var(--color-text-2)] leading-none">Upload</span>
        </button>
      );
    }
    
    // Default / Home / Ospek (Scan QR)
    return (
      <Link href="/ospek" className="relative flex flex-col items-center justify-end flex-1 cursor-pointer h-[64px] pb-[6px]" scroll={false} replace={pathname !== "/home"}>
        <div className="absolute bottom-[30px] w-[56px] h-[56px] rounded-full bg-[#E5271F] flex items-center justify-center shadow-[0_0_0_8px_var(--color-bg)] transition-transform hover:scale-105 active:scale-95 z-10">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[24px] h-[24px]">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
        </div>
        <span className="text-[10px] font-medium text-[#8e8e93] leading-none">Scan QR</span>
      </Link>
    );
  };

  const getLinkClass = (path: string) => {
    // Exact match for home, startsWith for others
    const isActive = path === "/home" ? pathname === path : pathname?.startsWith(path);
    return `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
      isActive ? "text-white" : "text-[#8e8e93] hover:text-[#d1d1d6]"
    }`;
  };

  const initial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U";
  const avatarUrl = session?.user?.image;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
      
      <div className="relative mx-4 mb-4 h-[72px] bg-[#1c1c1e]/95 backdrop-blur-xl border border-[#2a2a30] rounded-3xl flex items-center justify-around px-2 shadow-2xl pointer-events-auto">
        
        {/* Home */}
        <Link href="/home" className={getLinkClass("/home")} scroll={false} replace={pathname !== "/home"}>
          <svg viewBox="0 0 24 24" fill={pathname === "/home" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[24px] h-[24px] mb-1">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-[10px] font-medium leading-none mt-1">Home</span>
        </Link>

        {/* Dokumentasi */}
        <Link href="/dokumentasi" className={getLinkClass("/dokumentasi")} scroll={false} replace={pathname !== "/home"}>
          <svg viewBox="0 0 24 24" fill={pathname?.startsWith("/dokumentasi") ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[24px] h-[24px] mb-1">
            <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
            <path d="M14 3v5h5M16 13H8M16 17H8M10 9H8" />
          </svg>
          <span className="text-[10px] font-medium leading-none mt-1">Dokumen</span>
        </Link>

        {renderSmartButton()}

        {/* Academic */}
        <Link href="/tracker" className={getLinkClass("/tracker")} scroll={false} replace={pathname !== "/home"}>
          <svg viewBox="0 0 24 24" fill={pathname?.startsWith("/tracker") ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[24px] h-[24px] mb-1">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-[10px] font-medium leading-none mt-1">Academic</span>
        </Link>

        {/* Profile */}
        <Link href="/profile" className={getLinkClass("/profile")} replace={pathname !== "/"}>
          <div className="w-[38px] h-[38px] rounded-full overflow-hidden flex items-center justify-center shrink-0">
            {!isGuest && avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#3a3a3d] to-[#1c1c1e] flex items-center justify-center text-white text-[12px] font-bold">
                {isGuest ? "?" : initial}
              </div>
            )}
          </div>
        </Link>

      </div>
      
      {isUploading && <UploadMediaModal onClose={() => setIsUploading(false)} />}
    </div>
  );
}
