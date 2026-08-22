"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useGuest } from "@/components/GuestProvider";
import { useSession } from "next-auth/react";
import ProfileLockOverlay, { useProfileCheck } from "@/components/ProfileLockOverlay";
import TimePickerPopup from "./TimePickerPopup";
import { toast } from "@/lib/toast";
import { confirmAction } from "@/lib/confirm";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function KalenderTerdekat({ isModal = false, onClose }: { isModal?: boolean, onClose?: () => void }) {
  const { data: session } = useSession();
  const { isGuest, showLoginPopup } = useGuest();
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };



  const getMonthYearStr = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const m = currentWeekBase.getMonth();
    const y = currentWeekBase.getFullYear();
    return `${months[m]} ${y}`;
  };

  const [currentWeekBase, setCurrentWeekBase] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [weekDates, setWeekDates] = useState<{ dateNum: number, dateStr: string }[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({ title: "", time: "", location: "", visibility: "Diri Sendiri" });
  const { isComplete, missingInfo } = useProfileCheck();
  const [showLock, setShowLock] = useState(false);

  const { data: dbEvents, mutate, isLoading } = useSWR('/api/events', fetcher);
  
  // Provide fallback events when loading or empty db, and ensure it's an array
  const events = isLoading || !Array.isArray(dbEvents) ? [] : dbEvents;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !selectedDateStr) return;
    
    setIsSubmitting(true);
    try {
      const url = editEventId ? `/api/events/${editEventId}` : '/api/events';
      const method = editEventId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newEvent.title,
          date: selectedDateStr,
          time: newEvent.time || "Sepanjang hari",
          location: newEvent.location || "-",
          visibility: newEvent.visibility
        })
      });

      if (res.ok) {
        setNewEvent({ title: "", time: "", location: "", visibility: "Diri Sendiri" });
        setShowAddForm(false);
        setEditEventId(null);
        // Optimistic UI update or refetch
        mutate();
      } else {
        const err = await res.json();
        console.error("Failed to save event", err);
      }
    } catch (error) {
      console.error("Error submitting event", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    const setuju = await confirmAction({
      title: "Hapus jadwal ini?",
      description: `"${title}" akan hilang dari kalender dan tidak bisa dikembalikan.`,
      confirmLabel: "Hapus jadwal",
      destructive: true,
    });
    if (!setuju) return;

    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        mutate();
      } else {
        // Sebelumnya kegagalan cuma masuk console: jadwalnya tetap terpampang
        // dan user mengira sudah terhapus.
        toast.error("Gagal menghapus jadwal");
      }
    } catch (error) {
      console.error("Error deleting event", error);
      toast.error("Gagal menghapus jadwal");
    }
  };

  useEffect(() => {
    const today = new Date();
    
    // Get the Monday of the currentWeekBase
    const day = currentWeekBase.getDay();
    const diff = currentWeekBase.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(currentWeekBase);
    monday.setDate(diff);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(monday);
      nextDate.setDate(monday.getDate() + i);
      dates.push({
        dateNum: nextDate.getDate(),
        dateStr: formatDate(nextDate)
      });
    }
    
    setWeekDates(dates);
    
    // By default, select today if it's in the week, otherwise select the first day.
    const todayStr = formatDate(today);
    const hasToday = dates.find(d => d.dateStr === todayStr);
    
    if (!selectedDateStr || !dates.find(d => d.dateStr === selectedDateStr)) {
      if (hasToday) {
        setSelectedDateStr(todayStr);
      } else {
        setSelectedDateStr(dates[0].dateStr);
      }
    }
  }, [currentWeekBase]);

  const selectedEvents = events.filter(e => e.date === selectedDateStr);

  return (
    <div className={isModal ? "" : "bg-[#1c1c1e] border border-[#2a2a30] rounded-2xl p-5 shadow-lg"}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <div className="flex flex-col">
            <h3 className="font-bold text-white text-[15px] leading-tight">Kalender</h3>
            <span className="text-[10px] text-[var(--color-brand-red)] font-medium leading-tight">{getMonthYearStr()}</span>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button 
              onClick={() => {
                const prev = new Date(currentWeekBase);
                prev.setDate(prev.getDate() - 7);
                setCurrentWeekBase(prev);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button 
              onClick={() => {
                const next = new Date(currentWeekBase);
                next.setDate(next.getDate() + 7);
                setCurrentWeekBase(next);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
          <button 
            onClick={() => {
              if (isGuest) showLoginPopup();
              else if (!isComplete) setShowLock(true);
              else {
                setEditEventId(null);
                setNewEvent({ title: "", time: "", location: "", visibility: "Diri Sendiri" });
                setShowAddForm(!showAddForm);
              }
            }}
            className="ml-1 w-6 h-6 rounded-full bg-[var(--color-brand-red)]/20 text-[var(--color-brand-red)] flex items-center justify-center hover:bg-[var(--color-brand-red)]/40 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        {isModal ? (
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        ) : (
          <Link href="/kalender" className="text-[var(--color-brand-red)] text-xs font-bold hover:underline">
            Lihat Semua
          </Link>
        )}
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-3">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(day => (
          <div key={day} className="text-[10px] text-[var(--color-text-3)] font-semibold uppercase">{day}</div>
        ))}
      </div>

      {/* Dates row */}
      <div className="grid grid-cols-7 gap-1 text-center mb-6">
        {weekDates.map((item, index) => {
          const isSelected = selectedDateStr === item.dateStr;
          const hasEvent = events.some(e => e.date === item.dateStr);
          
          return (
            <div 
              key={index} 
              onClick={() => setSelectedDateStr(item.dateStr)}
              className={`text-sm font-medium flex flex-col items-center justify-center w-8 h-8 mx-auto rounded-full cursor-pointer transition relative
                ${isSelected ? "bg-[var(--color-brand-red)] text-white shadow-[0_0_10px_rgba(229,39,31,0.5)] font-bold" : "text-white hover:bg-[#2a2a30]"}
              `}
            >
              {item.dateNum}
              {hasEvent && !isSelected && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[var(--color-brand-red)]" />
              )}
            </div>
          );
        })}
      </div>

      {/* Event Details */}
      <div className="min-h-[80px]">
        {showAddForm ? (
          <form onSubmit={handleAddEvent} className="bg-[#2a2a30]/50 rounded-xl p-4 border border-[#3a3a3d]/50 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h4 className="text-white font-bold text-sm mb-3">{editEventId ? "Edit Jadwal" : "Tambah Jadwal"} (Tgl {selectedDateStr?.split('-')[2]})</h4>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Judul Kegiatan" 
                required
                value={newEvent.title}
                onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                className="w-full bg-[#1c1c1e] border border-[#3a3a3d] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-brand-red)] transition"
              />
              <div className="flex gap-2">
                <TimePickerPopup 
                  time={newEvent.time}
                  onChange={time => setNewEvent({...newEvent, time})}
                />
                <input 
                  type="text" 
                  placeholder="Lokasi" 
                  value={newEvent.location}
                  onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                  className="w-1/2 bg-[#1c1c1e] border border-[#3a3a3d] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-brand-red)] transition"
                />
              </div>
              <select 
                value={newEvent.visibility}
                onChange={e => setNewEvent({...newEvent, visibility: e.target.value})}
                className="w-full bg-[#1c1c1e] border border-[#3a3a3d] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-brand-red)] transition appearance-none"
              >
                <option value="Diri Sendiri">Diri Sendiri</option>
                <option value="Sekelas">Sekelas</option>
                <option value="Seprodi">Seprodi</option>
                <option value="Semua">Semua Mahasiswa</option>
              </select>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowAddForm(false); setEditEventId(null); }} className="text-[var(--color-text-3)] text-xs font-medium hover:text-white transition" disabled={isSubmitting}>Batal</button>
                <button type="submit" disabled={isSubmitting} className="bg-[var(--color-brand-red)] text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-red-600 transition disabled:opacity-50">
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </form>
        ) : selectedEvents.length > 0 ? (
          <div className="flex flex-col gap-2">
            {selectedEvents.map((evt, idx) => (
              <div key={idx} className="bg-[#2a2a30]/50 rounded-xl p-4 border border-[#3a3a3d]/50 relative overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-brand-red)]"></div>
                <div className="flex flex-col gap-1.5 mb-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-brand-red)]"></div>
                      <h4 className="text-white font-bold text-sm leading-tight">{evt.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {session?.user?.discordId === evt.user_discord_id && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => {
                            setEditEventId(evt.id);
                            setNewEvent({ title: evt.title, time: evt.time, location: evt.location, visibility: evt.visibility });
                            setShowAddForm(true);
                          }} className="text-[var(--color-text-3)] hover:text-white transition">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => handleDeleteEvent(evt.id, evt.title)} className="text-[var(--color-text-3)] hover:text-[var(--color-brand-red)] transition">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      )}
                      <span className="text-[9px] font-medium bg-[#1c1c1e] border border-[#3a3a3d] px-2 py-0.5 rounded-full text-[var(--color-text-2)]">{evt.visibility}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[var(--color-text-2)] text-[11px] mb-2 pl-4">{evt.time}</p>
                <div className="flex items-center gap-1.5 text-[var(--color-text-3)] pl-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="text-[11px] truncate">{evt.location}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[120px] text-[var(--color-text-3)] py-4 animate-in fade-in duration-300">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 mb-2 opacity-50">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            <p className="text-xs mb-3">Tidak ada jadwal hari ini</p>
            <button 
              onClick={() => {
                if (isGuest) showLoginPopup();
                else if (!isComplete) setShowLock(true);
                else setShowAddForm(true);
              }} 
              className="bg-white/10 hover:bg-white/20 transition text-white text-xs font-medium px-4 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Jadwal
            </button>
          </div>
        )}

        {/* Mobile: Link ke Kalender Penuh di Bawah */}
        {isModal && !showAddForm && (
           <div className="mt-4 flex justify-center">
             <Link href="/kalender" className="text-[var(--color-brand-red)] text-xs font-bold bg-[var(--color-brand-red)]/10 px-4 py-2 rounded-full hover:bg-[var(--color-brand-red)]/20 transition">
               Buka Kalender Penuh
             </Link>
           </div>
        )}
      </div>
      {showLock && <ProfileLockOverlay missingInfo={missingInfo} onClose={() => setShowLock(false)} />}
    </div>
  );
}
