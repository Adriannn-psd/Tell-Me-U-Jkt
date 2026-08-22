"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";

interface PhotoDetail {
  id: string;
  scannerName: string;
  scannedName: string;
  scannedIg?: string;
  photoUrl: string;
  createdAt: string;
}

export default function PhotoDetailModal({
  photo,
  onClose,
  onDeleted,
}: {
  photo: PhotoDetail;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/ospek/scan/${photo.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        onDeleted(photo.id);
      } else {
        toast.error(data.error || "Gagal menghapus foto");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col animate-in fade-in duration-200">
      
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3">
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md text-white hover:bg-white/20 transition"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
        <span className="text-white/60 text-sm font-medium">Detail Foto</span>
        <div className="w-10" />
      </div>

      {/* Photo */}
      <div className="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden">
        {photo.photoUrl ? (
          <img 
            src={photo.photoUrl} 
            alt={`${photo.scannerName} & ${photo.scannedName}`}
            className="max-w-full max-h-full object-contain rounded-2xl"
          />
        ) : (
          <div className="w-64 h-64 bg-[var(--color-surface)] rounded-2xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 text-[var(--color-text-3)]">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="bg-[#111] border-t border-white/10 rounded-t-3xl px-6 pt-5 pb-8 space-y-4">
        
        {/* Names */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-brand-red)]/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[var(--color-brand-red)]">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{photo.scannerName} <span className="text-[var(--color-text-3)] font-normal">&</span> {photo.scannedName}</p>
            {photo.scannedIg && (
              <p className="text-[var(--color-brand-red)] text-xs font-medium">@{photo.scannedIg}</p>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-400">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{formatDate(photo.createdAt)}</p>
            <p className="text-[var(--color-text-3)] text-xs">{formatTime(photo.createdAt)} WIB</p>
          </div>
        </div>

        {/* Delete */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/10 transition flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Hapus Foto
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-3 rounded-xl bg-[var(--color-surface)] text-[var(--color-text-2)] font-bold text-sm transition"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/>
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75"/>
                  </svg>
                  Menghapus...
                </>
              ) : "Ya, Hapus"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
