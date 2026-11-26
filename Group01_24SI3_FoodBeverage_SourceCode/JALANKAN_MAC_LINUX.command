#!/bin/bash
# Double-click di macOS (atau jalankan: bash JALANKAN_MAC_LINUX.command)
cd "$(dirname "$0")" || exit 1
PY=$(command -v python3 || command -v python)
if [ -z "$PY" ]; then echo "Python belum terinstall. Download di https://www.python.org/downloads/"; read -r; exit 1; fi
[ -x .venv/bin/python ] || "$PY" -m venv .venv || { echo "Gagal membuat venv"; read -r; exit 1; }
.venv/bin/python -m pip install -q --disable-pip-version-check -r requirements.txt || { echo "Gagal install dependency (cek internet)"; read -r; exit 1; }
[ -f .env ] || cp env.example .env
echo "Server berjalan di http://127.0.0.1:5000 — jangan tutup jendela ini. Berhenti: Ctrl+C"
( sleep 3; (open http://127.0.0.1:5000 || xdg-open http://127.0.0.1:5000) >/dev/null 2>&1 ) &
.venv/bin/python run.py
