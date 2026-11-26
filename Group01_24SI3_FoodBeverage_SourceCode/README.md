# SegarRasa ERP — PT Segar Rasa Riau

**Group 01 · Kelas 24SI3 · Studi kasus ERP Food & Beverage**

Aplikasi web ERP untuk PT Segar Rasa Riau (merek dagang SegarRasa, Pekanbaru), distributor minuman dan camilan kemasan dengan dua lokasi stok: gudang pusat **WH-PKU** dan outlet **OUT-MRP**. Aplikasi menghubungkan Sales, CRM, Purchase, Inventory, Quality, Invoicing, dan Accounting dalam satu database, dengan aturan bisnis SR-01–SR-20 ditegakkan di sisi server.

| | |
|---|---|
| **URL publik** | https://valentinor.pythonanywhere.com |
| **Akun uji** | Dikirim terpisah kepada dosen (tidak dicantumkan di repository) |
| **Uji otomatis** | 53 test, seluruhnya PASS (lihat [Test Results](docs/Group01_24SI3_FoodBeverage_TestResults.md)) |

## Tim

| Kode | Nama | Peran | Modul |
|---|---|---|---|
| M1 | Katherine Yap | Product Owner / Project Manager / Business Analyst | Sales (bersama M3), CRM |
| M2 | Valentino Riffan | Lead AI Developer | Purchase, Inventory |
| M3 | Merlyn Angelica | UI/UX dan Frontend Lead | Quality, Sales (co-owner) |
| M4 | Edward Narto | QA dan Deployment Lead | Accounting/Invoicing, Quality (co-owner) |

---

## Daftar dokumen penyerahan

| Item yang diminta (Paket Penyerahan poin 2) | Dokumen |
|---|---|
| README cara menjalankan | File ini |
| Diagram arsitektur dan data | [docs/Group01_24SI3_FoodBeverage_ArchitectureDataDiagram.md](docs/Group01_24SI3_FoodBeverage_ArchitectureDataDiagram.md) |
| Decision Log atas setiap konflik | [docs/Group01_24SI3_FoodBeverage_DecisionLog.md](docs/Group01_24SI3_FoodBeverage_DecisionLog.md) |
| Test Results T-01–T-36 (expected, actual, pass/fail, bukti) + defect log | [docs/Group01_24SI3_FoodBeverage_TestResults.md](docs/Group01_24SI3_FoodBeverage_TestResults.md) |
| AI-tool usage note | [docs/Group01_24SI3_FoodBeverage_AIToolUsageNote.md](docs/Group01_24SI3_FoodBeverage_AIToolUsageNote.md) |
| Role Assignment Sheet | [docs/Group01_24SI3_FoodBeverage_RoleAssignmentSheet.md](docs/Group01_24SI3_FoodBeverage_RoleAssignmentSheet.md) |
| Team Agreement | [docs/Group01_24SI3_FoodBeverage_TeamAgreement.md](docs/Group01_24SI3_FoodBeverage_TeamAgreement.md) |
| Contribution table | [docs/Group01_24SI3_FoodBeverage_ContributionTable.md](docs/Group01_24SI3_FoodBeverage_ContributionTable.md) |
| Traceability SR → fitur → kode → test | [docs/Group01_24SI3_FoodBeverage_RequirementsTraceability.md](docs/Group01_24SI3_FoodBeverage_RequirementsTraceability.md) |
| Commit history semua anggota | Riwayat commit repository GitHub ini |

---

## Teknologi

Python 3.10+ · Flask 3.1 · SQLite · HTML, CSS, dan JavaScript tanpa framework (single page application) · session login + RBAC di setiap endpoint API · deployment WSGI di PythonAnywhere.

Teknologi dipilih sendiri oleh tim sesuai ketentuan handout (tidak ada framework, database, atau hosting yang diwajibkan). Implementasi orisinal dan tidak menyalin source code maupun asset Odoo; yang diikuti hanya pola tampilan web Odoo (App switcher, List/Kanban/Form, status bar, related documents, log notes).

---

## Cara menjalankan

### Cara tercepat (tanpa mengetik perintah)

1. Pastikan **Python 3.10 atau lebih baru** sudah terpasang. Saat instalasi di Windows, centang **Add python.exe to PATH**.
2. Extract ZIP sampai selesai (jangan dijalankan langsung dari dalam ZIP).
3. Windows: klik dua kali `JALANKAN_WINDOWS.bat`. macOS/Linux: klik dua kali `JALANKAN_MAC_LINUX.command` (atau `bash JALANKAN_MAC_LINUX.command`).
4. Pertama kali dijalankan, script membuat virtual environment `.venv` dan menginstal dependency (butuh internet). Browser terbuka otomatis ke `http://127.0.0.1:5000`. Jangan tutup jendela terminalnya selama aplikasi dipakai.

### Cara manual (Antigravity, VS Code, atau terminal)

```bash
python -m venv .venv
# Windows PowerShell : .venv\Scripts\Activate.ps1
#   (jika diblokir   : Set-ExecutionPolicy -Scope Process Bypass)
# macOS / Linux      : source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env        # Windows: copy env.example .env, lalu isi SECRET_KEY acak
python run.py              # buka http://127.0.0.1:5000
```

Database SQLite dibuat otomatis di `instance/segarrasa_erp.db` beserta baseline seed (15 SKU, 6 customer, 4 vendor, S00004, PO00003, CRM00009, saldo awal). Data tetap ada setelah refresh atau restart.

Jika folder proyek dipindah atau di-rename, hapus folder `.venv` lalu jalankan script lagi. Virtual environment menyimpan path absolut sehingga harus dibuat ulang.

### Menjalankan uji otomatis

```bash
pip install pytest
python -m pytest -q tests/
```

Setiap test memakai database baru dari baseline seed, sesuai aturan bahwa setiap T-xx dimulai dari baseline.

### Reset baseline untuk pengujian

Login sebagai Master Admin → **Home → ↺ Reset baseline seed**. Seluruh transaksi uji dihapus dan data kembali ke baseline handout (penomoran kembali ke S00005, PO00004, CRM00010).

---

## Akun dan role
Username: role contoh owner / sales.staff / sales = manager
Pass : role123 contoh owner123 / sales.staff123 / sales123

Tersedia 12 akun dalam 7 role. Lima role bisnis memiliki level Manager dan Staff.

| Role | Level | Tugas utama di aplikasi |
|---|---|---|
| Master Admin | — | Kelola user, role, dan hak akses per orang; Login History, Permission Changes, Audit Log; backup, restore, reset baseline. Bukan pelaku transaksi atau approval. |
| Owner | — | Approval diskon di atas 10% (SR-08) dan PO di atas Rp1.000.000 (SR-20); Executive Dashboard; melihat seluruh modul tanpa posting. |
| Sales | Manager, Staff | Lead/CRM, quotation, Sales Order, pelanggan, pengajuan retur. |
| Warehouse | Manager, Staff | Delivery, Receipt, Internal Transfer, proses stok retur, lot dan expiry. |
| Procurement | Manager, Staff | RFQ/Purchase Order, vendor dan pricelist, variant SKU baru. |
| Finance | Manager, Staff | Customer Invoice, Vendor Bill, pembayaran, Credit Note, credit limit, jurnal dan laporan. |
| Quality | Manager, Staff | Quality Check Pass/Fail pada Receipt, inspeksi retur (Saleable/Damaged). |

Staff Sales dan Procurement hanya dapat membuka dokumen yang ia buat sendiri; Manager melihat seluruh dokumen departemennya. Pembatasan ini dilakukan di query database, bukan hanya di tampilan.

---

## Modul dan alur

| Alur | Langkah di aplikasi |
|---|---|
| **Order to Cash** | CRM Pipeline → Convert to Quotation → Confirm (cek diskon, credit exposure, Available) → Create Delivery (partial/backorder, FEFO) → Validate (jurnal COGS) → Create Invoice (≤ delivered) → Post → Register Payment (partial/paid) → Return + Credit Note |
| **Procure to Pay** | New RFQ → Confirm (subtotal > Rp1.000.000 = Pending Approval Owner) → Receive → Quality Check Pass/Fail → Validate (accepted only) → Create Vendor Bill (three-way match) → Post → Register Payment |
| **Quality** | Receipt menunggu QC; hanya qty Pass yang menambah stok; retur Saleable kembali ke stok, Damaged dicatat ke Quality Loss |
| **Inventory** | Stock & Reservation (On Hand, Reserved, Available), Internal Transfer WH-PKU ⇄ OUT-MRP, Stock Moves, Lot & Expiry |
| **Reporting** | Executive Dashboard Owner, dashboard per role, Approvals, Untung/Rugi, Audit Trail, Product Analysis, Customer Profitability |

Retur berjalan empat tahap berurutan: Sales mengajukan → Quality memeriksa → Warehouse memproses stock move → Finance membuat Credit Note dan penyesuaian AR.

## Jurnal yang dibukukan otomatis

| Kejadian | Debit | Kredit |
|---|---|---|
| Delivery divalidasi | 5100 COGS | 1200 Stock Valuation (standard cost) |
| Receipt divalidasi (accepted saja) | 1200 Stock Valuation | 1210 GRNI |
| Vendor Bill diposting | 1210 GRNI, 1300 VAT Input | 2100 Accounts Payable |
| Customer Invoice diposting | 1100 AR, 4110 Sales Discounts | 4100 Sales Revenue, 2200 VAT Output |
| Pembayaran customer / vendor | 1010 Bank / 2100 AP | 1100 AR / 1010 Bank |
| Retur Saleable / Damaged | 1200 Stock / 6100 Quality Loss | 5100 COGS |
| Credit Note | 4100 Sales Revenue, 2200 VAT Output | 1100 AR |

Setiap jurnal divalidasi debit = kredit sebelum disimpan. Stok, dokumen, dan jurnal disimpan dalam satu transaksi database (`BEGIN IMMEDIATE`); bila satu langkah gagal, seluruhnya dibatalkan.

---

## Struktur repository

```text
app/__init__.py          app factory, konfigurasi session dan cookie
app/auth.py              role, permission default, pengecekan izin per request
app/db.py                skema, migrasi, seed baseline, penomoran, pajak, jurnal, stock move
app/routes.py            seluruh API dan aturan bisnis SR-01–SR-20
app/templates/index.html halaman aplikasi
app/static/app.js        tampilan S-01–S-18 (SPA, hash routing)
app/static/style.css     tema tampilan
tests/test_scenarios.py  uji otomatis T-01–T-36 + uji tambahan
docs/                    dokumen penyerahan (lihat daftar di atas)
run.py · wsgi.py         menjalankan lokal · entry point WSGI untuk hosting
JALANKAN_*.{bat,command} script satu klik
env.example              contoh konfigurasi (.env asli tidak di-commit)
```

---

## Deployment publik (PythonAnywhere)

Aplikasi berjalan di **https://valentinor.pythonanywhere.com** dengan HTTPS. Semua anggota dan dosen memakai satu database online yang sama, sehingga riwayat transaksi dan audit trail konsisten.

1. Tab **Files**: unggah ZIP proyek ke `/home/<akun>/`, lalu di **Consoles → Bash**:
   ```bash
   unzip <nama-file>.zip && mv <nama-folder> erp && cd erp
   python3.11 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
   cp env.example .env   # isi SECRET_KEY acak dan SESSION_COOKIE_SECURE=1
   ```
2. Tab **Web** → Add a new web app → Manual configuration → Python 3.11. Source code dan working directory `/home/<akun>/erp`, virtualenv `/home/<akun>/erp/venv`.
3. File WSGI configuration diisi:
   ```python
   import sys, os
   path = "/home/<akun>/erp"
   sys.path.insert(0, path); os.chdir(path)
   from wsgi import app as application
   ```
4. Static files: URL `/static/` → `/home/<akun>/erp/app/static`. Aktifkan **Force HTTPS**, lalu **Reload**.

Pembaruan kode cukup dengan mengunggah file yang berubah lalu klik **Reload**. Folder `instance/` di server berisi database produksi dan tidak boleh ditimpa.

**Backup dan restore:** Master Admin → Home → **⤓ Backup database** mengunduh salinan lengkap. **⤒ Restore database** memvalidasi file (header SQLite, integrity check, tabel wajib, minimal satu Admin aktif) sebelum menggantikan database, dan tindakan ini tercatat di audit log.
