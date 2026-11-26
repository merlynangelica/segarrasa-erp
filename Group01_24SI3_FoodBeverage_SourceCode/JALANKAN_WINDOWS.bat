@echo off
title SegarRasa ERP - PT SEGAR RASA RIAU
cd /d "%~dp0"
echo ==============================================
echo   SegarRasa ERP - PT Segar Rasa Riau
echo ==============================================

set PY=
where py >nul 2>nul && set PY=py -3
if not defined PY (where python >nul 2>nul && set PY=python)
if not defined PY (
  echo [X] Python belum terinstall.
  echo     Download Python 3.11 atau lebih baru di https://www.python.org/downloads/
  echo     Saat install, CENTANG "Add python.exe to PATH", lalu jalankan file ini lagi.
  pause & exit /b 1
)
%PY% -c "import sys; sys.exit(0 if sys.version_info>=(3,10) else 1)" || (
  echo [X] Versi Python terlalu lama. Install Python 3.11 atau lebih baru.
  pause & exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo [1/3] Membuat virtual environment...
  %PY% -m venv .venv || (echo [X] Gagal membuat venv & pause & exit /b 1)
)
echo [2/3] Menginstall dependency (pertama kali butuh internet)...
".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check -r requirements.txt || (
  echo [X] Gagal install dependency. Cek koneksi internet lalu coba lagi.
  pause & exit /b 1
)
if not exist ".env" copy /y env.example .env >nul

echo [3/3] Menjalankan server di http://127.0.0.1:5000
echo       Browser akan terbuka otomatis. JANGAN tutup jendela ini selama memakai aplikasi.
echo       Untuk berhenti: tekan Ctrl+C atau tutup jendela ini.
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://127.0.0.1:5000"
".venv\Scripts\python.exe" run.py
pause
