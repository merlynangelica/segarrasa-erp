# Role Assignment Sheet — SegarRasa ERP

**Group 01 · 24SI3 · Food & Beverage**

Pembagian mengikuti tabel "Peran dan Tanggung Jawab Kelompok" pada handout. Isi kolom NIM.

## Pembagian peran

| Kode | Nama | NIM | Functional role | Module ownership | Tanggung jawab dominan | Fitur (F) | Pengujian (T) |
|---|---|---|---|---|---|---|---|
| M1 | Katherine Yap | [NIM] | Product Owner / Project Manager / Business Analyst | Sales (pemilik bersama M3); CRM (pemilik) | Prioritas, validasi SR, relasi prospek–pesanan, konflik dan Decision Log | F-01, F-02, F-04, F-05, F-06, F-10 | T-01–T-04, T-07–T-12 |
| M2 | Valentino Riffan | [NIM] | Lead AI Developer | Purchase dan Inventory (pemilik) | Integritas transaksi, reservasi, stok, penerimaan, transfer, persetujuan PO | F-03, F-07, F-08, F-11, F-12, F-17, F-22 | T-05–T-06, T-11–T-14, T-17–T-20, T-29–T-30 |
| M3 | Merlyn Angelica | [NIM] | UI/UX dan Frontend Lead | Quality (pemilik); Sales (co-owner bersama M1) | Pola tampilan, pemeriksaan kualitas, UX dashboard, kesesuaian wireframe | F-13, F-19, kontribusi F-05 | T-21–T-22, T-33–T-34 |
| M4 | Edward Narto | [NIM] | QA dan Deployment Lead | Accounting/Invoicing (pemilik); Quality (co-owner bersama M3) | Jurnal berpasangan, pajak, pembayaran, retur, audit, regresi, deployment | F-09, F-14, F-15, F-16, F-18, F-20, F-21 | T-15–T-16, T-23–T-28, T-31–T-32, T-35–T-36 |

## Matriks RACI

| Aktivitas | M1 PO/BA | M2 Lead Dev | M3 UI/UX | M4 QA/Deploy |
|---|---|---|---|---|
| Analisis kebutuhan dan acceptance | A/R | C | C | I |
| Model data dan dataset | C | A/R | C | R |
| Implementasi wireframe | C | R | A/R | C |
| Pembangunan modul | R | A/R | R | R |
| Pengujian integrasi dan aturan | C | R | R | A/R |
| Decision Log | A/R | C | C | C |
| Deployment | I | R | C | A/R |
| Video demo dan presentasi | R | C | A/R | R |

R = responsible · A = satu pemilik keputusan · C = consulted · I = informed · A/R = pemilik keputusan yang juga mengerjakan.

## Segmen demo per anggota

| Anggota | Segmen demo |
|---|---|
| M1 | CRM → Quotation → approval diskon → Confirm (kredit dan reservasi) |
| M2 | RFQ → approval PO → Receipt → Internal Transfer → stok dan reservasi |
| M3 | Quality Check Pass/Fail, inspeksi retur, Executive Dashboard |
| M4 | Invoice ≤ delivered, Vendor Bill three-way match, pembayaran parsial, Credit Note, jurnal dan audit |

Setiap pengalihan peran dicatat di bagian "Riwayat pengalihan peran" pada README.
