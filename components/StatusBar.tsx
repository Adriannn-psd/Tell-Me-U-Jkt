export default function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-4 pb-1 text-white">
      <span className="text-base font-semibold tracking-wide">9:41</span>
      <div className="flex items-center gap-1.5">
        <div className="flex items-end gap-[2px] h-[11px]">
          <span className="w-[3px] bg-white rounded-[1px] block h-[4px]"></span>
          <span className="w-[3px] bg-white rounded-[1px] block h-[6.5px]"></span>
          <span className="w-[3px] bg-white rounded-[1px] block h-[8.5px]"></span>
          <span className="w-[3px] bg-white rounded-[1px] block h-[11px]"></span>
        </div>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M1 4.5C4.5 1.2 11.5 1.2 15 4.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M3.3 7C5.7 4.8 10.3 4.8 12.7 7" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="9.6" r="1.2" fill="#fff" />
        </svg>
        <div className="w-[25px] h-[12px] border-[1.3px] border-white rounded-[3px] relative p-[1.5px] after:content-[''] after:absolute after:-right-[3px] after:top-[3.5px] after:w-[2px] after:h-[5px] after:bg-white after:rounded-r-[2px]">
          <i className="block w-[82%] h-full bg-white rounded-[1px]"></i>
        </div>
      </div>
    </div>
  );
}
