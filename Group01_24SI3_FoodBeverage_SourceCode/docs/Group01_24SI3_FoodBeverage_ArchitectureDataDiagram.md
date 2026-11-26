# Diagram Arsitektur dan Data — SegarRasa ERP

**Group 01 · 24SI3 · Food & Beverage**

Diagram ditulis dalam Mermaid sehingga tampil langsung sebagai gambar di GitHub.

## 1. Arsitektur sistem

```mermaid
flowchart LR
    subgraph Client["Browser (laptop / HP)"]
        UI["index.html + app.js + style.css<br/>Single Page App, hash routing<br/>Layar S-01–S-18"]
    end
    subgraph Server["PythonAnywhere (HTTPS, WSGI)"]
        direction TB
        API["Flask — app/routes.py<br/>REST API /api/..."]
        AUTH["app/auth.py<br/>login session + RBAC<br/>izin role ∪ grant − revoke"]
        RULES["Aturan bisnis SR-01–SR-20<br/>approval, kredit, stok, QC,<br/>three-way match, idempotensi"]
        CORE["app/db.py<br/>skema, seed, penomoran,<br/>PPN per baris, post_journal, stock_move"]
        DB[("SQLite<br/>instance/segarrasa_erp.db")]
    end
    UI -- "fetch JSON (cookie session)" --> API
    API --> AUTH
    API --> RULES
    RULES --> CORE
    CORE -- "BEGIN IMMEDIATE<br/>satu transaksi per aksi" --> DB
    API -- "JSON / 403 / 409" --> UI
```

Setiap request tulis melewati tiga pemeriksaan berurutan: (1) siapa user dan apakah masih aktif, (2) apakah role/levelnya punya izin, (3) apakah aturan bisnis terpenuhi. Hanya bila ketiganya lolos, perubahan dokumen, stok, dan jurnal disimpan sekaligus dalam satu transaksi. Tombol yang disembunyikan di tampilan hanyalah kenyamanan; penegakan aturan tetap di server.

## 2. Peta modul dan alur antar-modul

```mermaid
flowchart TB
    CRM["CRM<br/>Lead → Won"] --> SQ["Sales<br/>Quotation"]
    SQ -->|"diskon > 10%"| OWN1{{"Owner<br/>approval diskon"}}
    OWN1 --> SO["Sales Order Confirmed<br/>cek kredit + reservasi"]
    SQ --> SO
    SO --> DO["Warehouse<br/>Delivery (FEFO, partial)"]
    DO -->|"jurnal COGS"| ACC[("Accounting<br/>Journal / GL")]
    DO --> INV["Invoicing<br/>Customer Invoice ≤ delivered"]
    INV -->|"AR, Revenue, PPN"| ACC
    INV --> PAY1["Register Payment<br/>partial / paid"]
    PAY1 --> ACC
    INV --> RET["Return 4 tahap<br/>Sales → Quality → Warehouse → Finance"]
    RET -->|"Credit Note, COGS reversal"| ACC

    RFQ["Purchase<br/>RFQ"] -->|"subtotal > Rp1 jt"| OWN2{{"Owner<br/>approval PO"}}
    OWN2 --> PO["Purchase Order Confirmed"]
    RFQ --> PO
    PO --> RC["Warehouse<br/>Receipt (lot, expiry)"]
    RC --> QC["Quality<br/>Pass / Fail"]
    QC -->|"accepted saja: Stock / GRNI"| ACC
    QC --> VB["Vendor Bill<br/>three-way match"]
    VB -->|"GRNI, PPN masukan, AP"| ACC
    VB --> PAY2["Register Payment"]
    PAY2 --> ACC

    ACC --> DASH["Reporting<br/>Executive Dashboard Owner"]
```

## 3. Diagram data (entitas inti)

```mermaid
erDiagram
    CUSTOMERS ||--o{ LEADS : "memiliki"
    LEADS ||--o{ LEAD_STAGE_HISTORY : "riwayat stage"
    LEADS ||--o{ LEAD_ACTIVITIES : "aktivitas"
    LEADS |o--o| SALES_ORDERS : "dikonversi"
    CUSTOMERS ||--o{ SALES_ORDERS : "memesan"
    SALES_ORDERS ||--|{ SALES_ORDER_LINES : "baris"
    SALES_ORDERS ||--o{ RESERVATIONS : "reservasi stok"
    SALES_ORDERS ||--o{ DELIVERIES : "dikirim"
    DELIVERIES ||--|{ DELIVERY_LINES : "baris"
    SALES_ORDERS ||--o{ INVOICES : "ditagih"
    INVOICES ||--|{ INVOICE_LINES : "baris"
    INVOICES ||--o{ RETURNS : "diretur"
    INVOICES ||--o{ PAYMENTS : "dibayar"
    VENDORS ||--o{ VENDOR_PRICELIST : "harga beli"
    VENDORS ||--o{ PURCHASE_ORDERS : "menerima PO"
    PURCHASE_ORDERS ||--|{ PURCHASE_ORDER_LINES : "baris"
    PURCHASE_ORDERS ||--o{ RECEIPTS : "diterima"
    RECEIPTS ||--|{ RECEIPT_LINES : "accepted / rejected"
    RECEIPTS ||--o{ LOTS : "lot + expiry"
    RECEIPTS ||--o{ VENDOR_BILLS : "dicocokkan"
    VENDOR_BILLS ||--|{ VENDOR_BILL_LINES : "ordered / accepted / billed"
    VENDOR_BILLS ||--o{ PAYMENTS : "dibayar"
    PRODUCTS ||--o{ STOCK : "per lokasi"
    WAREHOUSES ||--o{ STOCK : "menyimpan"
    PRODUCTS ||--o{ STOCK_MOVES : "pergerakan"
    WAREHOUSES ||--o{ TRANSFERS : "asal / tujuan"
    JOURNAL_ENTRIES ||--|{ JOURNAL_LINES : "debit = kredit"
    ACCOUNTS ||--o{ JOURNAL_LINES : "akun"
    ROLES ||--o{ ROLE_PERMISSIONS : "izin default"
    USERS ||--o{ USER_PERMISSIONS : "grant / revoke"

    PRODUCTS {
        text sku PK
        text name
        text size
        int sales_price
        int standard_cost
    }
    STOCK {
        text sku FK
        text warehouse_code FK
        int on_hand
    }
    SALES_ORDERS {
        int id PK
        text number "S00005..."
        text customer_code FK
        text status "Quotation, Pending Approval, Confirmed, Cancelled"
        real discount_pct
        int total
    }
    RECEIPT_LINES {
        int receipt_id FK
        text sku
        int received_qty
        int accepted_qty
        int rejected_qty
    }
    VENDOR_BILLS {
        int id PK
        text number "BILL/2026/0001..."
        text match_status "Matched, Mismatch"
        int total
    }
    JOURNAL_ENTRIES {
        int id PK
        text number "MISC00001..."
        text source_type
        int source_id
        text reference
    }
```

## 4. Aturan desain data

- **Uang** disimpan sebagai integer rupiah; PPN efektif 11% (12% × 11/12) dihitung per baris dengan pembulatan half-up (SR-14).
- **Variant SKU** adalah record produk terpisah (SR-17); stok dicatat per SKU per lokasi.
- **Available** tidak disimpan, tetapi dihitung: On Hand − Reserved aktif (SR-03/SR-04).
- **Penomoran** diambil dari tabel `sequences` di dalam transaksi yang sama dengan pembuatan dokumen; kolom nomor bersifat UNIQUE (SR-15).
- **Jejak audit**: `audit_logs` mencatat actor, waktu, aksi, nomor dokumen, dan rincian; percobaan yang ditolak juga dicatat. Perubahan stage lead disimpan di `lead_stage_history`.
- **Status sebagai pengunci idempotensi**: delivery, receipt, invoice, bill, transfer, dan retur hanya diproses bila statusnya masih sesuai (update bersyarat), sehingga klik ulang tidak membuat stock move atau jurnal kedua.
- **Baseline seed**: 749 unit stok (WH-PKU 596, OUT-MRP 153), reserved 10 pada S00004, saldo awal AR Rp1.050.000, AP Rp220.000, Bank Rp7.000.000, Inventory Rp6.314.000.

## 5. Chart of accounts

| Kode | Akun | Dipakai oleh |
|---|---|---|
| 1010 | Bank | Pembayaran customer dan vendor |
| 1020 | Cash on Hand | Saldo awal |
| 1100 | Accounts Receivable | Invoice, pembayaran, credit note |
| 1200 | Stock Valuation | Receipt, delivery, retur saleable, selisih harga beli |
| 1210 | Stock Interim Received / GRNI | Receipt dan vendor bill |
| 1300 | VAT Input | Vendor bill |
| 2100 | Accounts Payable | Vendor bill dan pembayaran vendor |
| 2200 | VAT Output | Invoice dan credit note |
| 3100 | Opening Equity | Jurnal saldo awal |
| 4100 | Sales Revenue | Invoice dan credit note |
| 4110 | Sales Discounts | Diskon pada invoice |
| 5100 | Cost of Goods Sold | Delivery dan pembalikan saat retur |
| 6100 | Quality Loss | Retur Damaged |
| 6200 | Shipping Expense | Disiapkan untuk biaya kirim |
| 6300 | Bank Charges | Disiapkan untuk biaya bank |
