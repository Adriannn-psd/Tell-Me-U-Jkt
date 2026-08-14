import time
import schedule
from radar_scraper import main

def job():
    print(f"\n=======================================================")
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Menjalankan Radar Scraper...")
    print(f"=======================================================\n")
    
    try:
        main()
    except Exception as e:
        print(f"[!] Terjadi error pada job: {e}")
        
    print(f"\n=======================================================")
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Radar Scraper selesai. Menunggu jadwal berikutnya...")
    print(f"=======================================================\n")

if __name__ == "__main__":
    print("Memulai Daemon Radar Scraper...")
    print("Daemon ini akan:")
    print(" 1. Berjalan satu kali sekarang.")
    print(" 2. Berjalan setiap hari pada jam 00:01.")
    print(" 3. Berjalan otomatis setiap 6 jam sekali.\n")
    
    # Jalankan sekali saat pertama kali dihidupkan (server baru nyala)
    job()
    
    # Jadwalkan setiap 6 jam sekali
    schedule.every(6).hours.do(job)
    
    # Jadwalkan spesifik setiap hari jam 00:01
    schedule.every().day.at("00:01").do(job)
    
    # Loop abadi agar skrip tidak mati (terus standby di background)
    while True:
        schedule.run_pending()
        time.sleep(60) # Cek setiap 60 detik agar hemat CPU
