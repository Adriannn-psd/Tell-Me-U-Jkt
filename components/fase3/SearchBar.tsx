"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<{ users: any[], posts: any[] }>({ users: [], posts: [] });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
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
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
      router.push(`${currentPath}?q=${encodeURIComponent(query.trim())}`);
      setIsFocused(false);
    }
  };

  return (
    <div className="relative w-full mb-8 z-20">
      <form onSubmit={handleSearchSubmit} className={`flex items-center bg-[var(--color-surface)] border ${isFocused ? 'border-[var(--color-brand-red)] shadow-[0_0_15px_rgba(229,39,31,0.2)]' : 'border-[var(--color-border-color)]'} rounded-2xl px-4 py-3.5 transition-all duration-300`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 mr-3 transition-colors ${isFocused ? 'text-[var(--color-brand-red)]' : 'text-[var(--color-text-3)]'}`}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Cari mahasiswa, karya, atau tag..."
          className="bg-transparent border-none outline-none text-white w-full text-sm font-medium placeholder:text-[var(--color-text-3)]"
        />
        {query && (
          <button 
            type="button"
            onClick={() => setQuery("")}
            className="w-6 h-6 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-text-2)] hover:text-white transition ml-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        )}
      </form>

      {/* Dropdown Suggestions */}
      {isFocused && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
                      router.push(`/explore?q=${encodeURIComponent(post.title)}`);
                      setIsFocused(false);
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-[var(--color-surface-2)] rounded-lg text-left transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-text-2)]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{post.title}</p>
                      <p className="text-[var(--color-text-3)] text-xs truncate max-w-[200px]">{post.description || 'Karya'}</p>
                    </div>
                  </button>
                ))}
                
                {results.users.map((u: any) => (
                  <button 
                    key={u.id}
                    onClick={() => {
                      router.push(`/profile/${u.username}`);
                      setIsFocused(false);
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-[var(--color-surface-2)] rounded-lg text-left transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-text-2)] overflow-hidden shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{u.full_name} <span className="text-[var(--color-text-3)] font-normal">@{u.username}</span></p>
                      <p className="text-[var(--color-text-3)] text-xs">{u.prodi || "Mahasiswa"}</p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
