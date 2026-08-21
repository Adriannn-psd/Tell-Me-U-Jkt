/*
 * Membuat set frame versi HP (lebar 960px) dari frame 1280px yang sudah ada.
 *
 * Kenapa perlu: animasi landing memutar 865 frame WebP 1280x720. Di HP dengan
 * CPU lemah, decode segitu banyak — apalagi telkom 2 dan telkom 3 diputar
 * bersamaan — tidak sanggup mengikuti jam 30fps dan animasinya jadi slow-mo.
 * Frame 960px kira-kira 2x lebih murah di-decode dan memotong unduhan HP dari
 * ~38 MB jadi ~19 MB.
 *
 * Ditulis ke public/<folder>-960/ dengan NAMA FILE YANG SAMA, supaya sisi klien
 * cuma perlu menukar nama foldernya tanpa menyentuh filenameFormat.
 *
 * Pola sharp-nya sengaja meniru optimize_images.js yang sudah ada di repo
 * (resize lalu .webp({ quality: 70, effort: 4 })) supaya hasilnya konsisten
 * dengan frame 1280px.
 *
 * Jalankan sekali: node scripts/make-mobile-frames.js
 * Aman diulang — file yang sudah ada dilewati kecuali dijalankan dengan --force.
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const WIDTH = 960;
const SUFFIX = "-960";
const dirs = ["opening-frames", "outro", "telkom 1", "telkom 2", "telkom 3"];
const base = path.join(__dirname, "..", "public");
const force = process.argv.includes("--force");

async function run() {
  let totalIn = 0;
  let totalOut = 0;

  for (const d of dirs) {
    const src = path.join(base, d);
    const dest = path.join(base, d + SUFFIX);

    if (!fs.existsSync(src)) {
      console.log(`  ! folder tidak ada, dilewati: ${d}`);
      continue;
    }
    fs.mkdirSync(dest, { recursive: true });

    const files = fs.readdirSync(src).filter((f) => f.endsWith(".webp"));
    let dibuat = 0;
    let dilewati = 0;
    let byteIn = 0;
    let byteOut = 0;

    for (const f of files) {
      const inPath = path.join(src, f);
      const outPath = path.join(dest, f);
      byteIn += fs.statSync(inPath).size;

      if (!force && fs.existsSync(outPath)) {
        dilewati++;
        byteOut += fs.statSync(outPath).size;
        continue;
      }

      try {
        // withoutEnlargement: kalau ada frame yang ternyata < 960px, jangan
        // dibesarkan — hanya menambah byte tanpa menambah detail.
        await sharp(inPath)
          .resize(WIDTH, null, { withoutEnlargement: true })
          .webp({ quality: 70, effort: 4 })
          .toFile(outPath);
        byteOut += fs.statSync(outPath).size;
        dibuat++;
      } catch (err) {
        console.error(`  x gagal ${d}/${f}:`, err.message);
      }
    }

    const mb = (n) => (n / 1024 / 1024).toFixed(1) + " MB";
    console.log(
      `${d.padEnd(15)} ${String(files.length).padStart(3)} frame  ` +
        `${mb(byteIn).padStart(8)} -> ${mb(byteOut).padStart(8)}  ` +
        `(${dibuat} dibuat, ${dilewati} dilewati)`
    );
    totalIn += byteIn;
    totalOut += byteOut;
  }

  const mb = (n) => (n / 1024 / 1024).toFixed(1) + " MB";
  console.log(
    `\nTOTAL ${mb(totalIn)} -> ${mb(totalOut)} ` +
      `(${(100 - (totalOut / totalIn) * 100).toFixed(0)}% lebih kecil)`
  );
}

run();
