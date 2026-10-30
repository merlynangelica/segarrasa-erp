# SegarRasa Enterprise Core (SR-Core ERP)
## PT Segar Rasa Riau — Sistem ERP Distribusi F&B Mandiri

**Sesuai Dokumen Spesifikasi Resmi:** `24SI3 - Group 01 - Food and Beverage.pdf`  
**Merek Usaha:** PT Segar Rasa Riau (*SegarRasa*)  
**Bidang Industri:** Distributor Minuman Siap Minum & Camilan Kemasan Non-Mewah  
**Wilayah Operasional:** Pekanbaru, Kampar, Siak, Dumai (Riau)  
**Mata Uang:** Rupiah (IDR)  
**Skema Perpajakan:** PPN Efektif 11% (Formula PMK: 12% × 11/12)

---

## 1. Panduan Menjalankan Aplikasi Secara Lokal

### Prasyarat:
- Web browser modern (Google Chrome, Edge, Safari, Firefox).
- Node.js versi 18+ (Sudah terpasang di direktori alat pendukung scratch).

### Perintah Menjalankan:
```bash
# Masuk ke direktori proyek
cd C:\Users\User\.gemini\antigravity\scratch\segar-rasa-erp

# Menjalankan preview production server (atau npm run dev)
npm run preview -- --host 0.0.0.0 --port 5173
```
Akses di browser Anda pada alamat:
👉 **`http://localhost:5173/`**

---

## 2. Akun Demo untuk 6 Peran (Simulasi RBAC)

Aplikasi dilengkapi fitur 1-klik instan switch role pada halaman Login maupun Navbar atas:

| Role | Nama Pengguna | Email Login | Password | Tanggung Jawab & Hak Akses |
|---|---|---|---|---|
| **Owner** | Ratna Putri | `owner@segarrasa.id` | `owner123` | **MELIHAT SELURUH ERP (18 Layar & 7 Modul)**. Approval PO > Rp1 Jt & Diskon > 10%. |
| **Sales** | Dimas Saputra | `sales@segarrasa.id` | `sales123` | CRM, Kontak Customer, Katalog Produk, Quotation & Sales Order. (Dilarang akses Akuntansi: T-02). |
| **Warehouse** | Yusuf Hidayat | `warehouse@segarrasa.id` | `wh123` | Ketersediaan Stok Fisik, Reservasi (Available = On Hand - Reserved), Delivery Order, Penerimaan Gudang, Transfer Internal. |
| **Procurement** | Nina Febriana | `procurement@segarrasa.id` | `proc123` | Master Vendor, RFQ, Purchase Order (PO > Rp1 Jt butuh approval Owner: SR-20). |
| **Finance** | Sari Permata | `finance@segarrasa.id` | `fin123` | Customer Invoice (Berbasis Delivered Qty: SR-02), Tagihan Vendor (3-Way Match: SR-06), Buku Besar Jurnal Berpasangan, Pembayaran Parsial. |
| **Quality** | Tika Maharani | `quality@segarrasa.id` | `qa123` | Pemeriksaan Kualitas Masuk (QC Inbound Pass/Fail). Isolasi kemasan rusak; unit gagal tidak masuk stok jual (SR-11). |

---

## 3. Cakupan Lengkap 18 Layar (S-01 s.d. S-18)

1. **S-01:** Beranda App Switcher (F-01) — Home launcher & ringkasan operasional.
2. **S-02:** Contact Customer (F-02) — Master customer, credit limit, AR berjalan, dan headroom.
3. **S-03:** Product Variant Catalog (F-03) — 15 master SKU unik dengan harga jual & standard cost terpisah.
4. **S-04:** CRM Pipeline (F-04) — Pipeline prospek (New → Qualified → Won) & konversi Quotation.
5. **S-05:** Quotation / Sales Order (F-05, F-06) — Pesanan penjualan, PPN 11%, gerbang approval diskon > 10%, dan penguncian saat Confirmed.
6. **S-06:** Reservation & Credit Gate (F-07, F-10) — Formula alokasi $Available = On Hand - Reserved$, pencegahan stok negatif & limit kredit.
7. **S-07:** Delivery Order & Backorder (F-08) — Pengiriman parsial, pembentukan backorder otomatis, & jurnal COGS.
8. **S-08:** Customer Invoice (F-09, F-21) — Penagihan hanya atas kuantitas terkirim (*Delivered Qty*).
9. **S-09:** RFQ / Purchase Order (F-11, F-22) — Pembelian vendor & gerbang approval Owner untuk subtotal > Rp1.000.000.
10. **S-10:** Receipt & Accepted Qty (F-12) — Penerimaan fisik gudang terintegrasi hasil QC masuk.
11. **S-11:** Quality Check Pass / Fail (F-13) — Evaluasi segel/kemasan rusak; unit ditolak diisolasi.
12. **S-12:** Vendor Bill & Three-way Match (F-14) — Rekonsiliasi PO vs Receipt vs Bill. Penahanan varians jika tagihan > accepted.
13. **S-13:** Journal Entries & General Ledger (F-15) — Jurnal berpasangan otomatis berimbang sempurna (Dr = Cr, selisih Rp0).
14. **S-14:** Register Payment Dialog (F-16) — Penerimaan kas/bank, pembayaran parsial, & pelacakan residual.
15. **S-15:** Internal Stock Transfer (F-17) — Pemindahan stok WH-PKU ke OUT-MRP tanpa mengubah nilai konsolidasi.
16. **S-16:** Return & Credit Note (F-18) — Retur pelanggan layak jual, pemulihan stok, pembalikan COGS, & Nota Kredit.
17. **S-17:** KPI Dashboard (F-19) — Rekonsiliasi terpadu metrik baseline (On Hand 749, Reserved 10, Available 739, Valuasi Rp6.314.000).
18. **S-18:** Audit Log & Document Relations (F-20) — Peta relasi dokumen bisnis & jejak audit aktor idempoten.

---

## 4. Modal Verifikator 36 Skenario Pengujian (T-01 s.d. T-36)

Aplikasi memiliki fitur khusus **"36 Uji Skenario (T-01 s.d. T-36)"** di bilah navigasi atas (tombol warna emas).  
Dosen atau evaluator dapat mengklik tombol ini kapan saja untuk menjalankan pengujian otomatis atas seluruh aturan bisnis normal flow dan rule/edge test dengan perbandingan *Expected vs Actual Result* dan bukti verifikasi teknis.
