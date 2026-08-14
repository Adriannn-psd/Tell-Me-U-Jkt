"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import MasonryGrid, { Post } from "@/components/fase3/MasonryGrid";

import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (data.success && data.posts) {
    return data.posts.map((p: any) => ({
      id: p.id,
      title: p.title,
      author: p.author?.full_name || "Unknown",
      username: p.author?.username || p.user_id,
      avatar: p.author?.avatar_url || "U",
      prodi: p.author?.prodi || "Unknown",
      imageUrl: p.media_url,
      likes: p.likes?.[0]?.count || 0,
      comments: p.comments?.[0]?.count || 0,
      aspectRatio: p.aspect_ratio || "square",
      isTrending: false
    }));
  }
  return [];
};

import { useGuest } from "@/components/GuestProvider";
import LoginPanel from "@/components/LoginPanel";

export default function KaryaPage() {
  const { data: posts = [], isLoading: loading } = useSWR('/api/posts', fetcher, { keepPreviousData: true });
  const { isGuest, showLoginPopup } = useGuest();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <Sidebar />
      <Header />
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-5 md:px-8 py-6 pb-28 md:pb-10 md:pt-6 md:pl-[260px] relative">
        {isGuest && (
          <div 
            className="absolute inset-0 z-50 bg-black/40 flex flex-col items-center justify-center p-6 text-center cursor-pointer"
            onClickCapture={(e) => {
              e.preventDefault();
              e.stopPropagation();
              showLoginPopup();
            }}
          >
            <div className="bg-[#1c1c1e]/90 backdrop-blur-md border border-[#2a2a30] px-6 py-5 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300">
              <h3 className="text-lg font-bold text-white mb-1">Pratinjau Mode Tamu</h3>
              <p className="text-[var(--color-text-3)] text-xs leading-relaxed">Ini hanya tampilan contoh. Klik di mana saja untuk Login dan melihat karya yang sebenarnya.</p>
            </div>
          </div>
        )}
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight mb-2">Galeri <span className="text-[var(--color-brand-red)]">Karya</span></h1>
            <p className="text-[var(--color-text-2)] text-sm md:text-base max-w-md">Eksplorasi portofolio terbaik dari mahasiswa Tell Me U Jkt. Dapatkan inspirasi untuk tugasmu selanjutnya.</p>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold shrink-0">For You</button>
            <button className="bg-[var(--color-surface)] text-[var(--color-text-2)] hover:text-white border border-[var(--color-border-color)] px-4 py-2 rounded-full text-xs font-bold transition shrink-0">Following</button>
            <button className="bg-[var(--color-surface)] text-[var(--color-text-2)] hover:text-white border border-[var(--color-border-color)] px-4 py-2 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M11.64 5.23a.75.75 0 0 1 .72 0l7.5 4.14a.75.75 0 0 1 .36.63v8a.75.75 0 0 1-1.11.66L12 14.5l-7.11 4.16A.75.75 0 0 1 3.78 18v-8a.75.75 0 0 1 .36-.63l7.5-4.14Z"/>
              </svg>
              Trending
            </button>
          </div>
        </div>

        {/* Masonry Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : posts.length > 0 ? (
          <MasonryGrid posts={posts} />
        ) : (
          <div className="text-center text-[var(--color-text-2)] py-10 border-2 border-dashed border-[var(--color-border-color)] rounded-2xl">
            Belum ada karya yang diunggah.
          </div>
        )}

      </main>

      <BottomNav />
    </div>
  );
}

