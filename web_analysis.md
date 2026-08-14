# Analisis Sistem & Fitur Aplikasi Web "Tell Me U Jkt"

Berdasarkan eksplorasi terhadap struktur *codebase* dan fungsionalitas yang ada (menggunakan Next.js App Router, TailwindCSS, dan Supabase), berikut adalah telaah mendalam mengenai fitur-fitur utama dan *user flow* di dalam aplikasi.

---

## 1. Fitur "Kenalan Maba" (Scan QR Ospek)
Fitur ini dirancang khusus untuk fase orientasi (Ospek), membantu mahasiswa baru berjejaring (mutualan) dengan memindai QR Code teman.

**User Flow:**
1. **Entry Point:** Pengguna mengakses menu utama atau *bottom navigation bar* yang dinamis (saat fase Ospek aktif, tombol tengah *bottom nav* akan memunculkan menu "Scan QR").
2. **Scanner Page (`/ospek`):**
   - Menampilkan *interface* kamera berbasis HTML5 (`react-qr-reader` atau library sejenis) untuk memindai kode QR.
   - Jika QR Code terdeteksi dan valid, sistem mengekstrak ID pengguna unik dari QR tersebut.
3. **Verification Page (`/ospek/scan/[id]`):**
   - Pengguna diarahkan ke halaman detail mahasiswa yang bersangkutan (menampilkan Nama, Avatar/Foto, Jurusan/Prodi, dan Bio singkat).
   - Pengguna diminta memverifikasi apakah ini orang yang benar untuk diajak berkenalan.
4. **Validation & Proof (`/ospek/validate/[id]`):**
   - Untuk mencegah *spam* atau kecurangan, sistem mewajibkan pengguna untuk mengunggah *foto bareng* (wefie) sebagai bukti fisik perkenalan.
   - Foto yang diunggah disimpan di *storage* (Supabase Storage).
   - Record pertemanan dicatat dalam database (misalnya tabel `connections` dengan status `pending` atau `verified`).
5. **Sukses:** Menampilkan animasi sukses, jumlah "mutualan" bertambah di profil masing-masing.

---

## 2. Fitur "Galeri Karya" (Upload Karya & Showcase)
Fitur *portofolio* mahasiswa, mirip dengan Pinterest, dengan *layout* Masonry yang dinamis.

**User Flow:**
1. **Entry Point:** Menu "Karya" atau tombol *Quick Add* pada *bottom nav* ("Tambah Karya").
2. **Upload Modal/Page:**
   - Pengguna memilih file (gambar, desain, foto).
   - Mengisi metadata: Judul, Deskripsi, Kategori/Tags, dan *Link* eksternal (misal: GitHub, Figma, Behance).
   - Proses upload ke *cloud storage*.
3. **Showcase Page (`/karya`):**
   - Menggunakan *Masonry Layout* (gambar tersusun rapi secara vertikal tak beraturan seperti *Pinterest*).
   - Sistem *lazy-loading* dan optimasi gambar Next.js diterapkan.
4. **Interaksi:**
   - Fitur "Like" / "Love".
   - *Filter* berdasarkan Kategori (Desain, Fotografi, Kode, dll) atau Prodi.
5. **Detail Karya:** Menampilkan karya penuh, pembuat karya (link ke profil), dan kolom apresiasi/komentar.

---

## 3. Dokumentasi Kegiatan & Event (Drop Memory)
Sebuah *feed* kolektif untuk membagikan momen-momen seputar kegiatan kampus.

**User Flow:**
1. **Entry Point:** Halaman Dokumentasi (`/dokumentasi`) atau "Drop Memory" pada *Quick Actions*.
2. **Lihat Feed:**
   - *Masonry layout* gambar kegiatan kampus.
   - Tombol "Filter" yang melayang (*floating*) di desktop dan tergabung di sebelah tombol "Buat Kegiatan" di *mobile* untuk memilah berdasar kategori.
3. **Buat Kegiatan / Drop Memory:**
   - Melalui form modal: Mengunggah gambar/video, menambahkan *caption* dan *tags* (misal: #Ospek2024, #BEM).
   - Data masuk ke dalam tabel `events` atau `documentation_feed`.

---

## 4. Akademik & Produktivitas
Membantu mahasiswa mengelola tugas, absen, dan jadwal.

- **To-Do & Deadline (Widget Dinamis):**
  - Terdapat di *Dashboard* (halaman Home). Menampilkan tugas-tugas terdekat yang bisa diceklis (ditandai selesai) langsung dari halaman Home. Menggantikan blok *Active Mode* lama.
- **Tracker Akademik (`/tracker`):**
  - Halaman khusus layaknya kalender/planner akademik yang terintegrasi, yang menampilkan jadwal kelas, pengumpulan tugas, dll.

---

## 5. Fitur "Radar Kampus" (Dalam Pengembangan)
Sebuah fitur eksplorasi dan notifikasi informasi kampus.

- **Fungsi:** Sebuah widget di halaman utama yang membawa pengguna ke `/radar`.
- **Rencana Flow (AI Scraper):** Agen AI atau sistem otomasi akan melakukan *scraping* atau membaca berita/informasi dari website resmi Telkom Jakarta, lalu merangkumnya di Radar Kampus secara *live* agar mahasiswa tidak tertinggal info penting (misal: Oprec, jadwal UTS, dll).

---

## 6. Layout & Navigasi Utama (Fase 3)
Aplikasi didesain secara *mobile-first*, adaptif untuk tampilan desktop.

- **Header:** Berisi logo, sapaan personalisasi (Nama Pengguna), dan ikon notifikasi (Lonceng). Menu *hamburger* khusus dimunculkan hanya pada halaman Profil di tampilan *mobile*.
- **Quick Actions (Home):** Tombol aksi cepat seperti *Portal Kampus*, *Cari Partner / Team Finder*, *Drop Memory*, dan *Upload Karya*.
- **Smart Bottom Navigation (Mobile):**
  - Mengakomodasi tombol *Home*, *Dokumentasi*, *Academic/Tracker*, dan *Profile*.
  - **Smart FAB (Center):** Tombol tengah yang dinamis berdasarkan *season* kampus:
    - Jika `isOspekPhase = true` (Fase Orientasi): Menjadi *Scanner QR* Ospek.
    - Jika `isOspekPhase = false` (Perkuliahan Biasa): Menjadi tombol **`+` (Quick Add)** bergaya iOS yang akan memunculkan *Pop-up Menu* ("Tambah Tugas", "Tambah Karya", "Buat Event").
- **Sidebar (Desktop):** Navigasi *persisten* di layar besar.

---

## Teknologi & Arsitektur
1. **Frontend:** Next.js (App Router), React, TypeScript.
2. **Styling:** TailwindCSS, dioptimalkan dengan variabel CSS kustom untuk Dark Mode (*Apple-like aesthetic*, elemen *glassmorphism*).
3. **Backend & Auth:** Supabase (PostgreSQL, Storage, Auth).
4. **Design System:** Prioritas pada estetik premium (sudut membulat, animasi halus, *micro-interactions* pada tombol dan kartu).
