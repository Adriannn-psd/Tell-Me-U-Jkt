"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";

const fetcher = (url: string) => fetch(url).then(res => res.json());
import TrackerCalendar, { Task } from "@/components/fase3/TrackerCalendar";
import TaskDetailModal from "@/components/fase3/TaskDetailModal";
import AddTaskSheet from "@/components/fase3/AddTaskSheet";
import { useGuest } from "@/components/GuestProvider";

function TrackerContent() {
  const { data, error, isLoading, mutate } = useSWR("/api/tasks", fetcher);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const { isGuest, showLoginPopup } = useGuest();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setIsAddingTask(true);
      router.replace(pathname);
    }
  }, [searchParams, pathname, router]);

  const searchQuery = searchParams.get('q')?.toLowerCase() || "";

  let tasks: Task[] = data?.success ? data.tasks.map((t: any) => ({
    id: t.id,
    title: t.title,
    course: t.course,
    deadline: new Date(t.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    tags: [t.category],
    isUrgent: t.is_urgent,
    notes: t.notes,
    status: t.status
  })) : [];

  if (searchQuery) {
    tasks = tasks.filter(t => 
      t.title.toLowerCase().includes(searchQuery) ||
      (t.course && t.course.toLowerCase().includes(searchQuery)) ||
      (t.notes && t.notes.toLowerCase().includes(searchQuery))
    );
  }

  const handleTaskAdded = () => {
    setIsAddingTask(false);
    mutate(); // Refresh list via SWR
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <Sidebar />
      <Header />
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-5 md:px-8 py-6 pb-28 md:pb-10 md:pt-6 md:pl-[260px] relative">
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
              <p className="text-[var(--color-text-3)] text-xs leading-relaxed">Ini hanya tampilan contoh. Klik di mana saja untuk Login dan menggunakan Academic Tracker sepenuhnya.</p>
            </div>
          </div>
        )}
        
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight mb-2">Academic <span className="text-[var(--color-brand-red)]">Tracker</span></h1>
            <p className="text-[var(--color-text-2)] text-sm md:text-base max-w-md">Pantau jadwal tugas dan deadline-mu agar tidak ada yang terlewat.</p>
          </div>
          
          <button 
            onClick={() => isGuest ? showLoginPopup() : setIsAddingTask(true)}
            className="hidden md:flex bg-[var(--color-brand-red)] text-white w-10 h-10 md:w-auto md:px-5 md:py-2.5 rounded-full md:rounded-xl items-center justify-center font-bold text-sm hover:bg-red-600 transition shadow-[0_4px_14px_rgba(229,39,31,0.4)] shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:mr-2"><path d="M12 5v14M5 12h14"/></svg>
            <span className="hidden md:inline">Tambah Tugas</span>
          </button>
        </div>

        {isLoading && tasks.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <TrackerCalendar 
            tasks={tasks} 
            onTaskClick={(task) => setSelectedTask(task)} 
          />
        )}

      </main>

      <BottomNav />

      {/* Modals & Sheets */}
      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask} 
          onClose={() => {
            setSelectedTask(null);
            mutate(); // Refresh if status changed
          }} 
        />
      )}

      {isAddingTask && (
        <AddTaskSheet 
          onClose={() => setIsAddingTask(false)} 
          onSuccess={handleTaskAdded}
        />
      )}
    </div>
  );
}

export default function TrackerPage() {
  return (
    <Suspense fallback={<div className="flex-1 w-full min-h-[50vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin"></div></div>}>
      <TrackerContent />
    </Suspense>
  );
}

