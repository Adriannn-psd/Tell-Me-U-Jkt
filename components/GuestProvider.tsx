"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import GuestAuthPopup from "./GuestAuthPopup";
import { useSession } from "next-auth/react";

interface GuestContextProps {
  isGuest: boolean;
  showLoginPopup: () => void;
  hideLoginPopup: () => void;
}

const GuestContext = createContext<GuestContextProps | undefined>(undefined);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);
  const [isPopupVisible, setPopupVisible] = useState(false);
  const { status } = useSession();

  useEffect(() => {
    // Check if guest mode cookie exists
    const hasGuestCookie = document.cookie.split("; ").some(c => c.startsWith("guest_mode="));
    
    if (status === "authenticated") {
      setIsGuest(false);
      // Clear cookie if authenticated
      if (hasGuestCookie) {
        document.cookie = "guest_mode=; path=/; max-age=0";
      }
    } else {
      setIsGuest(hasGuestCookie);
    }
  }, [status]);

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
