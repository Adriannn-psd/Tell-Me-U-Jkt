"use client";

import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import { useGuest } from "@/components/GuestProvider";

const portalLinks = [
  {
    id: 1,
    title: "Telkom University Jakarta",
    subtitle: "Website Resmi Telkom University Kampus Jakarta",
    url: "https://jakarta.telkomuniversity.ac.id/en/",
    bgColor: "from-[#8a1414] to-[#cc2121]",
    image: "https://jakarta.telkomuniversity.ac.id/wp-content/uploads/2023/11/TELU-JKT-LOGO-scaled.webp"
  },
  {
    id: 2,
    title: "Peta & Lokasi Kampus",
    subtitle: "Temukan alamat lengkap dan panduan lokasi kampus",
    url: "https://jakarta.telkomuniversity.ac.id/alamat-dan-peta-kampus/",
    bgColor: "from-[#1a1a1a] to-[#333333]",
    image: "https://jakarta.telkomuniversity.ac.id/wp-content/uploads/2023/11/TELU-JKT-LOGO-scaled.webp"
  },
  {
    id: 3,
    title: "Pendaftaran Mahasiswa Baru",
    subtitle: "Seleksi Mahasiswa Baru (SMB) Kampus Jakarta",
    url: "https://smb.telkomuniversity.ac.id/jakarta/",
    bgColor: "from-[#cc2121] to-[#ff3b30]",
    image: "https://smb.telkomuniversity.ac.id/wp-content/uploads/2024/10/Banner-Telkom-University-Jakarta.jpg"
  },
  {
    id: 4,
    title: "DTI Telkom University Jakarta",
    subtitle: "Direktorat Teknologi Informasi Kampus Jakarta",
    url: "https://dti-jkt.telkomuniversity.ac.id/",
    bgColor: "from-[#003366] to-[#0a5cbf]",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 5,
    title: "Instagram Resmi",
    subtitle: "@telkomuniversity_jkt",
    url: "https://www.instagram.com/telkomuniversity_jkt/",
    bgColor: "from-[#833ab4] via-[#fd1d1d] to-[#fcb045]",
    image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 6,
    title: "Tentang Kampus Jakarta",
    subtitle: "Informasi lengkap mengenai Telkom University Jakarta",
    url: "https://telkomuniversity.ac.id/en/telkom-university-kampus-jakarta/",
    bgColor: "from-[#2b2b2b] to-[#404040]",
    image: "https://telkomuniversity.ac.id/wp-content/uploads/2023/08/Telkom-University-Kampus-Jakarta-scaled.jpg"
  },
  {
    id: 7,
    title: "Telkom University (Pusat)",
    subtitle: "Creating the Future Leaders",
    url: "https://telkomuniversity.ac.id/en/",
    bgColor: "from-[#8a1414] to-[#cc2121]",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 8,
    title: "i-GRACIAS",
    subtitle: "Sistem Informasi Akademik Terpadu",
    url: "https://igracias.telkomuniversity.ac.id/",
    bgColor: "from-[#004d99] to-[#0073e6]",
    image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 9,
    title: "Tel-U Satu",
    subtitle: "Portal Resmi Layanan Telkom University",
    url: "https://satu.telkomuniversity.ac.id/",
    bgColor: "from-[#d32f2f] to-[#f44336]",
    image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 10,
    title: "CeLOE LMS",
    subtitle: "Center for e-Learning and Open Education",
    url: "https://lms.telkomuniversity.ac.id/",
    bgColor: "from-[#1565c0] to-[#1976d2]",
    image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 11,
    title: "Tel-U Open Library",
    subtitle: "Perpustakaan Digital Telkom University",
    url: "https://openlibrary.telkomuniversity.ac.id/",
    bgColor: "from-[#2e7d32] to-[#4caf50]",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 12,
    title: "IT Service Desk",
    subtitle: "Pusat Bantuan Layanan Teknologi Informasi",
    url: "https://servicedesk.telkomuniversity.ac.id/",
    bgColor: "from-[#455a64] to-[#607d8b]",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 13,
    title: "Kalender Akademik",
    subtitle: "Jadwal Pendidikan dan Kegiatan Akademik",
    url: "https://baa.telkomuniversity.ac.id/kalender-akademik-2-2/",
    bgColor: "from-[#e65100] to-[#ff9800]",
    image: "https://images.unsplash.com/photo-1506784951206-33b19b6ba758?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 14,
    title: "Student Affairs",
    subtitle: "Direktorat Kemahasiswaan Telkom University",
    url: "https://studentaffairs.telkomuniversity.ac.id/",
    bgColor: "from-[#6a1b9a] to-[#9c27b0]",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 15,
    title: "SEEDS Tel-U",
    subtitle: "Student Entrepreneurship & Education",
    url: "https://seeds.telkomuniversity.ac.id/",
    bgColor: "from-[#00695c] to-[#009688]",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=600&auto=format&fit=crop"
  }
];

export default function PortalKampusPage() {
  const { isGuest, showLoginPopup } = useGuest();

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col pb-24">
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
              <p className="text-[var(--color-text-3)] text-xs leading-relaxed">Ini hanya tampilan contoh. Klik di mana saja untuk Login dan mengakses fitur Portal Kampus.</p>
            </div>
          </div>
        )}
        
        {/* Premium Hero Banner */}
        <header className="relative w-full rounded-[2rem] overflow-hidden mb-12 min-h-[260px] flex items-end p-8 md:p-10 shadow-2xl border border-white/5 group">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/40 via-black to-[#0a0a0a] z-0" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 group-hover:bg-red-500/30 transition-colors duration-700 pointer-events-none" />
          
          <div className="relative z-10 w-full">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/60 mb-3 tracking-tight">
              Portal Kampus
            </h1>
            <p className="text-[#a0a0ab] text-base md:text-lg max-w-xl leading-relaxed">
              Pusat akses cepat menuju seluruh layanan akademik dan fasilitas digital Telkom University.
            </p>
          </div>
        </header>

        {/* Dynamic Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-8">
          {portalLinks.map((item, index) => (
            <a 
              key={item.id} 
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="relative w-full h-[150px] md:h-[320px] rounded-2xl md:rounded-[2rem] overflow-hidden shadow-xl group block transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(220,38,38,0.3)] border border-white/5 hover:border-white/20"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Background Color & Image */}
              <div className={`absolute inset-0 bg-gradient-to-br ${item.bgColor} opacity-80 z-0 transition-opacity duration-700 group-hover:opacity-100`} />
              <div 
                className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-40 z-0 transition-transform duration-1000 group-hover:scale-110"
                style={{ backgroundImage: `url('${item.image}')` }}
              />
              {/* Gradient Overlay for Text Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 z-0" />

              <div className="relative z-10 p-3 md:p-7 flex flex-col h-full justify-between">
                {/* Top Section */}
                <div className="flex justify-end items-start">
                  <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-full transform opacity-0 translate-x-4 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 border border-white/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-5 h-5"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                  </div>
                </div>
                
                {/* Bottom Section */}
                <div className="transform transition-transform duration-300 group-hover:translate-y-0">
                  <h2 className="text-[12px] md:text-2xl font-bold text-white leading-tight mb-1 md:mb-2 tracking-wide group-hover:text-red-400 transition-colors">
                    {item.title}
                  </h2>
                  <p className="text-[#ebebf5]/70 text-[10px] md:text-sm leading-snug md:leading-relaxed font-medium line-clamp-2">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
