"use client";

import { signIn } from "next-auth/react";
import DiscordWidget from "@/components/DiscordWidget";
import { useRouter } from "next/navigation";
import { useGuest } from "@/components/GuestProvider";
// Import styles from login.css to maintain exact styling
import "@/app/login.css";

interface LoginPanelProps {
  errorMessage?: string | null;
  showGuestOption?: boolean;
  showDiscordWidget?: boolean;
}

export default function LoginPanel({ errorMessage, showGuestOption = false, showDiscordWidget = true }: LoginPanelProps) {
  const router = useRouter();
  const { setIsGuest } = useGuest();

  const handleGuestLogin = () => {
    document.cookie = "guest_mode=true; path=/; max-age=86400"; // 1 day
    setIsGuest(true);
    router.push("/home");
  };

  return (
    <section className="login-panel" style={{ position: 'relative', opacity: 1, visibility: 'visible', pointerEvents: 'auto', transform: 'none' }}>
      <div className="login-card">
        <h2 className="card-title">Masuk ke <span className="accent">Tell Me U JKT</span></h2>
        <p className="card-subtitle">Silakan login menggunakan akun Discord kamu untuk melanjutkan</p>

        {errorMessage && (
          <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.875rem', textAlign: 'center' }}>
            {errorMessage}
          </div>
        )}

        <button onClick={() => {
          document.cookie = "guest_mode=; path=/; max-age=0";
          setIsGuest(false);
          signIn("discord", { callbackUrl: "/home" });
        }} className="discord-btn" type="button">
          <span className="discord-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.076.076 0 0 0-.04.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </span>
          <span>Masuk dengan Discord</span>
          <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>

        {showGuestOption && (
          <button onClick={handleGuestLogin} className="discord-btn" style={{ marginTop: '12px', background: 'transparent', border: '2px solid rgba(255,255,255,0.1)' }} type="button">
            <span className="discord-icon text-[var(--color-text-2)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </span>
            <span style={{ color: 'var(--color-text-2)' }}>Lanjutkan sebagai Tamu</span>
            <svg className="chevron-icon text-[var(--color-text-2)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        )}

        <div className="divider"><span>Kenapa Discord?</span></div>

        <ul className="features">
          <li className="feature">
            <span className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <polyline points="9 12 11 14 15 10"></polyline>
              </svg>
            </span>
            <span className="feature-body">
              <strong>Aman &amp; Terverifikasi</strong>
              <p>Akun Discord kamu digunakan untuk verifikasi keanggotaan angkatan Tel-U JKT.</p>
            </span>
          </li>
          <li className="feature">
            <span className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
            <span className="feature-body">
              <strong>Privasi Terjaga</strong>
              <p>Kami tidak akan mengakses data pribadi selain informasi yang diperlukan.</p>
            </span>
          </li>
        </ul>
      </div>

      <div className="footer-text">
        <p>Belum punya akun Discord?</p>
        <a href="https://discord.com/register" target="_blank" rel="noopener noreferrer" className="signup-link">
          Daftar Discord
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
        {showDiscordWidget && <DiscordWidget serverId="1522059025485664326" />}
      </div>
    </section>
  );
}
