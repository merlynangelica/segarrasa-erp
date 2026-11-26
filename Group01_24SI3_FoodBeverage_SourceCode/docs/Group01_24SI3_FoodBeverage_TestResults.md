# Test Results T-01–T-36 — SegarRasa ERP

**Group 01 · 24SI3 · Food & Beverage** · Penanggung jawab (A/R): M4 QA dan Deployment Lead — Edward Narto

## Ringkasan

| | |
|---|---|
| Kode yang diuji | Versi yang di-deploy di https://valentinor.pythonanywhere.com (isi repository ini) |
| Tanggal eksekusi uji otomatis | 26/11/2026 |
| Lingkungan | Python 3.13, Flask 3.1, SQLite; setiap test memakai database baru dari baseline seed |
| Perintah | `python -m pytest -v tests/` |
| Hasil uji otomatis | **53 dari 53 PASS** (36 skenario T-01–T-36 + 1 skenario tambahan T-31b + 16 uji pendukung) |
| Hasil T-01–T-36 | **36 PASS · 0 FAIL** |

Kolom **Actual** di bawah adalah nilai yang benar-benar diperiksa (assert) oleh uji otomatis pada kode di repository ini, bukan perkiraan. Uji otomatis membuktikan logika di level API/database. Bukti UI (screenshot dari aplikasi publik setelah reset baseline) disimpan di folder `bukti/` dengan nama `T-xx.png`; status pengumpulannya ada di bagian **Checklist bukti UI**.

Prosedur setiap uji UI: login Master Admin → Home → **↺ Reset baseline seed** → jalankan situasi T-xx dengan akun role terkait → bandingkan dengan expected → simpan screenshot.

## Hasil T-01–T-36

| T | Jenis | Fitur | Situasi | Expected | Actual | Status | Bukti | Tester |
|---|---|---|---|---|---|---|---|---|
| T-01 | Normal | F-01 | Login role Sales dan Owner pada aplikasi hasil seed. | 7 jenis app tersedia sesuai izin; Sales tidak dapat membuka aksi ledger. | Owner melihat 7 app; Sales tidak memiliki app Accounting; akses trial balance oleh Sales → 403. | **PASS** | `test_T01_app_switcher` · UI: `bukti/T-01.png` | M1 · Katherine Yap |
| T-02 | Aturan/batas | F-01 | Role Sales memasukkan alamat URL detail Journal Entry secara langsung. | Akses ditolak (403/denied) tanpa menampilkan isi jurnal; non-Finance tidak dapat membuka detail ledger (SR-16). *(diturunkan dari SR)* | GET detail journal oleh Sales → 403 tanpa field `lines`; halaman dokumen jurnal → 403. | **PASS** | `test_T02_sales_denied_journal_detail` · UI: `bukti/T-02.png` | M1 · Katherine Yap |
| T-03 | Normal | F-02 | Buka customer C01, SO seed S00004 10 × Rp15.000 belum ditagih. | AR Rp400.000 + SO termasuk PPN Rp166.500 = exposure Rp566.500; headroom Rp1.433.500. | Credit limit Rp2.000.000, opening AR Rp400.000, SO belum ditagih Rp166.500 → exposure Rp566.500, headroom Rp1.433.500. | **PASS** | `test_T03_credit_exposure_C01` · UI: `bukti/T-03.png` | M1 · Katherine Yap |
| T-04 | Aturan/batas | F-02 | C02 punya AR Rp650.000; Sales mengonfirmasi 30 × BVG-500-PCH pada Rp26.000. | Exposure C02 (AR Rp650.000) + SO baru melebihi credit limit Rp1.000.000 → konfirmasi diblokir, SO tetap belum Confirmed (SR-09). *(diturunkan dari SR)* | Confirm → 409 "Credit limit terlampaui"; status tetap Quotation; headroom C02 Rp350.000. | **PASS** | `test_T04_credit_block_C02` · UI: `bukti/T-04.png` | M1 · Katherine Yap |
| T-05 | Normal | F-03 | Telusuri 15 master SKU dan buka BVG-250-LEM serta BVG-500-LEM. | Terdapat 15 SKU; harga Rp15.000 vs Rp25.000 dan cost Rp9.000 vs Rp15.000. | 15 SKU; harga Rp15.000 vs Rp25.000; standard cost Rp9.000 vs Rp15.000. | **PASS** | `test_T05_fifteen_skus` · UI: `bukti/T-05.png` | M2 · Valentino Riffan |
| T-06 | Aturan/batas | F-03 | Input SKU yang sudah ada BVG-250-LEM sebagai varian baru berukuran 500 ml. | SKU duplikat ditolak; master BVG-250-LEM tidak berubah (SR-17). *(diturunkan dari SR)* | Input SKU BVG-250-LEM → 409; master tetap 250 ml, harga Rp15.000. | **PASS** | `test_T06_duplicate_sku_rejected` · UI: `bukti/T-06.png` | M2 · Valentino Riffan |
| T-07 | Normal | F-04 | Buka CRM00009 untuk C03 dan pindahkan dari Qualified ke Won. | Jumlah prospek seed = 1; stage CRM00009 menjadi Won; ledger dan revenue baru tetap Rp0. | Prospek seed = 1 (CRM00009); stage menjadi Won; revenue posted Rp0. | **PASS** | `test_T07_crm_stage_won` · UI: `bukti/T-07.png` | M1 · Katherine Yap |
| T-08 | Aturan/batas | F-04 | Konversi CRM00009 menjadi Quotation dan lihat related document. | Quotation baru terhubung ke CRM00009 sebagai related document dua arah; tidak ada jurnal/revenue baru (SR-18). *(diturunkan dari SR)* | Terbentuk S00005; related document dua arah S00005 ⇄ CRM00009; jumlah jurnal tetap 1 (opening). | **PASS** | `test_T08_lead_to_quotation` · UI: `bukti/T-08.png` | M1 · Katherine Yap |
| T-09 | Normal | F-05, F-06 | Buat quotation baru C01 8 × BVG-250-LEM lalu Confirmed. | Net Rp120.000; PPN Rp13.200; gross Rp133.200; exposure C01 jadi Rp699.700. | S00005: net Rp120.000, PPN Rp13.200, gross Rp133.200; Confirmed; exposure C01 Rp699.700. | **PASS** | `test_T09_quotation_to_so` · UI: `bukti/T-09.png` | M1 · Katherine Yap |
| T-10 | Aturan/batas | F-05, F-06 | Pada quotation 8 unit, coba diskon 20% tanpa approval Owner dan ubah harga pada status Confirmed. | Diskon 20% tanpa Owner masuk Pending Approval dan tidak bisa Confirmed; setelah Confirmed harga/diskon terkunci dan percobaan ubah ditolak serta tercatat di audit (SR-07, SR-08). *(diturunkan dari SR)* | Diskon 10% total Rp119.880 tanpa approval; diskon 20% → 409, status Pending Approval; Owner approve → Confirmed; edit harga → 409 locked; audit memuat Approval required, Approve discount, Blocked edit (locked). | **PASS** | `test_T10_discount_gate_and_lock` · UI: `bukti/T-10.png` | M1 · Katherine Yap |
| T-11 | Normal | F-07, F-10 | Buka stock BVG-250-LEM WH-PKU; konfirmasi SO tambahan 8 unit. | Awal 50 On Hand / 10 Reserved / 40 Available; setelah confirm 50 / 18 / 32. | Awal 50 / 10 / 40; setelah confirm 8 unit 50 / 18 / 32. | **PASS** | `test_T11_reservation` · UI: `bukti/T-11.png` | M2 · Valentino Riffan |
| T-12 | Aturan/batas | F-07, F-10 | Dari baseline buat pesanan 45 unit BVG-250-LEM WH-PKU untuk C05 dan minta fulfilment. | Fulfilment 45 unit ditolak karena Available hanya 40; tidak ada stok negatif dan reservasi S00004 tidak terpakai (SR-03, SR-04). *(diturunkan dari SR)* | Confirm 45 unit C05 → 409; stok tetap 50 / 10 / 40. | **PASS** | `test_T12_oversell_blocked` · UI: `bukti/T-12.png` | M2 · Valentino Riffan |
| T-13 | Normal | F-08 | Buat SO baru 8 BVG-250-LEM; validasi Delivery 6 saja. | Delivered 6; Backorder 2; WH On Hand 44; Reserved 12 (10+2); Available 32; COGS Rp54.000. | COGS Rp54.000; WH 44 / Reserved 12 / Available 32; delivered 6, backorder 2. | **PASS** | `test_T13_partial_delivery` · UI: `bukti/T-13.png` | M2 · Valentino Riffan |
| T-14 | Aturan/batas | F-08 | Setelah hanya 6 dari 8 unit dikirim, Finance mencoba Customer Invoice 8 unit. | Invoice 8 unit ditolak; yang boleh ditagih hanya 6 unit terkirim (SR-02). *(diturunkan dari SR)* | Invoice 8 unit → 409, invoiceable 6; invoice yang dibuat net Rp90.000, total Rp99.900. | **PASS** | `test_T14_invoice_capped` · UI: `bukti/T-14.png` | M2 · Valentino Riffan |
| T-15 | Normal | F-09, F-21 | Buat SO dan Delivery 6 BVG-250-LEM lalu Post Customer Invoice. | Net Rp90.000; PPN Rp9.900; AR awal Rp1.050.000 menjadi Rp1.149.900; output tax Rp9.900. | Net Rp90.000, PPN Rp9.900; AR Rp1.149.900; VAT Output Rp9.900; Revenue Rp90.000. | **PASS** | `test_T15_invoice_posted` · UI: `bukti/T-15.png` | M4 · Edward Narto |
| T-16 | Aturan/batas | F-09, F-21 | Buat SO 6 BVG-250-LEM tetapi Delivery belum Validated; minta invoice. | Invoice ditolak karena delivered qty = 0; AR tidak berubah (SR-02). *(diturunkan dari SR)* | Invoice → 409, invoiceable 0; AR tetap Rp1.050.000. | **PASS** | `test_T16_invoice_without_delivery` · UI: `bukti/T-16.png` | M4 · Edward Narto |
| T-17 | Normal | F-11, F-22 | Lihat PO00003 V01 sebanyak 12 BVG-500-LEM (belum diterima). | Net Rp180.000; PPN simulasi Rp19.800; gross Rp199.800; stock tetap 749 unit. | PO00003 net Rp180.000, PPN Rp19.800, gross Rp199.800; total stok 749 unit. | **PASS** | `test_T17_po_seed` · UI: `bukti/T-17.png` | M2 · Valentino Riffan |
| T-18 | Aturan/batas | F-11, F-22 | Buat PO V01 70 × BVG-500-LEM dengan subtotal Rp1.050.000 lalu coba Confirmed sebagai Procurement tanpa approval. | PO subtotal Rp1.050.000 menjadi Pending Approval; Procurement tidak bisa menyetujui sendiri; setelah Owner approve status Confirmed dan approval terekam (SR-20). *(diturunkan dari SR)* | Subtotal Rp1.050.000 → Pending Approval; approve oleh Procurement → 403; approve Owner → approved_by owner, status Confirmed, approved_at terisi. | **PASS** | `test_T18_po_approval` · UI: `bukti/T-18.png` | M2 · Valentino Riffan |
| T-19 | Normal | F-12 | Untuk PO00003, terima 10 dari 12 BVG-500-LEM, 2 Fail di Quality. | WH SKU dari 30 menjadi 40; +Rp150.000 inventory, +10 company unit; 2 rejected tidak masuk stock. | Accepted value Rp150.000; BVG-500-LEM WH-PKU 40; total stok 759 (2 rejected tidak masuk). | **PASS** | `test_T19_receipt_accepted_only` · UI: `bukti/T-19.png` | M2 · Valentino Riffan |
| T-20 | Aturan/batas | F-12 | Petugas mencoba memvalidasi Receipt 13 terhadap PO00003 qty12. | Receipt 13 terhadap PO qty 12 ditolak; perlu revisi PO (SR-06, SR-11). *(diturunkan dari SR)* | Receipt 13 → 409 dengan pesan perlu revisi PO. | **PASS** | `test_T20_over_receipt_blocked` · UI: `bukti/T-20.png` | M2 · Valentino Riffan |
| T-21 | Normal | F-13 | QC00001 merekam 10 Pass + 2 Fail pada PO00003, lalu Warehouse menyelesaikan Receipt untuk unit accepted. | Inspected 12; Passed 10; Failed 2; Value accepted Rp150.000; rejected value potensial Rp30.000 tidak masuk stok. | Inspected 12, Accepted 10, Rejected 2; accepted value Rp150.000; rejected value potensial Rp30.000; QC00001 oleh user quality. | **PASS** | `test_T21_quality_record` · UI: `bukti/T-21.png` | M3 · Merlyn Angelica |
| T-22 | Aturan/batas | F-13 | Setelah QC menandai 2 unit Fail, Procurement berusaha menyatakan semuanya Accepted. | Override accepted 12 oleh Procurement ditolak; accepted tetap 10 dan percobaan tercatat (SR-06, SR-11). *(diturunkan dari SR)* | PATCH accepted 12 oleh Procurement → 409; accepted tetap 10; audit memuat Blocked accepted override. | **PASS** | `test_T22_cannot_override_failed` · UI: `bukti/T-22.png` | M3 · Merlyn Angelica |
| T-23 | Normal | F-14 | PO00003 Receipt 10 Accepted lalu Finance Posting Vendor Bill yang cocok. | Net Rp150.000; input PPN Rp16.500; bill gross Rp166.500; AP awal Rp220.000 jadi Rp386.500. | Bill net Rp150.000, PPN Rp16.500, total Rp166.500; posting OK; AP Rp386.500; GRNI kembali Rp0. | **PASS** | `test_T23_vendor_bill` · UI: `bukti/T-23.png` | M4 · Edward Narto |
| T-24 | Aturan/batas | F-14 | Vendor Bill untuk PO00003 diajukan 12 unit meski accepted10. | Bill 12 unit atas accepted 10 berstatus Mismatch, posting diblokir, AP tidak bertambah (SR-05, SR-06). *(diturunkan dari SR)* | Bill klaim 12 → Mismatch, net dibatasi Rp150.000; posting → 409; AP tetap Rp220.000. | **PASS** | `test_T24_bill_mismatch` · UI: `bukti/T-24.png` | M4 · Edward Narto |
| T-25 | Normal | F-15 | Buat Delivery 6 unit BVG-250-LEM dari WH-PKU lalu buka Journal Entries. | Dr COGS Rp54.000; Cr Inventory Rp54.000; Debits = Credits, selisih Rp0. | Jurnal delivery debit = kredit = Rp54.000, referensi WH/OUT/…. | **PASS** | `test_T25_cogs_journal` · UI: `bukti/T-25.png` | M4 · Edward Narto |
| T-26 | Aturan/batas | F-15 | Kirim kembali perintah Validate pada Delivery yang sudah Done. | Validate ulang tidak membuat stock move maupun jurnal kedua (SR-15). *(diturunkan dari SR)* | Validate ulang → idempotent; On Hand tetap 44; jurnal Delivery 1; stock move Delivery 1. | **PASS** | `test_T26_delivery_idempotent` · UI: `bukti/T-26.png` | M4 · Edward Narto |
| T-27 | Normal | F-16 | Lakukan Delivery+Invoice 6 Lemon lalu terima partial payment Rp40.000. | Residual Rp59.900; AR agregat Rp1.109.900; Bank Rp7.040.000; invoice Partial. | Pembayaran Rp40.000 → residual Rp59.900, status Partial; AR Rp1.109.900; Bank Rp7.040.000. | **PASS** | `test_T27_partial_payment` · UI: `bukti/T-27.png` | M4 · Edward Narto |
| T-28 | Aturan/batas | F-16 | Buat Delivery dan Posted Invoice 6 Lemon (residual Rp99.900); coba pembayaran negatif atau Rp110.000. | Pembayaran negatif, nol, atau melebihi residual Rp99.900 ditolak; saldo bank tidak berubah (SR-10). *(diturunkan dari SR)* | Pembayaran −Rp10.000, Rp110.000, dan Rp0 → masing-masing 409; Bank tetap Rp7.000.000. | **PASS** | `test_T28_invalid_payment` · UI: `bukti/T-28.png` | M4 · Edward Narto |
| T-29 | Normal | F-17 | Transfer 5 botol TEA-350-ORI dari WH-PKU ke OUT-MRP. | WH 60→55; OUT 18→23; total SKU 78; nilai agregat tidak berubah. | WH-PKU 55, OUT-MRP 23; nilai stok sebelum = sesudah = Rp6.314.000. | **PASS** | `test_T29_transfer` · UI: `bukti/T-29.png` | M2 · Valentino Riffan |
| T-30 | Aturan/batas | F-17 | Tekan Validate kedua kalinya untuk transfer yang sudah Done. | Validate kedua tidak memindahkan stok lagi (SR-12, SR-15). *(diturunkan dari SR)* | Validate kedua → idempotent; WH-PKU tetap 55. | **PASS** | `test_T30_transfer_idempotent` · UI: `bukti/T-30.png` | M2 · Valentino Riffan |
| T-31 | Normal | F-18 | Buat Delivery dan Invoice 6 Lemon, kemudian Return 2 unit layak jual + Credit Note. | Credit net Rp30.000 + PPN Rp3.300 = Rp33.300; 2 stok kembali; COGS reversal Rp18.000. | Credit net Rp30.000 + PPN Rp3.300 = Rp33.300; COGS reversal Rp18.000; Credit Note RINV/…; WH 46; COGS Rp36.000; AR Rp1.116.600. | **PASS** | `test_T31_return_credit_note (+ test_T31b_return_stage_order_and_roles)` · UI: `bukti/T-31.png` | M4 · Edward Narto |
| T-32 | Aturan/batas | F-18 | Setelah 6 Lemon ter-deliver, ajukan Return 7 unit atau Credit Note ganda. | Return 7 unit ditolak (maksimal 6); Credit Note tidak terbentuk dua kali (SR-13, SR-15). *(diturunkan dari SR)* | Return 7 → 409, cap 6; validate Credit Note kedua → idempotent; jurnal Credit Note hanya 1. | **PASS** | `test_T32_return_cap_and_idempotent` · UI: `bukti/T-32.png` | M4 · Edward Narto |
| T-33 | Normal | F-19 | Buka KPI Dashboard pada kondisi baseline tanpa transaksi pengujian. | On Hand 749 unit; Reserved10; Available739; nilai stock Rp6.314.000; 1 SO open, 1 PO open, 1 Lead open. | On Hand 749, Reserved 10, Available 739, nilai stok Rp6.314.000 (= ledger persediaan); 1 SO, 1 PO, 1 lead open. | **PASS** | `test_T33_dashboard_baseline` · UI: `bukti/T-33.png` | M3 · Merlyn Angelica |
| T-34 | Aturan/batas | F-19 | S00004 Confirmed tetapi belum delivered / invoiced: periksa KPI Revenue. | Revenue tetap Rp0 karena S00004 belum di-invoice; nilai SO confirmed belum ditagih ditampilkan terpisah (SR-18, SR-19). *(diturunkan dari SR)* | Revenue posted Rp0; uninvoiced confirmed Rp166.500. | **PASS** | `test_T34_revenue_excludes_so` · UI: `bukti/T-34.png` | M3 · Merlyn Angelica |
| T-35 | Normal | F-20 | Buka S00004 lalu lihat relation graph dan log seed. | Jejak actor seed tanggal 01/10/2026 dan related reservation 10 unit tersedia. | Riwayat S00004: actor seed, aksi Confirmed + reserve, 2026-10-01 02:00; reservasi 10 unit. | **PASS** | `test_T35_seed_audit` · UI: `bukti/T-35.png` | M4 · Edward Narto |
| T-36 | Aturan/batas | F-20 | Lakukan posting ulang pada invoice yang telah Posted untuk 6 Lemon. | Posting ulang tidak membuat invoice, event Post, maupun jurnal kedua; AR tidak dobel (SR-15). *(diturunkan dari SR)* | Post ulang → idempotent; jurnal Customer Invoice 1; AR Rp1.149.900; event Post Customer Invoice 1. | **PASS** | `test_T36_invoice_post_idempotent` · UI: `bukti/T-36.png` | M4 · Edward Narto |

Kolom **Tester** mengikuti pembagian tanggung jawab uji pada handout (M1–M4). Rincian peran ada di [Role Assignment Sheet](Group01_24SI3_FoodBeverage_RoleAssignmentSheet.md).

## Uji tambahan (di luar T-01–T-36)

| Test | Yang dibuktikan | Status |
|---|---|---|
| `test_T31b_return_stage_order_and_roles` | Retur tidak bisa melompati tahap; Sales tidak bisa menginspeksi; retur Damaged tidak menambah stok dan masuk Quality Loss Rp9.000 | PASS |
| `test_trial_balance_always_balanced` | Trial balance: selisih debit − kredit = 0 setelah delivery dan posting invoice | PASS |
| `test_admin_user_lifecycle` | Master Admin membuat user dan menonaktifkannya; sesi aktif langsung berakhir, login ditolak, tercatat di Login History | PASS |
| `test_admin_permission_change_applies` | Perubahan izin role (Sales diberi `purchase.view`) langsung berlaku dan tercatat di Permission Changes | PASS |
| `test_admin_is_not_business_actor` | Master Admin ditolak saat membuka dokumen penjualan dan saat menyetujui PO | PASS |
| `test_access_matrix_samples` | Owner tidak bisa membuat SO; Quality tidak bisa melihat invoice; Warehouse tidak bisa melihat lead; Sales tidak bisa mengubah credit limit; Finance bisa (SR-16) | PASS |
| `test_role_dashboards_render` | Dashboard setiap role dapat dibuka dan menampilkan 4 KPI | PASS |
| `test_lot_expiry_fefo` | Lot dan expiry tercatat saat receipt (LOT-A, 12 unit); delivery 5 unit mengurangi sisa lot menjadi 7 (F-23) | PASS |
| `test_sales_cannot_create_delivery` | Delivery hanya dibuat Warehouse | PASS |
| `test_discount_goes_straight_to_owner_approvals` | Quotation diskon > 10% langsung masuk daftar approval Owner; setelah Owner menolak, daftar approval kosong | PASS |
| `test_staff_sees_only_own_documents` | Level Staff hanya melihat dokumen miliknya | PASS |
| `test_admin_per_user_permission` | Grant izin per user berlaku untuk user itu saja; user lain dengan role sama tidak ikut berubah | PASS |
| `test_owner_profit_breakdown` | Laporan untung/rugi per produk: net sales Rp90.000, COGS Rp54.000, laba kotor Rp36.000, status Untung | PASS |
| `test_owner_executive_dashboard` | Executive Dashboard menampilkan KPI, enam kartu departemen, dan top produk; Sales ditolak (403) | PASS |
| `test_procurement_creates_product` | Procurement dapat membuat variant SKU; Sales ditolak | PASS |
| `test_backup_and_restore_database` | Backup menghasilkan file SQLite valid; restore memvalidasi file dan memulihkan data | PASS |
| `test_print_invoice_page` | Halaman cetak invoice dapat dibuka Finance; Warehouse ditolak | PASS |

## Defect log

Defect yang ditemukan selama pengembangan dan pengujian. Beberapa adalah contoh tampilan yang terlihat benar tetapi logikanya keliru, sehingga hanya ketahuan lewat pengujian.

| ID | Modul | Deskripsi | Dampak | Status di versi ini |
|---|---|---|---|---|
| DF-01 | Invoicing / Return | Validasi credit note merujuk kolom database yang tidak ada | Credit note gagal dibuat | Diperbaiki (memakai `validated_at` / `credit_net`) |
| DF-02 | Admin | Nama file backup memotong objek tanggal seperti string | Backup database error | Diperbaiki (format tanggal) |
| DF-03 | Reporting | Panel approval di Executive Dashboard menampilkan judul kosong | Tampilan membingungkan | Diperbaiki |
| DF-04 | Reporting | Sumbu grafik untung/rugi tidak sejajar dengan nilai | Grafik salah dibaca | Diperbaiki |
| DF-05 | Purchase | Tombol "New Variant SKU" memeriksa nama izin yang salah, sehingga Procurement tidak melihatnya | Procurement tidak bisa membuat SKU dari UI walau API mengizinkan | Diperbaiki |
| DF-06 | UI | Font tanpa fallback jatuh ke font serif di beberapa perangkat | Tampilan tidak konsisten | Diperbaiki |
| DF-07 | Reporting | Profit per Departemen untuk Warehouse dan Finance selalu Rp0 karena akun 6200/6300 tidak pernah diposting | Kartu terlihat "impas" padahal belum ada pencatatan biaya | Terbuka (keterbatasan, lihat Decision Log) |
| DF-08 | Sales | Quotation yang melebihi credit limit atau stok tidak menampilkan peringatan sebelum Confirm | Aturan tetap ditegakkan saat Confirm, tetapi user baru tahu setelah menekan tombol | Terbuka (UX) |
| DF-09 | Admin | Kolom "Reset password (opsional)" di form Edit User dapat terisi otomatis oleh browser; menyimpan form tanpa sengaja mengganti password akun yang diedit | Akun (termasuk admin) bisa tidak bisa login | Terbuka (pemulihan: reset password lewat console server) |
| DF-10 | UI | Pada layar HP, sidebar menyempit dan hanya menampilkan titik menu | Navigasi di HP sulit | Terbuka |

## Checklist bukti UI

| T | Bukti wajib (handout) | File | Sudah dikumpulkan |
|---|---|---|---|
| T-01 | Capture App Switcher dua role + hasil otorisasi. | `bukti/T-01.png` | ☐ |
| T-02 | Rekaman 403/denied tanpa isi ledger. | `bukti/T-02.png` | ☐ |
| T-03 | Form kontak dan rincian perhitungan. | `bukti/T-03.png` | ☐ |
| T-04 | Tangkapan validator kredit, SO belum Confirmed. | `bukti/T-04.png` | ☐ |
| T-05 | List 15 baris dan dua Form produk. | `bukti/T-05.png` | ☐ |
| T-06 | Bukti validasi SKU unik dan master tidak berubah. | `bukti/T-06.png` | ☐ |
| T-07 | Kanban before-after dan link CRM00009. | `bukti/T-07.png` | ☐ |
| T-08 | Bukti Quotation terkait, tanpa jurnal penjualan. | `bukti/T-08.png` | ☐ |
| T-09 | Form SO status dan detail subtotal/tax. | `bukti/T-09.png` | ☐ |
| T-10 | Bukti approval gate dan lock histori. | `bukti/T-10.png` | ☐ |
| T-11 | Snapshot stock sebelum dan setelah reservasi. | `bukti/T-11.png` | ☐ |
| T-12 | Bukti pencegahan oversell dan stock lain tidak berkurang. | `bukti/T-12.png` | ☐ |
| T-13 | DO, backorder, stock move, jurnal COGS. | `bukti/T-13.png` | ☐ |
| T-14 | Bukti nilai invoice cap dan backorder yang tersisa. | `bukti/T-14.png` | ☐ |
| T-15 | Invoice, GL AR/revenue/PPN dan related delivery. | `bukti/T-15.png` | ☐ |
| T-16 | Bukti invoicable qty nol, tanpa piutang/jurnal. | `bukti/T-16.png` | ☐ |
| T-17 | PO lines/status; bukti belum ada Receipt posting. | `bukti/T-17.png` | ☐ |
| T-18 | Bukti approval dan audit pencobaan. | `bukti/T-18.png` | ☐ |
| T-19 | Receipt, QC status dan jurnal stok. | `bukti/T-19.png` | ☐ |
| T-20 | Validasi penolakan/permintaan revisi PO. | `bukti/T-20.png` | ☐ |
| T-21 | QC record dengan jumlah, alasan, actor. | `bukti/T-21.png` | ☐ |
| T-22 | Bukti transisi diblokir dan jejak koreksi QC. | `bukti/T-22.png` | ☐ |
| T-23 | Bill, match, ledger dan status GRNI. | `bukti/T-23.png` | ☐ |
| T-24 | Screenshot selisih 2 unit dan posting ditahan. | `bukti/T-24.png` | ☐ |
| T-25 | Journal, valuation report, DO reference. | `bukti/T-25.png` | ☐ |
| T-26 | Bukti hanya satu journal, satu stock move dan satu pengurangan stock. | `bukti/T-26.png` | ☐ |
| T-27 | Payment record, invoice residual, bank/AR ledger. | `bukti/T-27.png` | ☐ |
| T-28 | Bukti dua request ditolak dan GL tidak berubah. | `bukti/T-28.png` | ☐ |
| T-29 | Transfer, source/destination stock, valuation. | `bukti/T-29.png` | ☐ |
| T-30 | Bukti saldo tetap hanya bergeser 5, bukan 10. | `bukti/T-30.png` | ☐ |
| T-31 | Return, Credit Note, GL, inventory trace. | `bukti/T-31.png` | ☐ |
| T-32 | Bukti batas return dan idempotency kredit. | `bukti/T-32.png` | ☐ |
| T-33 | Screenshot KPI dan filter dokumen asal. | `bukti/T-33.png` | ☐ |
| T-34 | Bukti pengecualian nilai SO dari posted revenue. | `bukti/T-34.png` | ☐ |
| T-35 | Screenshot log, smart links, actor, timestamp. | `bukti/T-35.png` | ☐ |
| T-36 | Bukti 1 invoice, 1 event Post, 1 journal dan AR tidak dobel. | `bukti/T-36.png` | ☐ |

## Cara mengulang uji

```bash
pip install -r requirements.txt pytest
python -m pytest -v tests/
```
