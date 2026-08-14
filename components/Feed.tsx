"use client";

import { useState, useEffect, useRef } from "react";
import MasonryGrid, { Post } from "./fase3/MasonryGrid";
import { useScrollState } from "./ScrollContext";
import useSWR from "swr";
import { useGuest } from "@/components/GuestProvider";
import { useSearchParams } from "next/navigation";

const feedFetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (data.success && data.posts) {
    return data.posts.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      author: p.author?.full_name || "Unknown",
      username: p.author?.username || p.user_id,
      avatar: p.author?.avatar_url || "U",
      prodi: p.author?.prodi || "Unknown",
      imageUrl: p.media_url,
      likes: p.likes ? p.likes.length : 0,
      comments: p.comments ? p.comments.length : 0,
      aspectRatio: p.aspect_ratio || "square",
      isTrending: false,
      isLiked: p.isLiked || false,
    }));
  }
  return [];
};

export default function Feed() {
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const { isGuest, showLoginPopup } = useGuest();
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get('q')?.toLowerCase() || "";
  
  const { data: allPosts = [], isLoading: loading } = useSWR('/api/posts', feedFetcher, { keepPreviousData: true });
  
  const posts = allPosts.filter((p: any) => {
    if (!searchQuery) return true;
    return (
      (p.title && p.title.toLowerCase().includes(searchQuery)) ||
      (p.description && p.description.toLowerCase().includes(searchQuery)) ||
      (p.author && p.author.toLowerCase().includes(searchQuery)) ||
      (p.username && p.username.toLowerCase().includes(searchQuery))
    );
  });
  
  // Optional chaining check, because Feed might be rendered outside ScrollProvider in some tests/other pages
  const scrollContext = useScrollState();
  const setIsScrolledPastHero = scrollContext?.setIsScrolledPastHero;

  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headerRef.current || !setIsScrolledPastHero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Jika header feed sudah tidak terlihat (melewati batas atas layar), nilainya false, jadi isScrolledPastHero = true
        // Kita menggunakan rootMargin negatif untuk trigger saat menyentuh navbar (asumsi navbar 80px)
        setIsScrolledPastHero(!entry.isIntersecting);
      },
      {
        rootMargin: "-80px 0px 0px 0px",
        threshold: 0,
      }
    );

    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [setIsScrolledPastHero]);

  const displayedPosts = activeTab === 'foryou' ? posts : [];

  return (
    <div className="px-5 md:px-0 pt-[22px] md:pt-10 pb-5 md:pb-12">
      <div ref={headerRef} className="flex items-center justify-between mb-6 md:mb-8">
        <h2 className="text-white text-[18px] md:text-2xl font-extrabold tracking-tight">Feed Karya</h2>
        <div className="flex gap-2">
           <button 
             onClick={() => setActiveTab('foryou')}
             className={`px-4 py-1.5 md:py-2 md:px-5 rounded-full text-xs md:text-sm font-bold transition ${activeTab === 'foryou' ? 'bg-[var(--color-surface)] text-white border border-[var(--color-border-color)]' : 'bg-transparent text-[var(--color-text-2)] hover:text-white'}`}
           >For You</button>
           <button 
             onClick={() => {
               if (isGuest) {
                 showLoginPopup();
               } else {
                 setActiveTab('following');
               }
             }}
             className={`px-4 py-1.5 md:py-2 md:px-5 rounded-full text-xs md:text-sm font-bold transition ${activeTab === 'following' ? 'bg-[var(--color-surface)] text-white border border-[var(--color-border-color)]' : 'bg-transparent text-[var(--color-text-2)] hover:text-white'}`}
           >Following</button>
        </div>
      </div>
      
      {isGuest ? (
        <div 
          onClick={(e) => {
            e.preventDefault();
            showLoginPopup();
          }}
          className="relative overflow-hidden flex flex-col items-center justify-center py-16 px-4 text-center cursor-pointer group"
        >
          {/* Subtle background decoration */}
          <div className="absolute inset-0 overflow-hidden opacity-[0.03] pointer-events-none flex flex-wrap gap-4 p-4 justify-center items-center">
            {[1,2,3,4,5,6].map(i => (
               <div key={i} className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-xl" style={{ transform: `rotate(${Math.random() * 20 - 10}deg)` }}></div>
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand-red)]/10 flex items-center justify-center text-[var(--color-brand-red)] mb-4 group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Feed Karya Terkunci</h3>
            <p className="text-[var(--color-text-3)] text-sm max-w-xs mb-5">
              Login untuk melihat portofolio dan karya inspiratif dari mahasiswa Tell Me U Jkt.
            </p>
            <button className="bg-[var(--color-brand-red)] text-white px-6 py-2.5 rounded-full font-bold text-xs hover:bg-red-600 transition shadow-[0_4px_14px_rgba(229,39,31,0.4)]">
              Buka Kunci
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : displayedPosts.length > 0 ? (
        <MasonryGrid posts={displayedPosts} />
      ) : (
        <div className="text-center text-[var(--color-text-2)] py-10 border-2 border-dashed border-[var(--color-border-color)] rounded-2xl">
          {activeTab === 'following' ? 'Belum ada karya dari orang yang kamu ikuti.' : 'Belum ada karya yang diunggah.'}
        </div>
      )}
      
    </div>
  );
}

