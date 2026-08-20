"use client";

import { useState, useEffect } from "react";
import Avatar from "@/components/Avatar";

export interface MediaData {
  id: string;
  media_url: string;
  drive_file_id?: string;
  user_id: string;
  created_at: string;
  author: {
    full_name: string;
    username: string;
    avatar_url: string;
  };
  likes: any[];
  comments: any[];
}

export default function MediaCard({ media, currentUserId, isEventOwner, onLike, onComment, onSetCover, onDelete }: { 
  media: MediaData; 
  currentUserId: string | null;
  isEventOwner: boolean;
  onLike: (id: string) => void;
  onComment: (id: string, text: string) => void;
  onSetCover: (url: string) => void;
  onDelete: (id: string) => void;
}) {
  const [commentText, setCommentText] = useState("");
  
  // Local state for optimistic updates
  const [localLikes, setLocalLikes] = useState(media.likes || []);
  const [localComments, setLocalComments] = useState(media.comments || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Sync with server if it changes
  useEffect(() => {
    setLocalLikes(media.likes || []);
    setLocalComments(media.comments || []);
  }, [media.likes, media.comments]);

  const isLikedByMe = localLikes.some(like => like.user_id === currentUserId);
  const likeCount = localLikes.length;
  const commentCount = localComments.length;

  const handleOptimisticLike = () => {
    if (!currentUserId) return;
    
    if (isLikedByMe) {
      setLocalLikes(prev => prev.filter(like => like.user_id !== currentUserId));
    } else {
      setLocalLikes(prev => [...prev, { id: 'temp', user_id: currentUserId }]);
    }
    
    // Call parent to do actual network request
    onLike(media.id);
  };

  const handleOptimisticComment = () => {
    if (!commentText.trim() || !currentUserId) return;
    
    const newComment = {
      id: 'temp-' + Date.now(),
      content: commentText,
      author: {
        full_name: "Kamu", // Will be replaced by actual data on next fetch
        username: "kamu"
      }
    };
    
    setLocalComments(prev => [...prev, newComment]);
    onComment(media.id, commentText);
    setCommentText("");
  };

  const topComments = localComments.slice(0, 2);

  return (
    <>
      <div className="break-inside-avoid bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl overflow-hidden flex flex-col relative">
        <div className="w-full bg-[var(--color-surface-2)] relative">
          {media.media_url?.match(/\.(mp4|webm|mov|ogg)$/i) ? (
            <video src={media.media_url} controls className="w-full h-auto" />
          ) : (
            <img src={media.media_url} alt="Media" className="w-full h-auto" />
          )}
          
          {/* 3-dots Menu Button */}
          <div className="absolute top-2 right-2">
            <button 
              onClick={(e) => { e.preventDefault(); setIsDropdownOpen(!isDropdownOpen); }}
              className="bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-xl shadow-xl z-50 overflow-hidden flex flex-col py-1 text-sm font-medium">
                  {media.drive_file_id && (
                    <a 
                      href={`https://drive.google.com/uc?export=download&id=${media.drive_file_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 text-white hover:bg-[var(--color-surface-2)] text-left transition-colors flex items-center gap-2"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      Download HD
                    </a>
                  )}
                  {isEventOwner && (
                    <button 
                      onClick={() => { 
                        const coverUrl = media.media_url.replace(/\.(mp4|webm|mov|ogg)$/i, '.jpg');
                        onSetCover(coverUrl); 
                        setIsDropdownOpen(false); 
                      }}
                      className="px-4 py-2.5 text-white hover:bg-[var(--color-surface-2)] text-left transition-colors flex items-center gap-2"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      Jadikan Cover
                    </button>
                  )}
                  {(isEventOwner || currentUserId === media.user_id) && (
                    <button 
                      onClick={() => { onDelete(media.id); setIsDropdownOpen(false); }}
                      className="px-4 py-2.5 text-[var(--color-brand-red)] hover:bg-[var(--color-surface-2)] text-left transition-colors flex items-center gap-2"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                      </svg>
                      Hapus Media
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-4">
          {/* Actions */}
          <div className="flex items-center gap-4 mb-3">
            <button onClick={handleOptimisticLike} className="flex items-center gap-1.5 transition-colors group">
              <svg viewBox="0 0 24 24" fill={isLikedByMe ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={`w-6 h-6 transition-transform group-active:scale-90 ${isLikedByMe ? "text-pink-500" : "text-white"}`}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="text-white font-bold text-sm">{likeCount}</span>
            </button>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 text-white transition-opacity hover:opacity-80">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="font-bold text-sm">{commentCount}</span>
            </button>
          </div>

          {/* Uploader info */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-[var(--color-surface-2)] overflow-hidden shrink-0">
              <Avatar
                src={media.author.avatar_url}
                size={24}
                alt={media.author.username}
                fallback={
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white bg-blue-500">
                    {media.author.full_name?.charAt(0) || "U"}
                  </div>
                }
              />
            </div>
            <span className="text-[var(--color-text-2)] text-xs">Diunggah oleh <span className="font-bold text-white">{media.author.full_name || media.author.username}</span></span>
          </div>

          {/* Comments (Top 2) */}
          <div className="space-y-1.5 mb-2">
            {topComments.map((c: any) => (
              <div key={c.id} className="text-xs">
                <span className="font-bold text-white mr-1">{c.author?.full_name || c.author?.username}</span>
                <span className="text-[var(--color-text-2)] break-words">{c.content}</span>
              </div>
            ))}
          </div>
          
          {localComments.length > 2 && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-xs text-[var(--color-text-3)] font-medium mb-3 hover:text-white transition-colors"
            >
              Lihat semua {localComments.length} komentar...
            </button>
          )}

          {/* Add comment */}
          <div className="flex items-center gap-2 mt-auto pt-3 border-t border-[var(--color-border-color)]">
            <input 
              type="text" 
              placeholder="Tambahkan komentar..." 
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              className="flex-1 bg-transparent border-none text-sm text-white placeholder-[var(--color-text-3)] focus:outline-none"
              onKeyDown={e => {
                if (e.key === "Enter") handleOptimisticComment();
              }}
            />
            <button 
              disabled={!commentText.trim()}
              onClick={handleOptimisticComment}
              className="text-[var(--color-brand-red)] text-sm font-bold disabled:opacity-50"
            >
              Kirim
            </button>
          </div>
        </div>
      </div>

      {/* Modal for All Comments */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[var(--color-surface)] w-full max-w-sm rounded-3xl border border-[var(--color-border-color)] shadow-2xl overflow-hidden flex flex-col h-[70vh]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-color)]">
              <h3 className="font-bold text-white text-lg">Komentar</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--color-text-3)] hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {localComments.map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] overflow-hidden shrink-0">
                    <Avatar
                      src={c.author?.avatar_url}
                      size={32}
                      alt={c.author?.username}
                      fallback={
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-blue-500">
                          {c.author?.full_name?.charAt(0) || "U"}
                        </div>
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-white text-sm mr-2">{c.author?.full_name || c.author?.username}</span>
                    <span className="text-[var(--color-text-2)] text-sm break-words">{c.content}</span>
                  </div>
                </div>
              ))}
              {localComments.length === 0 && (
                <div className="text-center text-[var(--color-text-3)] text-sm mt-10">Belum ada komentar</div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--color-border-color)] bg-[var(--color-surface-2)]">
              <div className="flex items-center gap-2 bg-[var(--color-surface)] rounded-full px-4 py-2 border border-[var(--color-border-color)]">
                <input 
                  type="text" 
                  placeholder="Tambahkan komentar..." 
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="flex-1 bg-transparent border-none text-sm text-white placeholder-[var(--color-text-3)] focus:outline-none"
                  onKeyDown={e => {
                    if (e.key === "Enter") handleOptimisticComment();
                  }}
                />
                <button 
                  disabled={!commentText.trim()}
                  onClick={handleOptimisticComment}
                  className="text-[var(--color-brand-red)] text-sm font-bold disabled:opacity-50"
                >
                  Kirim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
