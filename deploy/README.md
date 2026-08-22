# Deploy VPS

Dua compose project terpisah di VPS ini:

| Project | Lokasi | Isi |
| --- | --- | --- |
| `tellmeu` | root repo | `tellmeu-web` (Next.js) + `radar-scraper-daemon` |
| `proxy` | `deploy/proxy` | `caddy-proxy` — terminasi TLS untuk semua domain |

Keduanya bertemu di network Docker eksternal bernama `edge`. Caddy menemukan
upstream lewat **nama container** (`tellmeu-web`, `9router`), jadi app bisa
di-rebuild kapan saja tanpa menyentuh sertifikat, dan sebaliknya.

## Kenapa dipisah

Sebelumnya `caddy` ikut di compose repo ini. Efeknya: setiap
`docker compose up -d --build` untuk memperbarui web ikut merestart proxy, yang
berarti domain lain di VPS (mis. 9router) ikut down. Port 80/443 juga jadi milik
project app, sehingga app tidak bisa dimatikan tanpa mematikan TLS semua domain.

## Domain yang dilayani

Lihat [proxy/Caddyfile](proxy/Caddyfile):

- `tellmeujkt.web.id` → `tellmeu-web:3000`
- `adptr.web.id` → `9router:20128`

Menambah domain baru = tambah blok di `Caddyfile`, pastikan container tujuan ada
di network `edge`, lalu reload (lihat bawah). Tidak perlu restart apa pun.

## Perintah operasional

Semua dijalankan dari root repo (`/opt/tellmeu`).

Update aplikasi (proxy tidak tersentuh):

```bash
docker compose up -d --build
```

Reload konfigurasi Caddy setelah mengubah `Caddyfile` (tanpa downtime):

```bash
docker compose -f deploy/proxy/docker-compose.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Restart proxy (hanya kalau compose file proxy-nya berubah):

```bash
docker compose -f deploy/proxy/docker-compose.yml up -d
```

Log proxy, termasuk error penerbitan sertifikat:

```bash
docker compose -f deploy/proxy/docker-compose.yml logs --tail=80 caddy
```

## Migrasi dari susunan lama (sekali saja)

Kondisi awal: `caddy-proxy` masih milik project `tellmeu`, container `9router`
masih di network `bridge` default.

1. Buat network bersama:

   ```bash
   docker network create edge
   ```

2. Ambil perubahan repo:

   ```bash
   cd /opt/tellmeu && git pull
   ```

3. Turunkan Caddy lama supaya port 80/443 bebas:

   ```bash
   docker compose stop caddy && docker compose rm -f caddy
   ```

4. Sambungkan `tellmeu-web` dan `9router` ke `edge`:

   ```bash
   docker compose up -d
   ```

   ```bash
   docker network connect edge 9router
   ```

5. Nyalakan proxy baru:

   ```bash
   docker compose -f deploy/proxy/docker-compose.yml up -d
   ```

6. Verifikasi kedua domain:

   ```bash
   curl -I https://tellmeujkt.web.id && curl -I https://adptr.web.id
   ```

Sertifikat lama tersimpan di volume `tellmeu_caddy_data` dan **tidak** dipakai
project baru — Caddy menerbitkan ulang otomatis saat start pertama. Untuk dua
domain ini rate limit Let's Encrypt tidak jadi masalah. Volume lama boleh dibuang
setelah HTTPS terbukti jalan:

```bash
docker volume rm tellmeu_caddy_data tellmeu_caddy_config
```

## Catatan 9router

Container `9router` dijalankan di luar repo ini (`docker run`, bukan compose),
sehingga `docker network connect edge 9router` **hilang setiap container itu
di-recreate** (mis. update image). Selama belum punya compose file sendiri,
ulangi perintah tersebut setiap habis recreate.

Port `20128` masih dipublikasikan ke `0.0.0.0`, artinya API-nya bisa diakses
langsung lewat IP tanpa HTTPS. Setelah `adptr.web.id` jalan, jalankan ulang
container dengan `-p 127.0.0.1:20128:20128`; akses via Caddy tetap hidup karena
lewat network `edge`, bukan port host. Perlu dicatat: `ufw deny 20128` tidak
memblokir port publikasi Docker — Docker menulis aturannya sendiri di chain
`DOCKER-USER`.
