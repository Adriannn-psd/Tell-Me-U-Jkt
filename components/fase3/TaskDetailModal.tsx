"use client";

import { useState } from "react";
import { Task } from "./TrackerCalendar";

export default function TaskDetailModal({ 
  task, 
  onClose 
}: { 
  task: Task, 
  onClose: () => void 
}) {
  const [loading, setLoading] = useState(false);

  const handleUpdateStatus = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        onClose(); // Parent will refresh
      } else {
        alert("Gagal memperbarui status");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus tugas ini?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        onClose(); // Parent will refresh
      } else {
        alert("Gagal menghapus tugas");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-[var(--color-bg)] border border-[var(--color-border-color)] rounded-[24px] p-6 animate-in zoom-in-95 duration-300 shadow-2xl flex flex-col max-h-[80vh]">
        
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase mb-2 ${task.isUrgent ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-[var(--color-surface-2)] text-[var(--color-text-2)] border border-[var(--color-border-color)]'}`}>
              {task.course}
            </span>
            <h2 className="text-xl font-bold text-white leading-tight">{task.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-2)] hover:text-white transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm font-medium mb-6">
          <div className="flex items-center gap-1.5 text-[var(--color-text-3)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Tenggat: <span className={task.isUrgent ? "text-red-500 font-bold" : "text-white"}>{task.deadline}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--color-text-3)]">
             Status: <span className="text-white font-bold">{task.status === 'done' ? 'Selesai' : task.status === 'in_progress' ? 'Sedang Dikerjakan' : 'Belum Dimulai'}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
          <h3 className="text-sm font-bold text-white mb-2">Instruksi Tugas</h3>
          <p className="text-[var(--color-text-2)] text-sm leading-relaxed mb-4">
            {task.notes || "Tidak ada catatan."}
          </p>
          
          <h3 className="text-sm font-bold text-white mb-2">Kategori</h3>
          <div className="flex flex-wrap gap-2">
            {task.tags.map(tag => (
              <span key={tag} className="text-xs font-semibold text-[var(--color-text-3)] bg-[var(--color-surface)] px-2 py-1 rounded-md border border-[var(--color-border-color)]">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-auto flex-wrap">
          <button 
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 bg-red-500/10 text-red-500 font-bold py-3 rounded-xl hover:bg-red-500/20 transition border border-red-500/20 text-sm disabled:opacity-50"
          >
            Hapus
          </button>
          {task.status !== 'done' && (
            <button 
              onClick={() => handleUpdateStatus('done')}
              disabled={loading}
              className="flex-1 bg-[var(--color-brand-green)] text-white font-bold py-3 rounded-xl hover:bg-green-600 transition shadow-[0_4px_14px_rgba(16,185,129,0.4)] text-sm disabled:opacity-50"
            >
              Tandai Selesai
            </button>
          )}
          {task.status === 'done' && (
            <button 
              onClick={() => handleUpdateStatus('todo')}
              disabled={loading}
              className="flex-1 bg-[var(--color-surface-2)] text-white font-bold py-3 rounded-xl hover:bg-[#2a2a30] transition border border-[var(--color-border-color)] text-sm disabled:opacity-50"
            >
              Batalkan Selesai
            </button>
          )}
        </div>
        
      </div>
    </div>
  );
}
