import { useState } from "react";
import ProfileLockOverlay, { useProfileCheck } from "@/components/ProfileLockOverlay";

export default function PreviewConfirmModal({ 
  onClose, 
  onRetake,
  scanSession
}: { 
  onClose: () => void,
  onRetake: () => void,
  scanSession: { scannedId: string, photoBase64: string }
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const { isComplete, missingInfo } = useProfileCheck();

  const handleSimpan = () => {
    setIsUploading(true);
    setUploadProgress(0);
    setError("");
    
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/ospek/scan", true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        // Since XHR only tracks client-to-server upload, we cap it at 90% 
        // to leave room for server-to-drive/cloudinary processing
        const percentComplete = Math.round((event.loaded / event.total) * 90);
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          setUploadProgress(100);
          setTimeout(() => onClose(), 500); // Tunda sedikit agar user bisa lihat 100%
        } else {
          setError(data.error || "Gagal menyimpan data scan");
        }
      } catch (err) {
        setError("Respons server tidak valid. Coba lagi.");
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    };

    xhr.send(JSON.stringify({
      scannedId: scanSession.scannedId,
      photoBase64: scanSession.photoBase64,
    }));
  };

  if (!isComplete) {
    return <ProfileLockOverlay onClose={onClose} missingInfo={missingInfo} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)] animate-in fade-in duration-200">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4">
        <button 
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-[var(--color-surface)] flex items-center justify-center cursor-pointer text-white hover:bg-[var(--color-surface-2)] transition border border-[var(--color-border-color)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
        <span className="text-white font-bold">Preview Hasil</span>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col">
        {/* Photo Preview */}
        <div className="w-full aspect-[3/4] bg-[#1a1a1c] rounded-2xl border border-[var(--color-border-color)] overflow-hidden relative mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            {scanSession.photoBase64 ? (
              <img src={scanSession.photoBase64} alt="Captured" className="w-full h-full object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-20 h-20 text-[var(--color-text-3)]">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            )}
          </div>
          {/* Flash effect overlay */}
          <div className="absolute inset-0 bg-white animate-[flash_0.8s_ease-out_forwards]" />
        </div>

        {/* User Info Card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl p-5 mb-auto relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-brand-red)] opacity-5 rounded-full blur-xl -mr-8 -mt-8"></div>
          
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-[11px] text-[var(--color-text-2)] font-semibold mb-1 uppercase tracking-wide">ID Terscan</p>
              <h3 className="text-xl font-bold text-white mb-1 truncate w-40">{scanSession.scannedId}</h3>
            </div>
            
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#10b981] to-[#047857] flex items-center justify-center text-white font-bold border-2 border-[var(--color-bg)] shadow-lg">
              {scanSession.scannedId.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs mt-4 text-center">{error}</p>}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-4">
          <button 
            onClick={onRetake}
            disabled={isUploading}
            className="flex-1 bg-[var(--color-surface-2)] text-white font-bold py-3.5 rounded-xl hover:bg-[#2a2a30] transition border border-[var(--color-border-color)] disabled:opacity-50"
          >
            Ulangi
          </button>
          <button 
            onClick={handleSimpan}
            disabled={isUploading}
            className="flex-1 bg-[var(--color-brand-red)] text-white font-bold py-3.5 rounded-xl transition shadow-[0_4px_14px_rgba(229,39,31,0.4)] disabled:opacity-80 relative overflow-hidden flex justify-center items-center gap-2"
          >
            {isUploading ? (
              <>
                {/* Progress bar background */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300 ease-out" 
                  style={{ width: `${uploadProgress}%` }} 
                />
                <span className="relative z-10 flex items-center gap-2 text-sm">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25"/>
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75"/>
                  </svg>
                  Mengupload... {uploadProgress}%
                </span>
              </>
            ) : (
              "Simpan"
            )}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}} />
    </div>
  );
}
