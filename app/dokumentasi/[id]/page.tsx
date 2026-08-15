"use client";

import { useState, useRef, use } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import MediaCard, { MediaData } from "@/components/fase3/MediaCard";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import ProfileLockOverlay, { useProfileCheck } from "@/components/ProfileLockOverlay";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showProfileLock, setShowProfileLock] = useState(false);
  const { isComplete, missingInfo } = useProfileCheck();
  
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', title: '' });

  const showAlert = (title: string) => {
    setModalConfig({ isOpen: true, type: 'alert', title });
  };

  const showConfirm = (title: string, onConfirm: () => void) => {
    setModalConfig({ isOpen: true, type: 'confirm', title, onConfirm });
  };

  const { data, error, isLoading, mutate } = useSWR(`/api/dokumentasi/${id}`, fetcher, {
    revalidateOnFocus: false
  });

  const event = data?.event;
  const mediaList: MediaData[] = data?.media || [];

  const [sortBy, setSortBy] = useState("terbaru");

  const sortedMediaList = [...mediaList].sort((a, b) => {
    if (sortBy === "terbaru") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === "terlama") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortBy === "terpopuler") {
      return (b.likes?.length || 0) - (a.likes?.length || 0);
    }
    return 0;
  });

  const handleUploadClick = () => {
    if (!isComplete) {
      setShowProfileLock(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resData = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/dokumentasi/${id}`, true);
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch(e) {
            reject(new Error(xhr.statusText));
          }
        };
        xhr.onerror = () => reject(new Error("Network Error"));
        xhr.send(formData);
      });
        
      if (resData.success) {
        mutate(); // Refresh the media list
      } else {
        showAlert(resData.error || "Gagal mengunggah foto/video");
      }
    } catch (err) {
      console.error(err);
      showAlert("Terjadi kesalahan sistem saat mengunggah");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset file input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLike = async (mediaId: string) => {
    try {
      // Optimistic UI update
      const currentUserId = session?.user?.discordId || "";
      // mutate(...) could be used for advanced optimistic updates
      
      const res = await fetch(`/api/dokumentasi/media/${mediaId}/like`, { method: "POST" });
      if (res.ok) {
        mutate(); // Re-fetch for simplicity
      }
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleComment = async (mediaId: string, text: string) => {
    try {
      const res = await fetch(`/api/dokumentasi/media/${mediaId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text })
      });
      if (res.ok) {
        mutate();
      }
    } catch (err) {
      console.error("Comment error:", err);
    }
  };

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Sidebar />
      <Header />
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-5 md:px-8 py-6 pb-28 md:pb-10 md:pt-6 md:pl-[260px] relative">
        <Link href="/dokumentasi" className="inline-flex items-center gap-1.5 text-[var(--color-text-2)] hover:text-white transition mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="text-sm font-semibold">Kembali</span>
        </Link>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error || !event ? (
          <div className="text-center text-red-400 py-10 bg-[var(--color-surface)] rounded-2xl border border-red-500/20">
            Event tidak ditemukan
          </div>
        ) : (
          <>
            {/* Sticky Header Container */}
            <div className="sticky top-[60px] md:top-[73px] z-30 bg-[var(--color-bg)]/95 backdrop-blur-md pt-2 md:pt-4 pb-2 md:pb-3 mb-4 md:mb-6 border-b border-[#2a2a30]/30 -mx-5 px-5 md:mx-0 md:px-0">
              {/* Header Section */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-2 md:mb-4">
                <div>
                  <h1 className="text-xl md:text-3xl font-bold text-white mb-1.5 md:mb-2 leading-tight">{event.title}</h1>
                  {event.class_name && (
                    <span className="inline-block bg-[var(--color-surface-2)] text-[var(--color-text-2)] text-xs font-bold px-2.5 py-1 rounded-md mb-2">
                      Kelas: {event.class_name}
                    </span>
                  )}
                  {event.description && (
                    <p className="text-sm text-[var(--color-text-2)] max-w-2xl">{event.description}</p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-4 text-xs text-[var(--color-text-3)]">
                    <span>Dibuat oleh {event.author?.full_name || event.author?.username}</span>
                    <span>•</span>
                    <span>{new Date(event.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {event.drive_folder_id && (
                    <a 
                      href={`https://drive.google.com/drive/folders/${event.drive_folder_id}?usp=sharing`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] border border-[#1DA1F2]/30 font-bold py-2.5 px-4 rounded-xl transition flex items-center gap-2 text-sm"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      <span className="hidden sm:inline">Download (HD)</span>
                    </a>
                  )}

                  {data?.currentUserId === event.user_id && (
                    <button 
                      onClick={() => {
                        showConfirm("Yakin ingin menghapus seluruh dokumentasi ini?", async () => {
                          const res = await fetch(`/api/dokumentasi/${id}`, { method: "DELETE" });
                          if (res.ok) router.push("/dokumentasi");
                          else showAlert("Gagal menghapus dokumentasi");
                        });
                      }}
                      className="bg-transparent border border-[var(--color-border-color)] hover:bg-[var(--color-surface-2)] text-[var(--color-brand-red)] p-2.5 rounded-xl transition shrink-0"
                      title="Hapus Event"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  )}

                  <div className="flex items-center gap-4 px-3 py-1.5 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border-color)] shrink-0">
                    <div className="text-center">
                      <span className="block text-white font-bold text-base">{mediaList.length}</span>
                      <span className="block text-[var(--color-text-3)] text-[9px] uppercase font-bold tracking-wider">Media</span>
                    </div>
                  </div>
                  
                  {data?.canUpload ? (
                    <>
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <button 
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="bg-white hover:bg-gray-200 text-black font-bold py-2.5 px-4 rounded-xl transition flex items-center gap-2 disabled:opacity-50 text-sm shrink-0"
                      >
                        {isUploading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                            <span className="hidden sm:inline">Upload {uploadProgress}%</span>
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            <span className="hidden sm:inline">Upload</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/dokumentasi/${id}/request-upload`, { method: "POST" });
                        if (res.ok) mutate();
                        else showAlert("Gagal mengirim request");
                      }}
                      disabled={data?.uploadStatus === "pending" || data?.uploadStatus === "rejected"}
                      className="bg-[var(--color-brand-red)] hover:bg-red-600 text-white font-bold py-2.5 px-4 rounded-xl transition disabled:opacity-50 text-sm shrink-0"
                    >
                      {data?.uploadStatus === "pending" ? "Menunggu" : data?.uploadStatus === "rejected" ? "Ditolak" : "Minta Izin"}
                    </button>
                  )}
                  
                  {/* Mobile Icon Select */}
                  {mediaList.length > 0 && (
                    <div className="relative md:hidden w-[42px] h-[42px] shrink-0 flex items-center justify-center bg-[#1c1c1e] border border-[#2a2a30] rounded-xl text-[var(--color-text-2)] hover:text-white hover:border-[var(--color-text-3)] transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                      <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      >
                        <option value="terbaru">Terbaru</option>
                        <option value="terpopuler">Terpopuler</option>
                        <option value="terlama">Terlama</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Sorting UI */}
              {mediaList.length > 0 && (
                <div className="hidden md:flex justify-end mt-4">
                  <select 
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="bg-[#1c1c1e] border border-[#2a2a30] text-white px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--color-brand-red)] transition-colors appearance-none pr-8 relative bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-no-repeat bg-[right_12px_center]"
                  >
                    <option value="terbaru">Terbaru</option>
                    <option value="terpopuler">Terpopuler</option>
                    <option value="terlama">Terlama</option>
                  </select>
                </div>
              )}
            </div>

            {mediaList.length > 0 ? (
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-5">
                {sortedMediaList.map((media) => (
                  <MediaCard 
                    key={media.id} 
                    media={media} 
                    currentUserId={data?.currentUserId || null}
                    isEventOwner={data?.currentUserId === event.user_id}
                    onLike={handleLike}
                    onComment={handleComment}
                    onSetCover={async (url) => {
                      const res = await fetch(`/api/dokumentasi/${id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ cover_url: url })
                      });
                      if (res.ok) showAlert("Cover berhasil diubah");
                    }}
                    onDelete={(mediaId) => {
                      showConfirm("Yakin ingin menghapus foto/video ini?", async () => {
                        const res = await fetch(`/api/dokumentasi/media/${mediaId}`, { method: "DELETE" });
                        if (res.ok) mutate();
                        else showAlert("Gagal menghapus foto/video");
                      });
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl">
                <div className="w-16 h-16 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-[var(--color-text-3)]">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Album Masih Kosong</h3>
                <p className="text-[var(--color-text-2)] text-sm max-w-sm mx-auto mb-6">
                  Jadilah yang pertama mengunggah dokumentasi ke event ini.
                </p>
                <button 
                  onClick={handleUploadClick}
                  className="bg-white hover:bg-gray-200 text-black font-bold py-2.5 px-6 rounded-xl transition"
                >
                  Upload Foto Sekarang
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Custom Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} />
          <div className="relative bg-[var(--color-surface)] w-full max-w-sm rounded-3xl border border-[var(--color-border-color)] shadow-2xl p-6 text-center">
            <h3 className="text-white font-bold text-lg mb-6">{modalConfig.title}</h3>
            <div className="flex justify-center gap-3">
              {modalConfig.type === 'confirm' && (
                <button 
                  onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                  className="px-5 py-2.5 rounded-xl border border-[var(--color-border-color)] text-[var(--color-text-2)] hover:text-white font-bold transition"
                >
                  Batal
                </button>
              )}
              <button 
                onClick={() => {
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                  setModalConfig({ ...modalConfig, isOpen: false });
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-white transition ${modalConfig.type === 'confirm' ? 'bg-[var(--color-brand-red)] hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
      {showProfileLock && (
        <ProfileLockOverlay 
          onClose={() => setShowProfileLock(false)} 
          missingInfo={missingInfo} 
        />
      )}
    </div>
  );
}
