import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/utils/cropImage";
import { motion } from "framer-motion";

interface AvatarCropModalProps {
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

export default function AvatarCropModal({ imageSrc, onClose, onCropComplete }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedBlob) {
        onCropComplete(croppedBlob);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[#1c1c1e] rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-[#333338]"
      >
        <div className="p-4 border-b border-[#333338] flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Sesuaikan Foto</h2>
          <button onClick={onClose} disabled={isProcessing} className="text-[#8e8e93] hover:text-white transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="relative w-full h-[350px] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
          />
        </div>

        <div className="p-4 flex flex-col gap-4 border-t border-[#333338]">
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#8e8e93]">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1 bg-[#3a3a3d] rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-[#3a3a3d] rounded-xl hover:bg-[#4a4a4d] transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-bold text-white bg-[#E5271F] rounded-xl hover:bg-[#ff3b30] transition shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              Selesai
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
