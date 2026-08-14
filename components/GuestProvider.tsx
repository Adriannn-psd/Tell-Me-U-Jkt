"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import GuestAuthPopup from "./GuestAuthPopup";

interface GuestContextProps {
  isGuest: boolean;
  showLoginPopup: () => void;
  hideLoginPopup: () => void;
}

const GuestContext = createContext<GuestContextProps | undefined>(undefined);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);
  const [isPopupVisible, setPopupVisible] = useState(false);

  useEffect(() => {
    // Check if guest mode cookie exists
    const hasGuestCookie = document.cookie.split("; ").some(c => c.startsWith("guest_mode="));
    setIsGuest(hasGuestCookie);
  }, []);

  const showLoginPopup = () => setPopupVisible(true);
  const hideLoginPopup = () => setPopupVisible(false);

  return (
    <GuestContext.Provider value={{ isGuest, showLoginPopup, hideLoginPopup }}>
      {children}
      {isPopupVisible && <GuestAuthPopup onClose={hideLoginPopup} />}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error("useGuest must be used within a GuestProvider");
  }
  return context;
}
