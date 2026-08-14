"use client";

import { useState, useEffect, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

export default function ScannerCameraModal({ 
  onClose, 
  onCapture 
}: { 
  onClose: () => void,
  onCapture: (scannedId: string, photoBase64: string) => void
}) {
  const [phase, setPhase] = useState<"scanning" | "scanned" | "camera">("scanning");
  const [scannedId, setScannedId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flashOn, setFlashOn] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop video stream when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleScan = (text: string) => {
    if (phase !== "scanning") return;
    if (text && text.trim().length > 0) {
      setScannedId(text);
      setPhase("scanned");
      setTimeout(() => {
        setPhase("camera");
        startCamera("environment");
      }, 1500);
    }
  };

  const startCamera = async (facing: "environment" | "user") => {
    // Stop existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check flash/torch support
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.() as any;
        if (capabilities?.torch) {
          setFlashSupported(true);
        } else {
          setFlashSupported(false);
          setFlashOn(false);
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const newFlashState = !flashOn;
      await videoTrack.applyConstraints({
        advanced: [{ torch: newFlashState } as any]
      });
      setFlashOn(newFlashState);
    } catch (err) {
      console.error("Flash toggle error:", err);
    }
  };

  const flipCamera = () => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    setFlashOn(false);
    startCamera(newFacing);
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Mirror if using front camera
        if (facingMode === "user") {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0);
        const base64 = canvas.toDataURL("image/jpeg", 0.85);
        onCapture(scannedId, base64);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in zoom-in-95 duration-200">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4 absolute top-0 w-full z-10 bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md cursor-pointer text-white hover:bg-white/20 transition"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <span className="text-white font-bold tracking-wide">
          {phase === "scanning" ? "Scan QR Teman" : phase === "camera" ? "Ambil Foto" : "Berhasil!"}
        </span>
        <div className="w-10" /> {/* Balancer */}
      </div>

      {/* Main Viewfinder Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        
        {/* Background */}
        <div className="absolute inset-0 bg-[#111]">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>

        {/* Phase: Scanning QR */}
        {phase === "scanning" && (
          <div className="absolute inset-0">
            <Scanner 
              onScan={(result) => handleScan(result[0].rawValue)}
              components={{
                finder: false
              }}
              styles={{
                container: { width: '100%', height: '100%' },
                video: { objectFit: 'cover' }
              }}
            />
          </div>
        )}

        {/* Phase: Camera */}
        {phase === "camera" && (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
          />
        )}

        {/* Overlays for Scanning/Scanned */}
        {(phase === "scanning" || phase === "scanned") && (
          <div className="relative z-10 w-64 h-64 pointer-events-none">
            <div className={`absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 rounded-tl-xl transition-colors duration-300 ${phase === "scanned" ? "border-green-500" : "border-[var(--color-brand-red)]"}`} />
            <div className={`absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 rounded-tr-xl transition-colors duration-300 ${phase === "scanned" ? "border-green-500" : "border-[var(--color-brand-red)]"}`} />
            <div className={`absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 rounded-bl-xl transition-colors duration-300 ${phase === "scanned" ? "border-green-500" : "border-[var(--color-brand-red)]"}`} />
            <div className={`absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 rounded-br-xl transition-colors duration-300 ${phase === "scanned" ? "border-green-500" : "border-[var(--color-brand-red)]"}`} />
            
            {/* Animated Scan Line */}
            {phase === "scanning" && (
              <div className="absolute left-0 right-0 h-[2px] bg-[var(--color-brand-red)] shadow-[0_0_15px_rgba(229,39,31,1)] top-1/2 animate-[scan_2s_ease-in-out_infinite]" />
            )}

            {/* Success Icon */}
            {phase === "scanned" && (
              <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in fade-in duration-300">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="h-40 bg-black flex items-center justify-center relative z-10">
        {phase === "camera" && (
          <div className="flex items-center gap-12">
            {/* Flash Toggle */}
            <button 
              onClick={toggleFlash}
              disabled={!flashSupported}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                flashOn ? "bg-yellow-400 text-black" : "bg-white/10 text-white"
              } ${!flashSupported ? "opacity-30 cursor-not-allowed" : "hover:bg-white/20"}`}
            >
              <svg viewBox="0 0 24 24" fill={flashOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </button>

            {/* Shutter Button */}
            <button 
              onClick={takePhoto}
              className="w-20 h-20 rounded-full border-[5px] border-white/50 flex items-center justify-center p-1.5 cursor-pointer hover:border-white transition group"
            >
              <div className="w-full h-full bg-white rounded-full group-hover:scale-95 transition-transform group-active:scale-90" />
            </button>

            {/* Flip Camera */}
            <button 
              onClick={flipCamera}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>
                <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"/>
                <polyline points="16 3 19 1 22 3"/>
                <polyline points="8 21 5 23 2 21"/>
              </svg>
            </button>
          </div>
        )}
        
        {(phase === "scanning" || phase === "scanned") && (
           <p className="text-white/60 text-sm font-medium animate-pulse">
             Arahkan kamera ke QR Code teman
           </p>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
