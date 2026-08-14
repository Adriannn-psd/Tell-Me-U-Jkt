"use client";

import Link from "next/link";
import { EventData } from "./EventCard";
import { useGuest } from "@/components/GuestProvider";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";

export default function FeaturedEventCard({ event }: { event: EventData }) {
  const isGrid = Array.isArray(event.thumbnail) && event.thumbnail.length > 1;
  const { isGuest, showLoginPopup } = useGuest();

  const handleCardClick = (e: React.MouseEvent) => {
    if (isGuest) {
      e.preventDefault();
      showLoginPopup();
    }
  };

  return (
    <Link href={`/dokumentasi/${event.id}`} onClick={handleCardClick} className="bg-[#1c1c1e] border border-[#2a2a30] rounded-2xl overflow-hidden flex flex-col hover:border-[var(--color-brand-red)] transition group relative h-[320px] md:h-[400px]">
      {/* Background Thumbnail */}
      <div className="absolute inset-0 z-0">
        {isGrid ? (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
            {(event.thumbnail as string[]).map((url: string, i: number) => {
              const isVid = url.match(/\.(mp4|webm|ogg)$/i) || url.includes('/video/upload/');
              return (
              <div key={i} className={`w-full h-full relative ${(event.thumbnail as string[]).length === 2 && i === 0 ? "col-span-2 row-span-1" : ""} ${(event.thumbnail as string[]).length === 2 && i === 1 ? "col-span-2 row-span-1" : ""} ${(event.thumbnail as string[]).length === 3 && i === 0 ? "col-span-2 row-span-1" : ""}`}>
                {isVid ? (
                  <>
                    <img src={optimizeCloudinaryUrl(url.replace(/\.(mp4|webm|ogg)$/i, '.jpg'), { width: 1080 })} alt={`${event.title} ${i}`} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isGuest ? 'blur-md' : ''}`} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white pl-1 shadow-xl border border-white/20">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M5 3l14 9-14 9V3z"/></svg>
                      </div>
                    </div>
                  </>
                ) : (
                  <img src={optimizeCloudinaryUrl(url, { width: 1080 })} alt={`${event.title} ${i}`} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isGuest ? 'blur-md' : ''}`} />
                )}
              </div>
            )})}
          </div>
        ) : typeof event.thumbnail === 'string' && event.thumbnail ? (
          (() => {
            const isVid = event.thumbnail.match(/\.(mp4|webm|ogg)$/i) || event.thumbnail.includes('/video/upload/');
            return isVid ? (
              <>
                <img src={optimizeCloudinaryUrl(event.thumbnail.replace(/\.(mp4|webm|ogg)$/i, '.jpg'), { width: 1920 })} alt={event.title} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isGuest ? 'blur-md' : ''}`} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white pl-1 shadow-xl border border-white/20">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M5 3l14 9-14 9V3z"/></svg>
                  </div>
                </div>
              </>
            ) : (
              <img src={optimizeCloudinaryUrl(event.thumbnail, { width: 1920 })} alt={event.title} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isGuest ? 'blur-md' : ''}`} />
            );
          })()
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#2a2a30] text-[var(--color-text-3)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 mb-2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-sm font-semibold">Belum ada foto</span>
          </div>
        )}
        
        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/60 to-transparent z-10" />
      </div>

      {/* Top badges */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start">
        {event.category && (
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-[var(--color-brand-red)]">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Unggulan
          </div>
        )}
        
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg ml-auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M2 15h10" />
            <path d="m9 18 3-3-3-3" />
          </svg>
          {event.mediaCount}
        </div>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-20 flex flex-col justify-end">
        {event.category && (
           <div className="flex items-center gap-1.5 text-white/80 text-xs mb-2 bg-white/10 w-fit px-2 py-1 rounded backdrop-blur-md border border-white/5">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
               <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
               <line x1="16" y1="2" x2="16" y2="6" />
               <line x1="8" y1="2" x2="8" y2="6" />
               <line x1="3" y1="10" x2="21" y2="10" />
             </svg>
             {event.category}
           </div>
        )}
        
        <h3 className="text-white font-extrabold text-2xl md:text-3xl line-clamp-2 mb-2 group-hover:text-[var(--color-brand-red)] transition-colors shadow-sm">
          {event.title}
        </h3>
        
        <div className="flex items-center gap-1.5 text-white/70 text-xs mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{new Date(event.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
        
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-white/90">
              <svg viewBox="0 0 24 24" fill={event.totalLikes > 0 ? "var(--color-brand-red)" : "none"} stroke={event.totalLikes > 0 ? "var(--color-brand-red)" : "currentColor"} strokeWidth="2" className="w-4 h-4 transition-colors">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="text-sm font-semibold">{event.totalLikes}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/90">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-sm font-semibold">{event.totalComments}</span>
            </div>
          </div>
          
          <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white group-hover:bg-[var(--color-brand-red)] group-hover:border-[var(--color-brand-red)] group-hover:text-white transition-all duration-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
