export default function SearchBar() {
  return (
    <div className="px-5 md:px-0 pt-4 md:pt-6 pb-2">
      <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-[18px] md:rounded-[24px] p-[5px] pl-[18px] gap-2.5 md:max-w-2xl transition focus-within:border-[var(--color-text-3)] focus-within:shadow-lg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px] md:w-[22px] md:h-[22px] text-[var(--color-text-2)] shrink-0">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input 
          type="text" 
          placeholder="Cari teman, karya, kegiatan..." 
          className="border-none bg-transparent outline-none text-white text-sm md:text-base flex-1 min-w-0 placeholder-[var(--color-text-3)] font-inherit" 
        />
        <button type="button" aria-label="Cari" className="w-[42px] h-[42px] md:w-[48px] md:h-[48px] rounded-full bg-[var(--color-brand-red)] flex items-center justify-center shrink-0 cursor-pointer hover:bg-red-600 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[19px] h-[19px] md:w-[22px] md:h-[22px] text-white">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
