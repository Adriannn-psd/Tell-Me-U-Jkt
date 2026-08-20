"use client";

import React, { useState, useEffect, useRef, forwardRef } from "react";
import getCaretCoordinates from "textarea-caret";
import Avatar from "@/components/Avatar";

interface UserMention {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

interface MentionTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: any) => void;
  onValueChange?: (val: string) => void;
}

const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(({ value, onChange, onValueChange, className, ...props }, ref) => {
  const [showHints, setShowHints] = useState(false);
  const [hints, setHints] = useState<UserMention[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPos, setCursorPos] = useState({ top: 0, left: 0 });
  
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const setRefs = (element: HTMLTextAreaElement | null) => {
    internalRef.current = element;
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref) {
      ref.current = element;
    }
  };

  // Detect @ typing
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    if (onValueChange) onValueChange(e.target.value);
    checkMention(e.target);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    checkMention(e.currentTarget);
  };

  const checkMention = (textarea: HTMLTextAreaElement) => {
    const text = textarea.value;
    const caretPos = textarea.selectionStart;
    
    if (caretPos === 0) {
      setShowHints(false);
      return;
    }

    // Look backwards from caret to find an '@'
    let i = caretPos - 1;
    let foundAt = -1;
    while (i >= 0) {
      if (text[i] === '@') {
        // Ensure it's preceded by a space or it's the start of string
        if (i === 0 || /\s/.test(text[i - 1])) {
          foundAt = i;
        }
        break;
      }
      if (/\s/.test(text[i])) {
        // stop if we see space before finding @
        break;
      }
      i--;
    }

    if (foundAt !== -1) {
      const query = text.substring(foundAt + 1, caretPos);
      setMentionQuery(query);
      
      const caretCoords = getCaretCoordinates(textarea, foundAt);
      setCursorPos({
        top: caretCoords.top + caretCoords.height,
        left: caretCoords.left,
      });
      setShowHints(true);
      fetchHints(query);
    } else {
      setShowHints(false);
    }
  };

  const fetchHints = (query: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/mentions?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
          setHints(data.users);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);
  };

  const insertMention = (username: string) => {
    if (!internalRef.current) return;
    const text = internalRef.current.value;
    const caretPos = internalRef.current.selectionStart;

    // Find the @ again
    let i = caretPos - 1;
    let foundAt = -1;
    while (i >= 0) {
      if (text[i] === '@') {
        foundAt = i;
        break;
      }
      i--;
    }

    if (foundAt !== -1) {
      const newText = text.substring(0, foundAt) + `@${username} ` + text.substring(caretPos);
      
      const syntheticEvent = {
        target: { value: newText }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      
      onChange(syntheticEvent);
      if (onValueChange) onValueChange(newText);
      
      setShowHints(false);
      
      // refocus and move caret
      setTimeout(() => {
        if (internalRef.current) {
          internalRef.current.focus();
          const newCaretPos = foundAt + username.length + 2;
          internalRef.current.setSelectionRange(newCaretPos, newCaretPos);
        }
      }, 0);
    }
  };

  return (
    <div className="relative w-full">
      <textarea
        {...props}
        ref={setRefs}
        value={value}
        onChange={handleInput}
        onSelect={handleSelect}
        onKeyUp={handleSelect}
        onClick={handleSelect}
        className={`w-full ${className || ''}`}
      />
      
      {showHints && hints.length > 0 && (
        <div 
          className="absolute z-[100] bg-[var(--color-bg)] border border-[var(--color-border-color)] rounded-xl shadow-2xl overflow-hidden min-w-[200px] max-w-[280px]"
          style={{ top: Math.min(cursorPos.top + 5, 200), left: Math.min(cursorPos.left, 150) }}
        >
          <ul className="max-h-48 overflow-y-auto custom-scrollbar">
            {hints.map((user) => (
              <li 
                key={user.id}
                onClick={() => insertMention(user.username)}
                className="flex items-center gap-3 p-2.5 hover:bg-[var(--color-surface)] cursor-pointer transition"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] overflow-hidden shrink-0">
                  <Avatar
                    src={user.avatar_url}
                    size={32}
                    alt={user.username}
                    fallback={
                      <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-pink-500 to-yellow-500">
                        {(user.full_name || user.username).charAt(0)}
                      </div>
                    }
                  />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-white text-sm font-bold truncate">{user.username}</span>
                  <span className="text-[var(--color-text-2)] text-xs truncate">{user.full_name}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

export default MentionTextarea;
