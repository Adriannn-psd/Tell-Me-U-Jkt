"use client";

import { useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import MentionTextarea from "./MentionTextarea";

export default function UploadMediaModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [collaboratorUsername, setCollaboratorUsername] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [collabHints, setCollabHints] = useState<any[]>([]);
  const [showCollabHints, setShowCollabHints] = useState(false);
  const collabDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleCollaboratorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace('@', '');
    setCollaboratorUsername(val);

    if (val.trim() === '') {
      setShowCollabHints(false);
      return;
    }

    if (collabDebounceTimer.current) clearTimeout(collabDebounceTimer.current);
    collabDebounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/mentions?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        if (data.success) {
          setCollabHints(data.users);
          setShowCollabHints(true);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const selectedFile = fileList[0];
    
    // Strict validation for web images and videos
    if (!selectedFile.type.match(/image\/(jpeg|jpg|png|webp)/i) && !selectedFile.type.match(/video\/(mp4|webm|ogg)/i)) {
      alert("Format tidak didukung! Harap gunakan JPG, PNG, WEBP, atau MP4/WEBM.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsProcessing(true);

    if (selectedFile.type.startsWith("image/")) {
      // Compress image
      const options = {
        maxSizeMB: 1, // Compress to max 1MB to avoid Next.js payload limit
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      
      imageCompression(selectedFile, options)
        .then((compressedFile) => {
          proceedWithFile(compressedFile);
        })
        .catch((error) => {
          console.error("Compression error:", error);
          alert("Gagal memproses gambar.");
          if (fileInputRef.current) fileInputRef.current.value = "";
          setIsProcessing(false);
        });
      return;
    }

    if (selectedFile.type.startsWith("video/")) {
      // User requested to allow large files and let the system compress them later
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        proceedWithFile(selectedFile);
      };
      video.src = URL.createObjectURL(selectedFile);
    } else {
      proceedWithFile(selectedFile);
    }
  };

  const proceedWithFile = (selectedFile: File) => {
    setFile(selectedFile);
    
    // Create an object URL for instant, reliable preview
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
    
    // Kita tidak lagi mengubah file ke Base64 untuk menghindari crash browser
    // saat user memilih file video berukuran besar.
    setIsProcessing(false);
  };

  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async () => {
    if (!title || !file) return alert("Judul dan Foto wajib diisi!");
    setLoading(true);
    setUploadProgress(0);

    try {
      // 1. Dapatkan signature dari backend
      const timestamp = Math.round(new Date().getTime() / 1000);
      const paramsToSign = {
        timestamp,
        folder: "karya",
      };

      const signRes = await fetch("/api/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paramsToSign })
      });
      const signData = await signRes.json();
      if (!signData.success) throw new Error(signData.error || "Gagal mendapatkan signature");

      const { signature, cloudName, apiKey } = signData;

      // 2. Upload langsung ke Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", "karya");

      const uploadResult: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, true);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            // Upload ke Cloudinary merepresentasikan 85% progress
            const percentComplete = Math.round((event.loaded / event.total) * 85);
            setUploadProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(response);
            } else {
              reject(new Error(response.error?.message || "Gagal upload ke Cloudinary"));
            }
          } catch (e) {
            reject(new Error("Cloudinary server error"));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during Cloudinary upload"));
        xhr.send(formData);
      });

      const photoUrl = uploadResult.secure_url;
      setUploadProgress(90);

      // Determine aspect ratio basic logic
      let aspectRatio = "square";
      const img = new Image();
      img.src = preview || "";
      if (img.width > img.height) aspectRatio = "landscape";
      if (img.height > img.width) aspectRatio = "tall";

      // 3. Simpan data post ke database (Vercel Backend)
      const payload = {
        title,
        description,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        aspectRatio,
        photoUrl, // Kita kirim URL saja, bukan Base64
        collaborator_username: collaboratorUsername.trim() || undefined
      };

      const finalRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const finalData = await finalRes.json();
      if (!finalData.success) {
        throw new Error(finalData.error || "Gagal menyimpan karya ke database");
      }

      setUploadProgress(100);
      alert("Karya berhasil diunggah!");
      onClose();
      window.location.reload(); // Temporary reload until Optimistic UI is complete
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Gagal mengupload karya.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 pointer-events-auto">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-[var(--color-bg)] border border-[var(--color-border-color)] rounded-[24px] p-6 animate-in zoom-in-95 duration-300 shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Upload Karya</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-2)] hover:text-white transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5">
          
          {/* File Dropzone */}
          <input 
            type="file" 
            accept="image/jpeg, image/png, image/webp, video/mp4, video/webm" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange}
          />
          <div 
            onClick={() => { if (!isProcessing) fileInputRef.current?.click() }}
            className={`w-full h-40 border-2 border-dashed border-[var(--color-border-color)] rounded-2xl flex flex-col items-center justify-center transition group overflow-hidden relative ${isProcessing ? 'cursor-wait opacity-80' : 'cursor-pointer hover:border-[var(--color-brand-red)] hover:bg-[var(--color-surface)]'}`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center animate-pulse">
                <svg className="animate-spin w-8 h-8 text-[var(--color-brand-red)] mb-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-white font-bold text-sm">Memproses file...</p>
                <p className="text-[var(--color-text-3)] text-xs mt-1">Mohon tunggu sebentar</p>
              </div>
            ) : preview ? (
              file?.type.startsWith("video/") ? (
                <video src={preview} controls className="w-full h-full object-cover" />
              ) : (
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-full object-cover" 
                  onError={() => {
                    alert("Gagal memuat preview.");
                    setPreview(null);
                    setFile(null);
                  }}
                />
              )
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-text-2)] group-hover:text-[var(--color-brand-red)] transition mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <p className="text-white font-bold text-sm">Klik untuk pilih foto/video</p>
                <p className="text-[var(--color-text-3)] text-xs mt-1">Mendukung Image & Video (Max. 90 detik)</p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--color-text-2)] uppercase tracking-wide">Judul Karya</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Berikan judul yang menarik" 
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-xl px-4 py-3.5 text-white outline-none focus:border-[var(--color-brand-red)] transition text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--color-text-2)] uppercase tracking-wide">Deskripsi</label>
            <MentionTextarea 
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              placeholder="Ceritakan proses pembuatan karyamu (ketik @ untuk tag teman)..." 
              rows={4}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--color-brand-red)] transition text-sm resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--color-text-2)] uppercase tracking-wide">Tags (Pisahkan dengan koma)</label>
            <input 
              type="text" 
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="UI/UX, 3D, Ilustrasi..." 
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-xl px-4 py-3.5 text-white outline-none focus:border-[var(--color-brand-red)] transition text-sm"
            />
          </div>

          <div className="flex flex-col gap-2 relative">
            <label className="text-xs font-bold text-[var(--color-text-2)] uppercase tracking-wide">Kolaborasi Dengan (Username) - Opsional</label>
            <div className="flex w-full bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-xl overflow-hidden focus-within:border-[var(--color-brand-red)] transition">
              <div className="flex items-center justify-center pl-4 pr-1 text-[var(--color-text-3)] font-bold">@</div>
              <input 
                type="text" 
                value={collaboratorUsername}
                onChange={handleCollaboratorChange}
                onBlur={() => setTimeout(() => setShowCollabHints(false), 200)}
                placeholder="username teman" 
                className="w-full bg-transparent px-2 py-3.5 text-white outline-none text-sm"
              />
            </div>
            {showCollabHints && collabHints.length > 0 && (
              <div className="absolute bottom-[100%] mb-1 left-0 right-0 z-[100] bg-[var(--color-bg)] border border-[var(--color-border-color)] rounded-xl shadow-2xl overflow-hidden">
                <ul className="max-h-48 overflow-y-auto custom-scrollbar">
                  {collabHints.map((user) => (
                    <li 
                      key={user.id}
                      onClick={() => {
                        setCollaboratorUsername(user.username);
                        setShowCollabHints(false);
                      }}
                      className="flex items-center gap-3 p-2.5 hover:bg-[var(--color-surface)] cursor-pointer transition"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] overflow-hidden shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-pink-500 to-yellow-500">
                            {(user.full_name || user.username).charAt(0)}
                          </div>
                        )}
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

        </div>

        {loading ? (
          <div className="w-full mt-6 flex flex-col gap-2">
            <div className="flex justify-between text-xs font-bold text-white">
              <span>{uploadProgress < 100 ? "Mengupload..." : "Memproses di server..."}</span>
              <span>{uploadProgress < 100 ? `${uploadProgress}%` : "Mohon tunggu"}</span>
            </div>
            <div className="w-full bg-[var(--color-surface)] h-4 rounded-full overflow-hidden relative border border-[var(--color-border-color)]">
              <div 
                className={`absolute left-0 top-0 h-full bg-[var(--color-brand-red)] transition-all duration-300 ${uploadProgress === 100 ? 'animate-pulse' : ''}`}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <button 
            onClick={handleUpload}
            disabled={!title || !file || isProcessing}
            className="w-full bg-[var(--color-brand-red)] text-white font-bold py-4 rounded-xl mt-6 hover:bg-red-600 transition shadow-[0_4px_14px_rgba(229,39,31,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload Sekarang
          </button>
        )}
        
      </div>
    </div>
  );
}
