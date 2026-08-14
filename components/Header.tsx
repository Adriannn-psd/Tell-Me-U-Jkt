"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import UploadMediaModal from "@/components/fase3/UploadMediaModal";
import PortalKampusModal from "@/components/fase3/PortalKampusModal";
import { useScrollState } from "./ScrollContext";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/components/GuestProvider";

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const { isScrolledPastHero } = useScrollState();
  const [showAllModal, setShowAllModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPortal, setShowPortal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0); // TODO: Fetch actual count
  const { isGuest, showLoginPopup } = useGuest();
  
  
  // Search state
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<{ users: any[], posts: any[] }>({ users: [], posts: [] });
  const [isLoading, setIsLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ users: [], posts: [] });
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
          setResults({ users: data.users || [], posts: data.posts || [] });
        }
      } catch (err) {
        console.error("Failed to search", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/dokumentasi?q=${encodeURIComponent(query.trim())}`);
      setIsFocused(false);
    }
  };

  const user = session?.user;
  const avatarUrl = user?.avatarUrl || user?.image;
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <>
    <header className="sticky top-0 z-50 bg-[var(--color-bg)]/80 backdrop-blur-md border-b border-[var(--color-border-color)] md:w-[calc(100%-260px)] md:ml-[260px]">
      <div className="w-full px-5 md:px-8 py-4 flex items-center justify-between md:justify-end gap-6">
        
        {/* Mobile Logo */}
        <div className="flex items-center gap-3 md:hidden">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center">
            <img src="/logo.png" alt="Tell Me U Jkt Logo" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <div className="leading-[1.05]">
            <span className="text-white font-bold text-[16.5px] block">Tell Me U</span>
            <span className="text-[var(--color-brand-red)] font-extrabold text-[14.5px] block italic tracking-[0.3px]">Jkt</span>
          </div>
        </div>

        {/* Desktop Search Bar (Hidden on Mobile) */}
        {!pathname.startsWith('/profile') && (
          <div className="hidden md:block flex-1 max-w-[480px] mr-auto relative">
            <form onSubmit={handleSearchSubmit} className={`flex items-center bg-[#1c1c1e] border ${isFocused ? 'border-[var(--color-brand-red)] shadow-[0_0_15px_rgba(229,39,31,0.2)]' : 'border-[#2a2a30]'} rounded-xl px-4 py-2.5 transition-all duration-300`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 mr-3 transition-colors ${isFocused ? 'text-[var(--color-brand-red)]' : 'text-[var(--color-text-3)]'}`}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if (isGuest) { showLoginPopup(); return; } setIsFocused(true); }}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="Cari mahasiswa, karya, atau tag..."
                readOnly={isGuest}
                className="bg-transparent border-none outline-none text-white w-full text-sm font-medium placeholder:text-[var(--color-text-3)]"
              />
              {query && (
                <button 
                  type="button"
                  onClick={() => setQuery("")}
                  className="ml-2 text-[var(--color-text-3)] hover:text-white transition"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </form>

            {/* Dropdown Suggestions */}
            {isFocused && query.length > 0 && (

            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c1c1e] border border-[#2a2a30] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-2 flex flex-col">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-[var(--color-text-3)]">Mencari...</div>
                ) : results.users.length === 0 && results.posts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[var(--color-text-3)]">Tidak ditemukan hasil untuk "{query}"</div>
                ) : (
                  <>
                    {results.posts.map((post: any) => (
                      <button 
                        key={post.id} 
                        onClick={() => {
                          router.push(`/dokumentasi?q=${encodeURIComponent(post.title)}`);
                          setIsFocused(false);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-[#2a2a30] rounded-lg text-left transition"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#2a2a30] flex items-center justify-center text-[var(--color-text-2)]">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium line-clamp-1">{post.title}</p>
                          <p className="text-[var(--color-text-3)] text-xs">Karya</p>
                        </div>
                      </button>
                    ))}
                    {results.users.map((u: any) => (
                      <button 
                        key={u.id} 
                        onClick={() => {
                          router.push(`/profile/${u.id}`);
                          setIsFocused(false);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-[#2a2a30] rounded-lg text-left transition"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-[#2a2a30]">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium line-clamp-1">{u.name}</p>
                          <p className="text-[var(--color-text-3)] text-xs">Mahasiswa</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          
          <div className="relative text-white w-6 h-6 cursor-pointer hidden md:block" onClick={() => isGuest ? showLoginPopup() : setShowNotifications(!showNotifications)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full hover:text-[var(--color-text-2)] transition">
              <path d="M12 3a5 5 0 0 0-5 5v3.3c0 .8-.3 1.6-.9 2.2L5 15h14l-1.1-1.5c-.6-.6-.9-1.4-.9-2.2V8a5 5 0 0 0-5-5Z" />
              <path d="M10 18a2 2 0 0 0 4 0" />
            </svg>
            {notificationCount > 0 && (
              <span className="absolute -top-[4px] -right-[4px] min-w-[16px] h-[16px] px-1 flex items-center justify-center bg-[var(--color-brand-red)] rounded-full border-2 border-[var(--color-bg)] text-[9px] font-bold text-white">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
            
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }}></div>
                <div className="absolute right-0 top-full mt-3 w-64 bg-[#1c1c1e] border border-[#3a3a3d] rounded-xl shadow-xl py-4 px-4 z-50 cursor-default" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold text-white mb-2">Notifikasi</h3>
                  <div className="text-sm text-[var(--color-text-2)] text-center py-4 border-t border-[#3a3a3d]">
                    Belum ada notifikasi baru.
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 md:hidden">
            {/* Mobile Sticky Action Button */}
            <AnimatePresence>
              {isScrolledPastHero && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="flex items-center"
                >
                  <button 
                    onClick={() => setShowAllModal(true)}
                    className="w-[28px] h-[28px] rounded-full bg-gradient-to-tr from-[var(--color-brand-red)] to-[#ff8c00] flex items-center justify-center shadow-[0_2px_10px_rgba(255,59,48,0.3)] text-white"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative text-white w-[23px] h-[23px] cursor-pointer" onClick={() => isGuest ? showLoginPopup() : setShowNotifications(!showNotifications)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <path d="M12 3a5 5 0 0 0-5 5v3.3c0 .8-.3 1.6-.9 2.2L5 15h14l-1.1-1.5c-.6-.6-.9-1.4-.9-2.2V8a5 5 0 0 0-5-5Z" />
                <path d="M10 18a2 2 0 0 0 4 0" />
              </svg>
              {notificationCount > 0 && (
                <span className="absolute -top-[4px] -right-[4px] min-w-[14px] h-[14px] px-1 flex items-center justify-center bg-[var(--color-brand-red)] rounded-full border-[1.5px] border-[var(--color-bg)] text-[8px] font-bold text-white">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
              
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }}></div>
                  <div className="absolute right-0 top-full mt-3 w-64 bg-[#1c1c1e] border border-[#3a3a3d] rounded-xl shadow-xl py-4 px-4 z-50 cursor-default" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold text-white mb-2 text-left">Notifikasi</h3>
                    <div className="text-sm text-[var(--color-text-2)] text-center py-4 border-t border-[#3a3a3d]">
                      Belum ada notifikasi baru.
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Hamburger Menu (Only on Profile) */}
            {pathname.startsWith("/profile") && (
              <div className="relative">
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-white w-[23px] h-[23px] flex items-center justify-center focus:outline-none"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                </button>

                {/* Dropdown */}
                {isMobileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-3 w-40 bg-[#1c1c1e] border border-[#3a3a3d] rounded-xl shadow-xl py-1 z-50">
                      {isGuest ? (
                        <button 
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            showLoginPopup();
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-brand-red)] hover:bg-[#2c2c2e] font-semibold flex items-center gap-2"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                          Login
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setShowLogoutModal(true);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#E5271F] hover:bg-[#2c2c2e] font-semibold flex items-center gap-2"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          Logout
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Desktop Hamburger / Avatar */}
          {pathname.startsWith("/profile") ? (
            <div className="relative hidden md:block">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white w-7 h-7 flex items-center justify-center focus:outline-none hover:text-[var(--color-brand-red)] transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              </button>

              {/* Desktop Dropdown */}
              {isMobileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMobileMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-3 w-48 bg-[#1c1c1e] border border-[#3a3a3d] rounded-xl shadow-xl py-2 z-50">
                    {isGuest ? (
                      <button 
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          showLoginPopup();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--color-brand-red)] hover:bg-[#2c2c2e] font-semibold flex items-center gap-3 transition"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                        Login
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setShowLogoutModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[#E5271F] hover:bg-[#2c2c2e] font-semibold flex items-center gap-3 transition"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Logout
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/profile" className="relative w-9 h-9 shrink-0 cursor-pointer hidden md:block">
              {!isGuest && avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover border-[1.5px] border-[#333]" />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center text-white font-bold text-sm border-[1.5px] border-[#333] bg-gradient-to-br from-[#3a3a3d] to-[#1c1c1e]">
                  {isGuest ? "?" : initial}
                </div>
              )}
              {!isGuest && <span className="absolute bottom-0 right-0 w-[10px] h-[10px] bg-[var(--color-brand-green)] rounded-full border-[1.5px] border-[var(--color-bg)]"></span>}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Search Bar (Universal across all pages) */}
      <div className="md:hidden px-5 pb-4 w-full">
        <div className="relative w-full z-20">
          <form onSubmit={handleSearchSubmit} className={`flex items-center bg-[#1c1c1e] border ${isFocused ? 'border-[var(--color-brand-red)] shadow-[0_0_15px_rgba(229,39,31,0.2)]' : 'border-[#2a2a30]'} rounded-xl px-4 py-2.5 transition-all duration-300`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 mr-3 transition-colors ${isFocused ? 'text-[var(--color-brand-red)]' : 'text-[var(--color-text-3)]'}`}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (isGuest) { showLoginPopup(); return; } setIsFocused(true); }}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder="Cari mahasiswa, karya, atau tag..."
              readOnly={isGuest}
              className="bg-transparent border-none outline-none text-white w-full text-sm font-medium placeholder:text-[var(--color-text-3)]"
            />
            {query && (
              <button 
                type="button"
                onClick={() => setQuery("")}
                className="ml-2 text-[var(--color-text-3)] hover:text-white transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </form>

          {/* Dropdown Suggestions (Mobile) */}
          {isFocused && query.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c1c1e] border border-[#2a2a30] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-2 flex flex-col">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-[var(--color-text-3)]">Mencari...</div>
                ) : results.users.length === 0 && results.posts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[var(--color-text-3)]">Tidak ditemukan hasil untuk "{query}"</div>
                ) : (
                  <>
                    {results.posts.map((post: any) => (
                      <button 
                        key={post.id} 
                        onClick={() => {
                          router.push(`/dokumentasi?q=${encodeURIComponent(post.title)}`);
                          setIsFocused(false);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-[#2a2a30] rounded-lg text-left transition"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#2a2a30] flex items-center justify-center text-[var(--color-text-2)]">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium line-clamp-1">{post.title}</p>
                          <p className="text-[var(--color-text-3)] text-xs">Karya</p>
                        </div>
                      </button>
                    ))}
                    {results.users.map((u: any) => (
                      <button 
                        key={u.id} 
                        onClick={() => {
                          router.push(`/profile/${u.id}`);
                          setIsFocused(false);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-[#2a2a30] rounded-lg text-left transition"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-[#2a2a30]">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium line-clamp-1">{u.name}</p>
                          <p className="text-[var(--color-text-3)] text-xs">Mahasiswa</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Logout Confirmation Modal */}
    {showLogoutModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}></div>
        <div className="relative bg-[#1c1c1e] border border-[#3a3a3d] rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-[#E5271F]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-bold mb-2">Yakin Ingin Keluar?</h3>
            <p className="text-[#a1a1aa] text-sm mb-6">Anda harus login kembali untuk mengakses fitur Tell Me U Jkt.</p>
            
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#2c2c2e] text-white font-semibold text-sm hover:bg-[#3a3a3d] transition"
              >
                Batal
              </button>
              <button 
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex-1 py-2.5 rounded-xl bg-[#E5271F] text-white font-semibold text-sm hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Mobile "Lihat Semua" Modal */}
    <AnimatePresence>
      {showAllModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 md:hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
              <h3 className="text-white text-lg font-bold">Fitur Cepat</h3>
              <button onClick={() => setShowAllModal(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div onClick={() => { setShowAllModal(false); setShowPortal(true); }} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-[70px] h-[70px] rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-color)] flex items-center justify-center group-hover:bg-[#2a2a30] transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <span className="text-[11px] text-[var(--color-text-2)] font-medium text-center">Portal Kampus</span>
              </div>

              <Link href={isGuest ? "#" : "/partner"} onClick={(e) => { setShowAllModal(false); if (isGuest) { e.preventDefault(); showLoginPopup(); } }} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-[70px] h-[70px] rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-color)] flex items-center justify-center group-hover:bg-[#2a2a30] transition">
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
                <div className="w-[70px] h-[70px] rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-color)] flex items-center justify-center group-hover:bg-[#2a2a30] transition relative overflow-hidden">
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
                <div className="w-[70px] h-[70px] rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-color)] flex items-center justify-center group-hover:bg-[#2a2a30] transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[var(--color-brand-red)]">
                    <path d="M7 18a4 4 0 0 1-1-7.87A5.5 5.5 0 0 1 16.9 8H17a4 4 0 0 1 1 7.9" />
                    <path d="M12 11.5v7M9 14.5l3-3 3 3" />
                  </svg>
                </div>
                <span className="text-[11px] text-[var(--color-text-2)] font-medium text-center">Upload Karya</span>
              </div>
              
              <div onClick={() => setShowAllModal(false)} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-[70px] h-[70px] rounded-2xl bg-gradient-to-br from-[#ff3b30]/10 to-transparent border border-white/5 flex items-center justify-center group-hover:bg-white/5 transition relative overflow-hidden">
                   <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff3b30] to-[#ff8c00] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                   </div>
                </div>
                <span className="text-[11px] text-[var(--color-text-2)] font-medium text-center">To-Do</span>
              </div>

              <div onClick={() => setShowAllModal(false)} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-[70px] h-[70px] rounded-2xl bg-gradient-to-br from-[#30d158]/10 to-transparent border border-white/5 flex items-center justify-center group-hover:bg-white/5 transition relative overflow-hidden">
                   <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#30d158] to-[#28a745] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                   </div>
                </div>
                <span className="text-[11px] text-[var(--color-text-2)] font-medium text-center">Radar Kampus</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {isUploading && <UploadMediaModal onClose={() => setIsUploading(false)} />}
    {showPortal && <PortalKampusModal onClose={() => setShowPortal(false)} />}
    </>
  );
}
