"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { useGuest } from "@/components/GuestProvider";
import LoginPanel from "@/components/LoginPanel";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function KalenderPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const { isGuest, showLoginPopup } = useGuest();

  const { data: dbEvents, isLoading } = useSWR('/api/events', fetcher);
  // Fix: Ensure events is always an array
  let events = Array.isArray(dbEvents) ? dbEvents : (dbEvents?.events || dbEvents?.data || []);

  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase();

  if (searchQuery) {
    events = events.filter((e: any) => 
      e.title?.toLowerCase().includes(searchQuery) ||
      e.location?.toLowerCase().includes(searchQuery)
    );
  }

  // Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0 (Mon) to 6 (Sun)
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const renderDays = () => {
    const days = [];
    
    // Empty cells for days before the 1st of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-[#1c1c1e] p-2 rounded-lg min-h-[100px] border border-[#2a2a30]"></div>);
    }

    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events.filter((e: any) => e.date === dateStr);
      
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

      days.push(
        <div key={d} className={`bg-[#1c1c1e] p-2 rounded-lg min-h-[100px] border transition ${isToday ? "border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/5" : "border-[#2a2a30] hover:border-[#3a3a3d]"}`}>
          <div className={`text-sm font-semibold mb-2 ${isToday ? "text-[var(--color-brand-red)]" : "text-[var(--color-text-3)]"}`}>{d}</div>
          <div className="flex flex-col gap-1">
            {dayEvents.map((evt: any, idx: number) => (
              <div 
                key={idx} 
                onClick={() => setSelectedEvent(evt)}
                className="group relative bg-[#2a2a30] hover:bg-[#3a3a3d] cursor-pointer rounded p-1.5 text-[10px] flex flex-col gap-0.5 border border-[#3a3a3d] transition"
              >
                <div className="flex items-center gap-1 text-white font-medium truncate">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-red)] shrink-0"></div>
                  {evt.title}
                </div>
                <div className="text-[9px] text-[var(--color-text-3)] flex justify-between items-center">
                  <span className="truncate pr-1">{evt.time}</span>
                  <span className="text-[8px] bg-black/40 px-1 rounded truncate shrink-0">{evt.visibility}</span>
                </div>

                {/* Pop Up Detail (Hover di Desktop) */}
                <div className="hidden lg:group-hover:flex absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[#1c1c1e] border border-[#3a3a3d] shadow-2xl rounded-xl p-4 flex-col gap-2 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-white font-bold text-sm leading-tight break-words">{evt.title}</h4>
                    <span className="text-[9px] font-medium bg-[#2a2a30] border border-[#3a3a3d] px-2 py-0.5 rounded-full text-[var(--color-text-2)] shrink-0">{evt.visibility}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 text-xs text-[var(--color-text-2)] mt-1">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-[var(--color-brand-red)] shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {evt.time}
                    </div>
                    <div className="flex items-start gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-[var(--color-brand-red)] shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="break-words leading-tight">{evt.location}</span>
                    </div>
                  </div>
                  {/* Arrow for tooltip */}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1c1c1e] border-b border-r border-[#3a3a3d] transform rotate-45"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white p-4 md:p-8 relative">
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
            <p className="text-[var(--color-text-3)] text-xs leading-relaxed">Ini hanya tampilan contoh. Klik di mana saja untuk Login dan melihat kalender akademik.</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Link href="/" className="text-[var(--color-brand-red)] text-sm hover:underline mb-2 inline-flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Kembali ke Beranda
          </Link>
          <h1 className="text-3xl font-black text-white">Kalender Universitas</h1>
          <p className="text-[var(--color-text-2)] text-sm">Lihat semua kegiatan akademik dan UKM dalam bulan ini.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-[#1c1c1e] border border-[#2a2a30] rounded-xl p-2">
          <button onClick={prevMonth} className="p-2 hover:bg-[#2a2a30] rounded-lg transition text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="text-lg font-bold min-w-[120px] text-center">
            {months[month]} {year}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-[#2a2a30] rounded-lg transition text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map(day => (
            <div key={day} className="text-[11px] md:text-sm text-[var(--color-text-3)] font-bold uppercase">{day}</div>
          ))}
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-[var(--color-text-2)]">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin mb-4"></div>
              Memuat kalender...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {renderDays()}
          </div>
        )}
      </div>

      {/* Mobile Modal Detail */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}></div>
          <div className="relative w-full max-w-sm bg-[#1c1c1e] border border-[#2a2a30] rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <div className="flex items-start gap-3 mb-4 pr-10">
              <div className="w-3 h-3 rounded-full bg-[var(--color-brand-red)] shrink-0 mt-1"></div>
              <h3 className="text-white font-bold text-lg leading-tight">{selectedEvent.title}</h3>
            </div>
            <div className="flex flex-col gap-3 text-sm text-[var(--color-text-2)] bg-[#2a2a30]/50 p-4 rounded-xl border border-[#3a3a3d]/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-brand-red)]/20 flex items-center justify-center text-[var(--color-brand-red)] shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <span>{selectedEvent.time}</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-brand-red)]/20 flex items-center justify-center text-[var(--color-brand-red)] shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <span className="leading-tight">{selectedEvent.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-brand-red)]/20 flex items-center justify-center text-[var(--color-brand-red)] shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span>Visibilitas: <span className="text-white font-semibold">{selectedEvent.visibility}</span></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
