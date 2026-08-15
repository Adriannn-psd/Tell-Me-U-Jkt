"use client";

import { useState } from "react";
import ProfileLockOverlay from "@/components/ProfileLockOverlay";

export default function AddTaskSheet({ onClose, onSuccess }: { onClose: () => void, onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    course: "",
    title: "",
    deadline: "",
    category: "tugas",
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        if (onSuccess) onSuccess();
        else onClose();
      } else {
        alert("Gagal menyimpan tugas");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProfileLockOverlay onClose={onClose}>
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="relative bg-[var(--color-bg)] w-full max-w-2xl mx-auto rounded-t-3xl border-t border-[var(--color-border-color)] px-6 py-6 pb-12 animate-in slide-in-from-bottom-full duration-300">
        
        <div className="w-12 h-1.5 bg-[#333] rounded-full mx-auto mb-6" />
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Tambah Tugas Baru</h2>
        </div>
        
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--color-text-2)] uppercase tracking-wide">Mata Kuliah</label>
            <input 
              type="text" 
              placeholder="Contoh: Desain Antarmuka" 
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-xl px-4 py-3.5 text-white outline-none focus:border-[var(--color-brand-red)] transition text-sm"
              required
              value={formData.course}
              onChange={(e) => setFormData({...formData, course: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--color-text-2)] uppercase tracking-wide">Judul Tugas</label>
            <input 
              type="text" 
              placeholder="Contoh: Eksplorasi Wireframe" 
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-xl px-4 py-3.5 text-white outline-none focus:border-[var(--color-brand-red)] transition text-sm"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>
          
          <div className="flex gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-xs font-bold text-[var(--color-text-2)] uppercase tracking-wide">Tenggat Waktu</label>
              <input 
                type="date" 
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-xl px-4 py-3.5 text-white outline-none focus:border-[var(--color-brand-red)] transition text-sm [color-scheme:dark]"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({...formData, deadline: e.target.value})}
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-xs font-bold text-[var(--color-text-2)] uppercase tracking-wide">Kategori</label>
              <select 
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-xl px-4 py-3.5 text-white outline-none focus:border-[var(--color-brand-red)] transition text-sm appearance-none"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="tugas">Tugas</option>
                <option value="ujian">Ujian</option>
                <option value="proyek">Proyek Akhir</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--color-text-2)] uppercase tracking-wide">Catatan / Instruksi</label>
            <textarea 
              placeholder="Tambahkan detail tugas..." 
              rows={3}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--color-brand-red)] transition text-sm resize-none"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-brand-red)] text-white font-bold py-3.5 rounded-xl mt-4 hover:bg-red-600 transition shadow-[0_4px_14px_rgba(229,39,31,0.4)] disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Tugas"}
          </button>
        </form>
      </div>
    </div>
    </ProfileLockOverlay>
  );
}
