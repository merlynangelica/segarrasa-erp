# Team Agreement — SegarRasa ERP

**Group 01 · 24SI3 · Food & Beverage**

Kesepakatan kerja kelompok sesuai ketentuan handout (ritme rapat, approval, mitigasi keterlambatan). Sesuaikan isi dalam tanda kurung siku dengan kesepakatan kalian.

## 1. Tujuan bersama

Menyerahkan aplikasi ERP yang berjalan di URL publik, menegakkan SR-01–SR-20, lulus T-01–T-36 dengan bukti, dan setiap anggota mampu menjelaskan modulnya serta integrasi lintas modul.

## 2. Ritme rapat

| Jenis | Waktu | Media | Isi |
|---|---|---|---|
| Rapat mingguan | [hari, jam] | [kampus / Zoom / Discord] | Review checkpoint minggu berjalan, pembagian tugas minggu depan |
| Update singkat | [mis. setiap hari pukul 21.00] | [grup WhatsApp] | Progres, kendala, bantuan yang dibutuhkan |
| Sesi integrasi | [sebelum checkpoint] | [isi] | Uji alur end-to-end bersama |

Notulen singkat dicatat di [lokasi notulen].

## 3. Pembagian kerja dan kepemilikan

- Setiap anggota memiliki modul sesuai [Role Assignment Sheet](Group01_24SI3_FoodBeverage_RoleAssignmentSheet.md) dan bertanggung jawab end-to-end: kebutuhan, pembangunan, pengujian, dan segmen demo.
- Co-owner Sales (M1 dan M3) serta Quality (M3 dan M4) wajib berkontribusi nyata dalam fitur dan pengujian.

## 4. Approval dan pengambilan keputusan

- Keputusan aturan bisnis dan konflik SR: diputuskan M1 (A) setelah konsultasi anggota terkait, lalu dicatat di Decision Log.
- Keputusan teknis modul: diputuskan pemilik modul; perubahan yang memengaruhi modul lain dibahas di grup terlebih dahulu.
- Perubahan kode masuk ke branch utama setelah fitur berjalan dan seluruh uji otomatis PASS.
- Deployment ke server publik dilakukan oleh M4 (A).

## 5. Aturan repository

- Commit dilakukan setelah fitur berjalan, dengan pesan yang menjelaskan perubahan (mis. `F-09: batasi invoice ke delivered qty`).
- Setiap anggota melakukan commit dari akunnya sendiri agar commit history mencerminkan kontribusi.
- File rahasia (`.env`, database `instance/`, daftar akun uji) tidak pernah di-commit.
- Uji otomatis dijalankan ulang setelah setiap perubahan.

## 6. Mitigasi keterlambatan

| Kondisi | Tindakan |
|---|---|
| Tugas berisiko terlambat | Lapor di grup paling lambat [24 jam] sebelum tenggat |
| Tugas melewati tenggat 1 hari | Anggota lain membantu; pemilik tetap bertanggung jawab menyelesaikan |
| Anggota tidak dapat dihubungi [2 hari] | Tugas dialihkan sementara; pengalihan dicatat di README |
| Bug pada modul orang lain | Laporkan ke pemilik modul dan catat di Defect Log |

## 7. Komunikasi dan etika

- Menghargai pendapat, mengkritik ide bukan orang.
- Semua anggota memahami seluruh alur, termasuk bagian yang dibantu AI tool.
- Kontribusi dinilai lewat contribution table, commit history, dan peer assessment secara jujur.

## 8. Persetujuan

| Nama | Role | Tanda tangan / tanggal |
|---|---|---|
| Katherine Yap | Product Owner / Project Manager | |
| Valentino Riffan | Lead AI Developer | |
| Merlyn Angelica | UI/UX dan Frontend Lead | |
| Edward Narto | QA dan Deployment Lead | |
