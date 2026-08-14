# Panduan Setup SSO Instagram (Meta for Developers - UI Terbaru 2024)

Berdasarkan pembaruan UI terbaru dari Meta for Developers, pembuatan aplikasi sekarang menggunakan sistem **"Kasus Penggunaan" (Use Cases)**. Berikut adalah panduan langkah demi langkah yang disesuaikan dengan tampilan baru:

> [!IMPORTANT]
> Pastikan kamu login menggunakan akun Facebook yang terhubung dengan akun Instagram, atau login langsung menggunakan akun Instagram di portal developer Meta.

## Langkah 1: Buat Aplikasi Baru
1. Buka [Meta for Developers](https://developers.facebook.com/) dan login.
2. Di pojok kanan atas, klik **Aplikasi Saya** (My Apps), kemudian klik tombol **Buat Aplikasi** (Create App).
3. Saat ditanya *What do you want your app to do?* (Apa fungsi aplikasi Anda?), pilih opsi yang berkaitan dengan **Login** atau **Authenticate and request data from users with Instagram Login**. Jika tidak ada, pilih **Lainnya** (Other) > **Konsumen** (Consumer).
4. Masukkan **Nama Aplikasi** (misal: `Tell Me U Jkt-IG`), email kontak, lalu klik **Buat Aplikasi**.

## Langkah 2: Atur Kasus Penggunaan (Tambahkan Izin)
Sesuai dengan tangkapan layar yang kamu kirim, kamu sekarang berada di halaman **Kasus penggunaan > Sesuaikan** (Use cases > Customize):
1. Di panel menu sebelah kiri, di bawah dropdown **Instagram API**, klik tab **Izin dan fitur** (Permissions and features).
2. Di daftar izin (seperti yang terlihat di tangkapan layar ke-4), scroll ke bawah dan cari izin bernama **`instagram_basic`**.
   *(Izin ini berfungsi: "Aplikasi Anda dapat membaca info dan media profil akun Instagram.")*
3. Klik tombol **+ Tambahkan** (+ Add) di sebelah kanannya.

## Langkah 3: Dapatkan Kredensial App ID & Secret
1. Masih di panel menu sebelah kiri, klik **Penyiapan API dengan login Instagram**.
2. Pada bagian atas (lihat tangkapan layar ke-3), kamu akan melihat **ID aplikasi Instagram** dan **Rahasia aplikasi Instagram** (App Secret).
3. Buka file `.env` di dalam kodemu, dan salin nilai tersebut:

```env
# URL website kamu (localhost untuk dev)
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Kredensial dari Meta for Developers
INSTAGRAM_APP_ID="MASUKKAN_ID_APLIKASI_INSTAGRAM_DI_SINI"
INSTAGRAM_APP_SECRET="MASUKKAN_RAHASIA_APLIKASI_DI_SINI"
```
*(Catatan: Klik tombol "Tampilkan" untuk melihat rahasia aplikasi, jangan bagikan kode ini ke publik!)*

## Langkah 4: Konfigurasi URL Callback (Redirect URI)
Agar aplikasi Next.js kamu bisa berkomunikasi dengan Meta, Meta harus tahu ke mana harus mengembalikan data user setelah login.
1. Di panel menu Meta for Developers, cari produk/menu yang bernama **Instagram Login** atau pengaturan **Client OAuth Settings**.
2. Cari kolom yang bernama **Valid OAuth Redirect URIs** (URI Pengalihan OAuth yang Valid).
3. Masukkan URL berikut:
   `http://localhost:3000/api/auth/instagram/callback`
4. Jangan lupa **Simpan Perubahan** (Save Changes).

## Langkah 5: Tambahkan Test User (Karena Mode Development)
Aplikasi yang baru dibuat akan berstatus "Development", artinya hanya akun yang didaftarkan yang bisa melakukan login.
1. Masuk ke menu **Peran Aplikasi > Peran** (App Roles > Roles) di menu utama sebelah kiri (bukan di dalam kasus penggunaan).
2. Scroll ke bagian **Penguji Instagram** (Instagram Testers), klik **Tambahkan Penguji Instagram**.
3. Masukkan **username Instagram** pribadi kamu, lalu tambahkan.
4. Buka tab baru di browser, login ke web Instagram, dan buka pengaturan [Tester Invites](https://www.instagram.com/accounts/manage_access/) (Pengaturan > Aplikasi & Website > Undangan Penguji).
5. **Terima (Accept)** undangan tersebut.

---

Jika semua langkah di atas sudah selesai, jangan lupa matikan terminal Next.js kamu dan jalankan ulang `npm run dev` agar file `.env` yang baru terbaca. Setelah itu coba klik tombol **Tautkan Instagram** di halaman profil!
