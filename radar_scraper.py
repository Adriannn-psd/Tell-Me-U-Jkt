import os
import json
import time
from datetime import datetime
from collections import Counter
from instagrapi import Client

# pip install cloudinary google-generativeai supabase instagrapi python-dotenv
import cloudinary
import cloudinary.uploader
import google.generativeai as genai
from supabase import create_client, Client as SupabaseClient
from dotenv import load_dotenv

# Memuat variabel dari .env.local
load_dotenv(".env.local")

# ==========================================
# 1. KONFIGURASI INSTAGRAM & LOKAL
# ==========================================
SESSION_ID = "38516027021%3A8EMKRfgG0H94tc%3A7%3AAYggMAkDouApXlOSFmCpm2t_CjPU0UziOcQsD2Gq6Q"
DOWNLOAD_DIR = "media_kampus"
TARGET_ACCOUNTS = [
    "sisteminformasi_tukj", 
    "komvitukj", 
    "himsi_tuj",
    "pkkmb.telujakarta2026"
]

# ==========================================
# 2. KONFIGURASI CLOUDINARY
# ==========================================
cloudinary.config(
  cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
  api_key = os.getenv("CLOUDINARY_API_KEY"),
  api_secret = os.getenv("CLOUDINARY_API_SECRET")
)

# ==========================================
# 3. KONFIGURASI AI (Gemini)
# ==========================================
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model_ai = genai.GenerativeModel('gemini-flash-latest')

# ==========================================
# 4. KONFIGURASI SUPABASE
# ==========================================
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") 
supabase: SupabaseClient = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==========================================
# FUNGSI AI UNTUK EKSTRAKSI DATA
# ==========================================
def ekstrak_data_dengan_ai(caption: str, is_puzzle_feed: bool) -> dict:
    if is_puzzle_feed:
        struktur_json = """
        "title": "Judul singkat maksimal 6 kata",
        "summary": "Rangkuman padat dan jelas maksimal 2 kalimat (karena ini puzzle feed yang captionnya diulang)",
        "category": "Pilih salah satu: Beasiswa / Akademik / Event / Karir / Lost & Found / Lainnya",
        "important_date": "YYYY-MM-DD" (jika ada deadline/tanggal acara, jika tidak isi null)
        """
    else:
        struktur_json = """
        "title": "Judul singkat maksimal 6 kata",
        "category": "Pilih salah satu: Beasiswa / Akademik / Event / Karir / Lost & Found / Lainnya",
        "important_date": "YYYY-MM-DD" (jika ada deadline/tanggal acara, jika tidak isi null)
        """

    prompt = f"""
    Kamu adalah asisten pintar untuk portal mahasiswa. Tugasmu adalah mengekstrak informasi penting dari caption Instagram berikut ke dalam format JSON murni tanpa markdown.
    
    CAPTION:
    "{caption}"
    
    HASIL YANG DIHARAPKAN (JSON dengan struktur ini):
    {{
{struktur_json}
    }}
    """
    
    try:
        response = model_ai.generate_content(
            prompt,
            generation_config={"temperature": 0.2, "response_mime_type": "application/json"}
        )
        # Membersihkan output jika ada markdown
        result = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(result)
    except Exception as e:
        print(f"      [!] Gagal mengekstrak dengan AI: {e}")
        return {
            "title": "Info Kampus",
            "summary": caption, # Jangan potong caption jika AI gagal
            "category": "Lainnya",
            "important_date": None
        }

# ==========================================
# PROGRAM UTAMA
# ==========================================
def main():
    if not os.path.exists(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR)

    cl = Client()
    
    try:
        print("[*] Mencoba masuk mem-bypass login menggunakan Session ID...")
        cl.login_by_sessionid(SESSION_ID)
        print("[*] Bypass berhasil! Sesi terhubung.\n")
            
        hasil_radar = []

        for target in TARGET_ACCOUNTS:
            print(f"> Menganalisis data dari @{target}...")
            
            try:
                user_id = cl.user_id_from_username(target)
                medias = cl.user_medias(user_id, 6) 
                
                # TAHAP 1: PRE-CHECK (Puzzle Feed)
                semua_caption = [media.caption_text if media.caption_text else "KOSONG" for media in medias]
                jumlah_kemunculan_caption = Counter(semua_caption)
                print(f"  [*] Pre-check selesai: Ditemukan {len(medias)} postingan.")

                # Hapus duplikat media berdasarkan caption jika itu puzzle, ambil perwakilannya saja
                medias_to_process = []
                seen_captions = set()
                for media in medias:
                    caption = media.caption_text if media.caption_text else "KOSONG"
                    if jumlah_kemunculan_caption[caption] > 1:
                        if caption not in seen_captions:
                            medias_to_process.append(media)
                            seen_captions.add(caption)
                    else:
                        medias_to_process.append(media)

                # TAHAP 2: EKSEKUSI & DOWNLOAD
                for media in medias_to_process:
                    caption_saat_ini = media.caption_text if media.caption_text else "KOSONG"
                    
                    if caption_saat_ini == "KOSONG" or len(caption_saat_ini) < 10:
                        continue # Lewati jika tidak ada caption informatif
                        
                    # Cek apakah postingan sudah ada di database (Mencegah duplikasi)
                    original_link = f"https://www.instagram.com/p/{media.code}/"
                    existing = supabase.table('radar_kampus_posts').select("id").eq("original_link", original_link).execute()
                    if len(existing.data) > 0:
                        print(f"  [~] {media.code} | Sudah ada di database, skip.")
                        continue

                    is_puzzle_feed = jumlah_kemunculan_caption[caption_saat_ini] > 1
                    
                    media_paths = []
                    cloudinary_urls = []
                    
                    print(f"  [~] {media.code} | Mendownload dan mengupload gambar/video ke Cloudinary...")
                    
                    # Unduh ke lokal
                    try:
                        if media.media_type == 1:
                            path = cl.photo_download(media.pk, folder=DOWNLOAD_DIR)
                            media_paths.append(str(path))
                        elif media.media_type == 2:
                            path = cl.video_download(media.pk, folder=DOWNLOAD_DIR)
                            media_paths.append(str(path))
                        elif media.media_type == 8:
                            paths = cl.album_download(media.pk, folder=DOWNLOAD_DIR)
                            media_paths = [str(p) for p in paths]
                            
                        # Upload ke Cloudinary
                        for local_path in media_paths:
                            print(f"      Upload ke Cloudinary: {local_path}")
                            upload_result = cloudinary.uploader.upload(
                                local_path, 
                                folder="media_kampus",
                                resource_type="auto"
                            )
                            cloudinary_urls.append(upload_result['secure_url'])
                            
                    except Exception as e:
                        print(f"      [!] Gagal mendownload/upload media: {e}")
                            
                    # Upload Profile Pic
                    author_profile_pic = None
                    try:
                        if hasattr(media, "user") and media.user and hasattr(media.user, "profile_pic_url"):
                            pic_url = str(media.user.profile_pic_url)
                            if pic_url:
                                upload_res = cloudinary.uploader.upload(pic_url, folder="media_kampus/profiles")
                                author_profile_pic = upload_res['secure_url']
                    except Exception as e:
                        print(f"      [!] Gagal upload profile pic: {e}")

                    # TAHAP 3: PROSES AI
                    print(f"  [~] {media.code} | Menganalisis caption dengan Gemini AI...")
                    ai_data = ekstrak_data_dengan_ai(caption_saat_ini, is_puzzle_feed)

                    # TAHAP 4: SIMPAN KE SUPABASE & JSON LOKAL
                    
                    # Konversi media.taken_at (datetime) ke format string ISO
                    original_date_str = None
                    if hasattr(media, "taken_at") and media.taken_at:
                        try:
                            original_date_str = media.taken_at.isoformat()
                        except:
                            pass
                            
                    post_data = {
                        "title": ai_data.get("title", "Info Kampus"),
                        "summary": ai_data.get("summary", caption_saat_ini) if is_puzzle_feed else caption_saat_ini,
                        "category": ai_data.get("category", "Lainnya"),
                        "media_urls": cloudinary_urls,
                        "is_puzzle_feed": is_puzzle_feed,
                        "important_date": ai_data.get("important_date"),
                        "original_link": original_link,
                        "author_username": target,
                        "author_profile_pic": author_profile_pic,
                        "original_created_at": original_date_str
                    }
                    
                    # Insert ke Supabase
                    supabase.table('radar_kampus_posts').insert(post_data).execute()
                    
                    # Tambahkan ke JSON lokal sebagai log
                    post_data["akun"] = target
                    hasil_radar.append(post_data)
                    print(f"  [+] Berhasil menyimpan {media.code} ke Database!")

            except Exception as e:
                print(f"  [-] Gagal memproses @{target}: {e}")

            print("> Jeda 15 detik sebelum lanjut...\n")
            time.sleep(15)

        # Simpan backup JSON lokal
        with open('data_radar_kampus.json', 'w', encoding='utf-8') as f:
            json.dump(hasil_radar, f, indent=4, ensure_ascii=False)
            
        print(f"[*] Eksekusi selesai! File tersimpan di 'data_radar_kampus.json'")

    except Exception as e:
        print(f"[!] Terjadi kesalahan fatal: {e}")

if __name__ == "__main__":
    main()
