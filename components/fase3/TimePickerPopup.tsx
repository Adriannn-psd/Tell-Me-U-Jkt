"use client";

import React, { useState, useEffect } from "react";
import TimeKeeper from "react-timekeeper";

interface TimePickerPopupProps {
  time: string; // "HH:mm"
  onChange: (time: string) => void;
}

export default function TimePickerPopup({ time, onChange }: TimePickerPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Prevent background scrolling when picker is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="relative w-1/2">
      <input
        type="text"
        readOnly
        placeholder="Waktu (cth: 08:00)"
        value={time}
        onClick={() => setIsOpen(true)}
        className="w-full bg-[#1c1c1e] border border-[#3a3a3d] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-brand-red)] transition cursor-pointer"
      />
      
      {isOpen && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-[#1c1c1e] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transform scale-[0.85] sm:scale-100 flex items-center justify-center" 
            onClick={(e) => e.stopPropagation()}
          >
            <TimeKeeper
              time={time || "08:00"}
              onChange={(newTime) => onChange(newTime.formatted24)}
              onDoneClick={() => setIsOpen(false)}
              switchToMinuteOnHourSelect
              hour24Mode
            />
          </div>
        </div>
      )}
    </div>
  );
}
