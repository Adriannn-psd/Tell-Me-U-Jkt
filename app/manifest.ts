import type { MetadataRoute } from "next";

/**
 * Manifest ini ada untuk SATU alasan konkret: audio pembuka bisa berbunyi tanpa
 * satu ketukan pun.
 *
 * Kebijakan autoplay Chrome mengizinkan pemutaran BERSUARA tanpa gesture cuma
 * dalam tiga keadaan: (1) sudah pernah ada interaksi di dokumen itu, (2) di
 * desktop, Media Engagement Index situsnya sudah cukup tinggi, dan (3) situsnya
 * dipasang — "Add to Home Screen" di Android atau install PWA di desktop.
 * Nomor 1 tidak berlaku untuk halaman yang baru dibuka, nomor 2 tidak ada di
 * Android, jadi nomor 3 adalah satu-satunya jalan yang tersisa untuk membuka "/"
 * dari nol dan langsung mendengar suaranya.
 *
 * `display: "standalone"` yang membuat Chrome memasangnya sebagai aplikasi
 * (WebAPK) alih-alih shortcut biasa, dan status "terpasang" itulah yang dibaca
 * kebijakan autoplay. iOS Safari tidak punya pengecualian yang setara; di sana
 * suara pertama tetap menunggu sentuhan.
 *
 * `start_url: "/"` disengaja: itu halaman animasinya. Untuk user yang sudah
 * login, middleware.ts tetap memantulkannya ke /home seperti biasa.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tell Me U Jakarta",
    short_name: "TMU JKT",
    description:
      "Portal mahasiswa Telkom University Jakarta: verifikasi SKL, kelas, ospek, dan agenda kampus.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#060607",
    theme_color: "#060607",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        // Launcher Android memotong sampai 20% tiap sisi; versi ini logonya sudah
        // dikecilkan ke 60% kanvas supaya tidak ikut terpotong.
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
