"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGuest } from "../GuestProvider";

export default function FollowNetworkModal({
  username,
  type,
  onClose
}: {
  username: string;
  type: 'followers' | 'following';
  onClose: () => void;
}) {
  const { isGuest, showLoginPopup } = useGuest();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        const res = await fetch(`/api/profile/${encodeURIComponent(username)}/network?type=${type}`);
        const data = await res.json();
        
        if (data.success) {
          setUsers(data.users);
        } else {
          setError(data.error || "Gagal memuat daftar");
        }
      } catch (err) {
        setError("Terjadi kesalahan.");
      } finally {
        setLoading(false);
      }
    };
    fetchNetwork();
  }, [username, type]);

  const handleFollowAction = async (targetUserId: string, currentStatus: string) => {
    if (isGuest) return showLoginPopup();
    if (currentStatus === 'self') return;
    
    const action = currentStatus === 'accepted' ? 'unfollow' 
                 : currentStatus === 'pending' ? 'cancel' 
                 : 'follow';

    // Optimistic update
    setUsers(prev => prev.map(u => {
      if (u.id === targetUserId) {
        return {
          ...u,
          my_follow_status: action === 'unfollow' || action === 'cancel' ? 'none' 
                          : action === 'follow' ? 'pending' : u.my_follow_status
        };
      }
      return u;
    }));

    try {
      const res = await fetch(`/api/profile/${targetUserId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      
      if (data.success) {
        setUsers(prev => prev.map(u => {
          if (u.id === targetUserId) {
            return { ...u, my_follow_status: data.status };
          }
          return u;
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[var(--color-bg)] rounded-3xl border border-[var(--color-border-color)] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-[var(--color-border-color)] flex items-center justify-between sticky top-0 bg-[var(--color-bg)] z-10">
          <h2 className="text-white font-bold text-lg">{type === 'followers' ? 'Pengikut' : 'Mengikuti'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-text-2)] hover:text-white hover:bg-[var(--color-surface)] transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[var(--color-surface)] rounded w-1/2" />
                    <div className="h-3 bg-[var(--color-surface)] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-[var(--color-brand-red)] font-bold text-sm">{error}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[var(--color-text-3)] text-sm">Tidak ada pengguna.</p>
            </div>
          ) : (
            users.map(u => (
              <div key={u.id} className="flex items-center justify-between group">
                <Link href={`/profile/${u.username}`} onClick={onClose} className="flex items-center gap-3 flex-1 overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] shrink-0 flex items-center justify-center overflow-hidden border border-[var(--color-border-color)]">
                    {u.avatar_url && u.avatar_url.length > 2 ? (
                      <img src={u.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-bold">{u.full_name?.charAt(0) || u.username?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden pr-2">
                    <span className="text-white font-bold text-sm truncate group-hover:underline">{u.username}</span>
                    <span className="text-[var(--color-text-3)] text-xs truncate">{u.full_name}</span>
                  </div>
                </Link>

                {u.my_follow_status !== 'self' && (
                  <button
                    onClick={() => handleFollowAction(u.id, u.my_follow_status)}
                    className={`ml-2 shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition ${
                      u.my_follow_status === 'accepted' 
                        ? 'bg-[var(--color-surface-2)] text-white hover:bg-[var(--color-surface)]' 
                        : u.my_follow_status === 'pending'
                        ? 'bg-transparent border border-[var(--color-border-color)] text-[var(--color-text-3)]'
                        : 'bg-white text-black hover:bg-gray-200'
                    }`}
                  >
                    {u.my_follow_status === 'accepted' ? 'Mengikuti' : u.my_follow_status === 'pending' ? 'Diminta' : 'Ikuti'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
