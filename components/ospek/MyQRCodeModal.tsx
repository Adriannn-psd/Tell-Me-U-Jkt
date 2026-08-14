import { QRCodeCanvas } from "qrcode.react";

export default function MyQRCodeModal({ 
  onClose,
  discordId,
  displayName,
  dbUsername,
  initial
}: { 
  onClose: () => void,
  discordId: string,
  displayName: string,
  dbUsername: string,
  initial: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-[32px] p-6 pt-10 pb-8 flex flex-col items-center animate-in zoom-in-95 duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        {/* Glow effect behind QR */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[var(--color-brand-red)] opacity-20 blur-3xl rounded-full pointer-events-none"></div>

        <h2 className="text-xl font-extrabold text-white mb-2 relative z-10">QR Code Saya</h2>
        <p className="text-[var(--color-text-2)] text-sm mb-8 text-center relative z-10">Tunjukkan QR ini agar teman bisa mutualan denganmu.</p>

        {/* QR Code Container */}
        <div className="w-56 h-56 bg-white rounded-3xl p-4 shadow-[0_0_25px_rgba(255,255,255,0.1)] relative z-10 flex items-center justify-center">
          <QRCodeCanvas 
            value={discordId} 
            size={180} 
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
            className="rounded-lg"
          />
        </div>

        {/* User Info */}
        <div className="mt-8 flex flex-col items-center relative z-10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3a3a3d] to-[#1c1c1e] flex items-center justify-center text-white font-bold text-lg border-2 border-[var(--color-bg)] mb-3 shadow-md">
            {initial}
          </div>
          <h3 className="text-lg font-bold text-white leading-tight">{displayName}</h3>
          <p className="text-[var(--color-text-2)] text-sm">@{dbUsername}</p>
        </div>

        <button 
          onClick={onClose}
          className="mt-8 bg-[var(--color-surface-2)] text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-[#2a2a30] transition border border-[var(--color-border-color)] relative z-10"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
