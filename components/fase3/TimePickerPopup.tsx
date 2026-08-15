"use client";

import React, { useState, useEffect, useRef } from "react";
import TimeKeeper from "react-timekeeper";

interface TimePickerPopupProps {
  time: string; // "HH:mm"
  onChange: (time: string) => void;
}

export default function TimePickerPopup({ time, onChange }: TimePickerPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative w-1/2" ref={containerRef}>
      <input
        type="text"
        readOnly
        placeholder="Waktu (cth: 08:00)"
        value={time}
        onClick={() => setIsOpen(true)}
        className="w-full bg-[#1c1c1e] border border-[#3a3a3d] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-brand-red)] transition cursor-pointer"
      />
      
      {isOpen && (
        <div className="absolute z-50 top-full mt-2 left-0 scale-90 origin-top-left">
          <div className="bg-[#1c1c1e] p-2 rounded-xl border border-[#3a3a3d] shadow-2xl">
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
