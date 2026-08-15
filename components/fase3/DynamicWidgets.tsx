"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useGuest } from "@/components/GuestProvider";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DynamicWidgets() {
  const { isGuest, showLoginPopup } = useGuest();
  const [localTasks, setLocalTasks] = useState<{ id: number; title: string; deadline: string; done: boolean }[]>([]);

  const { data: tasksData } = useSWR("/api/tasks", fetcher, { revalidateOnFocus: false, dedupingInterval: 60000 });
  const { data: radarData } = useSWR("/api/radar", fetcher, { revalidateOnFocus: false, dedupingInterval: 60000 });

  useEffect(() => {
    if (tasksData?.success && tasksData?.tasks) {
      const activeTasks = tasksData.tasks
        .filter((t: any) => t.status !== 'completed')
        .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        .slice(0, 2)
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          deadline: new Date(t.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
          done: false
        }));
      setLocalTasks(activeTasks);
    }
  }, [tasksData]);

  const toggleTask = (id: number) => {
    setLocalTasks(localTasks.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const radarPosts = radarData?.success && radarData?.posts ? radarData.posts : [];

  return (
    <div className="px-5 md:px-0 pt-[22px] md:pt-8 pb-0">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-white text-[18px] md:text-2xl font-extrabold tracking-tight">Widget Dinamis</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 md:gap-7">
        
        {/* Widget Kiri: To-Do & Deadline */}
        <div className="relative overflow-hidden rounded-[16px] md:rounded-[28px] p-[1px] group transition-transform hover:-translate-y-1 duration-300 h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-[#ff3b30]/40 via-transparent to-[#ff3b30]/10 rounded-[16px] md:rounded-[28px] opacity-70" />
          <div className="relative bg-[#111112]/90 backdrop-blur-2xl rounded-[15px] md:rounded-[27px] p-2.5 md:p-8 flex flex-col h-full min-h-[100px] md:min-h-[340px] border border-white/5 shadow-[0_8px_32px_rgba(255,59,48,0.1)]">
            <div className="flex flex-col xl:flex-row xl:items-center items-start gap-1.5 md:gap-3.5 mb-2 md:mb-6 relative z-10">
              <div className="flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-7 md:h-7 drop-shadow-[0_2px_10px_rgba(255,59,48,0.4)]">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="m9 16 2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-[12px] md:text-xl font-bold text-white tracking-wide leading-tight">To-Do & Deadline</h3>
            </div>
            
            <div className="flex flex-col gap-1.5 md:gap-3.5 flex-1 relative z-10 w-full xl:w-[75%]">
              {localTasks.map(task => (
                <div 
                  key={task.id} 
                  className={`flex items-center gap-2 md:gap-4 p-2 md:p-4 rounded-xl md:rounded-[18px] border backdrop-blur-md transition-all cursor-pointer ${task.done ? 'bg-white/5 border-white/5 opacity-60' : 'bg-[#1a1a1c]/80 border-white/10 hover:bg-[#202022] hover:border-[#ff3b30]/40 shadow-sm'}`}
                  onClick={() => toggleTask(task.id)}
                >
                  <div className={`w-3.5 h-3.5 md:w-5 md:h-5 rounded-full border-[1.5px] md:border-2 flex items-center justify-center shrink-0 transition-colors ${task.done ? 'bg-[#ff3b30] border-[#ff3b30]' : 'border-[#6e6e73]'}`}>
                    {task.done && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2 h-2 md:w-3 md:h-3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[9px] md:text-[14px] font-semibold truncate transition-all ${task.done ? 'text-[#8e8e93] line-through' : 'text-[#f5f5f7]'}`}>{task.title}</p>
                    <p className={`text-[8px] md:text-[12px] mt-0.5 font-medium ${task.done ? 'text-[#6e6e73]' : 'text-[#ff3b30]'}`}>{task.deadline}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Premium Illustration / Flare */}
            <div className="absolute -right-10 top-5 opacity-40 z-0 pointer-events-none mix-blend-screen w-[200px] h-[200px] bg-[radial-gradient(circle,rgba(255,59,48,0.8)_0%,transparent_70%)] blur-2xl"></div>
            
            <div className="w-full flex justify-center border-t border-white/10 mt-2 md:mt-6 pt-2 md:pt-5 z-10">
              <Link href="/tracker" className="text-[9px] md:text-[13px] font-semibold text-[#8e8e93] hover:text-white transition flex items-center gap-1.5 group/link">
                Semua Tugas 
                <span className="transform group-hover/link:translate-x-1 transition-transform">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Widget Kanan: Radar Kampus */}
        <div className="relative overflow-hidden rounded-[16px] md:rounded-[28px] p-[1px] group transition-transform hover:-translate-y-1 duration-300 h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-[#30d158]/40 via-transparent to-[#30d158]/10 rounded-[16px] md:rounded-[28px] opacity-70" />
          <div className="relative bg-[#111112]/90 backdrop-blur-2xl rounded-[15px] md:rounded-[27px] p-2.5 md:p-8 flex flex-col h-full min-h-[100px] md:min-h-[340px] border border-white/5 shadow-[0_8px_32px_rgba(48,209,88,0.1)]">
            <div className="flex flex-col xl:flex-row xl:items-center items-start gap-1.5 md:gap-3.5 mb-2 md:mb-5 relative z-10">
              <div className="flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-7 md:h-7 drop-shadow-[0_2px_10px_rgba(48,209,88,0.4)]">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
              </div>
              <h3 className="text-[12px] md:text-xl font-bold text-white tracking-wide leading-tight">Radar Kampus</h3>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden relative z-10">
              {/* Slider cards wrapper */}
              <div className="flex gap-2.5 md:gap-4 w-full snap-x snap-mandatory overflow-x-auto pb-2 scrollbar-hide">
                
                {radarPosts.map((post: any, idx: number) => {
                  const cover = post.media_urls?.[0] || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=400&auto=format&fit=crop';
                  const bgGradient = idx % 2 === 0 
                    ? "from-[#8a1414] via-[#cc2121] to-[#ff3b30]" 
                    : "from-[#003366] via-[#0a5cbf] to-[#0a84ff]";
                  
                  const content = (
                    <>
                      <div className={`absolute inset-0 bg-cover bg-center z-0 transform scale-110 group-hover:scale-125 transition-transform duration-700 ${isGuest ? 'blur-md' : ''}`} style={{ backgroundImage: `url('${cover}')` }}></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-0" />
                      <div className={`absolute inset-0 bg-gradient-to-tr ${bgGradient} opacity-40 mix-blend-color z-0`} />
                      <div className={`relative z-10 ${isGuest ? 'blur-md select-none' : ''}`}>
                        <div className="flex items-center gap-1.5 mb-1.5 md:mb-2.5">
                          {post.author_profile_pic && (
                            <img src={post.author_profile_pic} alt={post.author_username} className="w-3.5 h-3.5 md:w-5 md:h-5 rounded-full object-cover border border-white/20" />
                          )}
                          <span className="px-1.5 py-0.5 md:px-2 md:py-0.5 bg-black/40 backdrop-blur-md rounded-md text-[7px] md:text-[9px] font-bold text-white tracking-wide border border-white/10 truncate max-w-[80px]">
                            @{post.author_username || post.category || 'Info'}
                          </span>
                        </div>
                        <p className="text-[9px] md:text-[13px] font-semibold text-white/90 leading-[1.3] mb-1 tracking-wide line-clamp-3">
                          {post.summary}
                        </p>
                      </div>
                      {isGuest && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-2 text-center bg-black/20 backdrop-blur-sm">
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-white mb-1"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                      )}
                    </>
                  );

                  return isGuest ? (
                    <div onClick={showLoginPopup} key={post.id} className="w-[80px] md:w-[150px] h-[80px] md:h-[210px] rounded-[10px] md:rounded-[20px] relative overflow-hidden flex flex-col justify-end p-1.5 md:p-4 snap-center border border-white/10 group-hover:border-white/30 transition duration-300 shadow-lg shrink-0 cursor-pointer">
                      {content}
                    </div>
                  ) : (
                    <Link key={post.id} href={`/radar#post-${post.id}`} className="w-[80px] md:w-[150px] h-[80px] md:h-[210px] rounded-[10px] md:rounded-[20px] relative overflow-hidden flex flex-col justify-end p-1.5 md:p-4 snap-center border border-white/10 group-hover:border-white/30 transition duration-300 shadow-lg shrink-0">
                      {content}
                    </Link>
                  );
                })}

                {!radarData && (
                   <div className="w-full flex items-center justify-center py-5 opacity-60">
                     <p className="text-[9px] md:text-sm text-white">Memuat...</p>
                   </div>
                )}
                {radarData && radarPosts.length === 0 && (
                   <div className="w-full flex items-center justify-center py-5 opacity-60">
                     <p className="text-[9px] md:text-sm text-white">Belum ada radar.</p>
                   </div>
                )}
              </div>
            </div>
            
            <div className="w-full flex justify-center border-t border-white/10 pt-2 md:pt-5 z-10 mt-auto">
              <Link href="/radar" className="text-[9px] md:text-[13px] font-semibold text-[#8e8e93] hover:text-white transition flex items-center gap-1.5 group/link">
                Buka Radar 
                <span className="transform group-hover/link:translate-x-1 transition-transform">&rarr;</span>
              </Link>
            </div>
            
            {/* Premium Illustration / Flare */}
            <div className="absolute -right-10 -bottom-10 opacity-30 z-0 pointer-events-none mix-blend-screen w-[250px] h-[250px] bg-[radial-gradient(circle,rgba(48,209,88,0.8)_0%,transparent_70%)] blur-3xl"></div>
          </div>
        </div>

      </div>
    </div>
  );
}
