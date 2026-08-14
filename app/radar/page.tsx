import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import RadarCard, { RadarPost } from "@/components/radar/RadarCard";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client on the SERVER using Service Role Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey || "dummy");

import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import LoginPanel from "@/components/LoginPanel";
import GuestOverlay from "@/components/GuestOverlay";

const getCachedRadarPosts = unstable_cache(
  async () => {
    if (!supabaseServiceKey) {
      console.warn("SUPABASE_SERVICE_ROLE_KEY is missing, cannot fetch posts.");
      return [];
    }
    const { data, error } = await supabase
      .from("radar_kampus_posts")
      .select("*")
      // Nulls last ensures older posts without original_created_at still appear, but at the end
      .order("original_created_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching radar posts:", error);
      return [];
    }
    return (data || []) as RadarPost[];
  },
  ['radar-kampus-posts'],
  { revalidate: 3600 }
);

export default async function RadarKampusPage() {
  const cookieStore = await cookies();
  const isGuest = cookieStore.get("guest_mode")?.value === "true";

  let posts: RadarPost[] = [];
  
  if (!isGuest) {
    posts = await getCachedRadarPosts();
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <Sidebar />
      <Header />
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-5 md:px-8 py-6 pb-28 md:pb-10 md:pt-6 md:pl-[260px] relative">
        {isGuest && <GuestOverlay message="mengakses Radar Kampus" />}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[var(--color-brand-red)]/20 flex items-center justify-center text-[var(--color-brand-red)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 10 10" />
                <path d="M12 12a5 5 0 0 0 5-5" />
                <path d="M12 12 7 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Radar Kampus</h1>
          </div>
          <p className="text-[var(--color-text-2)] max-w-2xl text-[15px] leading-relaxed">
            Pusat informasi terbaru yang dikumpulkan otomatis oleh AI TellMe U Jkt dari berbagai sumber resmi kampus. Pantau jadwal, pengumuman penting, dan event secara real-time.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-[var(--color-text-3)] mb-3">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <h3 className="text-lg font-bold text-white mb-1">Belum Ada Informasi</h3>
            <p className="text-[var(--color-text-2)] text-sm max-w-sm">
              Radar Kampus sedang memantau informasi. Cek lagi nanti ya!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
            {posts.map((post) => (
              <RadarCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
