"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import MasonryGrid, { Post } from "@/components/fase3/MasonryGrid";
import FollowNetworkModal from "@/components/fase3/FollowNetworkModal";
import { useSession } from "next-auth/react";
import { use } from "react";

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const [activeTab, setActiveTab] = useState<"karya" | "tentang">("karya");
  const [networkModalType, setNetworkModalType] = useState<"followers" | "following" | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  const resolvedParams = use(params);
  const username = resolvedParams.username;
  
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { data: session, status } = useSession();
  const isLoadingSession = status === "loading";
  const isOwnProfile = session?.user?.dbUsername === profileData?.username || session?.user?.name === profileData?.username;

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/profile/${username}`);
      const data = await res.json();
      if (data.success) {
        const mappedPosts: Post[] = data.posts.map((p: any) => ({
          id: p.id,
          title: p.title,
          author: data.profile.full_name || "Unknown",
          username: data.profile.username || p.user_id,
          avatar: data.profile.avatar_url || "U",
          prodi: data.profile.prodi || "Unknown",
          imageUrl: p.media_url,
          likes: p.likes?.length || 0,
          comments: p.comments?.length || 0,
          aspectRatio: p.aspect_ratio || "square",
          isTrending: false
        }));

        setProfileData({
          userId: data.profile.id,
          name: data.profile.full_name || username,
          username: data.profile.username || username,
          prodi: data.profile.prodi || "Unknown",
          avatarUrl: data.profile.avatar_url,
          bio: `Mahasiswa aktif yang tertarik dengan dunia digital kreatif. Portfolio dari ${data.profile.full_name || username}.`,
          stats: data.stats,
          skills: ["Creative Thinking", "Design", "Programming"], // Placeholder
          posts: mappedPosts,
          is_private: data.profile.is_private,
          followStatus: data.followStatus,
          canViewPosts: data.canViewPosts,
          isOwnProfile: data.isOwnProfile
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const handleFollow = async () => {
    if (!profileData?.userId || isFollowLoading) return;
    setIsFollowLoading(true);
    
    try {
      const isCurrentlyFollowed = profileData.followStatus === "accepted" || profileData.followStatus === "pending";
      const action = isCurrentlyFollowed ? "unfollow" : "follow";
      
      const res = await fetch("/api/user/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: profileData.userId, action })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setProfileData((prev: any) => ({
          ...prev,
          followStatus: data.status, // "accepted", "pending", or "none"
          stats: {
            ...prev.stats,
            followers: prev.stats.followers + (data.status === "accepted" && !isCurrentlyFollowed ? 1 : action === "unfollow" && prev.followStatus === "accepted" ? -1 : 0)
          }
        }));
      }
    } catch (err) {
      console.error("Failed to follow/unfollow:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <Sidebar />
      <Header />
      
      <main className="flex-1 w-full max-w-5xl mx-auto px-5 md:px-8 py-6 pb-24 md:pb-10 md:pt-6 md:pl-[260px] relative">
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !profileData ? (
          <div className="text-center text-[var(--color-text-2)] py-10">
            Profil tidak ditemukan.
          </div>
        ) : (
          <>
            {/* Profile Header section - Instagram Style */}
            <div className="mb-8 max-w-2xl mx-auto">
              
              <div className="flex items-center justify-between mb-4 px-2">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 p-[2px]">
                    {profileData.avatarUrl ? (
                      <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover border-2 border-[var(--color-bg)]" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-bg)] flex items-center justify-center text-3xl font-extrabold text-white">
                        {profileData.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-1 justify-around items-center ml-6 md:ml-10">
                  <div className="text-center">
                    <span className="text-white font-bold text-lg md:text-xl block">{profileData.stats.karya}</span>
                    <span className="text-white text-xs md:text-sm">postingan</span>
                  </div>
                  <div 
                    className={`text-center ${profileData.canViewPosts ? 'cursor-pointer hover:opacity-80 transition' : ''}`}
                    onClick={() => profileData.canViewPosts && setNetworkModalType('followers')}
                  >
                    <span className="text-white font-bold text-lg md:text-xl block">{profileData.stats.followers}</span>
                    <span className="text-white text-xs md:text-sm">pengikut</span>
                  </div>
                  <div 
                    className={`text-center ${profileData.canViewPosts ? 'cursor-pointer hover:opacity-80 transition' : ''}`}
                    onClick={() => profileData.canViewPosts && setNetworkModalType('following')}
                  >
                    <span className="text-white font-bold text-lg md:text-xl block">{profileData.stats.following}</span>
                    <span className="text-white text-xs md:text-sm">mengikuti</span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="px-2 mb-5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h1 className="text-white font-bold text-sm md:text-base">
                    {profileData.name}
                  </h1>
                  {profileData.is_private && (
                    <div className="flex items-center bg-black/40 border border-white/10 rounded-full px-2 py-0.5 gap-1" title="Akun Privat">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-[var(--color-text-2)]">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span className="text-[10px] font-bold text-[var(--color-text-2)]">Privat</span>
                    </div>
                  )}
                </div>
                
                <p className="text-[var(--color-text-3)] text-sm mb-1">
                  {profileData.prodi || "Mahasiswa"}
                </p>
                
                <div className="text-white text-sm mt-1">
                  <div className="flex items-center gap-1.5 mt-1">
                    {profileData?.instagram && profileData.canViewPosts && (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-pink-500">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                        </svg>
                        <a href={`https://instagram.com/${profileData.instagram}`} target="_blank" rel="noreferrer" className="hover:underline text-[var(--color-text-2)] hover:text-white transition">
                          @{profileData.instagram}
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {!isLoadingSession && !isOwnProfile && (
                <div className="flex items-center gap-2 px-2">
                  <button 
                    onClick={handleFollow}
                    disabled={isFollowLoading}
                    className={`flex-1 text-sm font-semibold py-1.5 rounded-lg transition disabled:opacity-50 ${
                      profileData.followStatus === "accepted"
                        ? "bg-[var(--color-surface)] border border-[var(--color-surface-2)] text-white hover:bg-[var(--color-surface-2)]" 
                        : profileData.followStatus === "pending"
                        ? "bg-[var(--color-surface)] border border-[var(--color-border-color)] text-[var(--color-text-2)] hover:text-white hover:border-white"
                        : "bg-[var(--color-brand-red)] text-white hover:bg-red-600"
                    }`}
                  >
                    {isFollowLoading ? "Loading..." : profileData.followStatus === "accepted" ? 'Mengikuti' : profileData.followStatus === "pending" ? 'Requested' : 'Ikuti'}
                  </button>
                </div>
              )}
            </div>

            {/* Tabs - IG Style */}
            <div className="flex border-t border-[var(--color-border-color)] mb-2 mt-4 max-w-2xl mx-auto">
              <button 
                onClick={() => setActiveTab("karya")}
                className={`flex-1 py-3 flex justify-center items-center gap-2 transition-all ${activeTab === "karya" ? "border-t-[1px] border-white text-white" : "border-t-[1px] border-transparent text-[var(--color-text-3)] hover:text-white"}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                  <line x1="15" y1="21" x2="15" y2="9" />
                </svg>
              </button>
              <button 
                onClick={() => setActiveTab("tentang")}
                className={`flex-1 py-3 flex justify-center items-center gap-2 transition-all ${activeTab === "tentang" ? "border-t-[1px] border-white text-white" : "border-t-[1px] border-transparent text-[var(--color-text-3)] hover:text-white"}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "karya" ? (
              <div>
                {!profileData.canViewPosts ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-full border-2 border-[var(--color-border-color)] flex items-center justify-center mb-4 text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">Akun Ini Privat</h3>
                    <p className="text-[var(--color-text-2)] text-sm max-w-xs">
                      Ikuti akun ini untuk melihat foto dan karyanya.
                    </p>
                  </div>
                ) : profileData.posts.length > 0 ? (
                  <MasonryGrid posts={profileData.posts} />
                ) : (
                  <div className="text-center text-[var(--color-text-2)] py-10 border-2 border-dashed border-[var(--color-border-color)] rounded-2xl">
                    Belum ada karya.
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl p-6 md:p-8 max-w-2xl">
                {profileData.canViewPosts ? (
                  <>
                    <h3 className="text-white font-bold text-lg mb-4">Keterampilan</h3>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {profileData.skills.map((skill: string) => (
                        <span key={skill} className="bg-[var(--color-bg)] border border-[var(--color-border-color)] text-[var(--color-text-2)] text-xs font-bold px-3 py-1.5 rounded-lg">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <h3 className="text-white font-bold text-lg mb-4">Pendidikan</h3>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0">
                        <img src="/Telkom.png" alt="Telkom" className="w-full h-full object-contain p-1" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold">Telkom University Jakarta</h4>
                        <p className="text-[var(--color-text-3)] text-sm">{profileData.prodi || "Prodi"} • 2026 - Sekarang</p>
                      </div>
                    </div>
                  </>
                ) : (
                   <div className="text-center text-[var(--color-text-2)] py-10">
                    Informasi ini disembunyikan karena akun privat.
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {/* Network Modal */}
        {networkModalType && profileData && (
          <FollowNetworkModal 
            username={profileData.username} 
            type={networkModalType} 
            onClose={() => setNetworkModalType(null)} 
            onUpdate={fetchProfile}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
}
