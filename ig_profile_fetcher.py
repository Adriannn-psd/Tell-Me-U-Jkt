"""
Instagram Profile Fetcher — Mengambil foto profil & info user via instagrapi.
Digunakan sebagai subprocess dari Next.js API route.
Mendukung ROTASI COOKIES dari beberapa akun IG.

Usage:
    python ig_profile_fetcher.py <username>

Output (stdout): JSON
    { "success": true, "username": "...", "full_name": "...", "profile_pic_url": "..." }
    atau
    { "cooldown": 30, "error": "Antrean penuh" }
    atau
    { "fallback": true, "message": "Semua session diblokir sementara" }
"""

import sys
import json
import os
import random
import time
from instagrapi import Client
from dotenv import load_dotenv

load_dotenv(".env.local")

STATE_FILE = "ig_session_state.json"
COOLDOWN_SECONDS = 15
BLOCK_SECONDS = 86400  # 24 hours

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {}

def save_state(state):
    try:
        with open(STATE_FILE, "w") as f:
            json.dump(state, f)
    except:
        pass

def get_session_ids():
    raw = os.getenv("IG_SESSION_IDS", "")
    if not raw:
        return []
    
    all_sessions = [s.strip() for s in raw.split(",") if s.strip()]
    profile_sessions = all_sessions[1:] if len(all_sessions) > 1 else all_sessions
    return profile_sessions

def fetch_profile(username: str):
    sessions = get_session_ids()
    
    if not sessions:
        return {"success": False, "error": "Tidak ada IG_SESSION_IDS di environment. Tambahkan minimal 2 session ID."}
    
    state = load_state()
    now = time.time()
    
    # Kumpulkan session yang tersedia
    available_sessions = []
    blocked_sessions = 0
    on_cooldown_sessions = 0
    
    for session_id in sessions:
        sess_state = state.get(session_id, {"last_used": 0, "blocked_until": 0})
        
        if sess_state["blocked_until"] > now:
            blocked_sessions += 1
            continue
            
        if now - sess_state["last_used"] < COOLDOWN_SECONDS:
            on_cooldown_sessions += 1
            continue
            
        available_sessions.append(session_id)
        
    if blocked_sessions == len(sessions):
        return {"success": True, "fallback": True, "message": "Semua sesi diblokir sementara. Lanjut tanpa foto profil."}
        
    if not available_sessions:
        return {"success": False, "cooldown": 30, "error": "Tunggu 30 detik. Semua antrean akun bot sedang digunakan pengguna lain."}
    
    # Pilih acak dari yang tersedia
    session_id = random.choice(available_sessions)
    
    try:
        cl = Client()
        cl.login_by_sessionid(session_id)
        user_info = cl.user_info_by_username(username)
        
        # Update last_used
        if session_id not in state:
            state[session_id] = {"last_used": 0, "blocked_until": 0}
        state[session_id]["last_used"] = time.time()
        save_state(state)
        
        profile_pic_url = str(user_info.profile_pic_url) if user_info.profile_pic_url else ""
        return {
            "success": True,
            "username": user_info.username,
            "full_name": user_info.full_name or "",
            "profile_pic_url": profile_pic_url,
            "is_private": user_info.is_private,
            "follower_count": user_info.follower_count,
            "following_count": user_info.following_count,
        }
    except Exception as e:
        # Jika gagal (seperti rate limit/challenge), blokir sesi ini
        error_msg = str(e).lower()
        if "login" in error_msg or "challenge" in error_msg or "feedback" in error_msg or "wait" in error_msg:
            if session_id not in state:
                state[session_id] = {"last_used": 0, "blocked_until": 0}
            state[session_id]["blocked_until"] = time.time() + BLOCK_SECONDS
            save_state(state)
            
        # Recursive retry kalau masih ada sesi lain?
        # Supaya tidak terlalu kompleks, kita return error dan biar user coba lagi (atau next fallback).
        return {"success": False, "error": f"Gagal fetch profil. Bot terkena limit. Silakan coba lagi."}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Username tidak diberikan"}))
        sys.exit(1)
    
    target_username = sys.argv[1].strip().lower()
    
    if target_username.startswith("@"):
        target_username = target_username[1:]
    if "instagram.com/" in target_username:
        parts = target_username.split("instagram.com/")
        target_username = parts[-1].split("/")[0].split("?")[0]
    
    result = fetch_profile(target_username)
    print(json.dumps(result, ensure_ascii=False))
