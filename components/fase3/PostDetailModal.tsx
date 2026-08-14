"use client";

import { useEffect, useState } from "react";
import { Post } from "./MasonryGrid";
import Link from "next/link";

export default function PostDetailModal({ 
  post, 
  onClose 
}: { 
  post: Post, 
  onClose: () => void 
}) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [followStatus, setFollowStatus] = useState("none");
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  
  // Swipe to close state
  const [startY, setStartY] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/posts/${post.id}`);
      const data = await res.json();
      if (data.success) {
        setDetail(data.post);
        setHasLiked(data.post.hasLiked || false);
        setFollowStatus(data.post.followStatus || "none");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [post.id]);

  const handleLike = async (forceLike: boolean = false) => {
    if (isLiking) return;
    
    if (forceLike) {
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 800);
      if (hasLiked) return; // If already liked, just show animation and don't hit API
    }
    
    // Optimistic Update
    const previousHasLiked = hasLiked;
    const currentLikes = detail?.likes?.length || post.likes;
    
    setHasLiked(!hasLiked);
    if (detail) {
      setDetail({
        ...detail,
        likes: !hasLiked 
          ? [...(detail.likes || []), { id: 'optimistic' }] 
          : (detail.likes || []).slice(0, -1)
      });
    }

    setIsLiking(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setHasLiked(data.liked);
      } else {
        setHasLiked(previousHasLiked);
      }
    } catch (err) {
      console.error(err);
      setHasLiked(previousHasLiked);
    } finally {
      setIsLiking(false);
    }
  };

  const handleFollow = async () => {
    if (!detail?.author?.discord_id || isFollowLoading) return;
    setIsFollowLoading(true);
    
    try {
      const isCurrentlyFollowed = followStatus === "accepted" || followStatus === "pending";
      const action = isCurrentlyFollowed ? "unfollow" : "follow";
      
      const res = await fetch("/api/user/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: detail.author.discord_id, action })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setFollowStatus(data.status);
      }
    } catch (err) {
      console.error("Failed to follow/unfollow:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    
    const textToSubmit = commentText;
    setCommentText(""); // Optimistic clear
    
    // Optimistic Add
    const optimisticComment = {
      id: Date.now().toString(),
      content: textToSubmit,
      created_at: new Date().toISOString(),
      user: { full_name: "Terkirim...", avatar_url: "" }
    };
    
    if (detail) {
      setDetail({
        ...detail,
        comments: [...(detail.comments || []), optimisticComment]
      });
    }

    try {
      const res = await fetch(`/api/posts/${post.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: textToSubmit })
      });
      const data = await res.json();
      if (data.success) {
        fetchDetail(); // Re-fetch to get real DB comment with actual user data
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) { // Only allow swiping down
      setTranslateY(diff);
    }
  };
  const handleTouchEnd = () => {
    if (translateY > 150) {
      onClose(); // Close if swiped down more than 150px
    } else {
      setTranslateY(0); // Snap back
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end md:items-center md:justify-center p-0 md:p-10">
      {/* Backdrop (Tap to close) */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Tap area at top for mobile to close */}
      <div className="flex-1 w-full md:hidden" onClick={onClose} />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-5xl h-[90vh] md:h-auto max-h-full bg-[var(--color-surface)] rounded-t-[24px] md:rounded-[24px] border border-[var(--color-border-color)] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 md:zoom-in-95 duration-300"
        style={{ transform: `translateY(${translateY}px)`, transition: translateY === 0 ? 'transform 0.3s ease-out' : 'none' }}
      >
        {/* Swipe Handle for Mobile */}
        <div 
          className="w-full flex justify-center py-3 md:hidden cursor-grab active:cursor-grabbing bg-[var(--color-bg)]"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-gray-500 rounded-full" />
        </div>
        
        {/* Mobile Header (Author Info moved above image) */}
        <div className="md:hidden p-4 bg-[var(--color-bg)] border-b border-[var(--color-border-color)] flex items-center justify-between">
          <Link href={`/profile/${post.username}`} className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-brand-red)] to-purple-600 p-0.5">
              <div className="w-full h-full bg-[var(--color-surface)] rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm">
                {post.avatar && post.avatar.length > 2 ? <img src={post.avatar} alt="avatar" className="w-full h-full object-cover"/> : post.avatar}
              </div>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm group-hover:underline decoration-[var(--color-brand-red)] underline-offset-2">{post.author}</h3>
              <p className="text-[var(--color-text-3)] text-xs">{post.prodi}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {detail && !detail.isOwnPost && (
              <button 
                onClick={handleFollow}
                disabled={isFollowLoading}
                className={`${followStatus === "accepted" ? "bg-[#2a2a30] text-white" : followStatus === "pending" ? "bg-[var(--color-surface)] text-[var(--color-text-2)] border border-[var(--color-border-color)]" : "bg-[var(--color-brand-red)] text-white"} text-xs font-bold px-4 py-1.5 rounded-full hover:opacity-80 transition disabled:opacity-50`}
              >
                {followStatus === "accepted" ? "Following" : followStatus === "pending" ? "Requested" : "Follow"}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-2)] text-white hover:bg-[var(--color-border-color)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        {/* Left Area - Image */}
        <div 
          className="w-full md:w-[60%] lg:w-[65%] h-[40vh] md:h-[80vh] bg-black relative flex items-center justify-center overflow-hidden shrink-0 select-none"
          onDoubleClick={() => handleLike(true)}
        >
          {/* Heart Animation Overlay */}
          {showHeartAnim && (
            <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none animate-in zoom-in duration-200 fade-out delay-500 fill-mode-forwards">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-24 h-24 text-[var(--color-brand-red)] drop-shadow-2xl">
                <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
              </svg>
            </div>
          )}
          
          {post.imageUrl ? (
            post.imageUrl.match(/\.(mp4|webm|ogg)$/i) || post.imageUrl.includes('/video/upload/') ? (
              <video src={post.imageUrl} controls className="w-full h-full object-contain" playsInline autoPlay loop />
            ) : (
              <img src={post.imageUrl} alt={post.title} className="w-full h-full object-contain" />
            )
          ) : (
            <div className="relative z-10 p-8 text-center mix-blend-overlay opacity-50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-32 h-32 mx-auto mb-4">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <p className="text-white font-bold text-2xl tracking-widest uppercase opacity-50">Artwork Preview</p>
            </div>
          )}
        </div>

        {/* Right Area - Details & Comments */}
        <div className="w-full md:w-[40%] lg:w-[35%] flex flex-col bg-[var(--color-bg)] h-[40vh] md:h-[80vh] flex-1">
          
          {/* Desktop Header - Author Info (Hidden on Mobile) */}
          <div className="hidden md:flex p-5 border-b border-[var(--color-border-color)] items-center justify-between">
            <Link href={`/profile/${post.username}`} className="flex items-center gap-3 group" onClick={onClose}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-brand-red)] to-purple-600 p-0.5">
                <div className="w-full h-full bg-[var(--color-surface)] rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm">
                  {post.avatar && post.avatar.length > 2 ? <img src={post.avatar} alt="avatar" className="w-full h-full object-cover"/> : post.avatar}
                </div>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm group-hover:underline decoration-[var(--color-brand-red)] underline-offset-2">{post.author}</h3>
                <p className="text-[var(--color-text-3)] text-xs">{post.prodi}</p>
              </div>
            </Link>
            <div className="flex gap-2">
              {detail && !detail.isOwnPost && (
                <button 
                  onClick={handleFollow}
                  disabled={isFollowLoading}
                  className={`${followStatus === "accepted" ? "bg-[#2a2a30] text-white" : followStatus === "pending" ? "bg-[var(--color-surface)] text-[var(--color-text-2)] border border-[var(--color-border-color)]" : "bg-[var(--color-brand-red)] text-white"} text-xs font-bold px-4 py-1.5 rounded-full hover:opacity-80 transition disabled:opacity-50`}
                >
                  {followStatus === "accepted" ? "Following" : followStatus === "pending" ? "Requested" : "Follow"}
                </button>
              )}
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-2)] text-white hover:bg-[var(--color-border-color)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>

          {/* Details & Comments section */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>
            
            {loading ? (
              <p className="text-[var(--color-text-2)] text-sm animate-pulse">Memuat detail...</p>
            ) : (
              <>
                <p className="text-[var(--color-text-2)] text-sm leading-relaxed mb-6 whitespace-pre-wrap">
                  {detail?.description || "Tidak ada deskripsi."}
                </p>
                {detail?.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {detail.tags.map((tag: string, i: number) => (
                      <span key={i} className="text-[10px] uppercase font-bold text-[var(--color-text-3)] bg-[var(--color-surface-2)] px-2 py-1 rounded">#{tag}</span>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="border-t border-[var(--color-border-color)] pt-5">
              <h4 className="text-white font-bold text-sm mb-4">Komentar ({detail?.comments?.length || post.comments})</h4>
              
              <div className="flex flex-col gap-4">
                {detail?.comments?.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] overflow-hidden flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {comment.user?.avatar_url ? <img src={comment.user.avatar_url} className="w-full h-full object-cover"/> : (comment.user?.full_name?.[0] || 'U')}
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold mb-0.5">
                        {comment.user?.full_name || comment.user?.username} 
                        <span className="text-[var(--color-text-3)] font-normal text-[10px] ml-1">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </p>
                      <p className="text-[var(--color-text-2)] text-xs">{comment.content}</p>
                    </div>
                  </div>
                ))}
                {!loading && (!detail?.comments || detail.comments.length === 0) && (
                  <p className="text-[var(--color-text-3)] text-xs italic">Belum ada komentar.</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions & Comment Input */}
          <div className="p-3 md:p-5 border-t border-[var(--color-border-color)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-4">
                <button onClick={() => handleLike()} disabled={isLiking} className={`flex items-center gap-1.5 transition group ${hasLiked ? 'text-[var(--color-brand-red)]' : 'text-white hover:text-[var(--color-brand-red)]'}`}>
                  <svg viewBox="0 0 24 24" fill={hasLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                  </svg>
                  <span className="font-bold">{detail?.likes?.length || post.likes}</span>
                </button>
                <button className="flex items-center gap-1.5 text-white hover:text-gray-300 transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>
                <button className="flex items-center gap-1.5 text-white hover:text-gray-300 transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
                  </svg>
                </button>
              </div>
              <button className="text-white hover:text-gray-300 transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                </svg>
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-white text-xs font-bold shrink-0 border border-[var(--color-border-color)]">U</div>
              <div className="flex-1 bg-[var(--color-bg)] rounded-full border border-[var(--color-border-color)] px-4 py-2 flex items-center">
                <input 
                  type="text" 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                  placeholder="Tambahkan komentar..." 
                  className="bg-transparent border-none outline-none text-white text-xs w-full"
                />
                <button onClick={handleComment} disabled={!commentText.trim()} className="text-[var(--color-brand-red)] text-xs font-bold ml-2 shrink-0 disabled:opacity-50">Kirim</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

