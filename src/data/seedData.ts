import { Customer, Vendor, Product, WarehouseLocation, StockEntry, Account, CRMLead, SalesOrder, PurchaseOrder, AuditRecord } from '../types';

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'C01', name: 'Toko Melati', type: 'Business', city: 'Pekanbaru', credit_limit: 2000000, payment_terms: 'NET14', opening_ar: 400000 },
  { id: 'C02', name: 'Resto Pagi Segar', type: 'Business', city: 'Pekanbaru', credit_limit: 1000000, payment_terms: 'NET07', opening_ar: 650000 },
  { id: 'C03', name: 'Koperasi Sekolah Hijau', type: 'Business', city: 'Kampar', credit_limit: 900000, payment_terms: 'NET30', opening_ar: 0 },
  { id: 'C04', name: 'Kedai Riau Jaya', type: 'Business', city: 'Pekanbaru', credit_limit: 600000, payment_terms: 'COD', opening_ar: 0 },
  { id: 'C05', name: 'PT Mitra Event Nusantara', type: 'Business', city: 'Dumai', credit_limit: 3000000, payment_terms: 'NET14', opening_ar: 0 },
  { id: 'C06', name: 'Grosir Berkah', type: 'Business', city: 'Siak', credit_limit: 1500000, payment_terms: 'NET21', opening_ar: 0 }
];

export const INITIAL_VENDORS: Vendor[] = [
  { id: 'V01', name: 'PT Rasa Sejuk Nusantara', city: 'Pekanbaru', payment_terms: 'NET14', tax_status: 'PKP' },
  { id: 'V02', name: 'CV Tirta Teh Kopi', city: 'Kampar', payment_terms: 'NET21', tax_status: 'PKP' },
  { id: 'V03', name: 'PT Air Bersih Riau', city: 'Pekanbaru', payment_terms: 'NET14', tax_status: 'PKP' },
  { id: 'V04', name: 'CV Cemilan Bahagia', city: 'Siak', payment_terms: 'NET30', tax_status: 'PKP' }
];

export const INITIAL_PRODUCTS: Product[] = [
  { variant_sku: 'BVG-250-LEM', name: 'Sparkling Lemon', size: '250 ml', color: 'Kuning', unit: 'botol', sales_price: 15000, standard_cost: 9000, default_vendor: 'V01' },
  { variant_sku: 'BVG-250-PCH', name: 'Sparkling Peach', size: '250 ml', color: 'Oranye', unit: 'botol', sales_price: 16000, standard_cost: 10000, default_vendor: 'V01' },
  { variant_sku: 'BVG-500-LEM', name: 'Sparkling Lemon', size: '500 ml', color: 'Kuning', unit: 'botol', sales_price: 25000, standard_cost: 15000, default_vendor: 'V01' },
  { variant_sku: 'BVG-500-PCH', name: 'Sparkling Peach', size: '500 ml', color: 'Oranye', unit: 'botol', sales_price: 26000, standard_cost: 16000, default_vendor: 'V01' },
  { variant_sku: 'TEA-350-ORI', name: 'Teh Daun', size: '350 ml', color: 'Cokelat', unit: 'botol', sales_price: 12000, standard_cost: 7000, default_vendor: 'V02' },
  { variant_sku: 'TEA-350-LYC', name: 'Teh Leci', size: '350 ml', color: 'Bening', unit: 'botol', sales_price: 14000, standard_cost: 8000, default_vendor: 'V02' },
  { variant_sku: 'COF-250-LAT', name: 'Kopi Latte', size: '250 ml', color: 'Krem', unit: 'kaleng', sales_price: 22000, standard_cost: 13000, default_vendor: 'V02' },
  { variant_sku: 'COF-250-MOC', name: 'Kopi Mocha', size: '250 ml', color: 'Cokelat', unit: 'kaleng', sales_price: 23000, standard_cost: 14000, default_vendor: 'V02' },
  { variant_sku: 'WTR-600-PLN', name: 'Air Mineral', size: '600 ml', color: 'Bening', unit: 'botol', sales_price: 7000, standard_cost: 3000, default_vendor: 'V03' },
  { variant_sku: 'WTR-1500-PLN', name: 'Air Mineral', size: '1.500 ml', color: 'Bening', unit: 'botol', sales_price: 12000, standard_cost: 6000, default_vendor: 'V03' },
  { variant_sku: 'SNK-060-BBQ', name: 'Keripik BBQ', size: '60 g', color: 'Merah', unit: 'pak', sales_price: 10000, standard_cost: 6000, default_vendor: 'V04' },
  { variant_sku: 'SNK-060-SEA', name: 'Keripik Rumput Laut', size: '60 g', color: 'Hijau', unit: 'pak', sales_price: 10000, standard_cost: 6000, default_vendor: 'V04' },
  { variant_sku: 'SNK-120-BBQ', name: 'Keripik BBQ', size: '120 g', color: 'Merah', unit: 'pak', sales_price: 18000, standard_cost: 11000, default_vendor: 'V04' },
  { variant_sku: 'NUT-080-HNY', name: 'Kacang Madu', size: '80 g', color: 'Emas', unit: 'pak', sales_price: 19000, standard_cost: 12000, default_vendor: 'V04' },
  { variant_sku: 'BIS-090-CHO', name: 'Biskuit Cokelat', size: '90 g', color: 'Cokelat', unit: 'pak', sales_price: 17000, standard_cost: 10000, default_vendor: 'V04' }
];

export const INITIAL_LOCATIONS: WarehouseLocation[] = [
  { location_code: 'WH-PKU', name: 'Gudang Utama Pekanbaru', city: 'Pekanbaru', type: 'Internal Warehouse' },
  { location_code: 'OUT-MRP', name: 'Titik Ambil Marpoyan', city: 'Pekanbaru', type: 'Internal Outlet' }
];

export const INITIAL_STOCK: StockEntry[] = [
  { variant_sku: 'BVG-250-LEM', wh_qty: 50, out_qty: 12, total_qty: 62, standard_value: 558000 },
  { variant_sku: 'BVG-250-PCH', wh_qty: 32, out_qty: 8, total_qty: 40, standard_value: 400000 },
  { variant_sku: 'BVG-500-LEM', wh_qty: 30, out_qty: 10, total_qty: 40, standard_value: 600000 },
  { variant_sku: 'BVG-500-PCH', wh_qty: 28, out_qty: 6, total_qty: 34, standard_value: 544000 },
  { variant_sku: 'TEA-350-ORI', wh_qty: 60, out_qty: 18, total_qty: 78, standard_value: 546000 },
  { variant_sku: 'TEA-350-LYC', wh_qty: 48, out_qty: 12, total_qty: 60, standard_value: 480000 },
  { variant_sku: 'COF-250-LAT', wh_qty: 26, out_qty: 8, total_qty: 34, standard_value: 442000 },
  { variant_sku: 'COF-250-MOC', wh_qty: 24, out_qty: 5, total_qty: 29, standard_value: 406000 },
  { variant_sku: 'WTR-600-PLN', wh_qty: 100, out_qty: 20, total_qty: 120, standard_value: 360000 },
  { variant_sku: 'WTR-1500-PLN', wh_qty: 45, out_qty: 10, total_qty: 55, standard_value: 330000 },
  { variant_sku: 'SNK-060-BBQ', wh_qty: 42, out_qty: 14, total_qty: 56, standard_value: 336000 },
  { variant_sku: 'SNK-060-SEA', wh_qty: 35, out_qty: 9, total_qty: 44, standard_value: 264000 },
  { variant_sku: 'SNK-120-BBQ', wh_qty: 22, out_qty: 6, total_qty: 28, standard_value: 308000 },
  { variant_sku: 'NUT-080-HNY', wh_qty: 20, out_qty: 5, total_qty: 25, standard_value: 300000 },
  { variant_sku: 'BIS-090-CHO', wh_qty: 34, out_qty: 10, total_qty: 44, standard_value: 440000 }
];

export const INITIAL_ACCOUNTS: Account[] = [
  { account_code: '1010', account_name: 'Bank', type: 'Asset', normal_balance: 'Debit', balance: 7000000 },
  { account_code: '1020', account_name: 'Cash on Hand', type: 'Asset', normal_balance: 'Debit', balance: 0 },
  { account_code: '1100', account_name: 'Accounts Receivable', type: 'Asset', normal_balance: 'Debit', balance: 1050000 },
  { account_code: '1200', account_name: 'Stock Valuation', type: 'Asset', normal_balance: 'Debit', balance: 6314000 },
  { account_code: '1210', account_name: 'Stock Interim Received / GRNI', type: 'Liability', normal_balance: 'Credit', balance: 0 },
  { account_code: '1300', account_name: 'VAT Input', type: 'Asset', normal_balance: 'Debit', balance: 0 },
  { account_code: '2100', account_name: 'Accounts Payable', type: 'Liability', normal_balance: 'Credit', balance: 220000 },
  { account_code: '2200', account_name: 'VAT Output', type: 'Liability', normal_balance: 'Credit', balance: 0 },
  { account_code: '3100', account_name: 'Opening Equity', type: 'Equity', normal_balance: 'Credit', balance: 14144000 },
  { account_code: '4100', account_name: 'Sales Revenue', type: 'Revenue', normal_balance: 'Credit', balance: 0 },
  { account_code: '4110', account_name: 'Sales Discounts', type: 'Contra Revenue', normal_balance: 'Debit', balance: 0 },
  { account_code: '5100', account_name: 'Cost of Goods Sold', type: 'Expense', normal_balance: 'Debit', balance: 0 },
  { account_code: '6100', account_name: 'Quality Loss', type: 'Expense', normal_balance: 'Debit', balance: 0 },
  { account_code: '6200', account_name: 'Shipping Expense', type: 'Expense', normal_balance: 'Debit', balance: 0 },
  { account_code: '6300', account_name: 'Bank Charges', type: 'Expense', normal_balance: 'Debit', balance: 0 }
];

export const INITIAL_CRM_LEADS: CRMLead[] = [
  {
    id: 'CRM00009',
    customer_id: 'C03',
    customer_name: 'Koperasi Sekolah Hijau',
    expected_sku: 'BVG-250-LEM',
    quantity: 30,
    stage: 'Qualified',
    created_at: '2026-10-01 08:30 WIB',
    history: ['Tahap dibuat: New (01/10/2026)', 'Tahap diperbarui: Qualified (01/10/2026)']
  }
];

export const INITIAL_SALES_ORDERS: SalesOrder[] = [
  {
    id: 'S00004',
    customer_id: 'C01',
    customer_name: 'Toko Melati',
    date: '2026-10-01',
    status: 'Sales Order',
    is_confirmed: true,
    lines: [
      {
        id: 'L01',
        variant_sku: 'BVG-250-LEM',
        name: 'Sparkling Lemon 250 ml',
        quantity: 10,
        unit_price: 15000,
        discount_pct: 0,
        subtotal: 150000,
        tax_amount: 16500, // 150000 * 11% = 16500
        total: 166500
      }
    ],
    untaxed_amount: 150000,
    tax_amount: 16500,
    total_amount: 166500,
    revision_history: [
      { actor: 'seed', timestamp: '2026-10-01 09:00 WIB', action: 'Confirmed + reserved 10 unit BVG-250-LEM di WH-PKU' }
    ]
  }
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO00003',
    vendor_id: 'V01',
    vendor_name: 'PT Rasa Sejuk Nusantara',
    date: '2026-10-01',
    currency: 'IDR',
    status: 'Purchase Order',
    is_confirmed: true,
    needs_owner_approval: false,
    lines: [
      {
        id: 'POL01',
        variant_sku: 'BVG-500-LEM',
        name: 'Sparkling Lemon 500 ml',
        quantity: 12,
        unit_cost: 15000,
        subtotal: 180000,
        tax_amount: 19800, // 180000 * 11% = 19800
        gross_amount: 199800
      }
    ],
    untaxed_amount: 180000,
    tax_amount: 19800,
    gross_amount: 199800
  }
];

export const INITIAL_AUDIT_LOGS: AuditRecord[] = [
  {
    id: 'AUD001',
    document_id: 'S00004',
    actor: 'seed / Sales',
    action: 'Confirmed + reserve',
    timestamp: '01/10/2026 09:00 WIB',
    reference: 'S00004 · stock reservation',
    linked_docs: 'CRM → SO → DO → Invoice',
    post_count: 1,
    details: 'Initial seed reservation for 10 units BVG-250-LEM at WH-PKU'
  }
];
