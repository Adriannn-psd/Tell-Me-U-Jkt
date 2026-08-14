import Link from "next/link";

export default function ActiveMode() {
  return (
    <div className="px-5 md:px-0 pt-[22px] md:pt-8 pb-0">
      <div className="flex items-center justify-between mb-3 md:mb-5">
        <h2 className="text-white text-[16.5px] md:text-xl font-bold">Mode Aktif</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        
        {/* OSPEK Mode (Active) */}
        <div className="bg-[var(--color-surface)] border border-[rgba(229,39,31,0.35)] rounded-[20px] md:rounded-[24px] p-4 md:p-6 relative min-h-[198px] md:min-h-[220px] flex flex-col hover:border-[rgba(229,39,31,0.6)] transition group cursor-pointer overflow-hidden">
          <span className="absolute top-[14px] md:top-5 right-[14px] md:right-5 bg-[rgba(229,39,31,0.18)] text-[var(--color-brand-red)] text-[9.5px] md:text-[11px] font-bold px-[9px] md:px-3 py-1 md:py-1.5 rounded-[20px] tracking-[0.4px]">AKTIF</span>
          <h3 className="text-[14.5px] md:text-lg font-extrabold mb-2 md:mb-3 text-[var(--color-brand-red)] pr-[44px]">OSPEK MODE</h3>
          <p className="text-[var(--color-text-2)] text-xs md:text-sm leading-[1.5] mb-4 md:mb-6 max-w-[200px] md:max-w-[250px]">Absen, Board, dan Dokumentasi Ospek</p>
          <Link href="/ospek" className="mt-auto inline-flex items-center gap-1.5 self-start px-[14px] md:px-5 py-[9px] md:py-2.5 rounded-xl text-xs md:text-sm font-bold cursor-pointer text-white bg-[var(--color-brand-red)] group-hover:bg-red-600 transition">
            Buka Ospek
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px] md:w-4 md:h-4 transition-transform group-hover:translate-x-1">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <svg className="absolute right-[10px] md:right-4 bottom-[10px] md:bottom-4 w-[78px] h-[78px] md:w-[120px] md:h-[120px] pointer-events-none opacity-90 md:opacity-100 transition-transform group-hover:scale-105" viewBox="0 0 100 100" fill="none">
            <rect x="20" y="16" width="56" height="64" rx="9" fill="#0f0f11" stroke="#2c2c30" strokeWidth="2"/>
            <rect x="30" y="28" width="9" height="9" fill="#dcdce0"/>
            <rect x="44" y="28" width="9" height="9" fill="#dcdce0"/>
            <rect x="58" y="28" width="9" height="9" fill="#dcdce0"/>
            <rect x="30" y="41" width="9" height="9" fill="#dcdce0"/>
            <rect x="58" y="41" width="9" height="9" fill="#dcdce0"/>
            <rect x="30" y="54" width="9" height="9" fill="#dcdce0"/>
            <rect x="44" y="54" width="9" height="9" fill="#dcdce0"/>
            <rect x="58" y="54" width="9" height="9" fill="#dcdce0"/>
            <rect x="12" y="84" width="72" height="7" rx="3.5" fill="#1c1c1f"/>
            <g stroke="#ff3b30" strokeWidth="3.2" strokeLinecap="round" fill="none">
              <path d="M12 26V17a7 7 0 0 1 7-7h9"/>
              <path d="M88 26V17a7 7 0 0 0-7-7h-9"/>
              <path d="M12 60v9a7 7 0 0 0 7 7h9"/>
              <path d="M88 60v9a7 7 0 0 1-7 7h-9"/>
            </g>
          </svg>
        </div>

        {/* PERKULIAHAN Mode */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-[20px] md:rounded-[24px] p-4 md:p-6 relative min-h-[198px] md:min-h-[220px] flex flex-col hover:border-[var(--color-text-3)] transition group cursor-pointer overflow-hidden">
          <h3 className="text-[14.5px] md:text-lg font-extrabold mb-2 md:mb-3 text-white">PERKULIAHAN</h3>
          <p className="text-[var(--color-text-2)] text-xs md:text-sm leading-[1.5] mb-4 md:mb-6 max-w-[200px] md:max-w-[250px]">Karya, Tugas, dan Kehidupan Kampus</p>
          <button type="button" className="mt-auto inline-flex items-center gap-1.5 self-start px-[14px] md:px-5 py-[9px] md:py-2.5 rounded-xl text-xs md:text-sm font-bold cursor-pointer text-white bg-[var(--color-surface-2)] group-hover:bg-[#2a2a30] transition">
            Buka Home
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px] md:w-4 md:h-4 transition-transform group-hover:translate-x-1">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          <svg className="absolute right-[10px] md:right-4 bottom-[10px] md:bottom-4 w-[78px] h-[78px] md:w-[120px] md:h-[120px] pointer-events-none opacity-90 md:opacity-100 transition-transform group-hover:scale-105" viewBox="0 0 100 100" fill="none">
            <rect x="18" y="62" width="58" height="12" rx="2.5" fill="#8f1a1a"/>
            <rect x="22" y="50" width="52" height="12" rx="2.5" fill="#141417" stroke="#2c2c30"/>
            <rect x="18" y="38" width="58" height="12" rx="2.5" fill="#b91f1f"/>
            <path d="M47 12 86 29 47 46 8 29Z" fill="#101012" stroke="#2c2c30" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M47 46v12" stroke="#2c2c30" strokeWidth="1.5"/>
            <circle cx="47" cy="46" r="2.6" fill="#ff3b30"/>
            <path d="M76 31v11c0 3-7.5 5-13 5" stroke="#2c2c30" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>

      </div>
    </div>
  );
}
