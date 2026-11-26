# Panduan Bukti Screenshot T-01–T-36

Simpan screenshot di folder ini sesuai kolom **Bukti** pada [Test Results](../docs/Group01_24SI3_FoodBeverage_TestResults.md). Bila satu T butuh lebih dari satu gambar, beri akhiran huruf: `T-01a.png`, `T-01b.png`, dan seterusnya. Setelah semua lengkap, centang kolom **Sudah dikumpulkan** di bagian Checklist bukti UI pada Test Results.

## Aturan umum

1. Ambil screenshot dari aplikasi publik **https://valentinor.pythonanywhere.com**.
2. Pastikan di setiap screenshot terlihat **nama user/role yang login** (pojok kanan atas), **nomor dokumen**, dan **hasil yang dibandingkan** (angka, status, atau pesan error).
3. Untuk kasus yang ditolak sistem, ambil screenshot **saat pesan error masih tampil**.
4. Ikuti urutan sesi di bawah. Setiap sesi dimulai dengan **Reset baseline**: login `admin` → Home → **↺ Reset baseline seed** → konfirmasi. Dengan urutan ini, angka di layar akan sama dengan expected di handout.
5. Lakukan seluruh sesi ini **sebelum** memasukkan data demo atau data lain, karena reset akan menghapus semua transaksi di server. Backup dulu (Home → **⤓ Backup database**) bila ada data yang ingin disimpan.

---

## Sesi 1 — Baseline (cek tampilan dan kasus yang ditolak)

**Reset baseline dulu.** Di sesi ini data hampir tidak berubah, karena semua kasus berupa pengecekan atau ditolak sistem.

| T | Akun | Langkah | Yang harus terlihat di screenshot |
|---|---|---|---|
| T-01 | `sales`, lalu `owner` | (a) Login `sales`, buka Home. (b) Masih sebagai `sales`, ketik di address bar `…/#accounting/trialbalance`. (c) Login `owner`, buka Home. | (a) Daftar app Sales tanpa Accounting. (b) Akses ditolak. (c) Owner melihat 7 app. |
| T-02 | `sales` | Ketik di address bar `…/#doc/journal/1`. Lalu login `admin` → Audit Log. | Halaman akses ditolak tanpa isi jurnal; baris "Access denied" di Audit Log. |
| T-03 | `sales` | Sales → Contacts (Customer) → buka **C01 Toko Melati**. | Credit limit Rp2.000.000, opening AR Rp400.000, S00004 belum ditagih Rp166.500, exposure Rp566.500, headroom Rp1.433.500. |
| T-05 | `sales` | Sales → Products (Variant). Buka **BVG-250-LEM** dan **BVG-500-LEM**. | (a) List 15 SKU. (b) Harga Rp15.000, cost Rp9.000. (c) Harga Rp25.000, cost Rp15.000. |
| T-06 | `procurement` | Purchase → Products → **＋ New Variant SKU**, isi SKU `BVG-250-LEM`, ukuran 500 ml, simpan. Lalu buka lagi BVG-250-LEM. | (a) Pesan error SKU sudah ada. (b) Produk tetap 250 ml, Rp15.000. |
| T-11a | `sales` | Inventory/Sales → Stock & Reservation (Availability), cari **BVG-250-LEM** di WH-PKU. | On Hand 50, Reserved 10, Available 40 (kondisi awal T-11). |
| T-17 | `procurement` | Purchase → RFQ / Purchase Orders → buka **PO00003**. | 12 × BVG-500-LEM, net Rp180.000, PPN Rp19.800, total Rp199.800, belum diterima. |
| T-33 | `owner` | Reporting → **Company KPI**. | Stock On Hand 749, Reserved 10 / Available 739, Stock Valuation Rp6.314.000 (sama dengan Inventory ledger), Open SO 1, Open PO 1, Open Lead 1. |
| T-34 | `owner` | Di Company KPI, lihat **Revenue posted** dan **Confirmed SO belum ditagih**; lalu buka **S00004**. | Revenue posted Rp0 walaupun S00004 berstatus Confirmed; Confirmed SO belum ditagih Rp166.500. |
| T-35 | `owner` | Buka **S00004**, gulir ke Log Notes / Audit History dan Related Docs. | Actor **seed**, tanggal 01/10/2026, aksi Confirmed + reserve, reservasi 10 unit. |
| T-20 | `warehouse` | Buka **PO00003** → **＋ Receive**, isi qty diterima **13**, simpan. | Pesan error melebihi PO / perlu revisi PO; receipt tidak terbentuk. |
| T-04 | `sales` | **＋ New Quotation**: customer **C02**, 30 × **BVG-500-PCH**, simpan → **Confirm**. | Pesan "Credit limit terlampaui"; status tetap Quotation. |
| T-12 | `sales` | **＋ New Quotation**: customer **C05**, 45 × **BVG-250-LEM**, gudang WH-PKU → **Confirm**. Lalu cek Stock & Reservation. | (a) Pesan error Available hanya 40. (b) Stok tetap 50 / 10 / 40. |
| T-29 | `owner`, `warehouse` | Login `owner`, catat **Stock Valuation** di Reporting → Company KPI. Login `warehouse`: Inventory → Internal Transfers → **＋ New Transfer**: TEA-350-ORI, qty 5, WH-PKU → OUT-MRP → **Validate**. Cek Stock & Reservation, lalu cek Stock Valuation lagi sebagai `owner`. | WH-PKU 60 → 55, OUT-MRP 18 → 23, total 78; nilai stok tetap Rp6.314.000. |
| T-30 | `warehouse` | Di transfer yang sama, klik **↻ Kirim ulang (uji idempotensi)**. | Pesan tidak ada perubahan; WH-PKU tetap 55. |

## Sesi 2 — CRM

**Reset baseline dulu.**

| T | Akun | Langkah | Yang harus terlihat di screenshot |
|---|---|---|---|
| T-07 | `sales`, `owner` | CRM → CRM Pipeline → buka **CRM00009** (C03) → pindahkan ke **Won**. Login `owner` → Reporting → Company KPI. | (a) Pipeline hanya 1 prospek; CRM00009 berstatus Won. (b) Revenue posted tetap Rp0. |
| T-08 | `sales`, `finance` | Di CRM00009 klik **＋ Convert to Quotation**. Lihat Related Docs di quotation dan di lead. Login `finance` → Accounting → Journal Entries. | (a) Quotation S00005 terhubung ke CRM00009, dan sebaliknya. (b) Hanya ada 1 jurnal (saldo awal). |

## Sesi 3 — Quotation, reservasi, diskon

**Reset baseline dulu.**

| T | Akun | Langkah | Yang harus terlihat di screenshot |
|---|---|---|---|
| T-09 | `sales` | **＋ New Quotation**: C01, 8 × BVG-250-LEM, diskon 0 → simpan → **Confirm**. Lalu buka Contacts → C01. | (a) S00005: net Rp120.000, PPN Rp13.200, total Rp133.200, status Confirmed. (b) Exposure C01 Rp699.700. |
| T-11b | `sales` | Stock & Reservation → BVG-250-LEM WH-PKU. | On Hand 50, Reserved 18, Available 32. |
| T-10 | `sales`, `owner` | (a) Quotation baru C01, 8 unit, **diskon 10%** → simpan (total Rp119.880, tidak perlu approval). (b) Quotation baru C01, 8 unit, **diskon 20%** → **Confirm**. (c) Login `owner` → buka quotation itu → **✓ Approve discount (Owner)**. (d) Login `sales` → **Confirm** → klik **✎ Edit harga / diskon**, ubah harga, simpan. (e) Gulir ke Log Notes. | (b) Pesan butuh approval; status Pending Approval. (c) Approval berhasil. (d) Pesan dokumen terkunci. (e) Log berisi Approval required, Approve discount, Blocked edit (locked). |

## Sesi 4 — Delivery, invoice, pembayaran, retur

**Reset baseline dulu.** Ikuti urutannya persis, karena langkah berikutnya memakai dokumen dari langkah sebelumnya.

| T | Akun | Langkah | Yang harus terlihat di screenshot |
|---|---|---|---|
| T-13 | `sales`, `warehouse` | Sales: quotation C01, 8 × BVG-250-LEM → Confirm (S00005). Warehouse: buka S00005 → **＋ Create Delivery**, qty **6** → buka delivery → **Validate**. Lihat baris S00005 dan Stock & Reservation. | Delivered 6, backorder 2; COGS Rp54.000; WH-PKU 44 / Reserved 12 / Available 32. |
| T-25 | `finance` | Accounting → Journal Entries → buka jurnal dengan referensi **WH/OUT/0001**. | Debit COGS Rp54.000 = Kredit Inventory Rp54.000. |
| T-26 | `warehouse` | Buka WH/OUT/0001 → **↻ Kirim ulang (uji idempotensi)**. Lalu Inventory → Stock Moves. | Pesan tidak ada perubahan; On Hand tetap 44; hanya 1 stock move Delivery. |
| T-14 | `finance` | Buka S00005 → **＋ Create Invoice**, coba isi qty **8** → simpan. | Pesan error: hanya 6 unit yang boleh ditagih. |
| T-15 | `finance` | Buat invoice dengan qty **6** → **Post**. Lalu Accounting → Trial Balance / GL. | (a) INV/2026/0001: net Rp90.000, PPN Rp9.900, total Rp99.900, Posted. (b) AR (1100) Rp1.149.900, VAT Output (2200) Rp9.900. |
| T-36 | `finance` | Di INV/2026/0001 klik **↻ Kirim ulang (uji idempotensi)**. Cek Journal Entries. | Pesan tidak ada perubahan; hanya 1 jurnal Customer Invoice; AR tetap Rp1.149.900. |
| T-28 | `finance` | Di INV/2026/0001 → **Register Payment**, coba nominal **−10000**, lalu **110000**, lalu **0**. | Tiga pesan error; saldo Bank tetap Rp7.000.000. |
| T-27 | `finance` | **Register Payment** Rp**40.000**. Lalu Trial Balance. | (a) Status Partial, residual Rp59.900. (b) AR Rp1.109.900, Bank Rp7.040.000. |
| T-32a | `sales` | Di INV/2026/0001 → **＋ Return / Credit Note**, BVG-250-LEM qty **7**. | Pesan error: maksimal 6 unit. |
| T-31 | `sales` → `quality` → `warehouse` → `finance` | Sales: retur qty **2**. Quality: Return Inspection → **Return Inspection (Quality)** → **Saleable**. Warehouse: Inventory → Returns → **✓ Proses stock move retur**. Finance: Invoicing → Returns & Credit Notes → **✓ Credit Note + AR adjustment**. | Credit Note RINV/2026/0001: net Rp30.000 + PPN Rp3.300 = Rp33.300; stok WH-PKU kembali ke 46; COGS reversal Rp18.000. Ambil satu screenshot per peran. |
| T-32b | `finance` | Di retur yang sama klik **↻ Kirim ulang (uji idempotensi)**. | Pesan tidak ada perubahan; hanya 1 Credit Note. |
| T-16 | `sales`, `finance` | Sales: quotation C01, 6 × BVG-250-LEM → Confirm (tanpa delivery). Finance: buka SO itu → **＋ Create Invoice**. | Pesan error: belum ada barang terkirim yang bisa ditagih. |

## Sesi 5 — Purchase, Quality, Vendor Bill

**Reset baseline dulu.**

| T | Akun | Langkah | Yang harus terlihat di screenshot |
|---|---|---|---|
| T-18 | `procurement`, `owner` | **＋ New RFQ**: V01, 70 × BVG-500-LEM (subtotal Rp1.050.000) → **Confirm**. Login `owner` → Reporting → Approvals → **Approve**. Buka PO itu lagi. | (a) Status Pending Approval; Procurement tidak punya tombol approve. (b) Status Confirmed, approved by owner beserta waktunya. |
| T-19 | `warehouse`, `quality` | Warehouse: buka **PO00003** → **＋ Receive** qty 12. Quality: Quality Checks → pilih receipt → **Quality Check Pass / Fail**: Pass 10, Fail 2, alasan "Segel rusak". | Receipt menunggu QC; hasil 10 Pass / 2 Fail tersimpan. |
| T-22 | `procurement` | Buka receipt tersebut → **Ubah accepted qty** menjadi 12 → simpan. Gulir ke Log Notes. | Pesan error; accepted tetap 10; log "Blocked accepted override". |
| T-19 (lanjut) | `warehouse` | Buka receipt → **✓ Validate (accepted only)**. Cek Stock & Reservation BVG-500-LEM. | WH-PKU 30 → 40; total stok perusahaan 759. |
| T-21 | `warehouse` | Buka receipt yang sudah Done, lihat bagian total. | QC00001; Inspected 12, Accepted 10, Rejected 2; accepted value Rp150.000; rejected value potensial Rp30.000. |
| T-24 | `finance` | Buka receipt → **＋ Create Vendor Bill**, ubah **Qty ditagih vendor** menjadi **12** → Create Bill → coba **Post**. Cek Trial Balance. | (a) Status **Mismatch**. (b) Pesan posting ditahan. (c) AP (2100) tetap Rp220.000. |
| T-23 | `finance` | Di bill yang sama klik **Resolve: tagih sebatas accepted** → **Post**. Cek Trial Balance. | (a) Bill net Rp150.000, PPN Rp16.500, total Rp166.500, Posted. (b) AP Rp386.500, GRNI (1210) Rp0. |
