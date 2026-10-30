import { UserRole } from '../types';

export interface NavItem {
  id: string;
  name: string;
  screenId: string;
  path: string;
  icon: string;
  allowedRoles: UserRole[];
  moduleGroup: string;
  description: string;
  isQuickApp?: boolean;
}

export const ERP_NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    name: 'Beranda App Switcher',
    screenId: 'S-01',
    path: '/',
    icon: 'LayoutGrid',
    allowedRoles: ['sales', 'warehouse', 'procurement', 'finance', 'quality', 'owner'],
    moduleGroup: 'Core',
    description: 'Beranda sistem ERP & peluncur aplikasi terpadu',
    isQuickApp: true
  },
  {
    id: 'contacts',
    name: 'Kontak Pelanggan & Vendor',
    screenId: 'S-02',
    path: '/contacts',
    icon: 'Users',
    allowedRoles: ['sales', 'finance', 'procurement', 'owner'],
    moduleGroup: 'Sales & Contacts',
    description: 'Master pelanggan, batas kredit, terms, dan saldo AR',
    isQuickApp: true
  },
  {
    id: 'products',
    name: 'Katalog Varian Produk (15 SKU)',
    screenId: 'S-03',
    path: '/products',
    icon: 'Package',
    allowedRoles: ['sales', 'warehouse', 'procurement', 'finance', 'quality', 'owner'],
    moduleGroup: 'Master Data',
    description: '15 SKU unik varian minuman dan camilan kemasan',
    isQuickApp: true
  },
  {
    id: 'crm',
    name: 'CRM Pipeline & Lead',
    screenId: 'S-04',
    path: '/crm',
    icon: 'Kanban',
    allowedRoles: ['sales', 'owner'],
    moduleGroup: 'Sales',
    description: 'Pelacakan prospek pelanggan (New → Qualified → Won)',
    isQuickApp: true
  },
  {
    id: 'sales',
    name: 'Quotation & Sales Order',
    screenId: 'S-05',
    path: '/sales',
    icon: 'FileText',
    allowedRoles: ['sales', 'owner'],
    moduleGroup: 'Sales',
    description: 'Penawaran harga, pesanan penjualan, diskon, & pajak',
    isQuickApp: true
  },
  {
    id: 'reservation',
    name: 'Reservasi Stok & Gerbang Kredit',
    screenId: 'S-06',
    path: '/reservation',
    icon: 'ShieldAlert',
    allowedRoles: ['sales', 'warehouse', 'finance', 'owner'],
    moduleGroup: 'Sales & Inventory',
    description: 'Pengecekan alokasi stok (Available = On Hand - Reserved) & Plafon Kredit',
    isQuickApp: false
  },
  {
    id: 'delivery',
    name: 'Pengiriman & Backorder',
    screenId: 'S-07',
    path: '/delivery',
    icon: 'Truck',
    allowedRoles: ['warehouse', 'sales', 'owner'],
    moduleGroup: 'Inventory',
    description: 'Validasi surat jalan, pengiriman parsial, dan backorder',
    isQuickApp: true
  },
  {
    id: 'customer_invoices',
    name: 'Faktur Penjualan (Invoices)',
    screenId: 'S-08',
    path: '/customer-invoices',
    icon: 'Receipt',
    allowedRoles: ['finance', 'sales', 'owner'],
    moduleGroup: 'Invoicing',
    description: 'Faktur penjualan berbasis kuantitas terkirim (Delivered)',
    isQuickApp: true
  },
  {
    id: 'purchase',
    name: 'Pengadaan & Purchase Order',
    screenId: 'S-09',
    path: '/purchase',
    icon: 'ShoppingBag',
    allowedRoles: ['procurement', 'owner'],
    moduleGroup: 'Purchase',
    description: 'Permintaan penawaran, PO, & gerbang approval Owner > Rp1 Jt',
    isQuickApp: true
  },
  {
    id: 'receipts',
    name: 'Penerimaan Barang Gudang',
    screenId: 'S-10',
    path: '/receipts',
    icon: 'Inbox',
    allowedRoles: ['warehouse', 'quality', 'owner'],
    moduleGroup: 'Inventory',
    description: 'Pencatatan penerimaan fisik dari PO dan integrasi QC',
    isQuickApp: true
  },
  {
    id: 'quality',
    name: 'Pemeriksaan Kualitas (QC)',
    screenId: 'S-11',
    path: '/quality',
    icon: 'CheckCircle2',
    allowedRoles: ['quality', 'warehouse', 'owner'],
    moduleGroup: 'Quality',
    description: 'Inspeksi barang masuk: Pass vs Fail, isolasi kemasan rusak',
    isQuickApp: true
  },
  {
    id: 'vendor_bills',
    name: 'Tagihan Vendor (3-Way Match)',
    screenId: 'S-12',
    path: '/vendor-bills',
    icon: 'FileSpreadsheet',
    allowedRoles: ['finance', 'procurement', 'owner'],
    moduleGroup: 'Accounting',
    description: 'Pencocokan 3-Way Match (PO - Penerimaan QC - Tagihan)',
    isQuickApp: true
  },
  {
    id: 'accounting',
    name: 'Buku Besar & Jurnal Umum',
    screenId: 'S-13',
    path: '/accounting',
    icon: 'BookOpen',
    allowedRoles: ['finance', 'owner'],
    moduleGroup: 'Accounting',
    description: 'Entri jurnal berpasangan otomatis, COGS, dan neraca saldo',
    isQuickApp: true
  },
  {
    id: 'payments',
    name: 'Registrasi Pembayaran',
    screenId: 'S-14',
    path: '/payments',
    icon: 'CreditCard',
    allowedRoles: ['finance', 'owner'],
    moduleGroup: 'Accounting',
    description: 'Penerimaan & pengeluaran kas/bank, pembayaran parsial',
    isQuickApp: false
  },
  {
    id: 'transfers',
    name: 'Transfer Stok Internal',
    screenId: 'S-15',
    path: '/transfers',
    icon: 'ArrowLeftRight',
    allowedRoles: ['warehouse', 'owner'],
    moduleGroup: 'Inventory',
    description: 'Mutasi stok WH-PKU ke OUT-MRP tanpa mengubah nilai konsolidasi',
    isQuickApp: false
  },
  {
    id: 'returns',
    name: 'Retur & Nota Kredit',
    screenId: 'S-16',
    path: '/returns',
    icon: 'RotateCcw',
    allowedRoles: ['warehouse', 'finance', 'owner'],
    moduleGroup: 'Inventory & Accounting',
    description: 'Pengembalian barang layak jual, pemulihan COGS & Nota Kredit',
    isQuickApp: false
  },
  {
    id: 'reporting',
    name: 'Dasbor KPI Eksekutif',
    screenId: 'S-17',
    path: '/reporting',
    icon: 'BarChart3',
    allowedRoles: ['owner', 'finance', 'warehouse'],
    moduleGroup: 'Reporting',
    description: 'Rekonsiliasi lintas modul dan pelacakan metrik operasional',
    isQuickApp: true
  },
  {
    id: 'audit',
    name: 'Jejak Audit & Relasi Dokumen',
    screenId: 'S-18',
    path: '/audit',
    icon: 'History',
    allowedRoles: ['sales', 'warehouse', 'procurement', 'finance', 'quality', 'owner'],
    moduleGroup: 'Core',
    description: 'Grafik hubungan antardokumen dan riwayat aktivitas aktor',
    isQuickApp: false
  }
];

export const canRoleAccess = (role: UserRole, screenId: string): boolean => {
  if (role === 'owner') return true; // OWNER CAN VIEW ALL MODULES & DATA
  const item = ERP_NAV_ITEMS.find(n => n.screenId === screenId);
  if (!item) return false;
  return item.allowedRoles.includes(role);
};
