# Contribution Table — SegarRasa ERP

**Group 01 · 24SI3 · Food & Beverage**

Kolom sesuai Paket Penyerahan: nama, role, module, fitur F yang dibangun, T yang diuji, dan key commits. Kolom F dan T terisi sesuai pembagian handout; sesuaikan bila pembagian nyata berbeda. **Key commits** diisi dengan hash dan pesan commit dari repository (perintah di bawah).

| Nama | Role | Module | Fitur F yang dibangun | T yang diuji | Key commits | Kontribusi (%) |
|---|---|---|---|---|---|---|
| Katherine Yap | Product Owner / Project Manager | Sales, CRM | F-01 App switcher dan otorisasi · F-02 Contacts dan credit exposure · F-04 CRM Lead/Opportunity · F-05 Quotation → SO · F-06 Diskon dan kunci harga · F-10 Validasi batas kredit | T-01–T-04, T-07–T-12 | [hash — pesan] | [isi] |
| Valentino Riffan | Lead AI Developer | Purchase, Inventory | F-03 Produk dan variant SKU · F-07 Reservasi dan Available · F-08 Partial delivery/backorder · F-11 RFQ dan PO · F-12 Receipt accepted qty · F-17 Internal Transfer · F-22 Approval PO | T-05–T-06, T-11–T-14, T-17–T-20, T-29–T-30 | [hash — pesan] | [isi] |
| Merlyn Angelica | UI/UX dan Frontend Lead | Quality, Sales (co-owner) | F-13 Quality Check · F-19 Dashboard yang dapat ditelusuri · kontribusi F-05 · layar S-01–S-18 | T-21–T-22, T-33–T-34 | [hash — pesan] | [isi] |
| Edward Narto | QA dan Deployment Lead | Accounting/Invoicing, Quality (co-owner) | F-09 Invoice berdasarkan delivery · F-14 Vendor Bill three-way match · F-15 Ledger dan COGS · F-16 Pembayaran parsial · F-18 Return dan Credit Note · F-20 Audit trail · F-21 Tax dan rounding · deployment publik | T-15–T-16, T-23–T-28, T-31–T-32, T-35–T-36 | [hash — pesan] | [isi] |

Fitur opsional F-23 (Lot dan monitoring expiry) juga diimplementasikan: [isi nama anggota].

## Mengambil key commits dari repository

```bash
# daftar commit per anggota
git shortlog -sn --all
# commit seorang anggota (ganti nama sesuai akun Git)
git log --author="Nama Anggota" --oneline
```

Salin 3–5 commit terpenting setiap anggota ke kolom **Key commits**, misalnya `a1b2c3d — F-14: three-way match dan status Mismatch`.
