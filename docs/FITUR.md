# Tell Me U Jkt — Katalog Fitur, Halaman, dan Alur

Dokumen ini mencatat **seluruh** fitur web app Tell Me U Jkt: 17 halaman, 40 file
route API, lapisan fondasi (auth, gate akses, tema, media), alur lengkap dari
ujung ke ujung, kontrak dengan bot Discord, dan daftar celah yang masih terbuka.

Stack: Next.js 16.3 (App Router) · React · Tailwind v4 · Auth.js v5 (NextAuth) ·
Supabase (PostgREST) · Cloudinary + Google Drive + Google Sheets · Gemini
(OCR saja) · SWR · framer-motion.

Produksi: Vercel (auto-deploy dari `main`) dan VPS sendiri
(`docker-compose`, domain `tellmeujkt.web.id`).

---

## Daftar Isi

1. [Lapisan Fondasi](#1-lapisan-fondasi)
2. [Semua Halaman](#2-semua-halaman)
3. [Alur Lengkap](#3-alur-lengkap)
4. [Referensi API](#4-referensi-api)
5. [Integrasi Bot Discord](#5-integrasi-bot-discord)
6. [Celah yang Diketahui](#6-celah-yang-diketahui)

---

## 1. Lapisan Fondasi

Semua yang ada di bagian ini berlaku di setiap halaman. Baca ini dulu sebelum
bagian per-halaman, karena hampir semua halaman cuma menumpang aturan di sini.

### 1.1 Login: Discord OAuth + gate server

`auth.ts` (185 baris) memegang seluruh pondasi identitas.

- **Provider tunggal**: Discord OAuth, `scope=identify guilds.members.read`.
  Tidak ada email/password, tidak ada provider lain.
- **Gate keanggotaan server**: di callback `signIn`, aplikasi memanggil
  `https://discord.com/api/v10/users/@me/guilds/{GUILD_ID}/member` memakai
  access token user. `GUILD_ID = 1522059025485664326`. Kalau responsnya bukan
  OK, login **ditolak** dan user dilempar ke `/login?error=NotInServer`.
  Artinya: tidak bisa punya akun tanpa jadi anggota server Discord kampus.

- **Role Discord → prodi**: 5 role ID dipetakan ke nama prodi lewat
  `ROLE_TO_PRODI`. Prodi user diambil dari role yang dia punya di server:

  | Role ID | Prodi |
  |---|---|
  | `1538489249895292951` | Informatika |
  | `1526566212077879438` | Teknologi Informasi |
  | `1526566441040478352` | Sistem Informasi |
  | `1526565350731284532` | Desain Komunikasi Visual |
  | `1526566818024783872` | Teknik Telekomunikasi |

- **Auto-verifikasi dari data bot**: saat login, aplikasi mencari baris di tabel
  `maba_roles` berdasarkan username Discord. Kalau bot sudah berhasil
  mengekstrak `full_name` untuk username itu, user langsung ter-verifikasi
  tanpa upload SKL. Nama role pendek dari bot dipetakan lewat
  `BOT_ROLE_TO_PRODI`: `DKV`, `TI`, `TEKINFO`, `INFOR`, `SISFOR`, `TEKTEL`.
  Kalau `full_name` belum ada, auto-verifikasi **tidak** dijalankan — user harus
  lewat jalur SKL di `/profile`.
- **Foto profil custom tidak tertimpa**: kalau `users.avatar_url` yang tersimpan
  bukan URL `cdn.discordapp.com`, login berikutnya tidak menimpanya dengan foto
  Discord. Foto Discord tetap dibawa terpisah sebagai `discordAvatarUrl` supaya
  tombol "Pakai foto Discord" masih bisa mengembalikannya.
- **Strategi sesi: JWT**, tapi callback `jwt` **membaca ulang Supabase setiap
  kali dipanggil**. Konsekuensinya penting: begitu `isVerified`, `kelas`, atau
  `instagram` berubah di database (mis. setelah verifikasi), cukup panggil
  `update()` di klien dan seluruh UI langsung ikut berubah — tanpa logout.
- **Access token Discord tidak pernah sampai ke klien.** Token disimpan di JWT
  server-side; callback `session` hanya meneruskan field aman: `discordId`,
  `prodi`, `fullName`, `isVerified`, `avatarUrl`, `dbUsername`, `kelas`,
  `instagram`, `discordAvatarUrl`.

### 1.2 Tiga tingkat akses

Aplikasi punya tiga kelas pengunjung, dan bedanya harus dipahami dengan tepat:

| Tingkat | Cara masuk | Bisa apa |
|---|---|---|
| **Sesi nyata** | Login Discord | Semua fitur (masih tergantung kelengkapan profil) |
| **Mode Tamu** | Cookie `guest_mode=true` (24 jam) | Hanya navigasi halaman. Semua data nyata tetap tertutup |
| **Anonim** | — | Hanya `/` dan `/login` |

**Mode Tamu murni UX, bukan keamanan.** Cookie itu ditulis dari klien
(`document.cookie = "guest_mode=true; ..."` di `components/LoginPanel.tsx`),
jadi siapa pun bisa memalsukannya. Yang menahan data adalah lapisan lain:
setiap route API memanggil `auth()` sendiri. Karena itu `middleware.ts`
sengaja **meloloskan semua `/api/*`** — supaya cookie tamu tidak pernah bisa
menggantikan sesi di titik mana pun yang menyentuh data.

### 1.3 Middleware (`middleware.ts`, 91 baris)

- `publicRoutes = ["/", "/login"]`.
- Sudah login lalu buka `/` → dialihkan ke `/home`.
- Tamu buka `/` → dialihkan ke `/home`.
- Belum login dan bukan tamu, buka halaman lain → dialihkan ke `/login`.
- Cek tamu memakai **perbandingan nilai**, bukan `cookies.has()`:
  `req.cookies.get("guest_mode")?.value === "true"`. Alasannya sign-out
  mengosongkan cookie dengan nilai kosong, bukan menghapus key-nya.
- **Allowlist ekstensi media** — ini bagian yang mudah bikin bug halus. Ekstensi
  `mp3`, `m4a`, `ogg`, `opus`, `wav`, `mp4`, `webm`, `webmanifest` harus ada di
  regex pengecualian. Kalau tidak, permintaan audio dijawab HTML halaman login
  dengan status 200 — audio gagal tanpa pesan error apa pun.
- Gate "sudah lihat intro" (`tmuj_intro_seen`) dulu ada di sini dan sudah
  dihapus dengan sengaja; catatannya masih tertinggal di file.

### 1.4 Gate kelengkapan profil

Lapisan kedua, di atas login. `useProfileCheck()` menghitung
`isComplete = isVerified && hasKelas && hasInstagram`. Komponen yang butuh
profil lengkap membungkus dirinya:

```tsx
if (!isComplete) return <ProfileLockOverlay ... />;
```

Dipakai antara lain oleh `UploadMediaModal` dan `PreviewConfirmModal` (ospek).
Catatan penting: kalau **tidak ada sesi sama sekali**, `useProfileCheck()`
mengembalikan `isComplete: true`, supaya overlay ini tidak pernah menghalangi
tamu — tamu sudah ditangani oleh gate-nya sendiri.

Halaman `/ospek` memakai gate paling ketat, tiga syarat sekaligus dan
ditampilkan sebagai checklist ✓/○:
`!isGuest && isVerified && hasKelas && hasInstagram`.

### 1.5 Tema terang/gelap

- Aplikasi lahir gelap: token warna ada di `app/globals.css` dan dipanggil
  1000+ tempat lewat `var(--color-…)`.
- Tema **tidak** diganti per komponen. Yang diubah cuma atribut `data-theme` di
  `<html>`; seluruh token ikut berubah dari satu tempat: `app/theme-light.css`
  yang seluruhnya di-scope ke `html[data-theme="light"]`.
- Kelas `page`, `tmuj-panel-flat`, `tmuj-dock`, `tmuj-dock-scrim`,
  `tmuj-dark-tile` ada murni sebagai pegangan untuk lapisan pemetaan itu.
  `tmuj-dark-tile` menandai kotak yang isinya harus tetap "mode gelap" di dalam
  mode terang — kartu yang seluruh isinya foto/gradien merek, dan panel media
  lightbox radar yang memang tetap hitam. Perlu kelas sendiri karena lapisan
  penggelapnya sering `absolute inset-0` yang **bersaudara** dengan teksnya,
  bukan leluhurnya, dan CSS tidak punya cara melihat saudara yang menutupi.
- `lib/theme.ts` (88 baris) memegang state di module scope + `Set` listener,
  tanpa provider — pola yang sama dengan `lib/toast.ts` dan `lib/confirm.ts`,
  jadi `ThemeToggle` cuma perlu satu import.
- Kunci penyimpanan: `localStorage["tmuj_tema"]`.
- Nilai awal dipasang **sebelum halaman digambar** oleh `<script>` inline di
  `app/layout.tsx`. Tanpa itu, pengguna mode terang akan melihat kedipan gelap.
  `syncThemeFromDocument()` karenanya menganggap DOM sebagai sumber kebenaran,
  bukan variabel di modul.
- `apply()` juga menyetel `root.style.colorScheme` (supaya scrollbar, teks
  terpilih, date picker, dan dropdown bawaan browser ikut terang) dan mengganti
  `meta[name="theme-color"]` — `dark: #0a0a0b`, `light: #f1f1f5`.
- Kegagalan `localStorage` (mode privat) ditelan: tema tetap berubah untuk sesi
  ini, cuma tidak diingat setelah tab ditutup.

### 1.6 Mode hemat efek (`data-lowfx`)

`lib/lowfx.ts` (47 baris). `isLowEndDevice()` menyatakan HP lemah kalau
`deviceMemory <= 4`, `hardwareConcurrency <= 4`, atau pengguna menyalakan
`prefers-reduced-motion: reduce`. `applyLowFxFlag()` menaruh atribut
`data-lowfx` di `<html>`.

Satu atribut itu cukup: CSS memakainya untuk menetralkan **26** overlay
`backdrop-filter: blur()` sekaligus. Ini yang membuat "buka fitur" tidak
tersendat di HP kentang.

Dua aturan di antaranya juga memadatkan panel tembus pandang jadi warna solid,
dan itu **wajib** dikecualikan dari mode terang (`:not([data-theme="light"])`) —
bobot selectornya sama dengan lapisan pemetaan mode terang, dan berkas itu
di-`@import` lebih awal, jadi kalau seri yang menang aturan `data-lowfx`.
Gejalanya khas dan sempat terjadi: kartu hitam di HP, tapi putih di laptop
walau layarnya sudah diubah ke ukuran HP di DevTools — karena emulasi layar
tidak memalsukan `deviceMemory` dan `hardwareConcurrency`.

Prinsip yang sama diterapkan manual di beberapa modal: scrim ber-blur **tidak**
dianimasikan opacity-nya, karena menganimasikan opacity elemen ber-blur memaksa
browser mem-blur ulang seluruh halaman di belakangnya tiap frame. Panelnya tetap
beranimasi, scrim-nya tidak. Contoh: `components/QuickActions.tsx`.

### 1.7 AI dipakai sebagai OCR saja

Ini keputusan arsitektur yang penting untuk keamanan: **Gemini tidak pernah
memutuskan apa pun.** Model (`gemini-flash-lite-latest`,
`responseMimeType: application/json`, keempat kategori safety `BLOCK_NONE`)
hanya diminta mengekstrak teks. Seluruh validasi — apakah nama cocok, apakah
prodi valid, apakah dokumen sah — dikerjakan oleh kode sistem. Dipakai di dua
tempat: OCR SKL (`/api/verify`) dan OCR username Instagram
(`/api/user/instagram-verify`).

### 1.8 Aturan kelas paten

- Kelas **terkunci** begitu disimpan. Tidak ada jalur ganti-sendiri di UI.
- Prefix kelas **disusun di server** dari `users.prodi`. User tidak bisa memilih
  prodi lain; UI hanya menampilkan pratinjau (`prefixForProdi()` di
  `lib/kelas.ts`).
- `lockUserClass` menulis dengan pengaman `.is("kelas", null)`. Kalau kelas
  sudah terisi, API balas **409** dan klien memanggil `update()` supaya kartunya
  langsung berubah jadi tampilan terkunci (menangani kasus dikunci dari tab
  lain).
- Reset akun **mempertahankan** kelas dan prodi kalau kelas sudah terkunci.
- Prodi tidak akan pernah bisa berubah setelah kelas dikunci.
- Salah kelas hanya bisa diperbaiki admin lewat Discord (`!resetkelas @user`).
- Bot **tidak pernah** menghapus role kelas — hanya mencabutnya dari member.

### 1.9 Penyimpanan media ganda

Setiap unggahan berpotensi mendarat di dua tempat, dengan peran berbeda:

| Tujuan | Peran | Cara |
|---|---|---|
| **Cloudinary** | Melayani gambar ke browser | Upload langsung dari browser dengan signature dari `/api/sign-upload`, atau `upload_stream` dari server |
| **Google Drive** | Menyimpan file asli | Hierarki bersarang Prodi → Kelas → Nama, folder dijadikan public-reader |

Aturan yang dipegang konsisten: **kegagalan Drive selalu non-fatal.** Karya
tetap tersimpan meski backup gagal. `/api/posts` bahkan membatasi backup Drive
dengan `Promise.race` 6 detik supaya request tidak menggantung.

### 1.10 Ekspor Google Sheets

Dipakai dashboard ospek. Membuat spreadsheet per-user / per-kelas / per-prodi,
berisi formula `=IMAGE(...)` supaya foto tampil langsung di sel. Header merah
(`{red: 0.9, green: 0.15, blue: 0.12}`), tinggi baris 150 px, izin `writer` /
`anyone` supaya link bisa langsung dibuka siapa pun yang memegangnya.

### 1.11 Kompresi gambar di klien

Dua jalur berbeda, tujuannya berbeda:

1. **Sebelum upload karya** — `browser-image-compression`, target 1 MB /
   1920 px, memakai web worker. Tujuannya menghemat kuota dan waktu upload.
2. **Sebelum OCR** — canvas manual, 1400 px / kualitas 0.75
   (`compressImage()` di `app/profile/page.tsx`). Tujuannya menghindari
   **504 Vercel**: Gemini butuh waktu, jadi payload harus kecil. PDF dilewatkan
   apa adanya karena tidak bisa dikompres via canvas.

### 1.12 Upload dengan progress bar

`fetch` tidak bisa melaporkan progress, jadi upload yang perlu progress memakai
`XMLHttpRequest` + `xhr.upload.onprogress`. Persentasenya sengaja dibatasi
supaya bar tidak "penuh tapi masih menunggu":

- Upload karya ke Cloudinary: **dibatasi 85 %** — sisanya untuk `POST /api/posts`.
- Scan ospek: **dibatasi 90 %** — sisanya untuk proses server ke Drive/Cloudinary.

### 1.13 Pola pengambilan data

- **SWR** untuk hampir semua daftar: `dedupingInterval`,
  `refreshInterval: 15000` di tempat yang butuh segar,
  `revalidateOnFocus: false` (supaya tidak refetch tiap kali balik ke tab),
  `keepPreviousData`, dan `mutate(data, false)` untuk update optimistis.
- **`unstable_cache`** dengan tag `['radar-kampus-posts']` dan
  `revalidate: 3600` di halaman `/radar`. Sebaliknya `/api/radar` (untuk widget
  home) **tidak** di-cache dan hanya `.limit(3)`.

### 1.14 Build tanpa env (Docker)

`lib/supabase.ts` memakai nilai placeholder kalau env belum ada. Ini bukan
kosmetik: `next build` mengevaluasi module scope saat "Collecting page data",
sedangkan build Docker di VPS menerima env baru pada runtime lewat `env_file`.
Tanpa placeholder, `createClient("")` melempar `supabaseUrl is required` dan
build mati. Penggunaan sebenarnya digerbangi
`const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)` yang
membalas 500 kalau key tidak ada. Route yang pernah kena masalah ini:
`app/api/radar/route.ts` (lihat komentar di file).

### 1.15 Keamanan filter PostgREST

`/api/search` membangun filter `.or()` dari input user. Karena sintaks `.or()`
bisa disuntik, query dibersihkan: karakter `[%,()"\\]` dibuang dan string
dipotong 50 karakter sebelum dipakai.

---

## 2. Semua Halaman

Ada tepat **17** halaman (`app/**/page.tsx`). Format tiap entri: alamat, tingkat
akses, isi, aksi yang tersedia, dan API yang dipanggil.

### 2.1 `/` — Landing (animasi pembuka)

**File:** `app/page.tsx` (567 baris) · **Akses:** publik

Halaman paling rumit di aplikasi, dan seluruhnya animasi. Bukan video, tapi
**urutan frame di canvas** yang digambar `CanvasSequenceManager`.

- **Jumlah frame per layer:** 154 / 115 / 179 / 177 / 240.
- **Frame rate:** `FPS = 30` untuk umum, `TELKOM_FPS = 60` untuk layer telkom.
- **Timing diturunkan, bukan dihardcode:** `SIDES_AT`, `CENTER_AT`,
  `TELKOM_CUE_AT = SIDES_AT + 10 / TELKOM_FPS`,
  `SKIP_AFTER_MS = (OPENING_FRAMES / FPS + SIDES_AT) * 1000`,
  `REDIRECT_AFTER_MS = 3000`.
- **Empat layer timeline:** `/outro` (`noDecimate`, `hideAfterEnd`),
  `/telkom 2`, `/telkom 3` (`flipX`), `/telkom 1`. Ukuran layer diturunkan dari
  alpha-box, posisinya diikat dengan `bottom: calc(38vw - 18.5vh - 45px)`.
- **Suara ikut timeline:** `TIMELINE_CUES = [{at: OUTRO_AT, name: "telyu"},
  {at: TELKOM_CUE_AT, name: "telkom"}]`, sedangkan cue `welcome` dilepas dari
  `onIntroStart`.
- **Tombol "Mulai"** hanya muncul kalau izin audio belum didapat
  (`landingVoiceUnlocked()`). Teksnya: "Animasi pembukanya pakai suara —
  besarkan volume dulu." Menekannya menjalankan `primeLandingVoice()` lalu
  `setStarted(true)`.
- Loader dibuat `pointer-events-none` supaya sentuhan tetap sampai ke listener
  pembuka izin audio.
- **"Lewati animasi"** — `Link` langsung ke `/login`.
- Layar outro terakhir mengirim `--tmuj-outro-ms` ke CSS supaya bar progres dan
  timer redirect memakai satu angka yang sama.
- Setelah selesai: `stopVoice()` lalu `router.replace("/login")` setelah 3 detik.
- Fallback `Suspense` tetap memakai kelas `page` supaya mode terang tidak
  berkedip.

**Mesin audio-nya** ada di `lib/useLandingVoice.ts` (244 baris) dan ini bagian
yang paling rapuh secara kebijakan browser:

- Sumber: `/voice/welcome.mp3`, `/voice/telyu-tizen.mp3`, `/voice/telkom.mp3`.
  **mp3, bukan Opus-in-Ogg**, karena Safari tidak bisa memainkannya.
- Elemen `<audio>` dan state `primed`/`pending` ada di module scope: izin audio
  itu milik dokumen, bukan milik komponen.
- `primeLandingVoice()` **wajib** dipanggil sinkron di dalam gesture, dan wajib
  memutar **unmuted** — di iOS, izin yang didapat dari pemutaran muted cuma
  berlaku untuk muted. Kalau gagal, `primed` direset ke `false`.
- `navigator.audioSession.type = "playback"` dipasang supaya saklar senyap iOS
  tidak membisukan suara.
- Cue yang keburu lewat tidak dibuang, tapi diputar **digeser sesuai
  keterlambatannya**: `el.currentTime = Math.max(0, late)` — dan dilewati kalau
  keterlambatannya sudah melebihi durasi klip.

### 2.2 `/login` — Masuk

**File:** `app/login/page.tsx`, panel di `components/LoginPanel.tsx` (113 baris)
· **Akses:** publik

Isi:
- Tombol **Masuk dengan Discord** — menghapus cookie tamu lebih dulu
  (`guest_mode=; max-age=0`), `setIsGuest(false)`, lalu
  `signIn("discord", { callbackUrl: "/home" })`.
- Tombol **Mode Tamu** — menulis `guest_mode=true; path=/; max-age=86400`,
  `setIsGuest(true)`, lalu `router.push("/home")`.
- Tautan **Daftar Discord** ke `https://discord.com/register`.
- **`DiscordWidget`** untuk server `1522059025485664326`.

Panel ini bisa dipakai ulang lewat props `showGuestOption` dan
`showDiscordWidget` — dipakai juga di dalam `/profile` untuk tamu, dengan kedua
props `false` sehingga hanya menyisakan tombol Discord.

Error yang bisa muncul di URL: `?error=NotInServer` (bukan anggota server).

### 2.3 `/home` — Beranda

**File:** `app/home/page.tsx` · **Akses:** login atau tamu

Halaman kumpulan widget. Susunannya berbeda antara mobile dan desktop, dan
sebagian elemen memang hanya ada di salah satunya.

**Aksi Cepat** (`components/QuickActions.tsx`, 256 baris):
- Mobile: grid 4 kotak — Portal Kampus, Drop Memory, Cari Partner, Kalender.
- Desktop: grid 2×2 — Portal Kampus, Drop Memory, Cari Partner, Upload Karya.
- Tombol **"Lihat Semua"** membuka modal berisi **7** pintasan: Portal Kampus,
  Cari Partner, Drop Memory, Upload Karya, To-Do (`/tracker`), Radar Kampus
  (`/radar`), Kalender.
- Kalender di mobile dibuka sebagai bottom sheet (`KalenderTerdekat`
  `isModal`), bukan halaman.
- Tautan yang butuh login (Drop Memory, Cari Partner, Upload Karya) mengecek
  `isGuest` dan memanggil `showLoginPopup()` alih-alih pindah halaman.
- Grid-nya sengaja **bukan** `motion.div layout`: layout animation memaksa
  framer mengukur ulang posisi tiap anak pada setiap render, padahal isi grid
  ini tetap dan tidak pernah berpindah.

**Widget dinamis** (`components/fase3/DynamicWidgets.tsx`, 211 baris):
- **To-Do**: SWR ke `/api/tasks`, memfilter `status !== 'completed'`, mengurut
  berdasarkan deadline, mengambil `.slice(0, 2)`. Centang mengubah status
  optimistis dan **membalikkan** kalau `PUT /api/tasks/{id}` gagal.
- **Radar**: SWR ke `/api/radar` (3 post terbaru), slider dengan snap. Untuk
  tamu, kartunya di-`blur-md` + ikon kunci yang memanggil `showLoginPopup`;
  untuk user, tiap kartu jadi `Link` ke `/radar#post-{id}`.
- Kedua SWR memakai `{ revalidateOnFocus: false, dedupingInterval: 60000 }`.

Popup tamu: `components/GuestAuthPopup.tsx` (77 baris) — modal "Mode Tamu" di
`z-[9999]`, scroll body dikunci, CTA-nya menghapus cookie tamu lalu
`signIn("discord")`.

### 2.4 `/karya` — Galeri Karya

**File:** `app/karya/page.tsx` (99 baris) · **Akses:** login atau tamu

- SWR ke `/api/posts`, hasilnya dipetakan ke bentuk `Post` lalu dirender oleh
  `MasonryGrid`. `keepPreviousData: true` supaya grid tidak berkedip saat
  revalidasi.
- Jumlah like/komentar dibaca dari bentuk agregat PostgREST:
  `p.likes?.[0]?.count`, `p.comments?.[0]?.count`.
- Kosong → "Belum ada karya yang diunggah."
- **Tamu**: seluruh `<main>` ditutup overlay `bg-black/40` dengan kartu
  "Pratinjau Mode Tamu"; klik di mana saja (ditangkap dengan `onClickCapture`
  supaya tidak lolos ke elemen di bawah) memanggil `showLoginPopup()`.
- **Tiga tombol filter — For You / Following / Trending — belum berfungsi.**
  Ketiganya markup tanpa `onClick`; tampilan "For You" aktif itu hardcoded.

### 2.5 `/dokumentasi` — Dokumentasi Kegiatan

**File:** `app/dokumentasi/page.tsx` (578 baris) · **Akses:** login atau tamu

Album kegiatan (event) berisi banyak foto. Ini salah satu halaman terlengkap.

**Menampilkan:**
- SWR ke `/api/dokumentasi` (`revalidateOnFocus: false`, `keepPreviousData`).
- **Dua mode tampilan:** `featured` (2 event teratas sebagai kartu besar
  `FeaturedEventCard`, lalu 4 "Kegiatan Terbaru" sebagai `EventCard`) dan `grid`
  (semua event, 12 per halaman + pagination Previous/Next).
- Peringkat "featured" dihitung dari `totalLikes + totalComments`.
- **Filter & Urutkan** (dropdown): urutan `Terbaru` / `Terpopuler` / `Terlama`;
  kategori `Semua`, `Kelas`, `Prodi`, `Kampus`, `Organisasi`, `Pribadi`.
  Memilih kategori selain "Semua" otomatis melompat ke mode `grid`.
- **Pencarian** dibaca dari query string `?q=` (dikirim `Header`), dicocokkan ke
  judul, deskripsi, dan nama kelas.
- **Tamu** mendapat dua event **dummy** hardcoded (`dummy-1` "Kegiatan Dummy
  Mahasiswa", `dummy-2` "Ospek Dummy") plus overlay "Pratinjau Mode Tamu".

**Membuat kegiatan** (`?action=add`, dipicu dari `Header`/`BottomNav`):
- Alurnya bertingkat: tamu → popup login; profil belum lengkap →
  `ProfileLockOverlay`; lengkap → modal "Buat Kegiatan Baru".
- Field: Nama Event (wajib), Kategori, Nama Kelas/Organisasi (opsional),
  Deskripsi, dan **Siapa yang bisa upload**: `all` (Semua Orang) / `prodi`
  (Satu Program Studi) / `kelas` (Satu Kelas) / `none` (Hanya Saya).
- `POST /api/dokumentasi`, lalu `mutate()`.
- Latar gelap modal ini **sengaja tidak menutup**; tombol X dijaga
  `DiscardConfirm` kalau form sudah terisi. Karena state form-nya disimpan di
  halaman (bukan di modal), "Buang saja" harus mengosongkannya sendiri —
  kalau tidak, isian lama akan muncul lagi saat modal dibuka ulang.

### 2.6 `/dokumentasi/[id]` — Detail Album

**File:** `app/dokumentasi/[id]/page.tsx` (414 baris) · **Akses:** login

- SWR ke `/api/dokumentasi/{id}`. Respons membawa `event`, `media`,
  `currentUserId`, `canUpload`, dan `uploadStatus` — jadi keputusan izin dibuat
  di server, klien cuma merender hasilnya.
- Header: judul, badge kelas, deskripsi, pembuat, tanggal, jumlah media.
- **Download (HD)** muncul kalau `event.drive_folder_id` ada — membuka folder
  Google Drive album itu langsung.
- **Hapus album** hanya muncul kalau `currentUserId === event.user_id`.
  `DELETE /api/dokumentasi/{id}` lalu kembali ke `/dokumentasi`.
- **Upload media**: kalau `canUpload` true, tombol Upload memilih file
  (`image/*,video/*`) dan mengirim `POST /api/dokumentasi/{id}` lewat XHR dengan
  progress 0–100 %. Sebelum itu, `useProfileCheck()` masih bisa memblokir dengan
  `ProfileLockOverlay`.
- **Minta izin upload**: kalau `canUpload` false, tombolnya berubah jadi
  "Minta Izin" → `POST /api/dokumentasi/{id}/request-upload`. Label mengikuti
  `uploadStatus`: `pending` → "Menunggu", `rejected` → "Ditolak" (keduanya
  membuat tombol non-aktif).
- **Urutkan** media: Terbaru / Terpopuler (jumlah like) / Terlama. Di mobile
  `<select>` disembunyikan transparan di atas ikon filter.
- Grid media memakai CSS `columns` (masonry murni CSS), tiap item `MediaCard`.
- Aksi per media: **like** (`POST /api/dokumentasi/media/{mediaId}/like`),
  **komentar** (`POST .../comment`), **jadikan cover**
  (`PUT /api/dokumentasi/{id}` dengan `cover_url`, hanya pemilik event), dan
  **hapus** (`DELETE /api/dokumentasi/media/{mediaId}`).
- Alert/confirm memakai modal lokal sendiri (`modalConfig`), bukan
  `lib/confirm.ts`.

### 2.7 `/tracker` — To-Do / Tugas

**File:** `app/tracker/page.tsx` · **Akses:** login (tamu diarahkan login)

- Daftar tugas pribadi: judul, deskripsi, mata kuliah, deadline, prioritas,
  status.
- API: `GET/POST /api/tasks`, `PATCH|PUT /api/tasks/{id}`,
  `DELETE /api/tasks/{id}`.
- Komponen pendukung: `AddTaskSheet` (bottom sheet tambah tugas),
  `TaskDetailModal` (detail + ubah/hapus), `TrackerCalendar` (tampilan kalender
  deadline).
- Widget To-Do di `/home` menarik dari endpoint yang sama dan hanya menampilkan
  2 tugas terdekat yang belum selesai.
- **Catatan teknis:** tabel `tasks` dikunci dengan **Discord ID**, bukan UUID
  `users.id` seperti tabel lain. Lihat §6.

### 2.8 `/kalender` — Kalender Akademik & Event

**File:** `app/kalender/page.tsx` · **Akses:** login atau tamu

- Grid kalender bulanan yang digambar sendiri (bukan library): `getDaysInMonth`,
  `getFirstDayOfMonth`, nama bulan Indonesia hardcoded, penanda hari ini,
  navigasi bulan sebelumnya/berikutnya.
- Data event dari SWR `GET /api/events`; event dicocokkan ke tanggal dengan
  string `YYYY-MM-DD`. Mengetuk tanggal membuka detail event.
- Pencarian `?q=` dari `Header` juga difilter di sini.
- Halaman ini **hanya membaca**. Tambah/ubah/hapus event dilakukan dari
  `components/fase3/KalenderTerdekat.tsx`, yang memanggil
  `POST /api/events`, `PUT /api/events/{id}`, dan `DELETE /api/events/{id}`.
- Tamu mendapat overlay "Pratinjau Mode Tamu" yang sama.
- `KalenderTerdekat` juga dipakai di `/home` mobile sebagai bottom sheet lewat
  Aksi Cepat → Kalender (`isModal={true}`).

### 2.9 `/ospek` — Mode OSPEK (mutualan via QR)

**File:** `app/ospek/page.tsx` (265 baris) · **Akses:** gate paling ketat

Fitur unggulan aplikasi: berkenalan saat OSPEK dengan **memindai QR** teman,
memfoto momennya, lalu papan skor per kelas terisi otomatis.

**Gate.** `canAccessOspek = !isGuest && isVerified && hasKelas && hasInstagram`.
Kalau gagal, halamannya diganti kartu "Akses Terkunci":
- Tamu → tombol "Login Sekarang" (memanggil `showLoginPopup()`).
- Sudah login tapi data belum lengkap → checklist ✓/○ untuk **Verifikasi
  Identitas**, **Pilih Kelas**, **Tautkan Instagram** + tombol "Ke Profil
  Sekarang".
- Selalu ada "Kembali ke Beranda".

**Tampilan.** Halaman ini punya header sendiri (bukan `Header` global) berlabel
"OSPEK MODE", dan tidak memakai `BottomNav`. Dua view diatur state, bukan
routing: `dashboard` dan `boardDetail`.

**Dashboard** (`components/ospek/OspekDashboard.tsx`, 221 baris):
- Data dari `GET /api/ospek/leaderboard` → `boards` + `totalScanned`.
  Di-fetch ulang setiap kali `activeModal` berubah, jadi angka langsung segar
  setelah scan disimpan.
- Menampilkan "{totalScanned} teman terscan" dan "dari {boards.length} kelas
  aktif".
- Daftar prodi diturunkan dari nama papan: `b.name.split("-")[0]`.
- Urutan: terbanyak / tersedikit / A–Z.
- Tombol scan: FAB di mobile, CTA di desktop — keduanya membuka scanner.
- **Ekspor ke Google Sheets**: `POST /api/ospek/sheets` dengan `{type, value}`
  (per user / kelas / prodi); kalau sukses, `spreadsheetUrl` dibuka di tab baru.
- Tamu melihat 4 papan **dummy** hardcoded (SI 1250, TI 980, IF 850, DKV 640,
  total 3720) di balik overlay pratinjau.

**QR saya** (`MyQRCodeModal.tsx`, 69 baris): `QRCodeCanvas` dengan
`value = discordId`, `size={180}`, `level="H"`. Yang di-encode **cuma Discord
ID**, tanpa data pribadi lain. Di HP 320×568 kartunya dulu 615 px sehingga
judul dan tombol Tutup keluar layar; sekarang jarak dan ukuran QR mengecil di
layar kecil, dengan `max-h-full overflow-y-auto` sebagai jaring terakhir.

**Scanner** (`ScannerCameraModal.tsx`, 255 baris): tiga fase —
`scanning` → `scanned` (jeda 1500 ms) → `camera`.
- QR dibaca `Scanner` dari `@yudiel/react-qr-scanner`.
- Kamera foto: `getUserMedia({ video: { facingMode, width: {ideal: 1920},
  height: {ideal: 1080} } })`.
- **Lampu flash** kalau perangkat mendukung: dicek lewat
  `videoTrack.getCapabilities?.().torch`, dinyalakan dengan
  `applyConstraints({ advanced: [{ torch }] })`.
- Kamera depan dicerminkan saat capture (`ctx.translate` + `ctx.scale(-1, 1)`)
  supaya hasilnya sesuai yang dilihat di layar.
- Output: `onCapture(scannedId, canvas.toDataURL("image/jpeg", 0.85))`.

**Konfirmasi** (`PreviewConfirmModal.tsx`, 163 baris): pratinjau foto dengan
tombol "Ulangi" / "Simpan". Simpan mengirim XHR `POST /api/ospek/scan` berisi
`{scannedId, photoBase64}`, progress dibatasi 90 % karena sisanya dipakai server
untuk mengunggah ke Drive/Cloudinary. Masih digerbangi `useProfileCheck()`.

**Detail papan** (`BoardDetail`): daftar hasil scan satu kelas, dari
`GET /api/ospek/board/{kelas}`.

### 2.10 `/radar` — Radar Kampus

**File:** `app/radar/page.tsx` (102 baris) · **Akses:** login atau tamu

Satu-satunya halaman utama yang **Server Component** (bukan `"use client"`).

- Isinya informasi kampus yang dikumpulkan otomatis oleh **scraper terpisah**
  (kontainer `radar-scraper` di `docker-compose`) ke tabel
  `radar_kampus_posts` — bukan konten yang dibuat user.
- Query dibungkus `unstable_cache` dengan key `['radar-kampus-posts']` dan
  `revalidate: 3600` (1 jam). Urutan: `original_created_at` desc dengan
  `nullsFirst: false` (post lama tanpa tanggal asli tetap tampil, tapi di
  belakang), lalu `created_at` desc.
- Mode tamu dibaca **di server** lewat `cookies()`; kalau tamu, query tidak
  dijalankan sama sekali (`posts = []`) dan `GuestOverlay` ditampilkan. Jadi di
  halaman ini data memang tidak pernah dikirim ke tamu, bukan sekadar diburamkan.
- Grid 2 → 5 kolom berisi `RadarCard`.
- Kosong → "Belum Ada Informasi · Radar Kampus sedang memantau informasi."
- Widget di `/home` memakai jalur berbeda: `GET /api/radar` (tanpa cache,
  `.limit(3)`), dan tiap kartu menaut ke `/radar#post-{id}`.

### 2.11 `/portal` — Portal Kampus

**File:** `app/portal/page.tsx` (219 baris) · **Akses:** login atau tamu

Halaman statis murni: tidak ada state, tidak ada fetch, tidak ada API. Isinya
array `portalLinks` yang di-hardcode di file itu — 15 tautan resmi kampus, tiap
item punya `title`, `subtitle`, `url`, `bgColor` (kelas gradien Tailwind), dan
`image` (URL gambar eksternal: aset WordPress kampus atau Unsplash).

Daftar 15 tautannya: Telkom University Jakarta, Peta & Lokasi Kampus,
Pendaftaran Mahasiswa Baru (SMB), DTI Tel-U Jakarta, Instagram Resmi
`@telkomuniversity_jkt`, Tentang Kampus Jakarta, Telkom University (Pusat),
i-GRACIAS, Tel-U Satu, CeLOE LMS, Tel-U Open Library, IT Service Desk, Kalender
Akademik, Student Affairs, SEEDS Tel-U.

Tampilan: hero banner `rounded-[2rem]` dengan blob merah blur 120 px, lalu grid
2 → 5 kolom berisi kartu `<a target="_blank" rel="noreferrer">`. Tiap kartu
menumpuk empat lapisan absolut (gradien warna, gambar `mix-blend-overlay
opacity-40`, gradien hitam agar teks terbaca, lalu konten) dan saat hover
gambarnya `scale-110`, kartunya naik 2 px, ikon panah keluar menggeser masuk.
`animationDelay: index * 50ms` diset di `style` — tapi tidak ada keyframe yang
dipasang, jadi properti itu tidak berefek.

Hero dan 15 kartunya sengaja tetap gelap di mode terang (gradien merek itu
identitasnya), jadi semuanya diberi kelas `tmuj-dark-tile` — lihat 1.5. Tanpa
itu teks pendukungnya berbalik jadi abu tua di atas gradien yang tetap hitam,
karena gradiennya bersaudara dengan teksnya, bukan leluhurnya.

Tamu: overlay `bg-black/40` + `onClickCapture → showLoginPopup()` dengan kartu
"Pratinjau Mode Tamu". Karena semua tautan sudah ada di klien, tamu sebenarnya
hanya terhalang secara visual di halaman ini.

Versi modal dari fitur yang sama ada di
`components/fase3/PortalKampusModal.tsx` (379 baris), dibuka dari Aksi Cepat di
`/home`, dan tampilannya jauh berbeda: carousel 3D `perspective-[1200px]`,
kartu bertumpuk 300 ms lalu menyebar, ambang geser ±70 px untuk pindah kartu,
`transformOrigin` dibaca dari posisi tombol pemicu
(`document.getElementById("portal-btn")`) supaya animasinya tumbuh dari tombol,
kartu dengan `absOffset > 4` tidak dirender demi biaya render, tombol "Kunjungi"
hanya di kartu aktif, dan footernya menaut ke `/portal` ini.

**Catatan mode terang:** kerangka halaman ini memakai `bg-[#050505]` yang
di-hardcode (bukan `var(--color-bg)`), dan warna teks kartunya juga literal.
Jadi `/portal` tetap gelap walau tema terang aktif — lihat §6.

### 2.12 `/about` — Tentang

**File:** `app/about/page.tsx` (344 baris) · **Akses:** bebas (tidak ada gate,
tidak ada overlay tamu)

Satu-satunya halaman yang murni bercerita, dan satu-satunya yang memakai
`framer-motion` untuk animasi scroll. Dua komponen lokal jadi tulang punggungnya:

- `Reveal` — `useInView(ref, { once: true, margin: "-60px" })` lalu
  `motion.div` dari `{opacity:0, y:30}` ke `{opacity:1, y:0}` selama 0,6 s
  dengan easing kustom `[0.25,0.46,0.45,0.94]` dan `delay` bertingkat.
- `BentoCard` dan `HoFCard` — kartu hover spring (`stiffness: 400,
  damping: 25`).

Lima seksi berurutan:

1. **Hero** — dua orb ambient (merah + biru) yang dianimasikan lewat
   `@keyframes pulse-glow` yang disuntik langsung sebagai
   `<style dangerouslySetInnerHTML>`; judul "Rumah Digital Mahasiswa / Tel-U
   Jkt." dengan teks gradien; naskah pembuka yang menjelaskan bahwa aplikasi ini
   lahir dari keresahan maba; cue "Scroll" dengan garis yang naik-turun
   `repeat: Infinity`.
2. **Kenapa Tell Me U?** — empat `BentoCard`: 🤝 Koneksi Tanpa Batas
   (Mutualan), 🚀 Produktivitas Terpusat (to-do Ospek, kalender, portal),
   🎨 Ruang Berkarya (Feed Karya), 📸 Album Kolaboratif (Dokumentasi).
3. **Who's Behind This?** — kartu developer: `/Adrian.jpg` (dengan fallback
   inisial "A" lewat `onError`), nama Adrian Adiputra, "DKV · Telkom University
   Jakarta", latar belakang RPL/PPLG, dan empat tautan sosial (Instagram,
   LinkedIn, GitHub, Discord) yang tiap ikonnya punya warna hover khas
   platformnya.
4. **Hall of Fame** — dua `HoFCard` kontributor: Gwen (Sisfor, `@21www_n`) dan
   Aidan (DKV, `@idanzthemeneng`), masing-masing menaut ke Instagram.
5. **QRIS donasi** — "Traktir Admin Kopi & Dukung Server", emoji ☕ mengapung,
   `/qris.png` di kartu putih dengan fallback "QRIS Belum Ada" kalau gambar
   gagal dimuat.

Catatan mode terang: kartu-kartunya memakai `tmuj-panel-flat` justru karena
gradien latarnya ditulis di atribut `style` sehingga tidak bisa dipetakan lewat
selector nama kelas — komentar di file itu menjelaskan alasannya.

### 2.13 `/notifications` — Notifikasi

**File:** `app/notifications/page.tsx` (401 baris) · **Akses:** login (tamu dapat
overlay pratinjau) · **API:** `GET /api/notifications`, `PUT /api/notifications`

Bukan cuma daftar bacaan — halaman ini juga tempat **menyetujui/menolak
permintaan**, jadi tiga alur persetujuan bermuara di sini.

**Tandai terbaca otomatis.** Sebuah `useEffect` memantau `data`; begitu ada satu
saja notifikasi dengan `!n.is_read`, ia menembak `PUT /api/notifications` lalu
`mutate()`. Jadi lencana di `Header` kosong segera setelah halaman dibuka, tanpa
tombol "tandai semua terbaca".

**Pengelompokan waktu.** `notifications.reduce(...)` mengelompokkan ke
"Hari Ini" / "Kemarin" / "Lebih Lama" pakai `isToday`/`isYesterday` dari
`date-fns`, lalu diurutkan dengan peta `{Hari Ini:1, Kemarin:2, Lebih Lama:3}`.
Cap waktu tiap kartu diformat `Hari ini, 14.30` / `Kemarin, 09.05` /
`21/08/2026, 14.30`.

**14 tipe notifikasi** dipetakan di `getNotificationContent()` — masing-masing
menghasilkan kalimat, tautan, dan (untuk tiga tipe) tombol aksi:

| `type` | Kalimat | Tautan | Tombol |
|---|---|---|---|
| `like`, `like_post` | menyukai postingan karyamu. | `/post/{ref}` | — |
| `comment`, `comment_post` | mengomentari postingan karyamu. | `/post/{ref}` | — |
| `reply` | membalas komentarmu di sebuah karya. | `/post/{ref}` | — |
| `mention` | menyebutmu dalam sebuah karya atau komentar. | `/post/{ref}` | — |
| `follow_request` | meminta untuk mengikuti akunmu. | `/profile/{username}` | **Terima / Tolak** |
| `follow`, `follow_accept` | mulai mengikuti kamu. | `/profile/{username}` | — |
| `upload_request` | meminta izin upload dokumentasi di acara yang kamu buat. | `/dokumentasi/{ref}` | **Izinkan / Tolak** |
| `upload_accept` | menerima permintaan izin upload dokumentasimu. | `/dokumentasi/{ref}` | — |
| `collab_request` | mengundangmu berkolaborasi dalam sebuah karya. | `/post/{ref}` | **Terima / Tolak** |
| `collab_accept` | menerima undangan kolaborasimu. | `/post/{ref}` | — |
| `tugas` | Ada tugas baru yang harus kamu kerjakan! | `/ospek` | — |
| *(default)* | berinteraksi dengan profilmu. | `#` | — |

**Tiga aksi persetujuan** dan endpoint masing-masing:

- `handleFollowRequest` → `PUT /api/profile/follow_requests`
  `{followerId, action}`
- `handleUploadRequest` → `PUT /api/dokumentasi/upload_requests`
  `{requesterId, eventId, action}`
- `handleCollabRequest` → `POST /api/posts/{postId}/collab` `{action}`

Semua tombol memakai pola yang sama: `checkLock(e)` dulu (kalau profil belum
lengkap → `ProfileLockOverlay`, aksi dibatalkan), lalu `e.preventDefault()` +
`stopPropagation()` supaya klik tidak ikut memicu navigasi kartu, lalu teks
tombol diubah jadi "Memproses..." dan `disabled`, dan kalau gagal teks
dipulihkan dari `originalText`. Perlu dicatat: teks tombol dimanipulasi lewat
`btn.innerText` langsung ke DOM, bukan lewat state React — pilihan yang bekerja
di sini justru karena `mutate()` akan mengganti seluruh kartu saat berhasil.

**Penanda belum dibaca:** border kartu jadi merah (`border-[var(--color-brand-red)]`)
plus titik merah 2,5 px di kanan. Karena efek tandai-terbaca jalan segera,
penanda ini praktis hanya terlihat pada render pertama.

Kosong → "Belum ada notifikasi". Tidak login dan bukan tamu → `router.push("/login")`.

**Catatan:** tautan `/post/{reference_id}` untuk like/comment/mention/reply/collab
menunjuk ke rute yang **tidak ada** di aplikasi ini; `Header.tsx` untuk kejadian
yang sama menaut ke `/karya?post={reference_id}`. Lihat §6.

### 2.14 `/profile` — Profil Saya & Onboarding

**File:** `app/profile/page.tsx` (1864 baris — halaman terbesar di aplikasi) ·
**Akses:** login (tamu dapat panel login penuh, bukan overlay)

Halaman ini menanggung dua peran sekaligus: profil pribadi **dan** seluruh
onboarding tiga langkah. Semua gate di aplikasi lain (`ProfileLockOverlay`,
gate Ospek) mengarahkan ke sini.

**Kartu progres.**
`completedSteps = [isSklComplete, !!user?.kelas, !!user?.instagram].filter(Boolean).length`
menghasilkan indikator 0/3 sampai 3/3. Setelah 3/3 kartu ini hilang.

#### Langkah 1 · Verifikasi SKL

- Area unggah drag & drop atau klik; tipe yang diterima
  `application/pdf, image/png, image/jpeg, image/webp`; maksimum 10 MB.
- Gambar dikompresi klien lewat `compressImage(file, 1400, 0.75)` sebelum
  dikirim — PDF diteruskan apa adanya. Tujuannya menghindari 504 di Vercel.
- Dikirim sebagai `FormData` ke `POST /api/verify`.
- Penanganan galat eksplisit: respons non-JSON, 504, dan 502 semuanya
  diterjemahkan jadi pesan "Server kelamaan memproses" alih-alih melempar
  `SyntaxError` mentah.
- Berhasil → `users.is_verified = true`, `full_name` terisi dari OCR, dan
  `sync_discord` diset `false` supaya bot memberi role.

#### Langkah 2 · Pilih Kelas (permanen)

- `ClassWheelPicker` (roda ala iOS) untuk tahun + nomor kelas; prefiksnya
  ditampilkan dari `prefixForProdi(user?.prodi)` sebagai pratinjau saja —
  server tetap menurunkan prefix sendiri dari `users.prodi`.
- Konfirmasi **dua tahap**: dialog "Kelas ini permanen" → tombol
  "Ya, kunci kelas ini". Ini sengaja, karena tidak ada jalan mundur.
- `POST /api/user/kelas {tahun, nomor, manual}`.
- Kalau server menjawab **409** (kelas sudah terkunci di DB tapi sesi masih
  basi), halaman memanggil `await update()` agar JWT menyegerakan diri, bukan
  menampilkan galat.
- Setelah terkunci, UI berubah jadi kartu baca-saja "Kelas kamu · paten".

#### Langkah 3 · Tautkan Instagram

Mesin status enam keadaan:
`IgStep = "upload" | "ai-preview" | "correction" | "correction-preview" | "confirm" | "cooldown"`.

1. **upload** — unggah tangkapan layar profil IG.
2. `POST /api/user/instagram-verify` → AI membaca username dari gambar.
3. **ai-preview** — `GET /api/user/ig-profile-pic?username=` mengambil foto
   profil untuk diperlihatkan. Kalau 429 dengan `data.cooldown`, layar berpindah
   ke **cooldown**: hitung mundur 30 detik plus tombol "Lewati Foto".
4. Pengguna menjawab **Benar / Salah**.
5. **correction** — dua jalur: tempel tautan IG (diurai
   `extractUsernameFromLink`) atau ketik manual **dua kali** dan keduanya harus
   sama.
6. **confirm** — kotak centang pernyataan bahwa akun itu benar miliknya, lalu
   `POST /api/user/instagram`.

#### Foto profil

`AvatarCropModal` → `handleCropComplete` meminta tanda tangan ke
`/api/sign-upload` (folder `avatars`), lalu mengunggah langsung ke
`https://api.cloudinary.com/v1_1/{cloud}/image/upload` dengan progres XHR.
Tombol "Pakai foto Discord" hanya muncul kalau `canResetAvatar`, dan ia hanya
mengubah state form — jadi masih bisa dibatalkan.

#### Edit profil

`handleSaveProfile` mengirim `PUT /api/user`
`{fullName, isPrivate, bio, skills, avatarUrl}` dengan `mutate` optimistis lalu
`update()` untuk menyegarkan sesi. Catatan penting:

- Input **nama lengkap permanen `disabled`** — nilainya berasal dari OCR SKL,
  tidak boleh diubah manual.
- `skills` dibatasi maksimal 5.
- `isPrivate` di sini yang mengaktifkan alur permintaan-mengikuti.
- Tombol back perangkat menutup modal edit, bukan meninggalkan halaman:
  dipasang lewat `history.pushState` + listener `popstate`.

#### Tab

- **karya** — `MasonryGrid` berisi karya sendiri.
- **tentang** — daftar `skills` plus blok riwayat pendidikan yang masih
  di-hardcode: "Telkom University Jakarta … 2026 - Sekarang".

**Tamu** tidak mendapat overlay klik-untuk-login seperti halaman lain, melainkan
`<LoginPanel showGuestOption={false} showDiscordWidget={false} />` — karena tidak
ada apa pun yang bisa dipratinjau tanpa akun.

### 2.15 `/profile/[username]` — Profil Orang Lain

**File:** `app/profile/[username]/page.tsx` (346 baris) · **Akses:** bebas
(tidak ada gate tamu di halaman ini) ·
**API:** `GET /api/profile/{username}`, `POST /api/user/follow`

Tata letaknya sengaja mirip Instagram: avatar di kiri, tiga angka statistik di
kanan (postingan · pengikut · mengikuti), lalu bio, lalu tombol aksi, lalu dua
tab ikon (grid = karya, orang = tentang).

**`params` adalah Promise.** Halaman ini memakai `use(params)` dari React —
konvensi Next 16 di mana `params` tidak lagi objek sinkron.

**Pengambilan data pakai `useState` + `fetch` manual, bukan SWR** — berbeda dari
halaman lain. `fetchProfile()` dipanggil ulang lewat `onUpdate` dari
`FollowNetworkModal`, jadi jumlah pengikut ikut berubah kalau ada aksi di dalam
modal itu.

**Kunci privasinya: `canViewPosts` dari server.** Ini flag yang menentukan hampir
semua tampilan, dan keputusan siapa boleh melihat apa dibuat di API, bukan di
klien:

| Elemen | `canViewPosts` true | false |
|---|---|---|
| Karya (`MasonryGrid`) | tampil | "Akun Ini Privat · Ikuti akun ini untuk melihat foto dan karyanya." |
| Bio | tampil | disembunyikan |
| Instagram | tampil (tautan ke `instagram.com/{username}`) | disembunyikan |
| Baris prodi | `prodi • kelas` | hanya `prodi` |
| Tab "tentang" | skills + pendidikan | "Informasi ini disembunyikan karena akun privat." |
| Angka pengikut/mengikuti | bisa diklik → `FollowNetworkModal` | tidak bisa diklik |

**Tombol ikuti tiga keadaan**, digerakkan `profileData.followStatus`:

- `"none"` → **"Ikuti"** (merah)
- `"pending"` → **"Requested"** (abu, artinya akun target privat dan permintaan
  menunggu persetujuan di `/notifications` mereka)
- `"accepted"` → **"Mengikuti"**

`handleFollow` mengirim `POST /api/user/follow`
`{targetUserId, action: "follow" | "unfollow"}` — satu endpoint untuk dua arah,
dan `action` ditentukan dari status saat itu (`pending` juga dianggap "sudah",
jadi menekannya membatalkan permintaan). Setelah berhasil, `followStatus` diambil
dari `data.status` (server yang memutuskan `accepted` vs `pending`), dan angka
pengikut hanya digeser ±1 kalau memang transisi ke/dari `accepted` — permintaan
`pending` tidak menambah hitungan.

Detail lain: `isOwnProfile` dihitung dua kali — sekali di klien
(`session.user.dbUsername === profileData.username`) dan sekali di server
(`data.isOwnProfile`); yang dipakai untuk menyembunyikan tombol ikuti adalah
versi klien. Avatar bisa diklik untuk membuka `AvatarPreviewModal`. Lencana
`VerifiedBadge` muncul kalau `is_verified`, dan lencana "Privat" (ikon kunci)
kalau `is_private`. Blok pendidikan memakai `/Telkom.png` dengan teks
`{prodi} • 2026 - Sekarang`.

### 2.16 `/drop-memory` — Drop Memory *(purwarupa, belum tersambung)*

**File:** `app/drop-memory/page.tsx` (359 baris) · **Akses:** login (tamu dapat
overlay) · **API: tidak ada**

Konsepnya: membagikan momen secara eksklusif ke kelas atau prodi sendiri. UI-nya
sudah lengkap, tapi **tidak ada satu pun panggilan API** di file ini.

Yang perlu dipahami sebelum memakainya:

- `handleSubmit` menaruh objek baru ke state lokal setelah
  `setTimeout(..., 1000)` — komentarnya sendiri menulis "Simulate API call".
  Muat ulang halaman, memori itu hilang.
- Untuk pengguna login, feed-nya di-set `setMemories([])` — jadi selalu kosong.
  Tamu justru mendapat dua kartu contoh ("Hari Pertama Kuliah" kelas IF-46-01,
  "Kunjungan Industri" prodi S1 Teknologi Informasi).
- `target_group` pada kiriman baru **di-hardcode** `"S1 TI 01"` / `"Teknologi
  Informasi"`, bukan kelas/prodi pengguna sebenarnya.
- Tombol suka tidak punya `onClick`.

Yang sudah benar dan layak dipertahankan saat nanti disambungkan:

- Tab filter Semua / Kelas Saya / Prodi Saya (`m.privacy === "Khusus " + tab`).
- Pilihan privasi radio: Publik / Khusus Kelas Saya / Khusus Prodi Saya, tiap
  nilainya punya ikon sendiri di kartu.
- Gate bertingkat pada `?action=add` dan pada tombol "Drop Baru": tamu →
  `showLoginPopup()`, profil belum lengkap → `ProfileLockOverlay`, lengkap →
  modal terbuka.
- Perlindungan isian: `isCreateDirty` + `requestCloseCreate()` membuat latar
  gelap **dan** tombol X sama-sama memunculkan `DiscardConfirm` kalau sudah ada
  isian, dan keduanya tidak melakukan apa pun selama `isSubmitting`. Karena state
  form ini milik halaman (bukan modal), `discardCreate()` harus mengosongkan
  `title`/`description`/`privacy` sendiri — komentar di file itu menjelaskan
  bahwa tanpa itu pertanyaan "buang?" jadi bohong.
- Dibungkus `<Suspense>` karena memakai `useSearchParams()`.

**Catatan mode terang:** kerangkanya `bg-[#121212]` hardcode dan kartunya
`bg-[#1c1c1e]`, jadi halaman ini tetap gelap di tema terang.

### 2.17 `/partner` — Cari Partner Tugas *(purwarupa, belum tersambung)*

**File:** `app/partner/page.tsx` (265 baris) · **Akses:** login (tamu dapat
overlay) · **API: tidak ada**

Papan "cari teman kelompok": daftar permintaan di kiri, form pembuatan sticky di
kanan (urutannya dibalik di mobile lewat `order-1`/`order-2` sehingga form muncul
lebih dulu).

Status implementasinya sama dengan Drop Memory:

- `handleSubmit` juga `setTimeout(..., 800)` dengan komentar "Simulate API call";
  kiriman baru diberi `user_name: "Saya (User)"` dan hanya hidup di state.
- Pengguna login selalu melihat daftar kosong (`setAllRequests([])`); dua entri
  contoh hanya untuk tamu, dan komentar di kode menyebut alasannya: "since we
  don't know if the table exists yet".

Yang sudah jalan:

- Tiap kartu punya `course`, `user_name`, tanggal `toLocaleDateString('id-ID')`,
  kotak "Mencari Role/Keahlian", dan tombol **Hubungi** yang membuka `contact`
  (diberi awalan `https://` otomatis kalau belum ada skema).
- Pencarian lewat `?q=` mencocokkan `course`, `role`, atau `user_name`.
- `?action=add` menggulirkan halaman ke form dan memfokuskan input mata kuliah
  (`courseInputRef.scrollIntoView` + `.focus()`), lalu membersihkan URL dengan
  `router.replace(pathname)`.
- Perlakuan tamu di sini paling rapat di seluruh aplikasi: selain overlay
  halaman, isi kartu diburamkan (`blur-md`) dengan pelat "Login untuk melihat",
  tautan Hubungi dimatikan (`href="#"`, tanpa `target`), semua input
  `readOnly`, `onFocus` memicu `handleAction`, dan tombol kirim berubah jadi
  `type="button"` supaya form tidak mungkin terkirim.
- `handleAction` menjaga tiga tingkat yang sama: tamu → popup login, profil belum
  lengkap → `ProfileLockOverlay`, lengkap → lanjut.

**Catatan mode terang:** sama seperti `/drop-memory`, warna dasarnya hardcode
(`bg-[#121212]`, `bg-[#1c1c1e]`).

---

## 3. Alur Lengkap

Bagian ini mengikuti setiap alur dari sentuhan pertama pengguna sampai baris
terakhir yang tersimpan, termasuk apa yang terjadi kalau gagal di tengah jalan.

### 3.1 Kunjungan pertama → masuk

1. Pengunjung membuka `/` (landing). Halaman ini tidak butuh sesi.
2. Menekan **"Mulai"** melakukan dua hal sekaligus: menyalakan izin audio
   dokumen (`primeLandingVoice()` dipanggil **sinkron** di dalam gestur — lihat
   §1.6) lalu menavigasi ke `/login`.
3. Di `/login` ada dua jalur:
   - **Login Discord** → `signIn("discord")` → OAuth dengan
     `scope=identify guilds.members.read`.
   - **Masuk sebagai tamu** → menulis cookie `guest_mode=true` lalu ke `/home`.
4. Callback Discord memeriksa keanggotaan guild `1522059025485664326`. Bukan
   anggota → dilempar ke `/login?error=NotInServer` dan sesi tidak dibuat.
5. Anggota → role Discord dipetakan ke prodi lewat `ROLE_TO_PRODI`. Kalau bot
   sudah pernah memproses SKL orang ini (baris `maba_roles` dengan `full_name`
   terisi), akunnya **langsung terverifikasi** tanpa upload apa pun.
6. Sesi jadi, `/home` terbuka. Kalau profil belum lengkap, setiap fitur yang
   menulis data akan memunculkan `ProfileLockOverlay` yang mengarahkan ke
   `/profile`.

Perbedaan tamu vs anggota diringkas di §1.2. Yang perlu diingat: cookie tamu
bisa dipalsukan siapa pun, jadi ia **hanya** mengatur tampilan — setiap route API
memanggil `auth()` sendiri.

### 3.2 Verifikasi SKL (langkah 1 onboarding)

Klien: `/profile` langkah 1 → `POST /api/verify` (FormData, `maxDuration = 60`).

**Sebelum dikirim.** Gambar dikompresi ke lebar 1400 px kualitas 0,75; PDF
dilewatkan utuh. Tipe dibatasi PDF/PNG/JPEG/WebP, ukuran maksimal 10 MB, dan
kedua batas itu **diperiksa ulang di server**.

**Di server, urutannya:**

1. Kalau `GEMINI_API_KEY` tidak ada → 500 "Konfigurasi server belum lengkap".
2. Sudah `is_verified` **dan** punya `full_name` → 400 "Akun sudah
   terverifikasi" (jadi tidak bisa verifikasi dua kali).
3. File → base64 → Gemini `gemini-flash-lite-latest` dengan
   `responseMimeType: "application/json"`. Prompt-nya menyuruh AI **hanya**
   mengekstrak `nama_lengkap`, `no_reg`, `jurusan`, dan `raw_text` — AI tidak
   pernah diminta memutuskan lolos/tidak.
4. Respons dibersihkan dari pembungkus ```` ```json ```` lalu `JSON.parse`.
   Gagal parse, atau `finishReason` `SAFETY`/`PROHIBITED_CONTENT` → 400 "Gagal
   membaca dokumen".

**Lalu enam pemeriksaan, semuanya kode biasa** (bukan AI). Semua galat
dikumpulkan dulu, baru dikirim sekaligus sebagai `details[]` dengan status
**422** — jadi pengguna tahu semua yang salah dalam satu kali coba:

| # | Yang diperiksa | Cara |
|---|---|---|
| 1 | Nama lengkap terbaca | panjang ≥ 3 karakter |
| 2 | Nomor registrasi | `raw_text.match(/\b\d{11}\b/)`, harus tepat 11 angka |
| 3 | Nomor registrasi belum diklaim orang lain | cari `skl_registry` by `no_reg`; pemilik ditentukan dari `discord_id`, dan baris warisan yang `discord_id`-nya `NULL` jatuh ke perbandingan username |
| 4 | Afiliasi Jakarta | `raw_text` memuat salah satu dari "jakarta", "tel-u jakarta", "telkom jakarta", … |
| 5 | Tahun ajaran | `raw_text` memuat "2026" atau "2027" |
| 6 | Jurusan cocok prodi Discord | `jurusanMatchesProdi()` dengan tabel alias (DKV/TI/IF/SI/TT) dan pencocokan `\b…\b` |

Ada satu pengaman tambahan: kalau `users.kelas` sudah terkunci,
`prodiForKelas(kelas)` menurunkan prodi dari prefix kelas, dan SKL berprodi lain
langsung ditolak dengan pesan yang menyebut kelas terkuncinya plus saran
`!resetkelas`. Ini menutup celah pada akun lama yang kolom `prodi`-nya pernah
dikosongkan oleh reset — tanpa itu pemeriksaan #6 terlewat dan prodi bisa
melenceng dari kelas.

**Kalau semua lolos:** `verifyUser(discordId, nama, username, no_reg, finalProdi)`
mengisi `full_name`, `is_verified = true`, menulis baris `skl_registry`, dan
menyetel `sync_discord = false` supaya bot memberi role (§5). `finalProdi`
diambil dari prodi terkunci kalau ada, kalau tidak dari prodi Discord, dan
sebagai upaya terakhir dideduksi dari jurusan di SKL.

**Kalau timeout:** klien menerjemahkan 504/502/non-JSON jadi pesan "Server
kelamaan memproses" — di Vercel Hobby batasnya 10 detik walaupun
`maxDuration = 60` sudah diminta.

### 3.3 Kunci kelas (langkah 2 onboarding) — permanen

Klien: `ClassWheelPicker` → konfirmasi dua tahap → `POST /api/user/kelas`
`{tahun, nomor, manual}`.

**Yang tidak dikirim klien: prefix.** Klien hanya mengirim tahun dan nomor.
Prefix (`JS1DKV`, `JS1SI`, …) disusun **di server** dari `users.prodi` lewat
`prefixForProdi()`. Ini disengaja: kalau klien boleh mengirim string kelas
lengkap, siapa pun bisa mendaftarkan diri ke kelas prodi lain dengan mengarang
teks.

Urutan pemeriksaan di server:

1. Tidak ada sesi → 401.
2. User tidak ada di DB → 404.
3. Belum `is_verified` → **403** "Verifikasi SKL kamu dulu sebelum memilih
   kelas". Jadi urutan onboarding dipaksa dari server, bukan cuma dari UI.
4. `user.kelas` sudah ada → **409** beserta nilai kelasnya. Ini jalur cepat:
   ditolak sebelum menyentuh DB lagi.
5. `prefixForProdi(user.prodi)` kosong → 400 "Prodi kamu belum terdeteksi".
6. `isValidKelasYear(tahun)` → 400 kalau tidak valid.
7. `normalizeSegment(nomor)`: tidak boleh kosong, panjang ≤
   `KELAS_TAIL_MAX_LENGTH`.
8. Kalau `manual !== true`, nomor **wajib** salah satu dari `KELAS_NUMBERS`
   (daftar roda). Input manual hanya dibuka untuk kelas yang tidak ada di daftar.
9. `buildKelas(prefix, tahun, tail)` lalu `isValidKelas()` sebagai pemeriksaan
   akhir bentuknya.
10. `lockUserClass(discordId, kelas)` — penulisannya dijaga
    `.is("kelas", null)`, jadi kalau ada dua permintaan berbarengan hanya satu
    yang menang. Yang kalah mendapat `alreadyLocked: true`, lalu route membaca
    ulang nilai kelas dari DB dan menjawab **409** dengan nilai yang benar.

Berhasil → `sync_kelas = false` diset supaya loop `sync_web_kelas` di bot
memberikan role kelas (§5).

**Di klien**, 409 tidak ditampilkan sebagai galat: halaman memanggil
`await update()` agar JWT membaca ulang Supabase, lalu UI berubah sendiri jadi
kartu "Kelas kamu · paten".

### 3.4 Tautkan Instagram (langkah 3 onboarding)

1. Unggah tangkapan layar profil IG → `POST /api/user/instagram-verify`. AI
   membaca username dari gambar.
2. `GET /api/user/ig-profile-pic?username=` mengambil foto profil sebagai
   konfirmasi visual. Kalau kena batas laju (**429** dengan `data.cooldown`),
   layar berpindah ke hitung mundur 30 detik dengan tombol **"Lewati Foto"** —
   alurnya tidak pernah mentok di situ.
3. Pengguna menegaskan **Benar** atau **Salah**.
4. Kalau salah: perbaiki dengan menempel tautan profil IG (diurai
   `extractUsernameFromLink`) atau mengetik username **dua kali** dan keduanya
   harus identik.
5. Kotak centang pernyataan bahwa akun itu miliknya, lalu
   `POST /api/user/instagram` menyimpannya.

Setelah langkah ini, `isVerified && kelas && instagram` semuanya terisi:
`ProfileLockOverlay` berhenti muncul dan gate `/ospek` terbuka.

### 3.5 Unggah karya

`/karya` (atau Aksi Cepat) → modal unggah → `POST /api/posts`.

1. Berkas dikompresi di browser dengan `browser-image-compression`
   (target 1 MB, sisi maksimum 1920 px, dijalankan di web worker) supaya tab
   tidak membeku.
2. `GET /api/sign-upload` memberi tanda tangan; browser mengunggah **langsung**
   ke Cloudinary dengan XHR sehingga progresnya bisa ditampilkan — kredensial
   Cloudinary tidak pernah ikut ke klien. Bilah progres berhenti di **85 %**,
   sisanya untuk pekerjaan server.
3. `POST /api/posts` menyimpan barisnya. Dua hal khas di sini:
   - Tabel `posts` punya foreign key ke **`profiles`**, bukan `users`, jadi route
     ini harus `upsert` ke `profiles` lebih dulu setiap kali — kalau tidak,
     penyimpanan gagal karena pelanggaran FK.
   - Pencadangan ke Google Drive dibatasi `Promise.race` **6 detik**. Drive
     lambat tidak boleh menggagalkan unggahan; kegagalan Drive selalu
     non-fatal.
4. Mention di judul/deskripsi diproses lewat `/api/mentions` dan menghasilkan
   notifikasi bertipe `mention`.
5. Kolaborator: `POST /api/posts/{id}/collab` mengirim undangan, penerima
   memutuskan di `/notifications` (`collab_request` → Terima/Tolak). Karya baru
   muncul di profil kolaborator setelah diterima.

### 3.6 Suka, komentar, dan notifikasi

- Suka: `POST /api/posts/{id}/like`, dijalankan optimistis di klien
  (`mutate(..., false)`) supaya hati langsung berubah.
- Komentar: `POST /api/posts/{id}/comment`; balasan menghasilkan notifikasi
  bertipe `reply`.
- Setiap interaksi menulis baris notifikasi untuk pemilik karya. Lencana di
  `Header` menghitung yang `is_read = false`.
- Membuka `/notifications` menembak `PUT /api/notifications` yang menandai
  semuanya terbaca sekaligus (§2.13).

### 3.7 Ikuti & akun privat

1. `PUT /api/user` dengan `isPrivate: true` menjadikan akun privat.
2. Orang lain menekan **Ikuti** di `/profile/{username}` →
   `POST /api/user/follow` `{targetUserId, action: "follow"}`.
3. Server yang memutuskan hasilnya: akun publik → `status: "accepted"`
   langsung; akun privat → `status: "pending"` plus notifikasi
   `follow_request` untuk si pemilik. Tombol berubah jadi **"Requested"**.
4. Pemilik menyetujui/menolak di `/notifications` →
   `PUT /api/profile/follow_requests` `{followerId, action}`.
5. Selama belum `accepted`, `GET /api/profile/{username}` mengembalikan
   `canViewPosts: false` dan **tidak mengirim** karya, bio, maupun Instagram —
   penyaringannya di server, jadi tidak bisa dibuka dengan mengakali klien.
6. Angka pengikut hanya bergerak saat transisi ke/dari `accepted`; permintaan
   yang masih `pending` tidak dihitung.

### 3.8 Dokumentasi: buat acara → izin unggah → unggah media

**Membuat acara.** `/dokumentasi` → tombol tambah (atau `?action=add`) → gate
bertingkat (tamu → popup login; profil belum lengkap → `ProfileLockOverlay`) →
form judul/kategori/nama kelas/deskripsi/`uploadPermission` →
`POST /api/dokumentasi`. `uploadPermission` bernilai `all`, `prodi`, `kelas`,
atau `none`, dan nilai itulah yang nanti dipakai server untuk menghitung
`canUpload` tiap pengunjung.

**Melihat acara.** `GET /api/dokumentasi/{id}` mengembalikan satu paket:
`event`, `media`, `currentUserId`, `canUpload`, dan `uploadStatus`. Klien tidak
menghitung sendiri siapa boleh mengunggah.

**Kalau tidak boleh mengunggah.** Tombolnya berubah jadi **"Minta Izin"** →
`POST /api/dokumentasi/{id}/request-upload`. Label berikutnya mengikuti
`uploadStatus`: `pending` → "Menunggu", `rejected` → "Ditolak". Pemilik acara
menerima notifikasi `upload_request` dan memutuskan di `/notifications` →
`PUT /api/dokumentasi/upload_requests` `{requesterId, eventId, action}`. Kalau
diterima, si peminta dapat notifikasi `upload_accept`.

**Mengunggah media.** XHR dengan progres 0–100 % ke
`POST /api/dokumentasi/{id}`. Originalnya juga disalin ke Google Drive; kalau
`event.drive_folder_id` ada, halaman menampilkan tautan **"Download (HD)"**.
Tiap media bisa disukai (`/api/dokumentasi/media/{mediaId}/like`), dikomentari
(`.../comment`), dijadikan sampul (`PUT /api/dokumentasi/{id}` dengan
`cover_url`), atau dihapus oleh pengunggahnya.

### 3.9 Ospek: mutualan lewat QR

Alur di layar: `/ospek` → tombol scan → `ScannerCameraModal` (memindai QR
lawan) → kamera mengambil foto bersama → `PreviewConfirmModal` → simpan.
Setiap orang menunjukkan QR-nya sendiri lewat `MyQRCodeModal`, yang isinya
`discordId`.

`POST /api/ospek/scan` `{scannedId, photoBase64}` mengerjakan enam hal:

1. Menolak kalau tidak ada sesi (401), data tidak lengkap (400), atau
   `scannerId === scannedId` — "Tidak bisa scan QR sendiri!".
2. Mengambil **kedua** baris user sekaligus (`.in("discord_id", [...])`) dan
   menolak kalau hasilnya bukan tepat dua baris.
3. Mengunggah pratinjau ke Cloudinary (`folder: "ospek_mutualan"`, lebar
   dibatasi 800 px, `quality: auto`). Kalau kunci Cloudinary tidak ada, ia
   jatuh ke Supabase Storage bucket `ospek_photos`.
4. Mengunggah **asli** ke Google Drive, dan uniknya satu berkas didaftarkan ke
   **dua induk sekaligus**
   (`parents: [...new Set([scannerNameFolderId, scannedNameFolderId])]`) —
   Prodi → Kelas → Nama untuk masing-masing orang. Jadi satu foto muncul di
   folder kedua belah pihak tanpa disalin dua kali. Berkasnya lalu dibuat
   `reader/anyone`. Semua kegagalan Drive hanya dicatat ke log.
5. Menyimpan `ospek_scans {scanner_id, scanned_id, photo_url}`. Pelanggaran
   keunikan diterjemahkan jadi pesan "Kalian sudah pernah mutualan!".
6. Menambahkan baris ke Google Sheets kelas — **untuk kedua kelas** yang
   terlibat, dan hanya kalau kelasnya berbeda supaya tidak dobel. Kegagalan
   Sheets ditandai sendiri di kodenya sebagai non-fatal.

Nama berkasnya dibersihkan jadi `Nama_Scanner_dan_Nama_Scanned.jpg` — pola ini
penting karena ekspor di §3.10 mencari berkas Drive **berdasarkan nama itu**.

Setelah modal tertutup, papan peringkat dimuat ulang: `useEffect` di `/ospek`
memasukkan `activeModal` ke daftar dependensinya, jadi angkanya ikut segar.

### 3.10 Ekspor Google Sheets (mutualan pribadi)

`POST /api/ospek/sheets` `{type, value}` dengan `type` = `gabungan` | `kelas` |
`prodi`.

1. Mengambil semua `ospek_scans` yang melibatkan saya
   (`.or("scanner_id.eq.…,scanned_id.eq.…")`), lalu memuat profil semua orang
   yang terlibat ke sebuah `Map`.
2. Menyaring sesuai `type`: `kelas` → hanya teman dengan `kelas === value`;
   `prodi` → `prodi === value` **atau** `kelas.startsWith(value)`.
3. Menentukan folder tujuan dan nama berkas:
   - `gabungan` → di folder root, "Ospek Mutualan - Gabungan (Nama)"
   - `kelas` → Prodi → Kelas → Nama saya, "Mutualan Kelas - X (Nama)"
   - `prodi` → Prodi → Nama saya, "Mutualan Prodi - X (Nama)"
4. Kalau spreadsheet dengan nama itu sudah ada, isinya **dibersihkan**
   (`A2:F1000`) lalu ditulis ulang — jadi menekan ekspor dua kali tidak
   menghasilkan baris ganda maupun berkas ganda.
5. Kalau belum ada, dibuat baru: baris pertama dibekukan, header
   `NO · FOTO · NAMA LENGKAP · USN IG` diberi latar merah
   `{red: 0.9, green: 0.15, blue: 0.12}` dengan teks putih tebal, kolom foto
   150 px, dan seluruh baris data 150 px supaya gambarnya terlihat. Berkasnya
   diberi izin `writer/anyone`.
6. Foto dicari di Drive **per 15 nama berkas** (query `name='…' or …`) agar
   tidak melampaui batas panjang query, tiap berkas yang ditemukan dijadikan
   publik secara paralel supaya rumus `=IMAGE(...)` bisa memuatnya, lalu sel
   foto diisi `=IMAGE("https://drive.google.com/uc?export=view&id=…")`. Kalau
   berkas Drive tidak ditemukan, ia jatuh ke URL Cloudinary.

`GET /api/ospek/sheets` **tidak melakukan apa pun** — ia selalu menjawab
`{success: true, url: null}`; komentarnya menyebut ekspor sekarang dibuat
langsung saat diminta.

### 3.11 Tracker tugas

`/tracker` memuat `GET /api/tasks` lewat SWR, menampilkan `TrackerCalendar`,
`TaskDetailModal`, dan `AddTaskSheet`. Membuat tugas → `POST /api/tasks`;
mengubah → `PATCH /api/tasks/{id}`; menghapus → `DELETE /api/tasks/{id}`.

Satu hal yang perlu diketahui sebelum menyentuh tabel ini: **`tasks` memakai
Discord ID sebagai kunci pemiliknya**, sedangkan hampir semua tabel lain memakai
UUID dari `users`. Lihat §6.

### 3.12 Kalender akademik

`/kalender` hanya membaca: `GET /api/events` lewat SWR, lalu menggambar grid
bulanan sendiri (`getDaysInMonth`, `getFirstDayOfMonth`, nama bulan Indonesia,
penanda `isToday`) dan menyaring dengan `?q=`.

Penambahan/pengubahan/penghapusan acara **tidak ada di halaman ini** — semuanya
lewat `components/fase3/KalenderTerdekat.tsx` (widget di `/home`), yang memanggil
`POST /api/events`, `PUT /api/events/{id}`, dan `DELETE /api/events/{id}`.

### 3.13 Radar Kampus

Scraper (kontainer terpisah, lihat §5 dan `docker-compose.yml`) mengisi tabel
`radar_kampus_posts`. Sisi web hanya membaca, dan lewat dua jalur berbeda:

- `/radar` — Server Component dengan `unstable_cache(['radar-kampus-posts'],
  { revalidate: 3600 })`, mengambil semua baris.
- Widget `/home` — `GET /api/radar`, tanpa cache, `.limit(3)`.

Untuk tamu, `/radar` tidak menjalankan query sama sekali.

### 3.14 Pencarian

Kotak cari di `Header` menuju `GET /api/search?q=…`. Dua hal yang penting di
sisi server:

- Kueri disanitasi sebelum masuk `.or()` PostgREST: karakter `[%,()"\\]`
  dibuang dan panjangnya dipotong 50 karakter. Tanpa itu, tanda koma dan tanda
  kurung bisa menyuntikkan filter tambahan ke kueri PostgREST.
- Beberapa halaman juga menerima `?q=` sendiri untuk menyaring daftar yang sudah
  dimuat: `/dokumentasi` (judul/deskripsi/nama kelas), `/kalender`, dan
  `/partner` (mata kuliah/role/nama).

### 3.15 Reset akun

`DELETE /api/user/reset` mengosongkan `full_name`, `instagram`, `bio`, `skills`,
`avatar_url`, `is_private`, `is_verified`, dan menghapus baris `maba_roles`
milik username tersebut. Dua pengecualian yang sengaja dibuat:

1. **Kelas dan prodi dipertahankan kalau kelas sudah terkunci.** Kalau `prodi`
   dikosongkan, pengguna bisa verifikasi ulang dengan SKL prodi lain sementara
   prefix kelasnya sudah terikat prodi lama — kelasnya jadi tidak nyambung. Yang
   belum punya kelas tetap boleh mereset prodi (misalnya salah unggah SKL waktu
   pertama kali).
2. **Baris `skl_registry` tidak dihapus.** Baris itulah bukti bahwa satu
   `no_reg` milik satu Discord ID; kalau dihapus, nomor registrasi itu bebas
   diklaim akun lain. Pemiliknya sendiri tetap bisa verifikasi ulang dengan SKL
   yang sama karena pemeriksaan kepemilikan mencocokkan `discord_id`.

Responsnya menyebutkan secara eksplisit kalau kelas dipertahankan.

---

## 4. Referensi API

40 berkas route di `app/api/`. Semuanya memanggil `auth()` sendiri — middleware
sengaja meloloskan `/api/*` supaya cookie tamu tidak pernah bisa menggantikan
sesi (§1.3).

### 4.1 Autentikasi & pengguna

| Endpoint | Metode | Fungsi |
|---|---|---|
| `/api/auth/[...nextauth]` | (handlers Auth.js) | Alur OAuth Discord, sesi, sign-out |
| `/api/verify` | POST | OCR SKL + 6 validasi sistem → verifikasi akun (§3.2) |
| `/api/user` | PUT | Simpan `fullName`, `isPrivate`, `bio`, `skills`, `avatarUrl` |
| `/api/user/kelas` | POST | Kunci kelas sekali seumur akun (§3.3) |
| `/api/user/instagram-verify` | POST | AI membaca username IG dari tangkapan layar |
| `/api/user/ig-profile-pic` | GET | Ambil foto profil IG; 429 + `cooldown` saat kena batas laju |
| `/api/user/instagram` | POST | Simpan username IG yang sudah dikonfirmasi |
| `/api/user/follow` | POST | `action: follow \| unfollow`; server memutuskan `accepted` vs `pending` |
| `/api/user/reset` | DELETE | Reset akun; kelas+prodi & `skl_registry` dipertahankan (§3.15) |
| `/api/sign-upload` | POST | Tanda tangan unggah langsung Cloudinary |

### 4.2 Karya

| Endpoint | Metode | Fungsi |
|---|---|---|
| `/api/posts` | GET, POST | Feed karya; buat karya (upsert `profiles` + cadangan Drive 6 s) |
| `/api/posts/[id]` | GET, DELETE | Detail satu karya; hapus milik sendiri |
| `/api/posts/[id]/like` | POST | Suka / batal suka |
| `/api/posts/[id]/comment` | POST | Komentar & balasan |
| `/api/posts/[id]/collab` | POST | Terima/tolak undangan kolaborasi |
| `/api/posts/collab` | PUT | Endpoint kolaborasi kedua yang tumpang tindih — lihat §6 |
| `/api/mentions` | GET | Cari pengguna untuk saran `@mention` |

### 4.3 Profil & sosial

| Endpoint | Metode | Fungsi |
|---|---|---|
| `/api/profile/[username]` | GET | Profil publik + `canViewPosts`, `followStatus`, `stats` |
| `/api/profile/[username]/network` | GET | Daftar pengikut / mengikuti untuk `FollowNetworkModal` |
| `/api/profile/follow_requests` | GET, PUT | Daftar permintaan; terima/tolak |
| `/api/notifications` | GET, PUT | Daftar notifikasi; PUT menandai semua terbaca |
| `/api/search` | GET | Pencarian global (kueri disanitasi sebelum `.or()`) |

### 4.4 Dokumentasi

| Endpoint | Metode | Fungsi |
|---|---|---|
| `/api/dokumentasi` | GET, POST | Daftar acara; buat acara + `uploadPermission` |
| `/api/dokumentasi/[id]` | GET, POST, PUT, DELETE | Detail (`canUpload`, `uploadStatus`); unggah media; ubah acara/sampul; hapus acara |
| `/api/dokumentasi/[id]/request-upload` | POST | Minta izin unggah |
| `/api/dokumentasi/upload_requests` | PUT | Pemilik acara mengizinkan/menolak |
| `/api/dokumentasi/media/[mediaId]` | DELETE | Hapus satu media |
| `/api/dokumentasi/media/[mediaId]/like` | POST | Suka media |
| `/api/dokumentasi/media/[mediaId]/comment` | POST | Komentari media |

### 4.5 Ospek

| Endpoint | Metode | Fungsi |
|---|---|---|
| `/api/ospek/scan` | POST | Simpan mutualan: Cloudinary + Drive dua induk + Sheets (§3.9) |
| `/api/ospek/scan/[id]` | DELETE | Hapus satu baris scan — **tanpa cek pemilik**, lihat §6 |
| `/api/ospek/leaderboard` | GET | Papan per kelas + `totalScanned` |
| `/api/ospek/board/[kelas]` | GET | Rincian satu kelas |
| `/api/ospek/me` | GET | Mutualan milik sendiri |
| `/api/ospek/sheets` | GET, POST | POST membuat/menulis ulang spreadsheet (§3.10); GET hanya stub |

### 4.6 Tugas, acara, radar

| Endpoint | Metode | Fungsi |
|---|---|---|
| `/api/tasks` | GET, POST | Daftar & buat tugas (dikunci per Discord ID) |
| `/api/tasks/[id]` | PATCH, PUT, DELETE | Ubah (PATCH dan PUT identik — §6); hapus |
| `/api/events` | GET, POST | Kalender akademik: baca & buat |
| `/api/events/[id]` | PUT, DELETE | Ubah & hapus acara kalender |
| `/api/radar` | GET | 3 pos radar terbaru untuk widget `/home` |

---

## 5. Integrasi Bot Discord

Aplikasi web dan bot Discord (repo terpisah, `BOT DEKVEE`) berbagi satu database
Supabase. Tidak ada panggilan HTTP di antara keduanya — semua koordinasi lewat
**kolom penanda di tabel**, yang berarti keduanya boleh mati-hidup sendiri tanpa
merusak yang lain.

### 5.1 Tabel `maba_roles` — verifikasi dari sisi bot

Bot menulis `{username, role_name, full_name}` untuk maba yang SKL-nya sudah ia
proses di Discord. Saat orang itu login ke web, callback `signIn` di
[auth.ts](auth.ts) mencarinya berdasarkan **username Discord** dan
**auto-verifikasi**-nya, jadi tidak perlu unggah SKL dua kali.

Syaratnya ketat: hanya kalau `full_name` sudah terisi. Kalau barisnya ada tapi
`full_name` kosong, kodenya sengaja **tidak** memverifikasi dan mencatat
"verified di bot tapi belum ada nama lengkap. Harus upload SKL ulang di web."

Nama role singkat milik bot dipetakan ke nama prodi panjang yang dipakai web:

| `role_name` bot | Prodi di web |
|---|---|
| `DKV` | Desain Komunikasi Visual |
| `TI` | Teknologi Informasi |
| `TEKINFO` | Teknologi Informasi |
| `INFOR` | Informatika |
| `SISFOR` | Sistem Informasi |
| `TEKTEL` | Teknik Telekomunikasi |

`TEKINFO` ada karena itulah nama role yang benar-benar ditulis bot; `TI`
dipertahankan sebagai alias.

### 5.2 Dua penanda handshake

| Kolom | Disetel `false` oleh | Dibaca bot untuk |
|---|---|---|
| `users.sync_discord` | `verifyUser()` di [lib/supabase.ts](lib/supabase.ts:143) | Memberi role prodi setelah verifikasi SKL di web |
| `users.sync_kelas` | `lockUserClass()` di [lib/supabase.ts](lib/supabase.ts:178) | Loop `sync_web_kelas`: membuat/menemukan role kelas lalu memasangnya |

Polanya sama untuk keduanya: web menulis data + menurunkan bendera, bot
mengambil pekerjaan pada putaran berikutnya lalu menaikkan benderanya kembali.
Karena web tidak menunggu, kegagalan di sisi bot tidak pernah membuat verifikasi
atau penguncian kelas di web gagal.

### 5.3 Aturan yang tidak boleh dilanggar soal role kelas

1. **Bot tidak boleh pernah menghapus role kelas.** Kalau seseorang harus
   dilepas dari kelas, yang dicabut adalah role itu **dari anggotanya**, bukan
   role-nya dari server. Menghapus role berarti menghancurkan keanggotaan semua
   orang lain di kelas yang sama.
2. **Prodi tidak bisa berubah setelah kelas terkunci.** Prefix kelas terikat
   prodi, jadi keduanya paten bersama-sama (lihat §3.2 dan §3.15 untuk backstop
   di sisi web).
3. **Satu-satunya jalan memperbaiki kelas yang salah adalah `!resetkelas @user`
   oleh admin di Discord.** Tidak ada endpoint web untuk ini, dan itu memang
   disengaja.

### 5.4 Alur data dua arah, ringkas

```
Discord (bot)                    Supabase                     Web
─────────────                    ────────                     ───
!verifikasi SKL ──────────────▶ maba_roles ──────────────▶ auto-verify saat login
role prodi/kelas ◀──── sync_discord=false ◀──────────── POST /api/verify
role kelas       ◀──── sync_kelas=false   ◀──────────── POST /api/user/kelas
!resetkelas @user ────────────▶ users.kelas ─────────────▶ /profile buka lagi langkah 2
```

### 5.5 Scraper Radar Kampus

Terpisah lagi dari bot: sebuah layanan Python (`radar-scraper` di
`docker-compose.yml`, dan sejak commit `dc587b5` punya stage Docker sendiri
sehingga tidak lagi menjalankan `npm install`/`npm run build`) mengumpulkan
informasi dari sumber resmi kampus dan menulisnya ke `radar_kampus_posts`. Web
hanya membaca tabel itu (§3.13).

---

## 6. Celah yang Diketahui

Semua poin di bawah dikonfirmasi dengan membaca file sumbernya langsung, bukan
dugaan. Ini bukan daftar bug yang harus segera dikejar — beberapa memang masih
prototipe yang sengaja belum disambung. Tujuannya supaya kamu tahu batas asli
aplikasi ini saat menjelaskannya ke orang lain atau melanjutkan pengerjaannya.

### 6.1 Dua halaman masih prototipe tampilan, belum tersambung ke database

`/drop-memory` dan `/partner` kelihatan berfungsi penuh, tapi tidak ada satu pun
panggilan API di dalamnya.

| Halaman | Bukti di kode | Akibatnya |
| --- | --- | --- |
| `/drop-memory` | `handleSubmit` memakai `setTimeout(..., 1000)` dengan komentar `Simulate API call` | Kiriman hanya masuk `useState`, hilang begitu halaman di-refresh |
| `/partner` | `handleSubmit` memakai `setTimeout(..., 800)`, item baru diberi label `user_name: "Saya (User)"` | Sama: tidak ada yang tersimpan |

Keduanya juga memberi list kosong ke pengguna yang sudah login
(`setMemories([])` / `setAllRequests([])`) — data contoh hanya muncul untuk mode
tamu. Jadi user asli melihat halaman kosong, sementara tamu melihat kartu palsu.
Di `/drop-memory` item baru diberi `target_group: "S1 TI 01"` dan prodi
`"Teknologi Informasi"` secara hardcoded, tidak dari sesi. Tombol like di sana
tidak punya `onClick` sama sekali. Komentar di `/partner` menyebut alasannya:
tabelnya belum dipastikan ada.

Untuk menyambungkannya nanti: perlu tabel Supabase + route `POST`/`GET`
masing-masing, lalu ganti `setTimeout` dengan `fetch` dan `useState` dengan SWR
seperti pola di `/karya`.

### 6.2 Filter feed di `/karya` belum berfungsi

Tombol **For You / Following / Trending** di `/karya` adalah markup mati — tidak
ada handler yang terpasang. Terpisah dari itu, di `components/Feed.tsx:76`:

```ts
const displayedPosts = activeTab === 'foryou' ? posts : [];
```

Artinya tab selain "For You" memang dirancang mengembalikan array kosong, jadi
tab Following selalu tampil kosong walau kamu mengikuti banyak orang. Belum ada
query yang memfilter berdasarkan daftar `follows`.

### 6.3 Notifikasi karya bisa menaut ke halaman yang tidak ada

Ada dua tempat yang membangun link notifikasi, dan keduanya berbeda:

| Sumber | Link yang dibuat | Status |
| --- | --- | --- |
| `components/Header.tsx:362` dan `:508` | `/karya?post={reference_id}` | Rute ada |
| `app/notifications/page.tsx:148,153,238,242,246,280` | `/post/{reference_id}` | **Rute tidak ada** |

Tidak ada `app/post/[id]/page.tsx` di proyek ini (dipastikan lewat inventaris 17
halaman di §2). Jadi notifikasi like, komentar, mention, reply, dan kolaborasi
yang dibuka dari halaman `/notifications` akan mendarat di 404, sedangkan yang
dibuka dari dropdown lonceng di header berfungsi. Perbaikan paling murah:
seragamkan halaman `/notifications` ke `/karya?post=...`.

### 6.4 `/auth/signin` di halaman dokumentasi

`app/dokumentasi/[id]/page.tsx:154` melakukan `router.push("/auth/signin")`.
Halaman login aplikasi ini `/login` (§2.2). `/auth/signin` adalah nama default
Auth.js yang tidak dipakai di sini, jadi redirect itu juga berujung 404.

### 6.5 Dua jenis kunci pengguna bercampur

Aplikasi ini punya dua identitas untuk orang yang sama: **Discord ID** (string
angka dari Discord) dan **UUID** baris `users`. Keduanya dipakai bergantian
tergantung tabel.

| Tabel | Isi `user_id` |
| --- | --- |
| `tasks` | Discord ID |
| `post_likes`, `post_comments` | Discord ID |
| `notifications` (aktor) | UUID `users` |

Efek praktisnya: kamu tidak bisa mem-`join` bebas antar tabel ini, dan setiap
query harus tahu persis kunci mana yang dipakai. Ini juga alasan beberapa route
melakukan pencarian dua tahap (ambil UUID dulu dari Discord ID, baru query).
Bukan bug yang bikin error hari ini, tapi sumber bug kalau nanti ada fitur baru
yang menggabungkan keduanya.

### 6.6 Tabel `posts` menunjuk ke `profiles`, bukan `users`

Foreign key `posts` mengarah ke tabel `profiles`, sementara data pengguna yang
sebenarnya hidup di `users`. Akibatnya `app/api/posts/route.ts:165` harus
melakukan `supabase.from("profiles").upsert({...})` setiap kali karya dibuat,
supaya baris `profiles` pasti ada sebelum insert karya. Satu tulis tambahan
untuk setiap unggahan, dan dua tempat yang harus dijaga tetap sinkron.

### 6.7 Video dokumentasi tercatat sebagai gambar

`app/api/dokumentasi/[id]/route.ts:287` menulis `media_type: "image"` secara
hardcoded, termasuk untuk unggahan video. Jadi kolom itu tidak bisa dipakai
untuk memisahkan video dari foto. Sekarang belum terasa karena tampilan
memutuskan render dari URL Cloudinary, tapi filter "hanya video" tidak akan
mungkin sebelum ini dibetulkan.

### 6.8 Endpoint kembar

Dua duplikasi yang tidak berbahaya tapi membingungkan:

- `PATCH` dan `PUT` di `app/api/tasks/[id]/route.ts` **identik byte per byte** —
  keduanya membaca `{status}` dan menjalankan
  `.update({ status }).eq("id", id).eq("user_id", session.user.discordId)`. Satu-satunya
  perbedaan adalah label di `console.error`. Salah satunya bisa dihapus.
- Ada dua endpoint kolaborasi yang saling tumpang tindih: `PUT /api/posts/collab`
  dan `POST /api/posts/[id]/collab`. Halaman `/notifications` memakai yang kedua.

### 6.9 `DELETE /api/ospek/scan/[id]` tidak memeriksa pemilik

Ini satu-satunya poin di §6 yang berkaitan dengan keamanan. Di
`app/api/ospek/scan/[id]/route.ts`, setelah `auth()` memastikan pemanggil sudah
login, route ini langsung:

```ts
const { data: scan } = await supabase.from("ospek_scans")
  .select("id, scanner_id, scanned_id, photo_url").eq("id", id).single();
// … cloudinary.uploader.destroy(publicId) …
const { error: deleteError } = await supabase.from("ospek_scans").delete().eq("id", id);
```

`scan.scanner_id` dan `scan.scanned_id` diambil, tapi tidak pernah dibandingkan
dengan `session.user.discordId`. Artinya **siapa pun yang sudah login bisa
menghapus baris mutualan milik orang lain** kalau tahu `id`-nya, sekaligus
menghancurkan fotonya di Cloudinary. Penghapusannya permanen. Perbaikannya satu
baris: tolak dengan 403 kalau session bukan salah satu dari kedua ID itu.

### 6.10 `GET /api/ospek/sheets` masih stub

Method `GET` di route itu selalu mengembalikan `{ success: true, url: null }`
tanpa melihat database. Jadi tidak ada cara mengambil kembali link spreadsheet
yang sudah pernah dibuat — satu-satunya jalan adalah `POST` lagi, yang akan
memakai ulang file yang sama (§3.10) dan mengembalikan URL-nya. Berfungsi, tapi
berarti setiap kali halaman ingin menampilkan "spreadsheet kamu ada di sini" ia
harus memicu ekspor ulang.

### 6.11 Tiga halaman belum ikut mode terang

Sapuan mode terang (§1.5) memakai satu lapisan pemetaan yang di-scope ke
`html[data-theme="light"]`, dan itu hanya bekerja pada elemen yang memakai
variabel warna. Tiga halaman masih menulis warna gelap langsung di kelas:

| Halaman | Warna hardcoded |
| --- | --- |
| `/portal` | `bg-[#050505]` di elemen akar |
| `/drop-memory` | `bg-[#121212]`, `bg-[#1c1c1e]` |
| `/partner` | `bg-[#121212]`, `bg-[#1c1c1e]` |

Ketiganya tetap gelap walau tema terang aktif. Perbaikannya sejalan dengan pola
yang sudah ada: ganti warna literal itu dengan `var(--color-bg)` /
`var(--color-surface)`, atau tempelkan handle `page` / `tmuj-panel-flat` yang
sudah dikenali lapisan tema.

### 6.12 Catatan lingkungan pengembangan

Bukan celah aplikasi, tapi hal yang akan langsung kamu temui:

- Build di dalam git worktree gagal dengan Turbopack (`Symlink
  [project]/node_modules is invalid`). Pakai `npx next build --webpack` di sana.
- Worktree tidak membawa `.env.local`, jadi `/radar` melempar error dan
  `/api/auth/*` merespons 500 sampai env-nya disalin.
- Peringatan deprecation Next 16.3 meminta `middleware.ts` dipindah ke `proxy`.
  Belum dikerjakan; `middleware.ts` masih berfungsi.

