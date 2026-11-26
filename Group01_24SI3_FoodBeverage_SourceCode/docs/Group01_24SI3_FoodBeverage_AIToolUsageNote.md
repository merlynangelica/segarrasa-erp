# AI-tool Usage Note — SegarRasa ERP

**Group 01 · 24SI3 · Food & Beverage**

Handout mengizinkan pendekatan *vibe coding* dengan syarat pekerjaan dipecah per modul, wireframe dan acceptance criteria dipakai sebagai spesifikasi, test diulang setelah setiap perubahan, dan logika hasil AI dievaluasi, bukan hanya tampilannya. Catatan ini menjelaskan bagaimana kelompok memakai AI tool dan bagaimana hasilnya diverifikasi.

## 1. Tool yang digunakan

| Tool | Versi / layanan | Dipakai oleh | Untuk apa |
|---|---|---|---|
| [isi nama AI tool] | [isi] | [isi anggota] | [isi] |
| [isi nama editor/IDE, mis. Antigravity] | [isi] | [isi anggota] | Penulisan dan menjalankan kode |

## 2. Bagian pekerjaan yang dibantu AI

Centang dan lengkapi sesuai kenyataan.

| Area | Dibantu AI | Keterangan singkat |
|---|---|---|
| Analisis handout (SR, F, S, T) | ☐ | |
| Rancangan database dan seed baseline | ☐ | |
| Kode backend (API, aturan bisnis, jurnal) | ☐ | |
| Kode frontend (layar S-01–S-18) | ☐ | |
| Uji otomatis T-01–T-36 | ☐ | |
| Dokumentasi (README, Decision Log, Test Results) | ☐ | |
| Panduan deployment | ☐ | |
| Materi presentasi / video | ☐ | |

## 3. Yang ditentukan dan dikerjakan oleh tim

- Interpretasi konflik stakeholder dan keputusan pada [Decision Log](Group01_24SI3_FoodBeverage_DecisionLog.md), termasuk pihak yang menanggung konsekuensi.
- Penentuan prioritas fitur dan fitur yang dipangkas.
- Pengujian ulang setelah perubahan, eksekusi T-01–T-36 di aplikasi publik, dan pengumpulan bukti screenshot.
- Deployment ke PythonAnywhere, konfigurasi `.env`, dan pengelolaan akun uji.
- [tambahkan pekerjaan lain yang dilakukan tim]

## 4. Cara tim memverifikasi hasil AI

1. Setiap aturan SR dibandingkan dengan perilaku aplikasi, bukan hanya dengan tampilan layar.
2. 53 uji otomatis dijalankan ulang setelah perubahan; seluruhnya harus PASS (lihat [Test Results](Group01_24SI3_FoodBeverage_TestResults.md)).
3. Angka hasil transaksi dicocokkan dengan angka di handout (misalnya exposure C01 Rp566.500, COGS Rp54.000, bill PO00003 Rp166.500).
4. Jurnal diperiksa di Trial Balance: total debit harus sama dengan total kredit.
5. Uji manual di UI untuk setiap role dari kondisi baseline yang di-reset.

## 5. Contoh hasil yang tampak benar tetapi logikanya salah

Contoh berikut ditemukan saat pengujian. Rinciannya ada di Defect Log pada Test Results.

| Defect | Yang terlihat | Masalah sebenarnya | Cara ditemukan |
|---|---|---|---|
| DF-05 | Halaman produk tampil normal | Tombol "New Variant SKU" memeriksa nama izin yang salah, sehingga Procurement tidak bisa membuat SKU walau aturannya mengizinkan | Uji per role |
| DF-07 | Kartu Profit per Departemen rapi dan berlabel "IMPAS" | Warehouse dan Finance selalu Rp0 karena akun biayanya tidak pernah diposting | Menelusuri rumus KPI ke jurnal |
| DF-08 | Quotation tersimpan tanpa error | Quotation melebihi credit limit/stok tidak memberi peringatan sampai tombol Confirm ditekan | Uji batas kredit di UI |
| DF-09 | Form Edit User terlihat normal | Kolom reset password terisi otomatis oleh browser sehingga menyimpan form dapat mengganti password | Insiden saat admin tidak bisa login, dilacak lewat audit log |
| [isi] | [isi] | [isi] | [isi] |

## 6. Batasan dan tanggung jawab

- Implementasi tidak menyalin source code maupun asset Odoo; yang diikuti hanya pola tampilan dan alur.
- Kredensial akun uji tidak dicantumkan di repository.
- Seluruh anggota bertanggung jawab memahami dan menjelaskan logika setiap modul saat demo dan tanya jawab, termasuk bagian yang dibantu AI.

## 7. Pernyataan kelompok

Kami menyatakan catatan di atas sesuai dengan cara kami bekerja.

| Nama | Role | Tanggal |
|---|---|---|
| Katherine Yap | Product Owner / Project Manager | |
| Valentino Riffan | Lead AI Developer | |
| Merlyn Angelica | UI/UX dan Frontend Lead | |
| Edward Narto | QA dan Deployment Lead | |
