"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ScrollContextType {
  isScrolledPastHero: boolean;
  setIsScrolledPastHero: (value: boolean) => void;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export function ScrollProvider({ children }: { children: ReactNode }) {
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);

  return (
    <ScrollContext.Provider value={{ isScrolledPastHero, setIsScrolledPastHero }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScrollState() {
  const context = useContext(ScrollContext);
  if (context === undefined) {
    return { isScrolledPastHero: false, setIsScrolledPastHero: () => {} };
  }
  return context;
}
