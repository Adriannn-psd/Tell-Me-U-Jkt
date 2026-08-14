"use client";

import React, { useState } from 'react';
import RadarDetailModal from './RadarDetailModal';
import { useGuest } from "@/components/GuestProvider";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";

export type RadarPost = {
  id: number;
  source_id: string;
  title: string;
  summary: string;
  category: string;
  important_date: string | null;
  is_puzzle_feed: boolean;
  media_urls: string[];
  source_url: string;
  author_username: string;
  author_profile_pic?: string | null;
  original_created_at?: string | null;
  created_at: string;
};

interface RadarCardProps {
  post: RadarPost;
}

export default function RadarCard({ post }: RadarCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickEvent, setClickEvent] = useState<React.MouseEvent | undefined>(undefined);
  const { isGuest, showLoginPopup } = useGuest();
  // Parsing date for display
  const dateToUse = post.original_created_at || post.created_at;
  const dateObj = new Date(dateToUse);
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(dateObj);

  return (
    <>
    <div 
      onClick={(e) => {
        if (isGuest) {
          e.preventDefault();
          showLoginPopup();
          return;
        }
        setClickEvent(e);
        setIsModalOpen(true);
      }}
      className="bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition duration-300 flex flex-col h-full group cursor-pointer"
    >
      {/* Media Area */}
      {post.media_urls && post.media_urls.length > 0 ? (
        <div className="relative w-full pt-[75%] overflow-hidden bg-black/20 border-b border-[var(--color-border-color)]">
          {(() => {
            const isVid = post.media_urls[0].match(/\.(mp4|webm|ogg)$/i) || post.media_urls[0].includes('/video/upload/');
            return isVid ? (
               <video src={optimizeCloudinaryUrl(post.media_urls[0], { isVideo: true })} className={`absolute top-0 left-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isGuest ? 'blur-md' : ''}`} autoPlay loop muted playsInline />
            ) : (
               <img src={optimizeCloudinaryUrl(post.media_urls[0], { width: 600 })} alt={post.title} className={`absolute top-0 left-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isGuest ? 'blur-md' : ''}`} loading="lazy" />
            );
          })()}
          {post.media_urls.length > 1 && (
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3.5 h-3.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span className="text-white text-xs font-bold">{post.media_urls.length}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-32 bg-gradient-to-br from-[#151517] to-[#1c1c1e] border-b border-[var(--color-border-color)] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12 text-white/10 z-10">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>
      )}
      
      {/* Content Area */}
      <div className="p-6 flex-1 flex flex-col">
        {/* Header: Author & Date */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--color-brand-red)] to-red-500 flex items-center justify-center shrink-0 shadow-sm border border-red-400/20 overflow-hidden">
            {post.author_profile_pic ? (
              <img src={post.author_profile_pic} alt={post.author_username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white">
                {post.author_username ? post.author_username.charAt(0).toUpperCase() : "U"}
              </span>
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[14.5px] font-bold text-[var(--color-text-2)] hover:text-white transition cursor-pointer truncate">
              @{post.author_username || "unknown"}
            </span>
            <span className="text-xs text-[var(--color-text-3)] mt-0.5">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white mb-2.5 leading-snug line-clamp-2">
          {post.title}
        </h3>
        
        {/* Summary */}
        <p className="text-[var(--color-text-2)] text-sm mb-6 line-clamp-4 leading-relaxed flex-1 whitespace-pre-line">
          {post.summary}
        </p>

        {/* Badges & Actions */}
        <div className="mt-auto pt-5 border-t border-[var(--color-border-color)]">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold bg-[var(--color-brand-red)]/10 text-[var(--color-brand-red)] border border-[var(--color-brand-red)]/20 shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {post.category}
            </span>
            
            {post.important_date && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/20 shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {post.important_date}
              </span>
            )}
          </div>

            <a 
              href={isGuest ? "#" : post.source_url}
              target={isGuest ? undefined : "_blank"}
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#1c1c1e] hover:bg-[#2a2a30] transition rounded-xl text-sm font-bold text-white group-hover:bg-[var(--color-brand-red)] group-hover:shadow-[0_4px_14px_rgba(229,39,31,0.4)] transform group-hover:-translate-y-0.5"
              onClick={(e) => {
                e.stopPropagation();
                if (isGuest) {
                  e.preventDefault();
                  showLoginPopup();
                }
              }}
            >
              Lihat di Instagram
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      
      {isModalOpen && (
        <RadarDetailModal 
          post={post} 
          onClose={() => setIsModalOpen(false)} 
          clickEvent={clickEvent} 
        />
      )}
    </>
  );
}
