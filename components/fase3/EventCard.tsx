"use client";

import Link from "next/link";
import { useGuest } from "@/components/GuestProvider";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";

export interface EventData {
  id: string;
  title: string;
  description: string;
  className: string;
  category?: string;
  thumbnail: string | string[] | null;
  mediaCount: number;
  totalLikes: number;
  totalComments: number;
  createdAt: string;
}

export default function EventCard({ event }: { event: EventData }) {
  const isGrid = Array.isArray(event.thumbnail) && event.thumbnail.length > 1;
  const { isGuest, showLoginPopup } = useGuest();

  const handleCardClick = (e: React.MouseEvent) => {
    if (isGuest) {
      e.preventDefault();
      showLoginPopup();
    }
  };

  return (
    <Link href={`/dokumentasi/${event.id}`} onClick={handleCardClick} className="bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl overflow-hidden flex flex-col hover:border-[var(--color-text-3)] transition group">
      {/* Thumbnail */}
      <div className="w-full aspect-[4/3] bg-[var(--color-surface-2)] relative overflow-hidden">
        {isGrid ? (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
            {(event.thumbnail as string[]).map((url: string, i: number) => {
              const isVid = url.match(/\.(mp4|webm|ogg)$/i) || url.includes('/video/upload/');
              return (
              <div key={i} className={`w-full h-full relative ${(event.thumbnail as string[]).length === 2 && i === 0 ? "col-span-2 row-span-1" : ""} ${(event.thumbnail as string[]).length === 2 && i === 1 ? "col-span-2 row-span-1" : ""} ${(event.thumbnail as string[]).length === 3 && i === 0 ? "col-span-2 row-span-1" : ""}`}>
                {isVid ? (
                  <video src={optimizeCloudinaryUrl(url, { isVideo: true })} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isGuest ? 'blur-md' : ''}`} autoPlay loop muted playsInline />
                ) : (
                  <img src={optimizeCloudinaryUrl(url, { width: 600 })} alt={`${event.title} ${i}`} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isGuest ? 'blur-md' : ''}`} />
                )}
              </div>
            )})}
          </div>
        ) : typeof event.thumbnail === 'string' && event.thumbnail ? (
          (() => {
            const isVid = event.thumbnail.match(/\.(mp4|webm|ogg)$/i) || event.thumbnail.includes('/video/upload/');
            return isVid ? (
               <video src={optimizeCloudinaryUrl(event.thumbnail, { isVideo: true })} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isGuest ? 'blur-md' : ''}`} autoPlay loop muted playsInline />
            ) : (
               <img src={optimizeCloudinaryUrl(event.thumbnail, { width: 800 })} alt={event.title} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isGuest ? 'blur-md' : ''}`} />
            );
          })()
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[var(--color-text-3)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mb-2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-xs font-semibold">Belum ada foto</span>
          </div>
        )}
        
        {/* Media count badge */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-white text-[10px] font-bold flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
            <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M2 15h10" />
            <path d="m9 18 3-3-3-3" />
          </svg>
          {event.mediaCount}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-white font-bold text-sm md:text-base line-clamp-1 mb-1 group-hover:text-[var(--color-brand-red)] transition-colors">
          {event.title}
        </h3>
        {event.className && (
          <p className="text-[var(--color-text-3)] text-xs mb-2">{event.className}</p>
        )}
        
        <div className="mt-auto flex items-center gap-4 pt-3 border-t border-[var(--color-border-color)]">
          <div className="flex items-center gap-1.5 text-[var(--color-text-2)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-xs font-semibold">{event.totalLikes}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--color-text-2)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-xs font-semibold">{event.totalComments}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
