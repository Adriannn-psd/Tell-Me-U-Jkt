import Link from "next/link";
import React from "react";

export const renderWithMentions = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_.]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const username = part.substring(1);
      return (
        <Link 
          key={i} 
          href={`/profile/${username}`} 
          onClick={(e) => e.stopPropagation()} 
          className="text-[var(--color-brand-red)] font-semibold hover:underline"
        >
          {part}
        </Link>
      );
    }
    return part;
  });
};
