"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import useSWR from "swr";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useGuest } from "@/components/GuestProvider";
import ProfileLockOverlay, { useProfileCheck } from "@/components/ProfileLockOverlay";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isGuest, showLoginPopup } = useGuest();

  useEffect(() => {
    if (status === "unauthenticated" && !isGuest) {
      router.push("/login");
    }
  }, [status, isGuest, router]);

  const { data, error, mutate } = useSWR(
    status === "authenticated" ? "/api/notifications" : null,
    fetcher
  );

  useEffect(() => {
    if (data?.notifications?.some((n: any) => !n.is_read)) {
      // Mark as read in the background
      fetch("/api/notifications", { method: "PUT" }).then(() => mutate());
    }
  }, [data, mutate]);


  const notifications = data?.notifications || [];
  const { isComplete, missingInfo } = useProfileCheck();
  const [showLock, setShowLock] = useState(false);

  const checkLock = (e?: any) => {
    if (!isComplete) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setShowLock(true);
      return false;
    }
    return true;
  };

  const handleFollowRequest = async (followerId: string, action: "accept" | "reject", btn: HTMLButtonElement, originalText: string) => {
    try {
      const res = await fetch("/api/profile/follow_requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId, action })
      });
      if (res.ok) {
        mutate();
      } else {
        const err = await res.json();
        alert("Gagal memproses: " + (err.error || res.statusText));
        btn.innerText = originalText;
        btn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
      btn.innerText = originalText;
      btn.disabled = false;
    }
  };

  const handleUploadRequest = async (requesterId: string, eventId: string, action: "accept" | "reject", btn: HTMLButtonElement, originalText: string) => {
    try {
      const res = await fetch("/api/dokumentasi/upload_requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId, eventId, action })
      });
      if (res.ok) {
        mutate();
      } else {
        const err = await res.json();
        alert("Gagal memproses: " + (err.error || res.statusText));
        btn.innerText = originalText;
        btn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
      btn.innerText = originalText;
      btn.disabled = false;
    }
  };

  const handleCollabRequest = async (postId: string, action: "accept" | "reject", btn: HTMLButtonElement, originalText: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/collab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        mutate();
      } else {
        const err = await res.json();
        alert("Gagal memproses: " + (err.error || res.statusText));
        btn.innerText = originalText;
        btn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
      btn.innerText = originalText;
      btn.disabled = false;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return `Hari ini, ${format(date, 'HH.mm')}`;
    if (isYesterday(date)) return `Kemarin, ${format(date, 'HH.mm')}`;
    return format(date, 'dd/MM/yyyy, HH.mm');
  };

  const getNotificationContent = (notification: any) => {
    const actorName = notification.actor?.full_name || notification.actor?.username || "Seseorang";
    const actorAvatar = notification.actor?.avatar_url;
    
    let content = "";
    let link = "";
    let actionButtons = null;

    switch (notification.type) {
      case "like":
      case "like_post":
        content = "menyukai postingan karyamu.";
        link = `/post/${notification.reference_id}`;
        break;
      case "comment":
      case "comment_post":
        content = "mengomentari postingan karyamu.";
        link = `/post/${notification.reference_id}`;
        break;
      case "follow_request":
        content = "meminta untuk mengikuti akunmu.";
        link = `/profile/${notification.actor?.username}`;
        actionButtons = (
          <div className="flex gap-2 mt-2">
            <button 
              onClick={(e) => { 
                if (!checkLock(e)) return;
                e.preventDefault(); e.stopPropagation(); 
                const btn = e.currentTarget; 
                const original = btn.innerText;
                btn.innerText = "Memproses..."; btn.disabled = true;
                handleFollowRequest(notification.actor?.id || notification.actor_id, "accept", btn, original); 
              }}
              className="bg-[var(--color-brand-red)] hover:bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition relative z-10 disabled:opacity-50"
            >
              Terima
            </button>
            <button 
              onClick={(e) => { 
                if (!checkLock(e)) return;
                e.preventDefault(); e.stopPropagation(); 
                const btn = e.currentTarget; 
                const original = btn.innerText;
                btn.innerText = "Memproses..."; btn.disabled = true;
                handleFollowRequest(notification.actor?.id || notification.actor_id, "reject", btn, original); 
              }}
              className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface)] text-white text-xs font-bold px-4 py-1.5 rounded-lg transition border border-[var(--color-border-color)] relative z-10 disabled:opacity-50"
            >
              Tolak
            </button>
          </div>
        );
        break;
      case "follow_accept":
      case "follow":
        content = "mulai mengikuti kamu.";
        link = `/profile/${notification.actor?.username}`;
        break;
      case "upload_request":
        content = "meminta izin untuk mengupload dokumentasi di acara yang kamu buat.";
        link = `/dokumentasi/${notification.reference_id}`;
        actionButtons = (
          <div className="flex gap-2 mt-2">
            <button 
              onClick={(e) => { 
                if (!checkLock(e)) return;
                e.preventDefault(); e.stopPropagation(); 
                const btn = e.currentTarget;
                const original = btn.innerText;
                btn.innerText = "Memproses..."; btn.disabled = true;
                handleUploadRequest(notification.actor?.id || notification.actor_id, notification.reference_id, "accept", btn, original); 
              }}
              className="bg-[var(--color-brand-red)] hover:bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition relative z-10 disabled:opacity-50"
            >
              Izinkan
            </button>
            <button 
              onClick={(e) => { 
                if (!checkLock(e)) return;
                e.preventDefault(); e.stopPropagation(); 
                const btn = e.currentTarget;
                const original = btn.innerText;
                btn.innerText = "Memproses..."; btn.disabled = true;
                handleUploadRequest(notification.actor?.id || notification.actor_id, notification.reference_id, "reject", btn, original); 
              }}
              className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface)] text-white text-xs font-bold px-4 py-1.5 rounded-lg transition border border-[var(--color-border-color)] relative z-10 disabled:opacity-50"
            >
              Tolak
            </button>
          </div>
        );
        break;
      case "upload_accept":
        content = "menerima permintaan izin upload dokumentasimu.";
        link = `/dokumentasi/${notification.reference_id}`;
        break;
      case "tugas":
        content = "Ada tugas baru yang harus kamu kerjakan!";
        link = "/ospek";
        break;
      case "mention":
        content = "menyebutmu dalam sebuah karya atau komentar.";
        link = `/post/${notification.reference_id}`;
        break;
      case "reply":
        content = "membalas komentarmu di sebuah karya.";
        link = `/post/${notification.reference_id}`;
        break;
      case "collab_request":
        content = "mengundangmu untuk berkolaborasi dalam sebuah karya.";
        link = `/post/${notification.reference_id}`;
        actionButtons = (
          <div className="flex gap-2 mt-2">
            <button 
              onClick={(e) => { 
                if (!checkLock(e)) return;
                e.preventDefault(); e.stopPropagation(); 
                const btn = e.currentTarget;
                const original = btn.innerText;
                btn.innerText = "Memproses..."; btn.disabled = true;
                handleCollabRequest(notification.reference_id, "accept", btn, original); 
              }}
              className="bg-[var(--color-brand-red)] hover:bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition relative z-10 disabled:opacity-50"
            >
              Terima
            </button>
            <button 
              onClick={(e) => { 
                if (!checkLock(e)) return;
                e.preventDefault(); e.stopPropagation(); 
                const btn = e.currentTarget;
                const original = btn.innerText;
                btn.innerText = "Memproses..."; btn.disabled = true;
                handleCollabRequest(notification.reference_id, "reject", btn, original); 
              }}
              className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface)] text-white text-xs font-bold px-4 py-1.5 rounded-lg transition border border-[var(--color-border-color)] relative z-10 disabled:opacity-50"
            >
              Tolak
            </button>
          </div>
        );
        break;
      case "collab_accept":
        content = "menerima undangan kolaborasimu.";
        link = `/post/${notification.reference_id}`;
        break;
      default:
        content = "berinteraksi dengan profilmu.";
        link = "#";
    }

    return { actorName, actorAvatar, content, link, actionButtons };
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <Sidebar />
      <Header />
      
      <main className="flex-1 w-full max-w-2xl mx-auto md:max-w-3xl md:pl-[260px] px-5 md:px-8 py-6 pb-28 md:pb-10 md:pt-6 relative">
        {isGuest && (
          <div 
            className="absolute inset-0 z-40 bg-black/40 cursor-pointer"
            onClickCapture={(e) => {
              e.preventDefault();
              e.stopPropagation();
              showLoginPopup();
            }}
          >
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1c1c1e]/90 backdrop-blur-md border border-[#2a2a30] px-6 py-5 rounded-2xl shadow-2xl max-w-[90vw] sm:max-w-sm w-full animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
              <h3 className="text-lg font-bold text-white mb-1">Pratinjau Mode Tamu</h3>
              <p className="text-[var(--color-text-3)] text-xs leading-relaxed">Ini hanya tampilan contoh. Klik di mana saja untuk Login dan melihat notifikasimu.</p>
            </div>
          </div>
        )}
        <h1 className="text-white text-xl font-bold mb-6">Notifikasi</h1>

        {(status === "loading" || !data) ? (
          <div className="flex-1 w-full min-h-[50vh] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto text-[var(--color-text-3)] mb-4">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <h3 className="text-white font-bold text-lg mb-2">Belum ada notifikasi</h3>
            <p className="text-[var(--color-text-3)] text-sm max-w-sm mx-auto">
              Saat ada yang berinteraksi dengan profilmu, notifikasinya akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(
              notifications.reduce((acc: any, notif: any) => {
                const date = new Date(notif.created_at);
                let group = "Lebih Lama";
                if (isToday(date)) group = "Hari Ini";
                else if (isYesterday(date)) group = "Kemarin";
                
                if (!acc[group]) acc[group] = [];
                acc[group].push(notif);
                return acc;
              }, {})
            ).sort((a: any, b: any) => {
              const order = { "Hari Ini": 1, "Kemarin": 2, "Lebih Lama": 3 };
              return (order[a[0] as keyof typeof order] || 4) - (order[b[0] as keyof typeof order] || 4);
            }).map(([groupName, groupedNotifs]: [string, any]) => (
              <div key={groupName}>
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-white font-bold text-sm tracking-wide">{groupName}</h3>
                  <div className="flex-1 h-px bg-[var(--color-border-color)]"></div>
                </div>
                <div className="space-y-3">
                  {groupedNotifs.map((notif: any) => {
                    const { actorName, actorAvatar, content, link, actionButtons } = getNotificationContent(notif);
                    
                    return (
                      <div 
                        key={notif.id} 
                        onClick={() => router.push(link)} 
                        className={`block bg-[var(--color-surface)] border ${notif.is_read ? 'border-[var(--color-border-color)]' : 'border-[var(--color-brand-red)]'} rounded-xl p-4 transition hover:bg-[var(--color-surface-2)] cursor-pointer`}
                      >
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-[var(--color-surface-2)] shrink-0 overflow-hidden border border-[var(--color-border-color)]">
                            {actorAvatar ? (
                              <img src={actorAvatar} alt={actorName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                                {actorName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-[var(--color-text-2)] leading-snug">
                              <span className="font-bold text-white">{actorName}</span> {content}
                            </p>
                            <p className="text-xs text-[var(--color-text-3)] mt-1">
                              {formatDate(notif.created_at)}
                            </p>
                            {actionButtons}
                          </div>
                          {!notif.is_read && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-red)] shrink-0 mt-1"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {showLock && <ProfileLockOverlay missingInfo={missingInfo} onClose={() => setShowLock(false)} />}
      </main>

      <BottomNav />
    </div>
  );
}
