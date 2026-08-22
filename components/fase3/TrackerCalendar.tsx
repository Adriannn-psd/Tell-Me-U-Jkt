"use client";

import { useState } from "react";
import { mutate } from "swr";
import { useGuest } from "@/components/GuestProvider";

export interface Task {
  id: string;
  title: string;
  course: string;
  deadline: string;
  tags: string[];
  isUrgent: boolean;
  status: string;
  notes?: string;
}

export default function TrackerCalendar({ 
  tasks, 
  onTaskClick 
}: { 
  tasks: Task[], 
  onTaskClick: (task: Task) => void 
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewingMoreStatus, setViewingMoreStatus] = useState<string | null>(null);
  const { isGuest, showLoginPopup } = useGuest();

  const handleStatusChange = async (e: React.MouseEvent, taskId: string, newStatus: string) => {
    e.stopPropagation(); // Prevent opening modal
    if (isGuest) {
      showLoginPopup();
      return;
    }
    if (updatingId) return;

    setUpdatingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        mutate('/api/tasks');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');
  // Sort tasks by deadline for upcoming, tasks are likely already sorted but just in case.
  const upcomingTasks = tasks.filter(t => t.status !== 'done').slice(0, 3);

  const renderTaskCard = (task: Task, currentStatus: string) => {
    return (
      <div 
        key={task.id} 
        onClick={() => isGuest ? showLoginPopup() : onTaskClick(task)}
        className={`group bg-[var(--color-bg)] border ${task.isUrgent ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-[var(--color-border-color)]'} rounded-xl p-3 cursor-pointer hover:border-[var(--color-text-3)] transition flex flex-col gap-2 relative`}
      >
        {updatingId === task.id && (
           <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center rounded-xl z-10">
             <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
           </div>
        )}
        <div className="flex justify-between items-start">
          <span className="text-[9px] bg-[var(--color-surface-2)] px-2 py-0.5 rounded-md font-semibold text-[var(--color-text-2)]">{task.course}</span>
          {task.isUrgent && <span className="text-[9px] text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Urgent</span>}
        </div>
        <h4 className="text-white font-bold text-xs leading-tight pr-2">{task.title}</h4>
        <div className="flex items-center gap-1.5 mt-auto text-[var(--color-text-3)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span className="text-[10px] font-medium">{task.deadline}</span>
        </div>
        
        {/* Status Actions */}
        <div className="mt-1.5 pt-2 border-t border-[var(--color-border-color)] flex gap-1.5">
          {currentStatus === 'todo' && (
            <button onClick={(e) => handleStatusChange(e, task.id, 'in_progress')} className="flex-1 bg-[var(--color-surface-2)] hover:bg-[#3a3a3d] text-white text-[9px] font-bold py-1.5 rounded-lg transition">Mulai Kerjakan</button>
          )}
          {currentStatus === 'in_progress' && (
            <>
              <button onClick={(e) => handleStatusChange(e, task.id, 'todo')} className="w-8 bg-[var(--color-surface-2)] hover:bg-[#3a3a3d] text-[var(--color-text-3)] text-[9px] font-bold py-1.5 rounded-lg transition flex items-center justify-center shrink-0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="m15 18-6-6 6-6"/></svg></button>
              <button onClick={(e) => handleStatusChange(e, task.id, 'done')} className="flex-1 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] text-[9px] font-bold py-1.5 rounded-lg transition">Selesaikan</button>
            </>
          )}
          {currentStatus === 'done' && (
            <button onClick={(e) => handleStatusChange(e, task.id, 'in_progress')} className="flex-1 bg-[var(--color-surface-2)] hover:bg-[#3a3a3d] text-[var(--color-text-3)] text-[9px] font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>Kembalikan</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
    <div className="w-full flex flex-col xl:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* KANBAN BOARD */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Papan Tugas</h2>
        </div>
        
        {/* Horizontal Scroll on Mobile, Grid on Desktop */}
        <div className="flex overflow-x-auto pb-4 -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-3 gap-5 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* TO DO COLUMN */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl p-4 flex flex-col gap-3 min-w-[280px] w-[85vw] md:w-auto md:min-w-0 snap-center shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[var(--color-text-2)] font-bold text-xs uppercase flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> To Do
              </h3>
              <span className="text-[10px] bg-[var(--color-surface-2)] text-[var(--color-text-3)] px-2 py-0.5 rounded-full font-bold">{todoTasks.length}</span>
            </div>
            <div className="flex flex-col gap-3 pr-1">
              {todoTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-[var(--color-border-color)] rounded-xl">
                  <span className="text-[var(--color-text-3)] text-xs font-semibold">Kosong</span>
                </div>
              ) : (
                <>
                  {todoTasks.slice(0, 2).map(task => renderTaskCard(task, 'todo'))}
                  {todoTasks.length > 2 && (
                    <button 
                      onClick={() => setViewingMoreStatus('todo')}
                      className="w-full py-2.5 mt-1 border border-dashed border-[var(--color-border-color)] text-[var(--color-text-3)] text-xs font-bold rounded-xl hover:bg-[var(--color-surface-2)] hover:text-white transition"
                    >
                      Lihat {todoTasks.length - 2} tugas lainnya
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* IN PROGRESS COLUMN */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl p-4 flex flex-col gap-3 min-w-[280px] w-[85vw] md:w-auto md:min-w-0 snap-center shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[var(--color-text-2)] font-bold text-xs uppercase flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div> In Progress
              </h3>
              <span className="text-[10px] bg-[var(--color-surface-2)] text-[var(--color-text-3)] px-2 py-0.5 rounded-full font-bold">{inProgressTasks.length}</span>
            </div>
            <div className="flex flex-col gap-3 pr-1">
              {inProgressTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-[var(--color-border-color)] rounded-xl">
                  <span className="text-[var(--color-text-3)] text-xs font-semibold">Kosong</span>
                </div>
              ) : (
                <>
                  {inProgressTasks.slice(0, 2).map(task => renderTaskCard(task, 'in_progress'))}
                  {inProgressTasks.length > 2 && (
                    <button 
                      onClick={() => setViewingMoreStatus('in_progress')}
                      className="w-full py-2.5 mt-1 border border-dashed border-[var(--color-border-color)] text-[var(--color-text-3)] text-xs font-bold rounded-xl hover:bg-[var(--color-surface-2)] hover:text-white transition"
                    >
                      Lihat {inProgressTasks.length - 2} tugas lainnya
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* DONE COLUMN */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl p-4 flex flex-col gap-3 min-w-[280px] w-[85vw] md:w-auto md:min-w-0 snap-center shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[var(--color-text-2)] font-bold text-xs uppercase flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#10b981]"></div> Done
              </h3>
              <span className="text-[10px] bg-[var(--color-surface-2)] text-[var(--color-text-3)] px-2 py-0.5 rounded-full font-bold">{doneTasks.length}</span>
            </div>
            <div className="flex flex-col gap-3 pr-1">
              {doneTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-[var(--color-border-color)] rounded-xl">
                  <span className="text-[var(--color-text-3)] text-xs font-semibold">Kosong</span>
                </div>
              ) : (
                <>
                  {doneTasks.slice(0, 2).map(task => renderTaskCard(task, 'done'))}
                  {doneTasks.length > 2 && (
                    <button 
                      onClick={() => setViewingMoreStatus('done')}
                      className="w-full py-2.5 mt-1 border border-dashed border-[var(--color-border-color)] text-[var(--color-text-3)] text-xs font-bold rounded-xl hover:bg-[var(--color-surface-2)] hover:text-white transition"
                    >
                      Lihat {doneTasks.length - 2} tugas lainnya
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* UPCOMING TASKS SIDEBAR */}
      <div className="w-full xl:w-80 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Tugas Terdekat</h3>
        </div>
        <div className="flex flex-col gap-3">
          {upcomingTasks.length === 0 ? (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-[var(--color-surface-2)] rounded-full flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[var(--color-text-3)]"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <span className="text-[var(--color-text-2)] text-sm font-semibold">Yay! Tidak ada tugas terdekat.</span>
            </div>
          ) : (
            upcomingTasks.map(task => (
              <div 
                key={task.id} 
                onClick={() => isGuest ? showLoginPopup() : onTaskClick(task)}
                className="group bg-[var(--color-surface)] border border-[var(--color-border-color)] hover:border-[var(--color-brand-red)] rounded-2xl p-4 cursor-pointer transition relative overflow-hidden"
              >
                {/* Glow effect */}
                <div className={`absolute top-0 right-0 w-24 h-24 ${task.isUrgent ? 'bg-[var(--color-brand-red)]' : 'bg-blue-500'} opacity-[0.03] rounded-bl-full transition group-hover:opacity-10`}></div>
                
                <div className="flex items-start gap-3 relative z-10">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${task.isUrgent ? 'bg-[var(--color-brand-red)]/10 text-[var(--color-brand-red)]' : 'bg-[var(--color-surface-2)] text-white'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold text-sm mb-1 truncate">{task.title}</h4>
                    <p className="text-[var(--color-text-2)] text-xs font-medium truncate mb-2">{task.course}</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                      <span className="bg-[#2a2a30] text-[var(--color-text-3)] px-2 py-1 rounded-md flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {task.deadline}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>

      {/* View More Modal */}
      {viewingMoreStatus && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setViewingMoreStatus(null)}></div>
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#1c1c1e] border border-[#2a2a30] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-6 shrink-0">
              <h2 className="min-w-0 text-white font-bold text-lg sm:text-xl uppercase">
                Semua Tugas: {viewingMoreStatus.replace('_', ' ')}
              </h2>
              <button
                onClick={() => setViewingMoreStatus(null)}
                className="w-8 h-8 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#3a3a3d] [&::-webkit-scrollbar-thumb]:rounded-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tasks.filter(t => t.status === viewingMoreStatus).map(task => renderTaskCard(task, viewingMoreStatus))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
