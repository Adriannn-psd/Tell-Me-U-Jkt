"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useGuest } from "@/components/GuestProvider";

interface PartnerRequest {
  id: string;
  course: string;
  role: string;
  contact: string;
  created_at: string;
  user_name?: string;
}

function CariPartnerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const courseInputRef = useRef<HTMLInputElement>(null);
  const { isGuest, showLoginPopup } = useGuest();

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      // Scroll to form and focus input
      setTimeout(() => {
        if (courseInputRef.current) {
          courseInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          courseInputRef.current.focus();
        }
      }, 100);
      router.replace(pathname);
    }
  }, [searchParams, pathname, router]);

  const [allRequests, setAllRequests] = useState<PartnerRequest[]>([
    // Mock data for UI testing since we don't know if the table exists yet
    { id: "1", course: "Pemrograman Web", role: "Frontend Developer (React)", contact: "wa.me/628123456789", created_at: new Date().toISOString(), user_name: "Budi Santoso" },
    { id: "2", course: "Rekayasa Perangkat Lunak", role: "Sistem Analis / Designer", contact: "Line: @anisa_rpl", created_at: new Date().toISOString(), user_name: "Anisa" }
  ]);
  const [course, setCourse] = useState("");
  const [role, setRole] = useState("");
  const [contact, setContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchQuery = searchParams.get('q')?.toLowerCase() || "";
  const requests = allRequests.filter(r => {
    if (!searchQuery) return true;
    return (
      (r.course && r.course.toLowerCase().includes(searchQuery)) ||
      (r.role && r.role.toLowerCase().includes(searchQuery)) ||
      (r.user_name && r.user_name.toLowerCase().includes(searchQuery))
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!course || !role || !contact) return;
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const newRequest: PartnerRequest = {
        id: Math.random().toString(),
        course,
        role,
        contact,
        created_at: new Date().toISOString(),
        user_name: "Saya (User)"
      };
      setAllRequests([newRequest, ...allRequests]);
      setCourse("");
      setRole("");
      setContact("");
      setIsSubmitting(false);
    }, 800);
  };

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
              <p className="text-[var(--color-text-3)] text-xs leading-relaxed">Ini hanya tampilan contoh. Klik di mana saja untuk Login dan mencari partner tugas.</p>
            </div>
          </div>
        )}
        
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-white mb-2">Cari Partner Tugas</h1>
          <p className="text-[var(--color-text-2)] text-sm">Temukan teman kelompok yang tepat untuk mata kuliahmu.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_350px] gap-8">
          
          {/* List of Requests */}
          <div className="order-2 md:order-1 space-y-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-[var(--color-brand-red)]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              Sedang Mencari Partner
            </h2>
            
            {requests.map((req) => (
              <div key={req.id} className="bg-[#1c1c1e] p-5 rounded-2xl border border-[#2a2a30] shadow-sm hover:border-[var(--color-brand-red)] transition-colors relative overflow-hidden group">
                <div className={`transition-all duration-300 ${isGuest ? 'blur-md opacity-70 select-none' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-white font-bold text-[15px]">{req.course}</h3>
                    <p className="text-[#a1a1aa] text-xs mt-1">Oleh: {req.user_name}</p>
                  </div>
                  <span className="text-[10px] text-[#a1a1aa] whitespace-nowrap ml-2">
                    {new Date(req.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                
                <div className="bg-[#2a2a30] rounded-xl p-3 mb-4">
                  <p className="text-xs text-[#a1a1aa] mb-1">Mencari Role/Keahlian:</p>
                  <p className="text-sm font-semibold text-[var(--color-brand-red)]">{req.role}</p>
                </div>
                
                  <a 
                    href={isGuest ? "#" : (req.contact.startsWith('http') ? req.contact : `https://${req.contact}`)} 
                    target={isGuest ? undefined : "_blank"} 
                    rel="noreferrer" 
                    className="w-full inline-flex justify-center items-center gap-2 bg-[var(--color-surface)] hover:bg-[#2a2a30] text-white border border-[#2a2a30] rounded-xl py-2.5 font-medium text-sm transition"
                    onClick={(e) => {
                      if (isGuest) {
                        e.preventDefault();
                        showLoginPopup();
                      }
                    }}
                  >
                    Hubungi
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  </a>
                </div>
                {isGuest && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 cursor-pointer" onClick={() => showLoginPopup()}>
                    <div className="bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm text-sm font-bold text-white flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Login untuk melihat
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Form Create Request */}
          <div className="order-1 md:order-2">
            <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-[var(--color-brand-red)]/30 shadow-lg sticky top-24">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-white">
                Buat Permintaan
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-2)] mb-1.5 ml-1">Mata Kuliah</label>
                  <input
                    ref={courseInputRef}
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    onFocus={() => isGuest && showLoginPopup()}
                    placeholder="Contoh: Pemrograman Web"
                    className="w-full bg-[#121212] border border-[#2a2a30] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-brand-red)] transition"
                    required
                    readOnly={isGuest}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-2)] mb-1.5 ml-1">Role / Keahlian yang Dicari</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    onFocus={() => isGuest && showLoginPopup()}
                    placeholder="Contoh: Frontend Developer, Desainer UI/UX"
                    className="w-full bg-[#121212] border border-[#2a2a30] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-brand-red)] transition"
                    required
                    readOnly={isGuest}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-2)] mb-1.5 ml-1">Kontak (Link / WA / Line)</label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    onFocus={() => isGuest && showLoginPopup()}
                    placeholder="Contoh: wa.me/628123..."
                    className="w-full bg-[#121212] border border-[#2a2a30] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-brand-red)] transition"
                    required
                    readOnly={isGuest}
                  />
                </div>
                <button
                  type={isGuest ? "button" : "submit"}
                  onClick={() => isGuest && showLoginPopup()}
                  disabled={isSubmitting && !isGuest}
                  className="w-full bg-[var(--color-brand-red)] hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl py-3.5 mt-2 transition shadow-md flex justify-center items-center"
                >
                  {isSubmitting && !isGuest ? "Mengirim..." : "Posting Permintaan"}
                </button>
              </form>
            </div>
          </div>

        </div>
      </main>

      <BottomNav />
    </div>
  );
}

export default function CariPartnerPage() {
  return (
    <Suspense fallback={<div className="flex-1 w-full min-h-[50vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div></div>}>
      <CariPartnerContent />
    </Suspense>
  );
}
