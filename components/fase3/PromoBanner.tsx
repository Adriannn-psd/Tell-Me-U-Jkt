export default function PromoBanner() {
  return (
    <div className="bg-[#1c1c1e] border border-[#2a2a30] rounded-2xl overflow-hidden shadow-lg relative min-h-[160px] flex flex-col justify-end p-5">
      {/* Background Graphic (Mockup using gradients since we don't have the exact image) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-[#1c1c1e]/80 to-[#1c1c1e] z-0"></div>
      
      {/* Abstract Red Lines/Glow (Simulating the design in screenshot) */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[var(--color-brand-red)] rounded-full blur-[60px] opacity-30 z-0"></div>
      <div className="absolute -bottom-5 -left-5 w-32 h-32 bg-[var(--color-brand-red)] rounded-full blur-[50px] opacity-20 z-0"></div>
      
      {/* Simulated City/Buildings silhouette using CSS (optional, just for flavor) */}
      <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end justify-center opacity-20 mix-blend-overlay z-0 pointer-events-none">
        <div className="w-4 h-12 bg-white mx-0.5 rounded-t-sm"></div>
        <div className="w-6 h-16 bg-white mx-0.5 rounded-t-sm"></div>
        <div className="w-5 h-10 bg-white mx-0.5 rounded-t-sm"></div>
        <div className="w-8 h-20 bg-white mx-0.5 rounded-t-sm"></div>
        <div className="w-3 h-14 bg-white mx-0.5 rounded-t-sm"></div>
        <div className="w-6 h-18 bg-white mx-0.5 rounded-t-sm"></div>
        <div className="w-7 h-12 bg-white mx-0.5 rounded-t-sm"></div>
      </div>

      <div className="relative z-10">
        <h3 className="font-bold text-white text-lg flex items-center gap-1.5 mb-1">
          Tell Me U <span className="text-[var(--color-brand-red)] italic font-extrabold tracking-wide">Jkt</span>
        </h3>
        <p className="text-[var(--color-text-3)] text-xs font-medium max-w-[200px]">
          Platform Eksklusif Angkatan Tel-U Jkt
        </p>
      </div>
    </div>
  );
}
