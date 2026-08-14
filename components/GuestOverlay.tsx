"use client";

import { useGuest } from "@/components/GuestProvider";

export default function GuestOverlay({ message = "melihat konten ini" }: { message?: string }) {
  const { showLoginPopup } = useGuest();

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/40 cursor-pointer flex items-center justify-center p-4"
      onClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        showLoginPopup();
      }}
    >
      <div className="bg-[#1c1c1e]/90 backdrop-blur-md border border-[#2a2a30] px-6 py-5 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300 pointer-events-none text-center">
        <h3 className="text-lg font-bold text-white mb-1">Pratinjau Mode Tamu</h3>
        <p className="text-[var(--color-text-3)] text-xs leading-relaxed">
          Ini hanya tampilan contoh. Klik di mana saja untuk Login dan {message}.
        </p>
      </div>
    </div>
  );
}
