@echo off
title SegarRasa Enterprise Core - PT Segar Rasa Riau
set "PATH=C:\Users\User\.gemini\antigravity\scratch\nodejs\node-v20.18.0-win-x64;%PATH%"
cd /d "C:\Users\User\.gemini\antigravity\scratch\segar-rasa-erp"
echo ===================================================
echo   Menjalankan SegarRasa Enterprise Core ERP
echo   PT Segar Rasa Riau
echo ===================================================
echo Membuka aplikasi di peramban...
start http://localhost:5173/
npm run preview -- --host 0.0.0.0 --port 5173
pause
