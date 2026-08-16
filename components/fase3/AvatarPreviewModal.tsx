"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface AvatarPreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export default function AvatarPreviewModal({ imageUrl, onClose }: AvatarPreviewModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-sm cursor-pointer"
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative max-w-[90vw] max-h-[90vh] md:max-w-md w-full aspect-square rounded-full overflow-hidden shadow-2xl z-10 border-2 border-[#3a3a3d]"
        >
          <img 
            src={imageUrl} 
            alt="Profile Preview" 
            className="w-full h-full object-cover"
          />
        </motion.div>
        
        {/* Close Button placed outside so it's always visible even if image is round */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition backdrop-blur-md"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </AnimatePresence>
  );
}
