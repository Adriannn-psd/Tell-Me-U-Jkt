"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

const portalLinks = [
  {
    id: 1,
    title: "Telkom University Jakarta",
    subtitle: "Website Resmi Telkom University Kampus Jakarta",
    url: "https://jakarta.telkomuniversity.ac.id/en/",
    bgColor: "from-[#8a1414] to-[#cc2121]",
    image: "https://jakarta.telkomuniversity.ac.id/wp-content/uploads/2023/11/TELU-JKT-LOGO-scaled.webp"
  },
  {
    id: 2,
    title: "Peta & Lokasi Kampus",
    subtitle: "Temukan alamat lengkap dan panduan lokasi kampus",
    url: "https://jakarta.telkomuniversity.ac.id/alamat-dan-peta-kampus/",
    bgColor: "from-[#1a1a1a] to-[#333333]",
    image: "https://jakarta.telkomuniversity.ac.id/wp-content/uploads/2023/11/TELU-JKT-LOGO-scaled.webp"
  },
  {
    id: 3,
    title: "Pendaftaran Mahasiswa Baru",
    subtitle: "Seleksi Mahasiswa Baru (SMB) Kampus Jakarta",
    url: "https://smb.telkomuniversity.ac.id/jakarta/",
    bgColor: "from-[#cc2121] to-[#ff3b30]",
    image: "https://smb.telkomuniversity.ac.id/wp-content/uploads/2024/10/Banner-Telkom-University-Jakarta.jpg"
  },
  {
    id: 4,
    title: "DTI Telkom University Jakarta",
    subtitle: "Direktorat Teknologi Informasi Kampus Jakarta",
    url: "https://dti-jkt.telkomuniversity.ac.id/",
    bgColor: "from-[#003366] to-[#0a5cbf]",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 5,
    title: "Instagram Resmi",
    subtitle: "@telkomuniversity_jkt",
    url: "https://www.instagram.com/telkomuniversity_jkt/",
    bgColor: "from-[#833ab4] via-[#fd1d1d] to-[#fcb045]",
    image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 6,
    title: "Tentang Kampus Jakarta",
    subtitle: "Informasi lengkap mengenai Telkom University Jakarta",
    url: "https://telkomuniversity.ac.id/en/telkom-university-kampus-jakarta/",
    bgColor: "from-[#2b2b2b] to-[#404040]",
    image: "https://telkomuniversity.ac.id/wp-content/uploads/2023/08/Telkom-University-Kampus-Jakarta-scaled.jpg"
  },
  {
    id: 7,
    title: "Telkom University (Pusat)",
    subtitle: "Creating the Future Leaders",
    url: "https://telkomuniversity.ac.id/en/",
    bgColor: "from-[#8a1414] to-[#cc2121]",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 8,
    title: "i-GRACIAS",
    subtitle: "Sistem Informasi Akademik Terpadu",
    url: "https://igracias.telkomuniversity.ac.id/",
    bgColor: "from-[#004d99] to-[#0073e6]",
    image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 9,
    title: "Tel-U Satu",
    subtitle: "Portal Resmi Layanan Telkom University",
    url: "https://satu.telkomuniversity.ac.id/",
    bgColor: "from-[#d32f2f] to-[#f44336]",
    image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 10,
    title: "CeLOE LMS",
    subtitle: "Center for e-Learning and Open Education",
    url: "https://lms.telkomuniversity.ac.id/",
    bgColor: "from-[#1565c0] to-[#1976d2]",
    image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 11,
    title: "Tel-U Open Library",
    subtitle: "Perpustakaan Digital Telkom University",
    url: "https://openlibrary.telkomuniversity.ac.id/",
    bgColor: "from-[#2e7d32] to-[#4caf50]",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 12,
    title: "IT Service Desk",
    subtitle: "Pusat Bantuan Layanan Teknologi Informasi",
    url: "https://servicedesk.telkomuniversity.ac.id/",
    bgColor: "from-[#455a64] to-[#607d8b]",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 13,
    title: "Kalender Akademik",
    subtitle: "Jadwal Pendidikan dan Kegiatan Akademik",
    url: "https://baa.telkomuniversity.ac.id/kalender-akademik-2-2/",
    bgColor: "from-[#e65100] to-[#ff9800]",
    image: "https://images.unsplash.com/photo-1506784951206-33b19b6ba758?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 14,
    title: "Student Affairs",
    subtitle: "Direktorat Kemahasiswaan Telkom University",
    url: "https://studentaffairs.telkomuniversity.ac.id/",
    bgColor: "from-[#6a1b9a] to-[#9c27b0]",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 15,
    title: "SEEDS Tel-U",
    subtitle: "Student Entrepreneurship & Education",
    url: "https://seeds.telkomuniversity.ac.id/",
    bgColor: "from-[#00695c] to-[#009688]",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=600&auto=format&fit=crop"
  }
];

export default function PortalKampusModal({ onClose }: { onClose: () => void }) {
  const [activeIndex, setActiveIndex] = useState(1); // start middle
  const [mounted, setMounted] = useState(false);
  
  // Animation states
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const [isStacked, setIsStacked] = useState(true);
  const [origin, setOrigin] = useState({ x: "50%", y: "50%" });

  // Drag states
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const isDraggingRef = useRef(false);
  const dragDistRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    const btn = document.getElementById("portal-btn");
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      setOrigin({ x: `${x}px`, y: `${y}px` });
    }

    const timer1 = setTimeout(() => {
      setIsOpening(false);
    }, 10);

    const timer2 = setTimeout(() => {
      setIsStacked(false);
    }, 300); // Wait longer so it shows up stacked for a moment
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (!mounted) return null;

  const handleClose = () => {
    setIsStacked(true);
    setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
      }, 400); 
    }, 300); // Wait for stack animation to finish before shrinking
  };

  const handlePointerDown = (e: React.TouchEvent | React.MouseEvent) => {
    if (isStacked) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setTouchStartX(clientX);
    isDraggingRef.current = false;
    dragDistRef.current = 0;
  };

  const handlePointerMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartX === null || isStacked) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = clientX - touchStartX;
    setDragOffset(diff);
    if (Math.abs(diff) > 5) {
      isDraggingRef.current = true;
      dragDistRef.current = diff;
    }
  };

  const handlePointerUp = () => {
    if (touchStartX === null) return;
    if (dragOffset < -70) {
      setActiveIndex((prev) => Math.min(prev + 1, portalLinks.length - 1));
    } else if (dragOffset > 70) {
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
    setTouchStartX(null);
    setDragOffset(0);
    // isDraggingRef is reset on next down
  };

  const SWIPE_WIDTH = 250; 
  const continuousIndex = activeIndex - (dragOffset / SWIPE_WIDTH);
  const isDragging = touchStartX !== null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4" 
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-[#0a0a0c]/95 transition-opacity duration-500 ease-out ${isOpening || isClosing ? 'opacity-0' : 'opacity-100'}`} 
        style={{ willChange: 'opacity' }}
        onClick={() => {
          if (!isStacked && !isDraggingRef.current) handleClose();
        }}
      />
      
      {/* Modal Container */}
      <div 
        className={`relative w-full max-w-4xl h-full flex flex-col items-center justify-center transition-all duration-500 ease-out ${isOpening || isClosing ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}
        style={{ transformOrigin: `${origin.x} ${origin.y}`, willChange: 'transform, opacity' }}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isStacked && !isDraggingRef.current) handleClose();
        }}
      >
        {/* Close Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); if (!isStacked && !isDraggingRef.current) handleClose(); }}
          className="absolute top-6 right-6 md:top-10 md:right-10 z-[110] p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors shadow-xl border border-white/20"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div 
          className="relative w-full h-[280px] md:h-[500px] flex items-center justify-center perspective-[1200px] mb-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isStacked && !isDraggingRef.current) handleClose();
          }}
        >
          {portalLinks.map((item, index) => {
            const offset = index - continuousIndex;
            const absOffset = Math.abs(offset);
            const sign = Math.sign(offset);
            
            // Dynamic spread: wider when dragging, tighter when at rest
            const spreadX = isDragging ? 190 : 140;
            const rawTranslateX = offset * spreadX; 
            
            // Dynamic Z depth and bump: curve grows while dragging
            const baseZ = isDragging ? 250 : 120;
            // Only apply the big curve bump when actually dragging!
            const transitionBump = isDragging ? Math.sin(Math.min(absOffset, 1) * Math.PI) * 250 : 0;
            const rawTranslateZ = -(absOffset * baseZ) - transitionBump;
            
            // Dynamic rotation: twists more while dragging
            const maxRotate = isDragging ? 60 : 45;
            const rawRotateY = -sign * Math.min(absOffset * maxRotate, maxRotate);
            
            // Apply stack factor (0 when stacked, 1 when spread)
            const stackFactor = isStacked ? 0 : 1;
            const translateX = rawTranslateX * stackFactor;
            
            // Curve downward (U-shape / oval)
            const translateY = isStacked ? 0 : Math.pow(absOffset, 1.5) * 35;

            const rotateY = rawRotateY * stackFactor;
            
            // When stacked, offset Z slightly by index so they don't clip z-fighting
            const translateZ = isStacked ? -(absOffset * 5) : rawTranslateZ;
            
            // When stacked, make opacity uniform. When spread, fade side cards.
            const opacity = isStacked ? 1 - (absOffset * 0.02) : Math.max(0, 1 - (absOffset * 0.4));
            const scale = Math.max(0.65, 1 - (absOffset * 0.25));
            const zIndex = 30 - Math.round(absOffset * 10);

            // Determine transition class based on state
            let transitionClass = "";
            if (isStacked) {
              transitionClass = "transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]";
            } else if (!isDragging) {
              transitionClass = "transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]";
            } else {
              transitionClass = "transition-transform duration-150 ease-out"; // fast follow while dragging
            }

            return (
              <div 
                key={item.id}
                onClick={() => {
                  if (Math.abs(dragOffset) < 10 && !isStacked) { 
                    setActiveIndex(index);
                  }
                }}
                className={`absolute w-[180px] md:w-[320px] h-[260px] md:h-[460px] rounded-3xl overflow-hidden cursor-pointer flex flex-col justify-between ${transitionClass}`}
                style={{
                  transform: `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  willChange: 'transform, opacity',
                  boxShadow: isStacked ? 'none' : '0 10px 30px rgba(0,0,0,0.5)'
                }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.bgColor} opacity-90 z-0`} />
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-40 z-0"
                  style={{ backgroundImage: `url('${item.image}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-0" />

                <div className="relative z-10 p-6 flex flex-col h-full justify-between select-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image src="/logo.png" alt="Telkom Logo" width={24} height={24} className="w-6 h-6 object-contain" />
                      <span className="text-white font-bold tracking-wider text-sm">Telkom University</span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-2">
                      {item.title}
                    </h2>
                    <p className="text-[#ebebf5]/80 text-sm mb-6 leading-relaxed">
                      {item.subtitle}
                    </p>
                    
                    {index === activeIndex && (
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-[var(--color-brand-red)] hover:bg-red-600 text-white font-bold text-sm px-6 py-2.5 rounded-full transition transform hover:scale-105"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Kunjungi
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {/* Fade effect at the bottom */}
          <div className="absolute -bottom-16 left-0 right-0 h-40 bg-gradient-to-t from-[#0a0a0a] to-transparent z-[50] pointer-events-none" />
        </div>

        <div className="flex flex-col items-center gap-6 mt-4 z-50">
          {/* Carousel controls mobile */}
          <div className="flex justify-center gap-2">
            {portalLinks.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full transition-all ${idx === activeIndex ? "bg-[var(--color-brand-red)] w-6" : "bg-white/40"}`}
              />
            ))}
          </div>

          <Link href="/portal" className="bg-white hover:bg-gray-100 text-black font-bold px-6 py-2.5 rounded-full transition shadow-lg text-sm flex items-center gap-2">
            Lihat Selengkapnya
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </div>

      </div>
    </div>
  );
}
