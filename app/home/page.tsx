import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import SearchBar from "@/components/fase3/SearchBar";
import DynamicWidgets from "@/components/fase3/DynamicWidgets";
import QuickActions from "@/components/QuickActions";
import Feed from "@/components/Feed";
import BottomNav from "@/components/BottomNav";
import KalenderTerdekat from "@/components/fase3/KalenderTerdekat";
import PromoBanner from "@/components/fase3/PromoBanner";
import { ScrollProvider } from "@/components/ScrollContext";

export default function Home() {
  return (
    <ScrollProvider>
      <div className="flex flex-col min-h-screen">
      <Sidebar />
      <Header />
      <main className="flex-1 w-full pb-20 md:pb-10 md:pt-6 md:pl-[260px]">
        
        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-y-0 md:gap-y-10 lg:gap-y-14 md:gap-x-10 lg:gap-x-[50px] xl:gap-x-[70px] px-0 md:px-6 lg:px-8">
          
          {/* Active Mode (Order 1 on mobile, Left Col Top on desktop) */}
          <div className="order-1 md:col-start-1 md:row-start-1 relative z-30">
            <DynamicWidgets />
          </div>

          {/* Right Column Content (Order 2 on mobile, Right Col on desktop) */}
          <div className="order-2 md:col-start-2 md:row-start-1 md:row-span-2 flex flex-col gap-6 md:gap-10 md:sticky md:top-24 h-fit relative z-40">
            <QuickActions />
            
            {/* These are desktop only widgets */}
            <div className="hidden md:flex flex-col gap-6 md:gap-10">
              <KalenderTerdekat />
              <PromoBanner />
            </div>
          </div>

          {/* Feed (Order 3 on mobile, Left Col Bottom on desktop) */}
          <div className="order-3 md:col-start-1 md:row-start-2 mt-6 md:mt-2 lg:mt-6">
            <Suspense fallback={<div>Loading Feed...</div>}>
              <Feed />
            </Suspense>
          </div>

        </div>
      </main>
      <BottomNav />
    </div>
    </ScrollProvider>
  );
}
