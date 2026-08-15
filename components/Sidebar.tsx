"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useGuest } from "@/components/GuestProvider";
import UploadMediaModal from "@/components/fase3/UploadMediaModal";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const { isGuest } = useGuest();

  const user = session?.user;
  const avatarUrl = user?.avatarUrl || user?.image;
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  const getLinkClass = (path: string) => {
    const isActive = pathname === path || (path !== "/home" && pathname?.startsWith(path + "/"));
    return `flex items-center gap-4 px-4 py-3 rounded-xl transition ${
      isActive 
        ? "bg-[var(--color-brand-red)]/10 text-[var(--color-brand-red)] font-bold" 
        : "text-[var(--color-text-2)] hover:bg-[#2a2a30] hover:text-white font-medium"
    }`;
  };

  return (
    <aside className="hidden md:flex flex-col w-[260px] fixed left-0 top-0 bottom-0 bg-[#0a0a0b] border-r border-[#1c1c1e] z-60 overflow-y-auto">
      {/* Logo */}
      <div className="px-6 py-8 flex items-center gap-3">
        <div className="w-10 h-10 shrink-0 flex items-center justify-center">
          <img src="/logo.png" alt="Tell Me U Jkt Logo" className="w-full h-full object-contain drop-shadow-md" />
        </div>
        <div className="leading-[1.05]">
          <span className="text-white font-bold text-[16.5px] block">Tell Me U</span>
          <span className="text-[var(--color-brand-red)] font-extrabold text-[14.5px] block italic tracking-[0.3px]">Jkt</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col px-4 gap-2 flex-1">
        <Link href="/home" className={getLinkClass("/home")} scroll={false} replace={pathname !== "/home"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
          Home
        </Link>
        <Link href="/dokumentasi" className={getLinkClass("/dokumentasi")} scroll={false} replace={pathname !== "/home"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
          Dokumentasi
        </Link>
        <Link href="/ospek" className={getLinkClass("/ospek")} scroll={false} replace={pathname !== "/home"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
          Ospek
        </Link>
        <Link href="/tracker" className={getLinkClass("/tracker")} scroll={false} replace={pathname !== "/home"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          Academic
        </Link>
      </nav>

      {/* Bottom Profile & Quote */}
      <div className="p-4 flex flex-col gap-4 mt-auto">
        {/* Profile Card */}
        <Link href="/profile" className="flex items-center gap-3 p-3 rounded-2xl bg-[#1c1c1e] border border-[#2a2a30] hover:bg-[#2a2a30] transition">
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-[var(--color-border-color)]">
            {!isGuest && avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#3a3a3d] to-[#1c1c1e] flex items-center justify-center text-white text-[12px] font-bold">
                {isGuest ? "?" : initial}
              </div>
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-white text-xs font-bold truncate uppercase">{isGuest ? "Mode Tamu" : (user?.name || "Unknown")}</span>
            <span className="text-[var(--color-text-3)] text-[10px]">{isGuest ? "Login / Daftar" : "Lihat Profil"}</span>
          </div>
        </Link>

        {/* About Link */}
        <Link href="/about" className="p-3 md:p-4 rounded-2xl bg-[#0a0a0b] border border-[var(--color-border-color)] hover:border-[var(--color-brand-red)]/50 relative overflow-hidden group flex items-center gap-3 transition-colors">
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[var(--color-brand-red)] opacity-0 group-hover:opacity-10 rounded-full blur-xl transition duration-500"></div>
          <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border-color)] flex items-center justify-center shrink-0 group-hover:border-[var(--color-brand-red)]/50 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[var(--color-text-2)] group-hover:text-[var(--color-brand-red)] transition-colors">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div className="flex flex-col relative z-10">
            <span className="text-white text-xs font-bold transition-colors">Tentang Tell Me U</span>
            <span className="text-[var(--color-text-3)] text-[10px]">Apresiasi & Developer</span>
          </div>
        </Link>
      </div>
      
      {isUploading && <UploadMediaModal onClose={() => setIsUploading(false)} />}
    </aside>
  );
}
