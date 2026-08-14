"use client";

import Link from "next/link";
import { useState } from "react";
import PostDetailModal from "./PostDetailModal";
import { useGuest } from "@/components/GuestProvider";

import { optimizeCloudinaryUrl } from "@/lib/cloudinary";

// Dummy data structure for a Post/Karya
export interface Post {
  id: string;
  title: string;
  author: string;
  username: string;
  avatar: string;
  prodi: string;
  imageUrl: string;
  likes: number;
  comments: number;
  isTrending?: boolean;
  isLiked?: boolean;
  aspectRatio: "square" | "portrait" | "landscape" | "tall";
}

export default function MasonryGrid({ posts }: { posts: Post[] }) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const { isGuest, showLoginPopup } = useGuest();

  // Mapping aspect ratios to Tailwind height classes for the dummy images
  const getAspectRatioClass = (ratio: Post["aspectRatio"]) => {
    switch (ratio) {
      case "square": return "aspect-square";
      case "portrait": return "aspect-[3/4]";
      case "landscape": return "aspect-[4/3]";
      case "tall": return "aspect-[9/16]";
      default: return "aspect-square";
    }
  };

  const cols2 = [[], []] as Post[][];
  const cols3 = [[], [], []] as Post[][];

  posts.forEach((post, i) => {
    cols2[i % 2].push(post);
    cols3[i % 3].push(post);
  });

  const renderCard = (post: Post) => {
    const isVideo = post.imageUrl?.match(/\.(mp4|webm|ogg)$/i) || post.imageUrl?.includes('/video/upload/');
    
    return (
    <div key={post.id} className="relative group w-full">
      {/* Post Image Container */}
      <div 
        onClick={() => isGuest ? showLoginPopup() : setSelectedPost(post)}
        className={`w-full ${post.imageUrl ? "" : getAspectRatioClass(post.aspectRatio)} bg-[var(--color-surface)] rounded-2xl overflow-hidden relative border border-[var(--color-border-color)] group-hover:border-[var(--color-text-3)] transition-all cursor-pointer`}
      >
        {(post.imageUrl && !isGuest) ? (
          isVideo ? (
            <>
              <img 
                src={optimizeCloudinaryUrl(post.imageUrl.replace(/\.(mp4|webm|ogg)$/i, '.jpg'), { width: 800 })}
                alt={post.title}
                className={`w-full h-auto object-cover md:transition-transform md:duration-500 md:group-hover:scale-105 block`}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white pl-1 shadow-xl border border-white/20">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M5 3l14 9-14 9V3z"/></svg>
                </div>
              </div>
            </>
          ) : (
            <img 
              src={optimizeCloudinaryUrl(post.imageUrl, { width: 800 })}
              alt={post.title}
              className={`w-full h-auto object-cover md:transition-transform md:duration-500 md:group-hover:scale-105 block`}
            />
          )
        ) : (
          <>
            {/* Dummy Image (Using colored rectangles for mockup) */}
            <div 
              className="absolute inset-0 opacity-40 md:transition-transform md:duration-500 md:group-hover:scale-105"
              style={{ 
                background: `linear-gradient(45deg, ${post.id.includes('1') ? '#3b82f6, #8b5cf6' : post.id.includes('2') ? '#ef4444, #f97316' : '#10b981, #3b82f6'})` 
              }}
            />
            
            {/* Placeholder Content Pattern */}
            <div className="absolute inset-0 flex flex-col items-center justify-center mix-blend-overlay opacity-50 text-white font-bold text-sm text-center px-4">
              {isGuest ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 mb-2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span>Login untuk melihat karya</span>
                </>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-1/4 h-1/4">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              )}
            </div>
          </>
        )}
        
        {/* Overlay on hover (Desktop) */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
          <div className="flex justify-end">
            <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </button>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm line-clamp-1">{post.title}</h3>
          </div>
        </div>

        {/* Trending Badge */}
        {post.isTrending && (
          <div className="absolute top-3 left-3 bg-[var(--color-brand-red)] text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M11.64 5.23a.75.75 0 0 1 .72 0l7.5 4.14a.75.75 0 0 1 .36.63v8a.75.75 0 0 1-1.11.66L12 14.5l-7.11 4.16A.75.75 0 0 1 3.78 18v-8a.75.75 0 0 1 .36-.63l7.5-4.14Z"/>
            </svg>
            TRENDING
          </div>
        )}
      </div>

      {/* Post Metadata (Below Image) */}
      <div className="mt-2 flex items-center justify-between px-1">
        <div 
          onClick={() => isGuest ? showLoginPopup() : undefined}
          className="flex items-center gap-2 group/author cursor-pointer"
        >
          {isGuest ? (
            <Link href="#" onClick={(e) => { e.preventDefault(); showLoginPopup(); }}>
              <div className="w-6 h-6 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-white text-[10px] font-bold border border-[var(--color-border-color)]">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7z"/></svg>
              </div>
            </Link>
          ) : (
            <Link href={`/profile/${post.username}`} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-white text-[10px] font-bold border border-[var(--color-border-color)]">
                {post.author.charAt(0)}
              </div>
            </Link>
          )}
          {isGuest ? (
             <span className="text-white text-xs font-semibold group-hover/author:underline opacity-50 blur-[2px]">Secret User</span>
          ) : (
             <Link href={`/profile/${post.username}`}>
               <span className="text-white text-xs font-semibold group-hover/author:underline">{post.author}</span>
             </Link>
          )}
        </div>
        
        <div className="flex items-center gap-2.5 text-[var(--color-text-3)]">
          <div className="flex items-center gap-1" onClick={() => isGuest && showLoginPopup()}>
            {post.isLiked && !isGuest ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[var(--color-brand-red)] hover:text-white transition cursor-pointer">
                <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 hover:text-[var(--color-brand-red)] transition cursor-pointer">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            )}
            <span className="text-xs font-bold">{post.likes}</span>
          </div>
          <div className="flex items-center gap-1" onClick={() => isGuest && showLoginPopup()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 hover:text-white transition cursor-pointer">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="text-xs font-bold">{post.comments}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <>
      {/* 2 Columns Layout (Mobile & Tablet) */}
      <div className="flex lg:hidden gap-2 md:gap-7 w-full items-start">
        {cols2.map((col, idx) => (
          <div key={idx} className="flex flex-col gap-2 md:gap-7 w-1/2">
            {col.map(post => renderCard(post))}
          </div>
        ))}
      </div>

      {/* 3 Columns Layout (Desktop) */}
      <div className="hidden lg:flex gap-5 md:gap-7 w-full items-start">
        {cols3.map((col, idx) => (
          <div key={idx} className="flex flex-col gap-5 md:gap-7 w-1/3">
            {col.map(post => renderCard(post))}
          </div>
        ))}
      </div>

      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </>
  );
}
