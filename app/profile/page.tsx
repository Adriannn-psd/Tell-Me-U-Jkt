"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import AvatarPreviewModal from "@/components/fase3/AvatarPreviewModal";
import FollowNetworkModal from "@/components/fase3/FollowNetworkModal";
import UploadMediaModal from "@/components/fase3/UploadMediaModal";
import AvatarCropModal from "@/components/fase3/AvatarCropModal";
import MasonryGrid, { Post } from "@/components/fase3/MasonryGrid";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useGuest } from "@/components/GuestProvider";
import LoginPanel from "@/components/LoginPanel";

// Removed hardcoded MY_POSTS

const getProdiAcronym = (prodi: string) => {
  if (!prodi) return "UNKNOWN";
  const p = prodi.toLowerCase();
  if (p.includes("sistem informasi")) return "SI";
  if (p.includes("teknologi informasi")) return "TI";
  if (p.includes("informatika")) return "INFOR";
  if (p.includes("komunikasi visual") || p.includes("dkv")) return "DKV";
  if (p.includes("telekomunikasi")) return "TT";
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
      isPrivate: data.profile.is_private || false,
      profile: data.profile
    };
  }
  return { posts: [], stats: { karya: 0, followers: 0, following: 0 }, isPrivate: false, profile: null };
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
  
  // Instagram multi-step verification flow
  type IgStep = "upload" | "ai-preview" | "correction" | "correction-preview" | "confirm" | "cooldown";
  const [igStep, setIgStep] = useState<IgStep>("upload");
  const [igUsername, setIgUsername] = useState(""); // username from AI or correction
  const [igProfilePicUrl, setIgProfilePicUrl] = useState(""); // profile pic from IG
  const [igProfileData, setIgProfileData] = useState<{full_name?: string; follower_count?: number; following_count?: number; is_private?: boolean} | null>(null);
  const [igCorrectionMethod, setIgCorrectionMethod] = useState<"link" | "manual" | null>(null);
  const [igManualInput1, setIgManualInput1] = useState("");
  const [igManualInput2, setIgManualInput2] = useState("");
  const [igLinkInput, setIgLinkInput] = useState("");
  const [igConfirmChecked, setIgConfirmChecked] = useState(false);
  const [igScreenshot, setIgScreenshot] = useState<File | null>(null);
  const [igScreenshotPreview, setIgScreenshotPreview] = useState("");
  const [isProcessingIg, setIsProcessingIg] = useState(false);
  const [isFetchingIgPic, setIsFetchingIgPic] = useState(false);
  const [igCooldownTimer, setIgCooldownTimer] = useState(0);
  const [igNextStepAfterCooldown, setIgNextStepAfterCooldown] = useState<IgStep | null>(null);
  const igFileInputRef = useRef<HTMLInputElement>(null);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (igCooldownTimer > 0) {
      interval = setInterval(() => {
        setIgCooldownTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [igCooldownTimer]);

  const user = session?.user;
  const displayName = user?.fullName || user?.name || "User";
  const avatarUrl = user?.avatarUrl || user?.image;
  const initial = displayName.charAt(0).toUpperCase();
  
  const isSklComplete = user?.isVerified && !!user?.fullName;
  const completedSteps = [isSklComplete, !!user?.kelas, !!user?.instagram].filter(Boolean).length;

  const usernameForFetch = user?.dbUsername || user?.name;
  const { data: profileData = { posts: [], posts_count: 0, followers_count: 0, following_count: 0, stats: { karya: 0, followers: 0, following: 0 }, isPrivate: false }, isLoading: isLoadingPosts, mutate } = useSWR(
    usernameForFetch ? `/api/profile/${usernameForFetch}` : null,
    profileFetcher
  );
  
  const [editFullName, setEditFullName] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editSkills, setEditSkills] = useState("");
  const [editSkillsError, setEditSkillsError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync profile data to edit state
  useEffect(() => {
    if (isEditingProfile) {
      setEditFullName(displayName);
      setEditIsPrivate(profileData.isPrivate);
      setEditBio((profileData as any).profile?.bio || "");
      setEditSkills((profileData as any).profile?.skills?.join(", ") || "");
      setEditAvatarUrl(avatarUrl || "");
    }
  }, [isEditingProfile, displayName, profileData.isPrivate, (profileData as any).profile?.bio, (profileData as any).profile?.skills, avatarUrl]);

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setImageToCrop(null);
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", croppedBlob);

      const timestamp = Math.round(new Date().getTime() / 1000);
      const paramsToSign = {
        timestamp,
        folder: "avatars"
      };

      const signRes = await fetch("/api/sign-upload", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paramsToSign })
      });
      const signData = await signRes.json();
      
      if (!signData.success) throw new Error("Failed to get signature");

      formData.append("api_key", signData.apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signData.signature);
      formData.append("folder", "avatars");

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error?.message || "Upload failed");
      
      setEditAvatarUrl(uploadData.secure_url);
    } catch (err) {
      console.error("Failed to upload avatar", err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setEditSkillsError("");
    const skillsArray = editSkills.split(",").map(s => s.trim()).filter(s => s.length > 0);
    
    if (skillsArray.length > 5) {
      setEditSkillsError("Maksimal 5 keterampilan.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName,
          isPrivate: editIsPrivate,
          bio: editBio,
          skills: skillsArray,
          avatarUrl: editAvatarUrl
        })
      });
      if (res.ok) {
        // Optimistic update so UI doesn't flash empty
        const updatedProfile = {
          ...profileData,
          profile: {
            ...(profileData as any).profile,
            full_name: editFullName,
            is_private: editIsPrivate,
            bio: editBio,
            skills: skillsArray,
            avatar_url: editAvatarUrl
          }
        };
        await mutate(updatedProfile, { revalidate: true }); // refresh profile data
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

  // -- IG Flow: Handle screenshot file selection --
  const handleIgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIgScreenshot(file);
    setIgScreenshotPreview(URL.createObjectURL(file));
    setIgError("");
  };

  // -- IG Flow: Upload screenshot → AI reads username --
  const handleIgScreenshotUpload = async () => {
    if (!igScreenshot) {
      setIgError("Pilih screenshot profil Instagram kamu terlebih dahulu");
      return;
    }

    setIsProcessingIg(true);
    setIgError("");

    try {
      const formData = new FormData();
      formData.append("file", igScreenshot);

      const res = await fetch("/api/user/instagram-verify", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success && data.username) {
        setIgUsername(data.username);
        // Now fetch profile pic
        await fetchIgProfilePic(data.username, "ai-preview");
      } else {
        setIgError(data.error || "Gagal membaca username dari screenshot");
      }
    } catch (err) {
      setIgError("Terjadi kesalahan saat memproses screenshot. Coba lagi.");
    } finally {
      setIsProcessingIg(false);
    }
  };

  // -- IG Flow: Fetch profile picture from IG --
  const fetchIgProfilePic = async (username: string, nextStep: IgStep) => {
    setIsFetchingIgPic(true);
    setIgError("");
    try {
      const res = await fetch(`/api/user/ig-profile-pic?username=${encodeURIComponent(username)}`);
      const data = await res.json();

      if (res.status === 429 && data.cooldown) {
        setIgCooldownTimer(30);
        setIgNextStepAfterCooldown(nextStep);
        setIgStep("cooldown");
        setIgProfilePicUrl("");
        setIgProfileData(null);
        return;
      }

      if (res.ok && data.success) {
        setIgProfilePicUrl(data.profile_pic_url || "");
        if (data.full_name || data.follower_count !== undefined) {
          setIgProfileData({
            full_name: data.full_name,
            follower_count: data.follower_count,
            following_count: data.following_count,
            is_private: data.is_private,
          });
        } else {
          setIgProfileData(null);
        }
      } else {
        // Profile pic fetch failed, but we still have the username
        setIgProfilePicUrl("");
        setIgProfileData(null);
      }
      setIgStep(nextStep);
    } catch {
      setIgProfilePicUrl("");
      setIgProfileData(null);
      setIgStep(nextStep);
    } finally {
      setIsFetchingIgPic(false);
    }
  };

  // -- IG Flow: User confirms AI result is correct → go to checkbox --
  const handleIgConfirmCorrect = () => {
    setIgStep("confirm");
  };

  // -- IG Flow: User says AI result is wrong → show correction options --
  const handleIgConfirmWrong = () => {
    setIgCorrectionMethod(null);
    setIgManualInput1("");
    setIgManualInput2("");
    setIgLinkInput("");
    setIgError("");
    setIgStep("correction");
  };

  // -- IG Flow: Extract username from IG link --
  const extractUsernameFromLink = (link: string): string => {
    let cleaned = link.trim();
    if (cleaned.includes("instagram.com/")) {
      const parts = cleaned.split("instagram.com/");
      cleaned = parts[parts.length - 1].split("/")[0].split("?")[0];
    }
    if (cleaned.startsWith("@")) cleaned = cleaned.substring(1);
    return cleaned.replace(/\s+/g, "").toLowerCase();
  };

  // -- IG Flow: Submit correction (link or manual) --
  const handleIgCorrectionSubmit = async () => {
    setIgError("");
    let correctedUsername = "";

    if (igCorrectionMethod === "link") {
      correctedUsername = extractUsernameFromLink(igLinkInput);
      if (!correctedUsername) {
        setIgError("Masukkan link profil Instagram yang valid");
        return;
      }
    } else if (igCorrectionMethod === "manual") {
      const u1 = igManualInput1.trim().toLowerCase().replace(/^@/, "");
      const u2 = igManualInput2.trim().toLowerCase().replace(/^@/, "");
      if (!u1 || !u2) {
        setIgError("Isi kedua kolom username");
        return;
      }
      if (u1 !== u2) {
        setIgError("Username tidak cocok! Pastikan keduanya sama persis.");
        return;
      }
      correctedUsername = u1;
    } else {
      setIgError("Pilih metode koreksi terlebih dahulu");
      return;
    }

    setIgUsername(correctedUsername);
    setIsProcessingIg(true);
    await fetchIgProfilePic(correctedUsername, "correction-preview");
    setIsProcessingIg(false);
  };

  // -- IG Flow: Final submit to save Instagram username --
  const handleInstagramSubmit = async () => {
    if (!igUsername.trim()) {
      setIgError("Username Instagram tidak ditemukan");
      return;
    }
    if (!igConfirmChecked) {
      setIgError("Centang pernyataan konfirmasi terlebih dahulu");
      return;
    }

    setIsSubmittingIg(true);
    setIgError("");

    try {
      const res = await fetch("/api/user/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagram: igUsername }),
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
      {previewAvatarUrl && (
        <AvatarPreviewModal 
          imageUrl={previewAvatarUrl} 
          onClose={() => setPreviewAvatarUrl(null)} 
        />
      )}
      
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
                      <img 
                        src={avatarUrl} 
                        alt="Avatar" 
                        onClick={() => setPreviewAvatarUrl(avatarUrl)}
                        className="w-full h-full rounded-full object-cover border-2 border-[var(--color-bg)] cursor-pointer" 
                      />
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
                {(!user?.isVerified || !user?.fullName) && (
                  <div className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          <polyline points="9 12 11 14 15 10"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm">
                          {!user?.isVerified ? "1. Verifikasi Identitas" : "1. Lengkapi Nama (Upload SKL Lagi)"}
                        </h3>
                        <p className="text-[var(--color-text-3)] text-xs mt-1">
                          {!user?.isVerified 
                            ? "Upload file PDF SKL atau screenshot bagian atas SKL yang berisi nama lengkap dan jurusan untuk mendapatkan centang biru." 
                            : "Sistem membutuhkan nama lengkap kamu. Silakan upload ulang SKL kamu (PDF atau gambar)."}
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

                {/* 3. Instagram Verification Card */}
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

                    {/* Step indicator */}
                    <div className="flex items-center gap-1 mb-4">
                      {["upload", "ai-preview", "confirm"].map((step, i) => (
                        <div key={step} className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full transition-colors ${
                            (igStep === step || 
                             (step === "ai-preview" && (igStep === "correction" || igStep === "correction-preview")) ||
                             (step === "confirm" && igStep === "confirm"))
                              ? "bg-pink-500" 
                              : "bg-[var(--color-border-color)]"
                          }`} />
                          {i < 2 && <div className="w-6 h-px bg-[var(--color-border-color)]" />}
                        </div>
                      ))}
                    </div>

                    {/* STEP 1: Upload Screenshot */}
                    {igStep === "upload" && (
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-[var(--color-text-2)] block">
                          Screenshot Halaman Profil Instagram Kamu
                        </label>
                        <input
                          ref={igFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleIgFileSelect}
                        />
                        <div
                          onClick={() => igFileInputRef.current?.click()}
                          className="border-2 border-dashed border-[var(--color-border-color)] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500/50 transition group"
                        >
                          {igScreenshotPreview ? (
                            <img src={igScreenshotPreview} alt="Screenshot preview" className="max-h-48 rounded-lg object-contain" />
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-[var(--color-text-3)] group-hover:text-pink-400 transition mb-2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span className="text-xs text-[var(--color-text-3)] group-hover:text-pink-400 transition">
                                Tap untuk upload screenshot
                              </span>
                            </>
                          )}
                        </div>

                        <p className="text-[10px] text-[var(--color-text-3)] flex items-start gap-1">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                          <span>Screenshot halaman profil Instagram kamu. AI akan membaca username secara otomatis.</span>
                        </p>

                        {igError && <p className="text-red-400 text-xs">{igError}</p>}

                        <button
                          onClick={handleIgScreenshotUpload}
                          disabled={isProcessingIg || !igScreenshot}
                          className="w-full bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isProcessingIg ? (
                            <>
                              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/>
                                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75"/>
                              </svg>
                              AI sedang membaca...
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                              Proses Screenshot
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* STEP 2: AI Preview — show profile pic + username */}
                    {igStep === "ai-preview" && (
                      <div className="space-y-4">
                        <div className="bg-[var(--color-bg)] border border-[var(--color-border-color)] rounded-xl p-4">
                          <p className="text-[10px] text-[var(--color-text-3)] mb-3 uppercase tracking-wider font-semibold">Hasil AI — Apakah ini akun kamu?</p>
                          
                          <div className="flex items-center gap-4">
                            {/* Profile Picture */}
                            <div className="shrink-0">
                              {isFetchingIgPic ? (
                                <div className="w-16 h-16 rounded-full bg-[var(--color-border-color)] animate-pulse" />
                              ) : igProfilePicUrl ? (
                                <img src={igProfilePicUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-pink-500/30" />
                              ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white text-xl font-bold">
                                  {igUsername.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            
                            {/* Username + Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-bold text-base truncate">@{igUsername}</p>
                              {igProfileData?.full_name && (
                                <p className="text-[var(--color-text-3)] text-xs truncate">{igProfileData.full_name}</p>
                              )}
                              {igProfileData && (
                                <div className="flex gap-3 mt-1">
                                  {igProfileData.follower_count !== undefined && (
                                    <span className="text-[10px] text-[var(--color-text-3)]">
                                      <span className="text-white font-semibold">{igProfileData.follower_count.toLocaleString()}</span> followers
                                    </span>
                                  )}
                                  {igProfileData.following_count !== undefined && (
                                    <span className="text-[10px] text-[var(--color-text-3)]">
                                      <span className="text-white font-semibold">{igProfileData.following_count.toLocaleString()}</span> following
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {igError && <p className="text-red-400 text-xs">{igError}</p>}

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={handleIgConfirmWrong}
                            className="py-3 rounded-xl font-bold text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 transition flex items-center justify-center gap-1.5"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Salah
                          </button>
                          <button
                            onClick={handleIgConfirmCorrect}
                            className="py-3 rounded-xl font-bold text-sm bg-green-600 text-white hover:bg-green-500 transition flex items-center justify-center gap-1.5"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>
                            Benar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 3: Correction — choose link or manual */}
                    {igStep === "correction" && (
                      <div className="space-y-3">
                        <p className="text-xs text-[var(--color-text-2)]">Pilih cara koreksi username:</p>

                        {/* Option buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => { setIgCorrectionMethod("link"); setIgError(""); }}
                            className={`py-3 px-3 rounded-xl text-xs font-semibold border transition flex flex-col items-center gap-1.5 ${
                              igCorrectionMethod === "link" 
                                ? "border-pink-500 bg-pink-500/10 text-pink-400" 
                                : "border-[var(--color-border-color)] text-[var(--color-text-2)] hover:border-pink-500/50"
                            }`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            Link Profil IG
                          </button>
                          <button
                            onClick={() => { setIgCorrectionMethod("manual"); setIgError(""); }}
                            className={`py-3 px-3 rounded-xl text-xs font-semibold border transition flex flex-col items-center gap-1.5 ${
                              igCorrectionMethod === "manual" 
                                ? "border-pink-500 bg-pink-500/10 text-pink-400" 
                                : "border-[var(--color-border-color)] text-[var(--color-text-2)] hover:border-pink-500/50"
                            }`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Input Manual
                          </button>
                        </div>

                        {/* Link input */}
                        {igCorrectionMethod === "link" && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                            <label className="text-[10px] font-semibold text-[var(--color-text-3)] block">Paste link profil Instagram kamu</label>
                            <input
                              type="text"
                              placeholder="https://www.instagram.com/username_kamu/"
                              value={igLinkInput}
                              onChange={(e) => setIgLinkInput(e.target.value)}
                              className="w-full bg-[var(--color-bg)] border border-[var(--color-border-color)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500 transition"
                            />
                          </div>
                        )}

                        {/* Manual double input */}
                        {igCorrectionMethod === "manual" && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                            <label className="text-[10px] font-semibold text-[var(--color-text-3)] block">Ketik username kamu 2 kali (untuk memastikan tidak typo)</label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-4 flex items-center text-[var(--color-text-3)] font-medium">@</span>
                              <input
                                type="text"
                                placeholder="username pertama"
                                value={igManualInput1}
                                onChange={(e) => setIgManualInput1(e.target.value)}
                                className="w-full bg-[var(--color-bg)] border border-[var(--color-border-color)] text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-pink-500 transition"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-4 flex items-center text-[var(--color-text-3)] font-medium">@</span>
                              <input
                                type="text"
                                placeholder="ulangi username"
                                value={igManualInput2}
                                onChange={(e) => setIgManualInput2(e.target.value)}
                                className="w-full bg-[var(--color-bg)] border border-[var(--color-border-color)] text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-pink-500 transition"
                              />
                            </div>
                            {igManualInput1 && igManualInput2 && igManualInput1.trim().toLowerCase().replace(/^@/, "") !== igManualInput2.trim().toLowerCase().replace(/^@/, "") && (
                              <p className="text-red-400 text-[10px] flex items-center gap-1">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                Username tidak cocok
                              </p>
                            )}
                          </div>
                        )}

                        {igError && <p className="text-red-400 text-xs">{igError}</p>}

                        {igCorrectionMethod && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setIgStep("upload"); setIgCorrectionMethod(null); setIgError(""); }}
                              className="flex-1 py-3 rounded-xl font-bold text-sm border border-[var(--color-border-color)] text-[var(--color-text-2)] hover:bg-white/5 transition"
                            >
                              Kembali
                            </button>
                            <button
                              onClick={handleIgCorrectionSubmit}
                              disabled={isProcessingIg || (igCorrectionMethod === "link" ? !igLinkInput.trim() : (!igManualInput1.trim() || !igManualInput2.trim()))}
                              className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {isProcessingIg ? (
                                <>
                                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/>
                                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75"/>
                                  </svg>
                                  Memproses...
                                </>
                              ) : "Verifikasi"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* STEP 3.5: Correction Preview — same as ai-preview but after correction */}
                    {igStep === "correction-preview" && (
                      <div className="space-y-4">
                        <div className="bg-[var(--color-bg)] border border-[var(--color-border-color)] rounded-xl p-4">
                          <p className="text-[10px] text-[var(--color-text-3)] mb-3 uppercase tracking-wider font-semibold">Hasil Koreksi — Apakah ini akun kamu?</p>
                          
                          <div className="flex items-center gap-4">
                            <div className="shrink-0">
                              {isFetchingIgPic ? (
                                <div className="w-16 h-16 rounded-full bg-[var(--color-border-color)] animate-pulse" />
                              ) : igProfilePicUrl ? (
                                <img src={igProfilePicUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-pink-500/30" />
                              ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white text-xl font-bold">
                                  {igUsername.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-bold text-base truncate">@{igUsername}</p>
                              {igProfileData?.full_name && (
                                <p className="text-[var(--color-text-3)] text-xs truncate">{igProfileData.full_name}</p>
                              )}
                              {igProfileData && (
                                <div className="flex gap-3 mt-1">
                                  {igProfileData.follower_count !== undefined && (
                                    <span className="text-[10px] text-[var(--color-text-3)]">
                                      <span className="text-white font-semibold">{igProfileData.follower_count.toLocaleString()}</span> followers
                                    </span>
                                  )}
                                  {igProfileData.following_count !== undefined && (
                                    <span className="text-[10px] text-[var(--color-text-3)]">
                                      <span className="text-white font-semibold">{igProfileData.following_count.toLocaleString()}</span> following
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {igError && <p className="text-red-400 text-xs">{igError}</p>}

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => { setIgStep("correction"); setIgError(""); }}
                            className="py-3 rounded-xl font-bold text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 transition flex items-center justify-center gap-1.5"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Masih Salah
                          </button>
                          <button
                            onClick={handleIgConfirmCorrect}
                            className="py-3 rounded-xl font-bold text-sm bg-green-600 text-white hover:bg-green-500 transition flex items-center justify-center gap-1.5"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>
                            Benar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 3.6: Cooldown */}
                    {igStep === "cooldown" && (
                      <div className="space-y-4 text-center py-6">
                        <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                        </div>
                        <h4 className="text-white font-bold">Server Sedang Sibuk</h4>
                        <p className="text-sm text-[var(--color-text-2)]">
                          Terlalu banyak permintaan ke Instagram. Silakan tunggu sebentar sebelum kami bisa mengambil foto profil kamu.
                        </p>
                        
                        <div className="text-3xl font-mono font-bold text-orange-400 py-2">
                          00:{igCooldownTimer.toString().padStart(2, '0')}
                        </div>

                        {igCooldownTimer > 0 ? (
                          <p className="text-xs text-[var(--color-text-3)] animate-pulse">
                            Tunggu {igCooldownTimer} detik...
                          </p>
                        ) : (
                          <button
                            onClick={() => {
                              setIsProcessingIg(true);
                              fetchIgProfilePic(igUsername, igNextStepAfterCooldown || "ai-preview").finally(() => setIsProcessingIg(false));
                            }}
                            disabled={isProcessingIg}
                            className="mt-2 w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white hover:opacity-90 transition disabled:opacity-40"
                          >
                            {isProcessingIg ? "Memproses..." : "Coba Ambil Foto Lagi"}
                          </button>
                        )}
                        
                        <button
                          onClick={() => setIgStep(igNextStepAfterCooldown || "ai-preview")}
                          className="mt-2 w-full py-3 rounded-xl font-bold text-sm border border-[var(--color-border-color)] text-[var(--color-text-2)] hover:bg-white/5 transition"
                        >
                          Lewati Foto (Lanjut tanpa foto)
                        </button>
                      </div>
                    )}

                    {/* STEP 4: Confirm — checkbox + save */}
                    {igStep === "confirm" && (
                      <div className="space-y-4">
                        {/* Mini preview */}
                        <div className="flex items-center gap-3 bg-[var(--color-bg)] border border-[var(--color-border-color)] rounded-xl p-3">
                          {igProfilePicUrl ? (
                            <img src={igProfilePicUrl} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-pink-500/30" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {igUsername.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white font-bold text-sm truncate">@{igUsername}</p>
                            {igProfileData?.full_name && (
                              <p className="text-[var(--color-text-3)] text-[10px] truncate">{igProfileData.full_name}</p>
                            )}
                          </div>
                        </div>

                        {/* Checkbox pernyataan */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="relative mt-0.5">
                            <input
                              type="checkbox"
                              checked={igConfirmChecked}
                              onChange={(e) => setIgConfirmChecked(e.target.checked)}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                              igConfirmChecked 
                                ? "bg-pink-500 border-pink-500" 
                                : "border-[var(--color-border-color)] group-hover:border-pink-500/50"
                            }`}>
                              {igConfirmChecked && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-[var(--color-text-2)] leading-relaxed">
                            Saya menyatakan bahwa <span className="text-white font-semibold">@{igUsername}</span> adalah benar akun Instagram milik saya. Saya memahami bahwa username ini <span className="text-red-400 font-semibold">tidak dapat diubah</span> setelah disimpan.
                          </span>
                        </label>

                        {igError && <p className="text-red-400 text-xs">{igError}</p>}

                        <div className="flex gap-2">
                          <button
                            onClick={() => { setIgStep("upload"); setIgConfirmChecked(false); setIgError(""); }}
                            className="flex-1 py-3 rounded-xl font-bold text-sm border border-[var(--color-border-color)] text-[var(--color-text-2)] hover:bg-white/5 transition"
                          >
                            Ulangi
                          </button>
                          <button
                            onClick={handleInstagramSubmit}
                            disabled={isSubmittingIg || !igConfirmChecked}
                            className="flex-1 bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      </div>
                    )}

                    {/* Warning footer */}
                    <p className="text-[10px] text-[var(--color-text-3)] mt-3 flex items-start gap-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 mt-0.5 shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <span>Setelah disimpan, username Instagram tidak dapat diubah lagi!</span>
                    </p>
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
                  {(profileData as any)?.profile?.skills && (profileData as any).profile.skills.length > 0 ? (
                    (profileData as any).profile.skills.map((skill: string) => (
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
                <div className="flex flex-col items-center mb-6">
                  <div 
                    className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[#333338] bg-[#2c2c2e] cursor-pointer group flex items-center justify-center shrink-0"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {isUploadingAvatar ? (
                      <div className="w-8 h-8 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        {editAvatarUrl ? (
                          <img src={editAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl font-bold text-[#8e8e93]">{initial}</span>
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--color-text-3)] mt-2">Klik foto untuk mengganti</p>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={avatarInputRef} 
                    onChange={handleAvatarFileSelect} 
                  />
                </div>

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
                  {editSkillsError ? (
                    <p className="text-[10px] text-red-400 mt-1">{editSkillsError}</p>
                  ) : (
                    <p className="text-[10px] text-[var(--color-text-3)] mt-1">Pisahkan dengan koma ( , ) jika lebih dari satu. Maks 5.</p>
                  )}
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

      {isUploading && (
        <UploadMediaModal onClose={() => setIsUploading(false)} />
      )}
      
      {imageToCrop && (
        <AvatarCropModal
          imageSrc={imageToCrop}
          onClose={() => setImageToCrop(null)}
          onCropComplete={handleCropComplete}
        />
      )}
      
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
