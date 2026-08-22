# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# base — sistem + Python venv, dipakai kedua service.
#
# Python ada di dua-duanya karena bukan cuma scraper yang butuh: route
# app/api/user/ig-profile-pic memanggil `python ig_profile_fetcher.py` lewat
# child_process saat runtime.
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# scraper — daemon Python saja: tidak perlu node_modules, tidak perlu
# `next build`. Sebelumnya stage ini ikut membangun seluruh aplikasi Next.js
# (~70 detik + satu image penuh) padahal yang dijalankan hanya radar_daemon.py.
# ---------------------------------------------------------------------------
FROM base AS scraper

COPY . .

CMD ["python3", "radar_daemon.py"]

# ---------------------------------------------------------------------------
# web — Node modules + build Next.js.
# ---------------------------------------------------------------------------
FROM base AS web

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Variabel NEXT_PUBLIC_* ditanam permanen ke dalam hasil build, bukan dibaca saat
# runtime — jadi `env_file` di docker-compose TIDAK berpengaruh untuk yang ini.
# Kalau kosong, metadataBase di app/layout.tsx jatuh ke domain Vercel.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
