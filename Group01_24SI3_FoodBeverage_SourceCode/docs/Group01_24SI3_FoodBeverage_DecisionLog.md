# Decision Log — SegarRasa ERP

**Group 01 · 24SI3 · Food & Beverage** · Pemilik keputusan (A): M1 Product Owner / Project Manager — Katherine Yap · Consulted: M2 Valentino Riffan, M3 Merlyn Angelica, M4 Edward Narto

Handout menegaskan bahwa sebagian tuntutan stakeholder tidak mungkin dipenuhi bersamaan. Setiap keputusan di bawah mencatat konflik, opsi yang ditimbang, kebijakan yang dipilih beserta fitur (F) dan layar (S), pihak yang menanggung konsekuensi dan mitigasinya, serta bukti uji (T). Format mengikuti "Format wajib Pembelaan Keputusan" pada handout.

## Ringkasan keputusan

| ID | Problem / conflict (SR) | Options considered | Decision + F/S | Trade-off + who loses | Evidence (T) |
|---|---|---|---|---|---|
| D-01 | SR-01 vs SR-02 — kapan invoice boleh dibuat | A: invoice 100% saat SO Confirmed · B: invoice ≤ qty terkirim yang belum ditagih | **B**. F-09, F-08 · S-07, S-08 | Sales/pelanggan menunggu tagihan untuk backorder · mitigasi: invoice parsial per pengiriman | T-14, T-16 |
| D-02 | SR-03 vs SR-04 — stok negatif saat pelanggan mendesak | A: izinkan Available negatif s.d. 5 · B: blokir di atas Available, jangan pakai reservasi pesanan lain | **B**. F-07, F-08 · S-06, S-07 | Sales kehilangan penjualan instan · mitigasi: partial delivery + backorder, transfer dari outlet, PO | T-12, T-13 |
| D-03 | SR-05 vs SR-06 — tagihan vendor atas barang rusak | A: bill sesuai ordered qty · B: bill ≤ accepted qty, three-way match, selisih ditandai | **B**. F-14, F-12, F-13 · S-12 | Procurement/vendor: pembayaran tertunda sampai Mismatch diselesaikan · mitigasi: tombol Resolve tagih sebatas accepted | T-24, T-23 |
| D-04 | SR-07 vs SR-08 — diskon 20% dan revisi harga setelah confirm | A: Sales bebas diskon 20% dan edit harga · B: diskon > 10% butuh Owner, harga terkunci setelah confirm, ubah lewat revisi | **B** (diskon maks 20% tetap dimungkinkan dengan approval). F-06 · S-05 | Sales kehilangan fleksibilitas negosiasi cepat · mitigasi: approval Owner langsung muncul di dashboard; revisi cancel & copy | T-10 |
| D-05 | SR-09 — dasar perhitungan batas kredit | A: hanya saldo invoice · B: AR terbuka + SO Confirmed belum ditagih (termasuk PPN), tanpa hitung ganda | **B**. F-10, F-02 · S-02, S-06 | Sales: pesanan pelanggan berutang besar tertahan · mitigasi: headroom terlihat di form kontak; Finance dapat menaikkan limit | T-03, T-04, T-09 |
| D-06 | SR-11 — barang datang langsung masuk stok vs wajib QC | A: Receipt langsung menambah stok · B: stok bertambah hanya qty Pass setelah QC | **B**. F-12, F-13 · S-10, S-11 | Warehouse: barang belum bisa dijual sebelum QC · mitigasi: antrean QC terlihat di dashboard Quality | T-19, T-21, T-22 |
| D-07 | SR-20 — PO besar perlu dicek pemilik | A: semua PO langsung confirmed · B: subtotal > Rp1.000.000 Pending Approval Owner, approval terekam | **B**. F-22, F-11 · S-09 | Procurement: konfirmasi vendor tertunda · mitigasi: PO ≤ Rp1 juta tetap langsung; approval di satu daftar | T-18 |
| D-08 | SR-16 — Owner ingin melihat semua vs pemisahan tugas | A: Owner super-user (boleh posting & edit) · B: Owner lihat semua + approval, tidak posting; Admin kelola user tapi bukan pelaku transaksi | **B**. F-01 · S-01 | Owner tidak bisa "membereskan sendiri" transaksi · mitigasi: dashboard yang dapat ditelusuri, approval cepat | T-01, T-02 |
| D-09 | SR-18/SR-19 — pipeline penjualan vs pengakuan pendapatan | A: Won/SO Confirmed dihitung sebagai revenue · B: revenue hanya dari invoice Posted | **B**. F-04, F-19 · S-04, S-17 | Sales: target terlihat lebih kecil di dashboard · mitigasi: KPI terpisah "SO confirmed belum ditagih" | T-07, T-08, T-34 |
| D-10 | SR-15 — klik ulang / koneksi lambat | A: andalkan user tidak klik dua kali · B: Validated/Posted/Paid idempotent lewat update bersyarat status, nomor unik | **B**. F-15, F-20 · S-13, S-18 | Tidak ada pihak dirugikan; biaya: logika status lebih ketat | T-26, T-30, T-32, T-36 |
| D-11 | SR-13 — retur harus mengembalikan barang dan tagihan | A: retur hanya mengurangi AR · B: retur 4 tahap, cap net delivered − retur sebelumnya, Saleable kembali stok, Damaged ke Quality Loss, Credit Note membalik dasar + PPN | **B**. F-18 · S-16 | Proses lebih panjang (4 peran) · mitigasi: urutan dipandu status, tiap peran hanya melihat tombolnya | T-31, T-32 |
| D-12 | SR-14 — pembulatan PPN | A: pembulatan per dokumen · B: per baris, half-up, efektif 11% = 12% × 11/12 | **B**. F-21 · S-08 | Selisih pembulatan beberapa rupiah dibanding per dokumen · mitigasi: aturan sama untuk penjualan dan pembelian | T-09, T-15 |
| D-13 | SR-12 — stok outlet vs gudang pusat | A: satu angka stok perusahaan · B: stok per lokasi, transfer menurunkan asal & menaikkan tujuan, nilai agregat tetap | **B**. F-17 · S-15 | Outlet harus mengajukan transfer saat stok menipis · mitigasi: reorder point per lokasi di dashboard | T-29, T-30 |

---

## Rincian keputusan

### D-01 · Invoice hanya untuk barang yang sudah keluar gudang
**Konflik.** Dimas (Sales, SR-01) ingin seluruh 8 botol langsung ditagih saat SO Confirmed agar pelanggan cepat menerima faktur. Sari (Finance, SR-02) hanya mau piutang atas barang yang benar-benar keluar gudang.
**Opsi.** (A) invoice 100% ordered qty saat confirm; (B) invoice maksimal delivered qty yang belum pernah ditagih.
**Keputusan.** B. Endpoint pembuatan invoice menghitung `delivered − sudah ditagih` per SKU dan menolak jumlah di atasnya (HTTP 409, menampilkan qty yang boleh ditagih).
**Alasan.** Menagih barang yang belum dikirim membuat piutang dan pendapatan tidak didukung bukti pengiriman, berisiko sengketa dengan pelanggan dan salah saji laporan.
**Yang dirugikan + mitigasi.** Sales dan pelanggan menunggu faktur untuk sisa backorder. Mitigasi: invoice parsial boleh dibuat setiap kali ada pengiriman.
**Dampak bila dibalik.** AR membengkak tanpa dasar barang; retur dan kredit menjadi rumit; T-14 dan T-16 gagal.

### D-02 · Tidak ada stok negatif, reservasi pesanan lain dilindungi
**Konflik.** SR-03 meminta pesanan 45 botol tetap dipenuhi meski Available 40; SR-04 melarang stok negatif dan pemakaian reservasi pesanan lain.
**Keputusan.** B. Confirm SO dan validasi Delivery menolak qty di atas Available = On Hand − Reserved. Lot dikeluarkan dengan FEFO.
**Yang dirugikan + mitigasi.** Sales kehilangan penjualan instan 5 botol. Mitigasi: kirim sebagian dengan backorder, transfer dari OUT-MRP, atau buat RFQ.
**Dampak bila dibalik.** Pesanan S00004 yang sudah ber-reservasi bisa gagal dikirim; nilai persediaan dan COGS menjadi negatif.

### D-03 · Vendor hanya dibayar untuk barang yang lolos QC
**Konflik.** Nina (Procurement, SR-05) ingin bill atas seluruh 12 botol agar pembayaran vendor cepat; Sari (SR-06) tidak mau membayar botol yang ditolak Quality.
**Keputusan.** B. Vendor Bill dibuat dari Receipt; billed qty dibatasi accepted qty. Bila vendor mengklaim lebih, status **Mismatch** dan posting diblokir sampai Finance memilih "Resolve: tagih sebatas accepted".
**Yang dirugikan + mitigasi.** Vendor dan Procurement (pembayaran tertunda). Mitigasi: catatan selisih otomatis sebagai dasar klaim/retur ke vendor.
**Bukti angka.** PO00003: diterima 12, lolos 10 → bill Rp150.000 + PPN Rp16.500 = Rp166.500; AP Rp220.000 → Rp386.500 (T-23).

### D-04 · Diskon besar perlu Owner, harga terkunci setelah confirm
**Konflik.** SR-07 menginginkan promo hingga 20% dan revisi harga setelah confirm; SR-08 meminta angka terkunci agar laporan konsisten.
**Keputusan.** B dengan kompromi: diskon tetap boleh hingga 20%, tetapi di atas 10% quotation otomatis **Pending Approval** dan hanya bisa dikonfirmasi setelah Owner menyetujui. Setelah Confirmed, harga/diskon terkunci; perubahan lewat **Revisi (cancel & copy)** yang membatalkan SO lama, melepas reservasi, dan tercatat di audit.
**Yang dirugikan + mitigasi.** Sales kehilangan kecepatan negosiasi. Mitigasi: daftar approval di Executive Dashboard Owner.

### D-05 · Credit exposure memasukkan SO yang belum ditagih
**Keputusan.** Exposure = saldo awal AR + invoice Posted belum lunas (dikurangi pembayaran dan credit note) + nilai SO Confirmed yang belum ditagih termasuk PPN. Bagian SO yang sudah diinvoice tidak dihitung dua kali. Confirm diblokir bila exposure + pesanan baru melebihi credit limit.
**Bukti angka.** C01: AR Rp400.000 + S00004 Rp166.500 = Rp566.500, headroom Rp1.433.500 (T-03). C02 dengan 30 × BVG-500-PCH ditolak; status tetap Quotation (T-04).

### D-06 · Quality sebagai gerbang stok
**Keputusan.** Receipt berstatus Waiting sampai Quality mengisi Pass/Fail. Validasi Warehouse hanya menambah qty accepted; rejected tercatat terpisah dan tidak menambah stok maupun nilai persediaan. Pihak lain (misalnya Procurement) tidak bisa mengubah accepted qty yang sudah diputuskan QC.
**Bukti.** PO00003: 10 Pass / 2 Fail → stok WH-PKU 30 → 40, +Rp150.000; rejected value potensial Rp30.000 tidak masuk stok (T-19, T-21); override ditolak dan tercatat (T-22).

### D-07 · Approval Owner untuk PO di atas Rp1.000.000
**Keputusan.** Batas dibandingkan dengan **subtotal sebelum pajak**, sesuai SR-20. Procurement tidak dapat menyetujui sendiri (403). Approval menyimpan `approved_by` dan `approved_at`.
**Bukti.** PO V01 70 × BVG-500-LEM subtotal Rp1.050.000 → Pending Approval → approve Owner → Confirmed (T-18).

### D-08 · Pemisahan peran Owner dan Master Admin
**Konflik.** Ratna (Owner, SR-16) ingin setiap orang hanya melihat yang dibutuhkan, tetapi Owner sendiri ingin melihat semua.
**Keputusan.** Owner dapat membuka seluruh modul dan memberi approval, tetapi tidak memposting jurnal/transaksi. Master Admin mengelola user, role, dan hak akses per orang, tetapi bukan pelaku transaksi atau approval. Non-Finance tidak dapat membuka detail ledger (403, tercatat di audit).
**Alasan.** Yang menyetujui transaksi dipisahkan dari yang mengatur hak akses dan dari yang mengeksekusi transaksi (segregation of duties).

### D-09 · Revenue hanya dari invoice yang diposting
**Keputusan.** Perpindahan stage lead ke Won dan SO Confirmed tidak membuat jurnal maupun revenue. Dashboard memisahkan "revenue posted" dan "SO confirmed belum ditagih".
**Bukti.** Baseline: revenue Rp0, uninvoiced confirmed Rp166.500 (T-34); CRM00009 Won tetap revenue Rp0 (T-07).

### D-10 · Idempotensi aksi
**Keputusan.** Setiap aksi Validate/Post/Paid memakai update bersyarat (hanya berlaku bila status masih sesuai), dijalankan dalam satu transaksi `BEGIN IMMEDIATE`. Klik kedua dibalas "idempotent" tanpa stock move atau jurnal tambahan. Nomor dokumen diambil dari tabel sequence dalam transaksi yang sama dan bersifat unik.

### D-11 · Retur empat tahap
**Keputusan.** Sales mengajukan → Quality inspeksi (Saleable/Damaged) → Warehouse memproses stock move → Finance membuat Credit Note dan penyesuaian AR. Langkah tidak bisa dilompati. Batas retur = net delivered − retur sebelumnya.
**Bukti.** Retur 2 dari 6 Lemon: credit net Rp30.000 + PPN Rp3.300 = Rp33.300, stok kembali 2, COGS reversal Rp18.000 (T-31). Retur 7 ditolak (cap 6); Credit Note ganda tidak terbentuk (T-32).

### D-12 · Pajak per baris
**Keputusan.** PPN efektif 11% (12% × 11/12) dihitung dan dibulatkan half-up per baris untuk invoice maupun vendor bill; harga produk belum termasuk pajak.

### D-13 · Stok per lokasi
**Keputusan.** Stok outlet dan gudang pusat dicatat terpisah. Internal Transfer memindahkan qty tanpa jurnal karena nilai persediaan perusahaan tidak berubah.
**Bukti.** TEA-350-ORI WH 60 → 55, OUT 18 → 23, nilai stok tetap Rp6.314.000 (T-29).

---

## Keputusan implementasi tambahan (di luar konflik SR)

| ID | Keputusan | Alasan |
|---|---|---|
| I-01 | Level **Manager** dan **Staff** untuk setiap role bisnis; Staff hanya melihat dokumen miliknya | Membatasi akses data sesuai SR-16 tanpa menambah role baru |
| I-02 | Variant SKU baru dibuat oleh **Procurement** (dan Master Admin), stok awal 0 | Procurement pertama kali berurusan dengan barang baru dari vendor; stok hanya bertambah lewat Receipt (SR-11) |
| I-03 | COGS dicatat saat **delivery** dengan **standard cost** | Mengikuti handout; konsekuensinya laba Sales dapat sementara minus antara delivery dan posting invoice |
| I-04 | Deployment di PythonAnywhere dengan SQLite | Gratis, disk permanen, HTTPS; data persisten setelah refresh. Batasan skala dicatat sebagai rekomendasi |
| I-05 | Akun uji tidak ditampilkan di halaman login maupun README | Kredensial diberikan terpisah kepada dosen sesuai Paket Penyerahan poin 1 |

## Fitur yang dipangkas atau ditunda (dan pembelaannya)

| Fitur | Status | Pembelaan |
|---|---|---|
| POS dan manajemen kas kasir | Tidak dibangun | Studi kasus berfokus pada distribusi B2B (koperasi, kedai, grosir, event organizer) lewat Quotation/SO |
| Stock opname / inventory adjustment | Ditunda | Butuh alur approval tersendiri agar koreksi stok tidak menjadi celah manipulasi |
| Pencatatan biaya operasional (akun 6200/6300) | Ditunda | Tidak termasuk F-01–F-23; konsekuensinya Warehouse/Finance di Profit per Departemen bernilai Rp0 |
| Pembayaran terhadap saldo awal AR/AP | Ditunda | Handout mengukur pembayaran atas invoice/bill yang diposting (F-16) |
