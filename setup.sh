#!/bin/bash
set -e

# ==========================================
# Konfigurasi Awal
# ==========================================
REPO_URL="https://github.com/Adriannn-psd/Tell-Me-U-Jkt.git"
APP_DIR="/opt/tellmeu"

echo "Memulai otomatisasi setup VPS..."

# 1. Update sistem dan install dependencies
echo "[1/4] Mengupdate sistem..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y git curl apt-transport-https ca-certificates gnupg lsb-release

# 2. Instalasi Docker & Docker Compose
echo "[2/4] Menginstal Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    sudo systemctl enable --now docker
else
    echo "Docker sudah terinstall."
fi

# 3. Clone / Pull Repository
echo "[3/4] Mengambil source code dari repository..."
if [ -d "$APP_DIR" ]; then
    echo "Direktori $APP_DIR sudah ada, melakukan git pull..."
    cd $APP_DIR
    git pull origin main
else
    echo "Melakukan git clone ke $APP_DIR..."
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Pastikan file .env dipindahkan/dicopy ke $APP_DIR sebelum lanjut.
# Di instruksi ini kita berasumsi file .env sudah siap atau 
# akan dibuat via cara lain pada VPS Anda.

# 4. Menjalankan Docker Compose
echo "[4/4] Menjalankan Docker Compose..."

# Network bersama tempat reverse proxy menemukan container app. Harus ada lebih
# dulu: compose menolak start kalau network `external` belum dibuat.
sudo docker network inspect edge &> /dev/null || sudo docker network create edge

# Memastikan plugin compose digunakan
if docker compose version &> /dev/null; then
    COMPOSE="sudo docker compose"
else
    # Fallback ke docker-compose lama jika docker compose (v2) tidak ada
    COMPOSE="sudo docker-compose"
fi

$COMPOSE up -d --build
# Reverse proxy adalah project terpisah (lihat deploy/proxy) supaya rebuild app
# tidak pernah menurunkan TLS untuk domain lain di VPS ini.
$COMPOSE -f deploy/proxy/docker-compose.yml up -d

echo "Setup selesai! Aplikasi sedang berjalan dan akan diakses lewat https://tellmeujkt.web.id"
