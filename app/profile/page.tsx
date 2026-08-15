"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import FollowNetworkModal from "@/components/fase3/FollowNetworkModal";
import UploadMediaModal from "@/components/fase3/UploadMediaModal";
import MasonryGrid, { Post } from "@/components/fase3/MasonryGrid";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useGuest } from "@/components/GuestProvider";
import LoginPanel from "@/components/LoginPanel";

// Removed hardcoded MY_POSTS

const getProdiAcronym = (prodi: string) => {
  if (prodi === "Sistem Informasi") return "SI";
  if (prodi === "Teknik Informasi") return "TI";
  if (prodi === "Desain Komunikasi Visual") return "DKV";
  if (prodi === "Teknik Telekomunikasi") return "TT";
  return "UNKNOWN";
};

import useSWR from "swr";

const profileFetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (data.success) {
    const formattedPosts = data.posts ? data.posts.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      author: data.profile.full_name || data.profile.username,
      username: data.profile.username,
      avatar: data.profile.avatar_url,
      prodi: data.profile.prodi,
      imageUrl: p.media_url,
      likes: p.likes?.length || 0,
      comments: p.comments?.length || 0,
      aspectRatio: p.aspectRatio || "portrait"
    })) : [];
    
    return {
      posts: formattedPosts,
      posts_count: data.posts?.length || 0,
      followers_count: data.stats?.followers || 0,
      following_count: data.stats?.following || 0,
      stats: data.stats || { karya: 0, followers: 0, following: 0 },
      isPrivate: data.profile.is_private || false
    };
  }
  return { posts: [], stats: { karya: 0, followers: 0, following: 0 }, isPrivate: false };
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex-1 w-full min-h-[50vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div></div>}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const { data: session, status, update } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isGuest } = useGuest();
  
  useEffect(() => {
    if (status === "unauthenticated" && !isGuest) {
      router.push("/login");
    }
  }, [status, isGuest, router]);


  
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"karya" | "tentang">("karya");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [networkModalType, setNetworkModalType] = useState<'followers' | 'following' | null>(null);
  
  // Verification state
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    success?: boolean;
    error?: string;
    details?: string[];
    nama_lengkap?: string;
    message?: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [classError, setClassError] = useState("");
  const [bioError, setBioError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Handle hardware back button for Edit Profile Modal
  useEffect(() => {
    if (isEditingProfile) {
      const stateObj = { profileModal: true };
      window.history.pushState(stateObj, '');

      const handlePopState = () => {
        setIsEditingProfile(false);
      };

      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
        if (window.history.state?.profileModal) {
           window.history.back();
        }
      };
    }
  }, [isEditingProfile]);

  const [isSubmittingIg, setIsSubmittingIg] = useState(false);
  const [instagramInput, setInstagramInput] = useState("");
  const [igError, setIgError] = useState("");

  const user = session?.user;
  const displayName = user?.fullName || user?.name || "User";
  const avatarUrl = user?.avatarUrl || user?.image;
  const initial = displayName.charAt(0).toUpperCase();
  
  const completedSteps = [user?.isVerified, !!user?.kelas, !!user?.instagram].filter(Boolean).length;

  const usernameForFetch = user?.dbUsername || user?.name;
  const { data: profileData = { posts: [], posts_count: 0, followers_count: 0, following_count: 0, stats: { karya: 0, followers: 0, following: 0 }, isPrivate: false }, isLoading: isLoadingPosts, mutate } = useSWR(
    usernameForFetch ? `/api/profile/${usernameForFetch}` : null,
    profileFetcher
  );
  
  const [editFullName, setEditFullName] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editSkills, setEditSkills] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync profile data to edit state
  useEffect(() => {
    if (isEditingProfile) {
      setEditFullName(displayName);
      setEditIsPrivate(profileData.isPrivate);
      setEditBio((profileData as any).profile?.bio || "");
      setEditSkills((profileData as any).profile?.skills?.join(", ") || "");
    }
  }, [isEditingProfile, displayName, profileData.isPrivate, (profileData as any).profile?.bio, (profileData as any).profile?.skills]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const skillsArray = editSkills.split(",").map(s => s.trim()).filter(s => s.length > 0);
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName,
          isPrivate: editIsPrivate,
          bio: editBio,
          skills: skillsArray
        })
      });
      if (res.ok) {
        await mutate(); // refresh profile data
        await update(); // refresh session data
        setIsEditingProfile(false);
      } else {
        console.error("Failed to update profile", await res.text());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };
  const userPosts = profileData.posts;
  const stats = profileData.stats;

  if (status === "unauthenticated" && isGuest) {
    return (
      <div className="flex flex-col min-h-screen">
        <Sidebar />
        <Header />
        <main className="flex-1 w-full pb-20 md:pb-10 md:pt-6 md:pl-[260px] flex items-center justify-center p-4">
          <LoginPanel showGuestOption={false} showDiscordWidget={false} />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 text-[var(--color-brand-red)] rounded-full border-t-2 border-b-2 border-current"></div>
      </div>
    );
  }

  // Generate class options based on prodi
  const acronym = getProdiAcronym(user?.prodi || "");
  const classOptions = [`${acronym}-A`, `${acronym}-B`, `${acronym}-C`, `${acronym}-D`];

  const handleFileSelect = (file: File) => {
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setVerifyResult({ error: "Format file harus PDF, PNG, JPG, atau WebP" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setVerifyResult({ error: "Ukuran file maksimal 10MB" });
      return;
    }
    setVerifyFile(file);
    setVerifyResult(null);
  };

  const handleVerify = async () => {
    if (!verifyFile) return;
    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const formData = new FormData();
      formData.append("file", verifyFile);

      const res = await fetch("/api/verify", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setVerifyResult({
          success: true,
          nama_lengkap: data.nama_lengkap,
          message: data.message,
        });
        await update();
      } else {
        setVerifyResult({
          error: data.error || "Gagal verifikasi SKL",
          details: data.details
        });
      }
    } catch (err) {
      setVerifyResult({ error: "Terjadi kesalahan sistem. Coba lagi nanti." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleClassSubmit = async () => {
    if (!selectedClass) {
      setClassError("Pilih kelas terlebih dahulu");
      return;
    }
    
    setIsSubmittingClass(true);
    setClassError("");

    try {
      const res = await fetch("/api/user/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelas: selectedClass }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await update(); 
      } else {
        setClassError(data.error || "Gagal menyimpan kelas");
      }
    } catch (err) {
      setClassError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmittingClass(false);
    }
  };

  const handleInstagramSubmit = async () => {
    if (!instagramInput.trim()) {
      setIgError("Masukkan username Instagram kamu");
      return;
    }
    
    setIsSubmittingIg(true);
    setIgError("");

    try {
      const res = await fetch("/api/user/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagram: instagramInput }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await update(); 
      } else {
        setIgError(data.error || "Gagal menyimpan Instagram");
      }
    } catch (err) {
      setIgError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmittingIg(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <Sidebar />
      <Header />
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-5 md:px-8 py-6 pb-28 md:pb-10 md:pt-6 md:pl-[260px] relative">
        
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 lg:items-start w-full">
          {/* Left Column: Profile Sticky */}
          <div className="w-full lg:w-[450px] shrink-0 lg:sticky lg:top-8">
            {/* Profile Header section */}
            <div className="mb-4 md:mb-8">
              
              <div className="flex items-center justify-between mb-3 md:mb-4 px-2">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 p-[2px]">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover border-2 border-[var(--color-bg)]" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-bg)] flex items-center justify-center text-3xl font-extrabold text-white">
                        {initial}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setIsUploading(true)}
                    className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 rounded-full border-2 border-[var(--color-bg)] flex items-center justify-center text-white cursor-pointer hover:bg-blue-600"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </div>

                {/* Stats */}
                <div className="flex flex-1 justify-around items-center ml-4 md:ml-6">
                  <div className="text-center">
                    <span className="text-white font-bold text-base md:text-xl block leading-tight">{profileData.posts_count}</span>
                    <span className="text-white text-[10px] md:text-sm">postingan</span>
                  </div>
                  <button onClick={() => setNetworkModalType('followers')} className="text-center">
                    <span className="text-white font-bold text-base md:text-xl block leading-tight">{profileData.followers_count}</span>
                    <span className="text-white text-[10px] md:text-sm">pengikut</span>
                  </button>
                  <button onClick={() => setNetworkModalType('following')} className="text-center">
                    <span className="text-white font-bold text-base md:text-xl block leading-tight">{profileData.following_count}</span>
                    <span className="text-white text-[10px] md:text-sm">mengikuti</span>
                  </button>
                </div>
              </div>

              {/* Bio */}
              <div className="px-2 mb-5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h1 className="text-white font-bold text-sm md:text-base">
                    {displayName}
                  </h1>
                  {user?.isVerified && <VerifiedBadge size={16} />}
                </div>
                
                <p className="text-[var(--color-text-3)] text-sm mb-1">
                  @{user?.dbUsername || user?.name?.toLowerCase().replace(/\s/g, "")}
                </p>

                <p className="text-[var(--color-text-3)] text-sm mb-1">
                  {[user?.prodi, user?.kelas].filter(Boolean).join(" • ") || "Mahasiswa"}
                </p>

                {(profileData as any).profile?.bio && (
                  <p className="text-white text-sm mt-2 mb-1 leading-relaxed whitespace-pre-wrap">
                    {(profileData as any).profile.bio}
                  </p>
                )}
                
                <div className="text-white text-sm mt-2">
                  <div className="flex items-center gap-1.5 mt-1">
                    {user?.instagram && (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-pink-500">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                        </svg>
                        <a href={`https://instagram.com/${user.instagram}`} target="_blank" rel="noreferrer" className="hover:underline text-[var(--color-text-2)] hover:text-white transition">
                          @{user.instagram}
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="flex-1 bg-[var(--color-surface)] hover:bg-[#2a2a30] text-white py-2.5 rounded-xl font-bold text-sm border border-[#3a3a3d] transition flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  Edit Profil
                </button>
                <button className="bg-[var(--color-surface)] border border-[#3a3a3d] hover:bg-[#2a2a30] transition p-2.5 rounded-xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Onboarding Flow */}
            {completedSteps < 3 && (
              <div className="bg-[var(--color-surface)] rounded-2xl p-5 mb-8 w-full border border-[var(--color-border-color)] hidden lg:block">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border-color)]">
                  <h3 className="text-white font-bold text-sm">Status Lengkap</h3>
                  <span className="text-[var(--color-brand-red)] font-bold text-xs">{completedSteps}/3</span>
                </div>
                <p className="text-[var(--color-text-3)] text-xs">Selesaikan profil kamu agar lebih mudah berinteraksi dan mengikuti OSPEK!</p>
              </div>
            )}
          </div>

          {/* Right Column: Feeds & Tabs */}
          <div className="flex-1 w-full min-w-0">
            {/* Onboarding Flow for mobile/tablet */}
            {completedSteps < 3 && (
              <div className="bg-[var(--color-surface)] rounded-2xl p-3 md:p-5 mb-4 md:mb-8 w-full">
                <div className="flex items-center justify-between mb-3 md:mb-6 pb-2 md:pb-4 border-b border-[var(--color-border-color)]">
                  <h3 className="text-white font-bold text-[12px] md:text-sm">Status Data Diri & OSPEK</h3>
                  <span className="text-[var(--color-brand-red)] font-bold text-[10px] md:text-xs">{completedSteps}/3 Selesai</span>
                </div>

                {/* 1. SKL Verification Card */}
                {!user?.isVerified && (
                  <div className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          <polyline points="9 12 11 14 15 10"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm">1. Verifikasi Identitas</h3>
                        <p className="text-[var(--color-text-3)] text-xs mt-1">
                          Upload file PDF SKL atau screenshot bagian atas SKL yang berisi nama lengkap dan jurusan untuk mendapatkan centang biru.
                        </p>
                      </div>
                    </div>

                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        isDragging
                          ? "border-[var(--color-brand-red)] bg-red-500/5"
                          : verifyFile
                          ? "border-green-500/40 bg-green-500/5"
                          : "border-[var(--color-border-color)] hover:border-[var(--color-text-3)] bg-[var(--color-bg)]/50"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                      />
                      
                      {verifyFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="16" y1="13" x2="8" y2="13"/>
                              <line x1="16" y1="17" x2="8" y2="17"/>
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="text-white text-sm font-semibold truncate max-w-[200px]">{verifyFile.name}</p>
                            <p className="text-[var(--color-text-3)] text-xs">{(verifyFile.size / 1024).toFixed(0)} KB • Klik untuk ganti file</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 mx-auto text-[var(--color-text-3)] mb-3">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                          <p className="text-[var(--color-text-2)] text-sm font-medium">
                            Drag & drop file atau <span className="text-[var(--color-brand-red)]">klik di sini</span>
                          </p>
                          <p className="text-[var(--color-text-3)] text-xs mt-1">PDF, PNG, JPG, WebP • Maks 10MB</p>
                        </>
                      )}
                    </div>

                    <button
                      onClick={handleVerify}
                      disabled={!verifyFile || isVerifying}
                      className="mt-4 w-full bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isVerifying ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/>
                            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75"/>
                          </svg>
                          Memverifikasi...
                        </>
                      ) : (
                        "Kirim Verifikasi"
                      )}
                    </button>
                  </div>
                )}

                {/* 2. Class Selection Card */}
                {user?.isVerified && !user?.kelas && (
                  <div className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-start gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-red)]/20 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[var(--color-brand-red)]">
                          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm">2. Pilih Kelas Kamu</h3>
                        <p className="text-[var(--color-text-3)] text-xs mt-1">
                          Verifikasi SKL berhasil! Sekarang pilih kelas agar kamu masuk ke papan prodi yang tepat untuk OSPEK.
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="text-xs font-semibold text-[var(--color-text-2)] mb-2 block">Pilih Kelas</label>
                      <div className="relative">
                        <select
                          value={selectedClass}
                          onChange={(e) => setSelectedClass(e.target.value)}
                          className="w-full bg-[var(--color-bg)] border border-[var(--color-border-color)] text-white text-sm rounded-xl px-4 py-3 appearance-none focus:outline-none focus:border-[var(--color-brand-red)] transition cursor-pointer"
                        >
                          <option value="" disabled>-- Pilih Kelas --</option>
                          {classOptions.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[var(--color-text-3)]">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                      </div>
                      {classError && <p className="text-red-400 text-xs mt-2">{classError}</p>}
                    </div>

                    <button
                      onClick={handleClassSubmit}
                      disabled={isSubmittingClass || !selectedClass}
                      className="w-full bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmittingClass ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/>
                            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75"/>
                          </svg>
                          Menyimpan...
                        </>
                      ) : (
                        "Simpan Kelas"
                      )}
                    </button>
                  </div>
                )}

                {/* 3. Instagram SSO Card */}
                {user?.isVerified && user?.kelas && !user?.instagram && (
                  <div className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-start gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm">3. Tautkan Instagram</h3>
                        <p className="text-[var(--color-text-3)] text-xs mt-1">
                          Wajib! Tautkan akun Instagram kamu agar teman-teman mudah follow back setelah mutualan saat OSPEK.
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="text-xs font-semibold text-[var(--color-text-2)] mb-2 block">Username Instagram (tanpa @)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-4 flex items-center text-[var(--color-text-3)] font-medium">@</span>
                        <input
                          type="text"
                          placeholder="usn_kamu"
                          value={instagramInput}
                          onChange={(e) => setInstagramInput(e.target.value)}
                          className="w-full bg-[var(--color-bg)] border border-[var(--color-border-color)] text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-pink-500 transition"
                        />
                      </div>
                      <p className="text-[10px] text-[var(--color-text-3)] mt-1.5 flex items-start gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 mt-0.5 shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <span>Peringatan: Pastikan username sudah benar. Setelah disimpan, username Instagram tidak dapat diubah lagi!</span>
                      </p>
                      {igError && <p className="text-red-400 text-xs mt-2">{igError}</p>}
                    </div>

                    <button
                      onClick={handleInstagramSubmit}
                      disabled={isSubmittingIg || !instagramInput.trim()}
                      className="w-full bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmittingIg ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/>
                            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75"/>
                          </svg>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                          </svg>
                          Simpan Instagram
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tabs - IG Style */}
            <div className="flex border-t border-[var(--color-border-color)] mb-2 mt-2 md:mt-4 w-full">
              <button 
                onClick={() => setActiveTab("karya")}
                className={`flex-1 py-2 md:py-3 flex justify-center items-center gap-2 transition-all ${activeTab === "karya" ? "border-t-[1px] border-white text-white" : "border-t-[1px] border-transparent text-[var(--color-text-3)] hover:text-white"}`}
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
                {isLoadingPosts ? (
                  <div className="flex justify-center items-center h-48">
                    <div className="animate-spin w-8 h-8 text-[var(--color-brand-red)] border-t-2 border-b-2 border-current rounded-full"></div>
                  </div>
                ) : userPosts.length > 0 ? (
                  <MasonryGrid posts={userPosts} />
                ) : (
                  <div className="text-center py-20 bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl w-full">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto text-[var(--color-text-3)] mb-4">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <h3 className="text-white font-bold text-lg mb-2">Belum ada karya</h3>
                    <p className="text-[var(--color-text-3)] text-sm max-w-sm mx-auto mb-6">
                      Kamu belum mengunggah karya apapun. Yuk, bagikan karyamu sekarang!
                    </p>
                    <button 
                      onClick={() => setIsUploading(true)}
                      className="bg-[var(--color-brand-red)] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-red-600 transition"
                    >
                      Upload Karya Pertama
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl p-6 md:p-8 w-full">
                <h3 className="text-white font-bold text-lg mb-4">Keterampilan</h3>
                <div className="flex flex-wrap gap-2 mb-8">
                  {(user as any)?.skills && (user as any).skills.length > 0 ? (
                    (user as any).skills.map((skill: string) => (
                      <span key={skill} className="bg-[var(--color-bg)] border border-[var(--color-border-color)] text-[var(--color-text-2)] text-xs font-bold px-3 py-1.5 rounded-lg">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-[var(--color-text-3)] text-sm italic">Belum ada keterampilan yang ditambahkan.</p>
                  )}
                </div>

                <h3 className="text-white font-bold text-lg mb-4">Pendidikan</h3>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0">
                    <img src="/Telkom.png" alt="Telkom" className="w-full h-full object-contain p-1" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">Telkom University Jakarta</h4>
                    <p className="text-[var(--color-text-3)] text-sm">{user?.prodi || "Prodi"} • 2026 - Sekarang</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Profile Modal */}
        {isEditingProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditingProfile(false)}></div>
            <div className="relative bg-[#1c1c1e] border border-[#3a3a3d] rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold text-lg">Edit Profil</h3>
                <button onClick={() => setIsEditingProfile(false)} className="text-[var(--color-text-3)] hover:text-white transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[var(--color-text-2)] text-xs font-semibold mb-1.5 block">Nama Lengkap</label>
                  <input
                    type="text"
                    value={editFullName}
                    disabled={true}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border-color)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-brand-red)] transition opacity-50 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-[var(--color-text-3)] mt-1">Nama lengkap terisi otomatis dari verifikasi (Discord/SKL) dan tidak dapat diubah.</p>
                </div>

                <div>
                  <label className="text-[var(--color-text-2)] text-xs font-semibold mb-1.5 block">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Ceritakan sedikit tentang dirimu..."
                    rows={3}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border-color)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-brand-red)] transition resize-none"
                  />
                </div>

                <div>
                  <label className="text-[var(--color-text-2)] text-xs font-semibold mb-1.5 block">Keterampilan</label>
                  <input
                    type="text"
                    value={editSkills}
                    onChange={(e) => setEditSkills(e.target.value)}
                    placeholder="Contoh: Figma, React, Public Speaking"
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border-color)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-brand-red)] transition"
                  />
                  <p className="text-[10px] text-[var(--color-text-3)] mt-1">Pisahkan dengan koma ( , ) jika lebih dari satu.</p>
                </div>


                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h4 className="text-white text-sm font-semibold">Akun Privat</h4>
                    <p className="text-[var(--color-text-3)] text-xs mt-0.5">Hanya pengikut yang bisa melihat postinganmu.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={editIsPrivate}
                      onChange={(e) => setEditIsPrivate(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-[var(--color-bg)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                  </label>
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile || !editFullName.trim()}
                  className="w-full bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingProfile ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/>
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75"/>
                      </svg>
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verification Result Modals */}
        {verifyResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setVerifyResult(null)}></div>
            <div className="relative bg-[#1c1c1e] border border-[#3a3a3d] rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center">
                {verifyResult.success ? (
                  <>
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <h3 className="text-white text-lg font-bold mb-2">Verifikasi Berhasil!</h3>
                    <p className="text-[#a1a1aa] text-sm mb-6">
                      {verifyResult.message || `Nama lengkap (${verifyResult.nama_lengkap}) dan centang biru telah ditambahkan ke profil Anda.`}
                    </p>
                    <button 
                      onClick={() => setVerifyResult(null)}
                      className="w-full py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition"
                    >
                      Tutup
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#E5271F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <h3 className="text-white text-lg font-bold mb-2">Verifikasi Gagal</h3>
                    <p className="text-[#a1a1aa] text-sm mb-4">
                      {verifyResult.error}
                    </p>
                    {verifyResult.details && verifyResult.details.length > 0 && (
                      <ul className="text-[#E5271F] text-xs text-left w-full bg-red-500/10 p-3 rounded-lg mb-6 space-y-1">
                        {verifyResult.details.map((d, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="shrink-0 mt-0.5">•</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button 
                      onClick={() => setVerifyResult(null)}
                      className="w-full py-2.5 rounded-xl bg-[#2c2c2e] text-white font-semibold text-sm hover:bg-[#3a3a3d] transition"
                    >
                      Mengerti
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      <BottomNav />

      {isUploading && <UploadMediaModal onClose={() => setIsUploading(false)} />}
      
      {/* Network Modal */}
      {networkModalType && usernameForFetch && (
        <FollowNetworkModal 
          username={usernameForFetch} 
          type={networkModalType} 
          onClose={() => setNetworkModalType(null)} 
          onUpdate={mutate}
        />
      )}
    </div>
  );
}
