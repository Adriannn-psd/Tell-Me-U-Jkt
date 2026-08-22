"use client";

import { useState, useEffect, useRef } from "react";
import { RadarPost } from "./RadarCard";

interface RadarDetailModalProps {
  post: RadarPost;
  onClose: () => void;
  clickEvent?: React.MouseEvent;
}

export default function RadarDetailModal({ post, onClose, clickEvent }: RadarDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Animation states
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const [origin, setOrigin] = useState({ x: "50%", y: "50%" });

  // Drag states for gallery
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    
    // Set origin based on where the user clicked
    if (clickEvent) {
      setOrigin({ x: `${clickEvent.clientX}px`, y: `${clickEvent.clientY}px` });
    }

    const timer1 = setTimeout(() => {
      setIsOpening(false);
    }, 50);
    
    return () => clearTimeout(timer1);
  }, [clickEvent]);

  if (!mounted) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 500); 
  };

  const handlePointerDown = (e: React.TouchEvent | React.MouseEvent) => {
    if (!post.media_urls || post.media_urls.length <= 1) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setTouchStartX(clientX);
    isDraggingRef.current = false;
  };

  const handlePointerMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartX === null || !post.media_urls || post.media_urls.length <= 1) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = clientX - touchStartX;
    setDragOffset(diff);
    if (Math.abs(diff) > 5) {
      isDraggingRef.current = true;
    }
  };

  const handlePointerUp = () => {
    if (touchStartX === null) return;
    if (dragOffset < -70) {
      setActiveIndex((prev) => Math.min(prev + 1, (post.media_urls?.length || 1) - 1));
    } else if (dragOffset > 70) {
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
    setTouchStartX(null);
    setDragOffset(0);
  };

  const SWIPE_WIDTH = 250; 
  const continuousIndex = activeIndex - (dragOffset / SWIPE_WIDTH);
  const isDragging = touchStartX !== null;

  // Formatting date
  const dateToUse = post.original_created_at || post.created_at;
  const dateObj = new Date(dateToUse);
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isOpening || isClosing ? 'opacity-0' : 'opacity-100'}`} 
        onClick={() => {
          if (!isDraggingRef.current) handleClose();
        }}
      />
      
      {/* Modal Container */}
      <div 
        className={`relative w-full max-w-5xl h-[85vh] md:h-[90vh] flex flex-col md:flex-row bg-[#151517] rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] border border-[#2a2a30] ${isOpening || isClosing ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}
        style={{ transformOrigin: `${origin.x} ${origin.y}` }}
      >
        
        {/* Left/Top Area: Media Gallery */}
        {/* `tmuj-dark-tile`: panel ini `bg-black` dan tetap hitam di mode terang
            (foto paling enak dilihat di atas hitam), jadi titik carousel dan
            kontrol di atasnya harus tetap putih. Lihat bagian 12
            app/theme-light.css. */}
        <div
          className="tmuj-dark-tile relative w-full md:w-[55%] h-[40%] md:h-full bg-black flex items-center justify-center overflow-hidden perspective-[1200px]"
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
        >
          {(!post.media_urls || post.media_urls.length === 0) ? (
             <div className="text-[var(--color-text-3)] text-sm font-semibold flex flex-col items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                Tidak ada media
             </div>
          ) : (
            <>
              {post.media_urls.map((url, index) => {
                const offset = index - continuousIndex;
                const absOffset = Math.abs(offset);
                const sign = Math.sign(offset);
                
                // 3D Carousel Math
                const spreadX = isDragging ? 180 : 120;
                const translateX = offset * spreadX; 
                
                const baseZ = isDragging ? 250 : 150;
                const transitionBump = isDragging ? Math.sin(Math.min(absOffset, 1) * Math.PI) * 200 : 0;
                const translateZ = -(absOffset * baseZ) - transitionBump;
                
                const maxRotate = isDragging ? 40 : 25;
                const rotateY = -sign * Math.min(absOffset * maxRotate, maxRotate);
                
                const opacity = Math.max(0, 1 - (absOffset * 0.5));
                const scale = Math.max(0.7, 1 - (absOffset * 0.2));
                const zIndex = 30 - Math.round(absOffset * 10);

                let transitionClass = "";
                if (!isDragging) {
                  transitionClass = "transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]";
                } else {
                  transitionClass = "transition-transform duration-150 ease-out"; 
                }

                return (
                  <div 
                    key={index}
                    className={`absolute w-[80%] h-[90%] md:h-[80%] rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center bg-[#0a0a0b] border border-[#1c1c1e] ${transitionClass}`}
                    style={{
                      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                      opacity,
                      zIndex,
                    }}
                  >
                    {url.endsWith('.mp4') ? (
                      <video src={url} controls className="w-full h-full object-contain" />
                    ) : (
                      <img src={url} alt={`Media ${index + 1}`} className="w-full h-full object-contain select-none" draggable={false} />
                    )}
                  </div>
                );
              })}
              
              {/* Pagination Dots */}
              {post.media_urls.length > 1 && (
                <div className="absolute bottom-4 left-0 w-full flex justify-center gap-1.5 z-40">
                  {post.media_urls.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeIndex ? "bg-[var(--color-brand-red)] w-6" : "bg-white/40 w-1.5"}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right/Bottom Area: Details */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar relative">
           <button 
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#2a2a30] text-white hover:bg-[var(--color-brand-red)] transition z-10"
           >
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
           </button>

           {/* Author Section */}
           <div className="flex items-center gap-3 mb-6 pr-8">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--color-brand-red)] to-red-500 flex items-center justify-center shrink-0 overflow-hidden border border-red-400/20">
                {post.author_profile_pic ? (
                  <img src={post.author_profile_pic} alt={post.author_username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[14px] font-bold text-white">
                    {post.author_username ? post.author_username.charAt(0).toUpperCase() : "U"}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold text-white">@{post.author_username || "unknown"}</span>
                <span className="text-xs font-semibold text-[var(--color-text-3)]">{formattedDate}</span>
              </div>
           </div>

           {/* Title */}
           <h2 className="text-2xl font-bold text-white mb-4 leading-tight">
             {post.title}
           </h2>

           {/* Badges */}
           <div className="flex flex-wrap gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold bg-[var(--color-brand-red)]/10 text-[var(--color-brand-red)] border border-[var(--color-brand-red)]/20 shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {post.category}
              </span>
              
              {post.important_date && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/20 shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {post.important_date}
                </span>
              )}
            </div>

            {/* Content Summary */}
            <div className="text-[var(--color-text-2)] text-[15px] leading-relaxed mb-8 flex-1">
              {post.summary.split('\n').map((line, idx) => (
                <p key={idx} className="mb-2">{line}</p>
              ))}
            </div>

            {/* Action Button */}
            <a 
              href={post.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-auto w-full py-3.5 bg-[var(--color-brand-red)] hover:bg-red-600 transition rounded-xl text-[15px] font-bold text-white shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transform hover:scale-[1.02]"
            >
              Buka di Instagram Asli
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
        </div>
      </div>
    </div>
  );
}
