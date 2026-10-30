import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User, UserRole, Customer, Vendor, Product, StockEntry, Account,
  CRMLead, SalesOrder, DeliveryOrder, CustomerInvoice, PurchaseOrder,
  Receipt, QualityCheck, VendorBill, JournalEntry, StockTransfer,
  CustomerReturn, AuditRecord
} from '../types';
import {
  INITIAL_CUSTOMERS, INITIAL_VENDORS, INITIAL_PRODUCTS, INITIAL_STOCK,
  INITIAL_ACCOUNTS, INITIAL_CRM_LEADS, INITIAL_SALES_ORDERS,
  INITIAL_PURCHASE_ORDERS, INITIAL_AUDIT_LOGS
} from '../data/seedData';

export const DEMO_USERS: Record<UserRole, User> = {
  sales: {
    id: 'U-SALES',
    name: 'Dimas Saputra',
    email: 'sales@segarrasa.id',
    role: 'sales',
    title: 'Manajer Penjualan (Sales Manager)',
    avatarColor: 'bg-emerald-600'
  },
  warehouse: {
    id: 'U-WH',
    name: 'Yusuf Hidayat',
    email: 'warehouse@segarrasa.id',
    role: 'warehouse',
    title: 'Kepala Gudang & Logistik',
    avatarColor: 'bg-blue-600'
  },
  procurement: {
    id: 'U-PROC',
    name: 'Nina Febriana',
    email: 'procurement@segarrasa.id',
    role: 'procurement',
    title: 'Manajer Pengadaan (Procurement)',
    avatarColor: 'bg-purple-600'
  },
  finance: {
    id: 'U-FIN',
    name: 'Sari Permata',
    email: 'finance@segarrasa.id',
    role: 'finance',
    title: 'Kepala Akuntansi & Keuangan',
    avatarColor: 'bg-amber-600'
  },
  quality: {
    id: 'U-QC',
    name: 'Tika Maharani',
    email: 'quality@segarrasa.id',
    role: 'quality',
    title: 'Koordinator Quality Control',
    avatarColor: 'bg-rose-600'
  },
  owner: {
    id: 'U-OWNER',
    name: 'Ratna Putri',
    email: 'owner@segarrasa.id',
    role: 'owner',
    title: 'Direktur Utama & Pemilik Perusahaan',
    avatarColor: 'bg-brand-800'
  }
};

interface ErpContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  switchRole: (role: UserRole) => void;
  logout: () => void;

  customers: Customer[];
  vendors: Vendor[];
  products: Product[];
  stock: StockEntry[];
  reservations: Record<string, { 'WH-PKU': number; 'OUT-MRP': number }>;
  accounts: Account[];
  crmLeads: CRMLead[];
  salesOrders: SalesOrder[];
  deliveryOrders: DeliveryOrder[];
  customerInvoices: CustomerInvoice[];
  purchaseOrders: PurchaseOrder[];
  receipts: Receipt[];
  qualityChecks: QualityCheck[];
  vendorBills: VendorBill[];
  journalEntries: JournalEntry[];
  stockTransfers: StockTransfer[];
  customerReturns: CustomerReturn[];
  auditLogs: AuditRecord[];

  // Helper calculations
  calculateCreditExposure: (customerId: string) => {
    openingAr: number;
    uninvoicedSo: number;
    totalExposure: number;
    creditLimit: number;
    headroom: number;
  };
  getStockLevel: (sku: string, location: 'WH-PKU' | 'OUT-MRP') => {
    onHand: number;
    reserved: number;
    available: number;
  };
  getAggregateStock: (sku?: string) => {
    onHand: number;
    reserved: number;
    available: number;
    totalValue: number;
  };
  getDashboardKpi: () => {
    stockOnHand: number;
    reserved: number;
    available: number;
    stockValuation: number;
    openSO: number;
    openPO: number;
    openLead: number;
    totalAR: number;
    totalAP: number;
    bankBalance: number;
    newRevenue: number;
  };

  // Actions
  createQuotation: (so: Partial<SalesOrder>) => SalesOrder;
  confirmSalesOrder: (soId: string, actor: string) => { success: boolean; message: string };
  approveSalesOrderDiscount: (soId: string, actor: string) => { success: boolean; message: string };
  validateDeliveryOrder: (doId: string, deliveredQtyMap: Record<string, number>, actor: string) => { success: boolean; message: string };
  postCustomerInvoice: (invId: string, actor: string) => { success: boolean; message: string };
  createPurchaseOrder: (po: Partial<PurchaseOrder>) => PurchaseOrder;
  confirmPurchaseOrder: (poId: string, actor: string) => { success: boolean; message: string };
  approvePurchaseOrder: (poId: string, actor: string) => { success: boolean; message: string };
  createReceiptFromPO: (poId: string) => Receipt;
  recordQualityCheck: (qcId: string, passedQty: number, failedQty: number, failReason: string, actor: string) => { success: boolean; message: string };
  validateReceipt: (receiptId: string, actor: string) => { success: boolean; message: string };
  postVendorBill: (billId: string, actor: string) => { success: boolean; message: string };
  registerPayment: (invId: string, amount: number, type: 'customer' | 'vendor', actor: string) => { success: boolean; message: string };
  executeStockTransfer: (transferId: string, actor: string) => { success: boolean; message: string };
  processCustomerReturn: (returnId: string, actor: string) => { success: boolean; message: string };
  convertCrmToQuotation: (crmId: string) => { success: boolean; quotationId?: string; message: string };
  updateCrmStage: (crmId: string, newStage: 'New' | 'Qualified' | 'Won' | 'Lost', actor: string) => void;
  resetToBaseline: () => void;
}

const ErpContext = createContext<ErpContextType | null>(null);

const STORAGE_KEY = 'segar_rasa_erp_state_v1';

export const ErpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current user session
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('segar_rasa_current_user');
    return saved ? JSON.parse(saved) : DEMO_USERS.sales;
  });

  // State entities
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [stock, setStock] = useState<StockEntry[]>(INITIAL_STOCK);
  const [reservations, setReservations] = useState<Record<string, { 'WH-PKU': number; 'OUT-MRP': number }>>({
    'BVG-250-LEM': { 'WH-PKU': 10, 'OUT-MRP': 0 }
  });
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [crmLeads, setCrmLeads] = useState<CRMLead[]>(INITIAL_CRM_LEADS);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(INITIAL_SALES_ORDERS);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([]);
  const [vendorBills, setVendorBills] = useState<VendorBill[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [customerReturns, setCustomerReturns] = useState<CustomerReturn[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>(INITIAL_AUDIT_LOGS);

  // Load from localStorage if present
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.customers) setCustomers(parsed.customers);
        if (parsed.vendors) setVendors(parsed.vendors);
        if (parsed.products) setProducts(parsed.products);
        if (parsed.stock) setStock(parsed.stock);
        if (parsed.reservations) setReservations(parsed.reservations);
        if (parsed.accounts) setAccounts(parsed.accounts);
        if (parsed.crmLeads) setCrmLeads(parsed.crmLeads);
        if (parsed.salesOrders) setSalesOrders(parsed.salesOrders);
        if (parsed.deliveryOrders) setDeliveryOrders(parsed.deliveryOrders);
        if (parsed.customerInvoices) setCustomerInvoices(parsed.customerInvoices);
        if (parsed.purchaseOrders) setPurchaseOrders(parsed.purchaseOrders);
        if (parsed.receipts) setReceipts(parsed.receipts);
        if (parsed.qualityChecks) setQualityChecks(parsed.qualityChecks);
        if (parsed.vendorBills) setVendorBills(parsed.vendorBills);
        if (parsed.journalEntries) setJournalEntries(parsed.journalEntries);
        if (parsed.stockTransfers) setStockTransfers(parsed.stockTransfers);
        if (parsed.customerReturns) setCustomerReturns(parsed.customerReturns);
        if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
      } catch (err) {
        console.error('Failed to parse saved state:', err);
      }
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    const state = {
      customers, vendors, products, stock, reservations, accounts,
      crmLeads, salesOrders, deliveryOrders, customerInvoices,
      purchaseOrders, receipts, qualityChecks, vendorBills,
      journalEntries, stockTransfers, customerReturns, auditLogs
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [
    customers, vendors, products, stock, reservations, accounts,
    crmLeads, salesOrders, deliveryOrders, customerInvoices,
    purchaseOrders, receipts, qualityChecks, vendorBills,
    journalEntries, stockTransfers, customerReturns, auditLogs
  ]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('segar_rasa_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('segar_rasa_current_user');
    }
  }, [currentUser]);

  const switchRole = (role: UserRole) => {
    setCurrentUser(DEMO_USERS[role]);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const resetToBaseline = () => {
    setCustomers(INITIAL_CUSTOMERS);
    setVendors(INITIAL_VENDORS);
    setProducts(INITIAL_PRODUCTS);
    setStock(INITIAL_STOCK);
    setReservations({ 'BVG-250-LEM': { 'WH-PKU': 10, 'OUT-MRP': 0 } });
    setAccounts(INITIAL_ACCOUNTS);
    setCrmLeads(INITIAL_CRM_LEADS);
    setSalesOrders(INITIAL_SALES_ORDERS);
    setDeliveryOrders([]);
    setCustomerInvoices([]);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setReceipts([]);
    setQualityChecks([]);
    setVendorBills([]);
    setJournalEntries([]);
    setStockTransfers([]);
    setCustomerReturns([]);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Helper: Credit Exposure calculation (SR-09)
  const calculateCreditExposure = (customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    const openingAr = cust ? cust.opening_ar : 0;
    const creditLimit = cust ? cust.credit_limit : 0;

    // Confirmed SOs that are NOT yet invoiced (Gross with tax)
    const uninvoicedSo = salesOrders
      .filter(so => so.customer_id === customerId && so.is_confirmed && !so.related_inv_id)
      .reduce((sum, so) => sum + so.total_amount, 0);

    const totalExposure = openingAr + uninvoicedSo;
    const headroom = Math.max(0, creditLimit - totalExposure);

    return { openingAr, uninvoicedSo, totalExposure, creditLimit, headroom };
  };

  // Helper: Stock Level (SR-04)
  const getStockLevel = (sku: string, location: 'WH-PKU' | 'OUT-MRP') => {
    const entry = stock.find(s => s.variant_sku === sku);
    const onHand = entry ? (location === 'WH-PKU' ? entry.wh_qty : entry.out_qty) : 0;
    const reserved = reservations[sku] ? (reservations[sku][location] || 0) : 0;
    const available = Math.max(0, onHand - reserved);
    return { onHand, reserved, available };
  };

  // Helper: Aggregate Stock
  const getAggregateStock = (sku?: string) => {
    if (sku) {
      const entry = stock.find(s => s.variant_sku === sku);
      const onHand = entry ? entry.total_qty : 0;
      const resWH = reservations[sku]?.['WH-PKU'] || 0;
      const resOUT = reservations[sku]?.['OUT-MRP'] || 0;
      const reserved = resWH + resOUT;
      const available = Math.max(0, onHand - reserved);
      const totalValue = entry ? entry.standard_value : 0;
      return { onHand, reserved, available, totalValue };
    }

    const onHand = stock.reduce((sum, s) => sum + s.total_qty, 0);
    let reserved = 0;
    Object.values(reservations).forEach(r => {
      reserved += (r['WH-PKU'] || 0) + (r['OUT-MRP'] || 0);
    });
    const available = Math.max(0, onHand - reserved);
    const totalValue = stock.reduce((sum, s) => sum + s.standard_value, 0);
    return { onHand, reserved, available, totalValue };
  };

  // Helper: Dashboard KPIs (SR-19)
  const getDashboardKpi = () => {
    const agg = getAggregateStock();
    const openSO = salesOrders.filter(so => so.status === 'Sales Order' || so.status === 'Quotation').length;
    const openPO = purchaseOrders.filter(po => po.status === 'Purchase Order' || po.status === 'Pending Approval' || po.status === 'RFQ').length;
    const openLead = crmLeads.filter(l => l.stage !== 'Won' && l.stage !== 'Lost').length;
    const totalAR = customers.reduce((sum, c) => sum + c.opening_ar, 0);
    const totalAP = accounts.find(a => a.account_code === '2100')?.balance || 220000;
    const bankBalance = accounts.find(a => a.account_code === '1010')?.balance || 7000000;
    const newRevenue = accounts.find(a => a.account_code === '4100')?.balance || 0;

    return {
      stockOnHand: agg.onHand,
      reserved: agg.reserved,
      available: agg.available,
      stockValuation: agg.totalValue,
      openSO,
      openPO,
      openLead,
      totalAR,
      totalAP,
      bankBalance,
      newRevenue
    };
  };

  // Action: Create Quotation (F-05)
  const createQuotation = (data: Partial<SalesOrder>): SalesOrder => {
    const nextSeq = (salesOrders.length + 5).toString().padStart(5, '0');
    const newId = `S${nextSeq}`;
    const cust = customers.find(c => c.id === data.customer_id) || customers[0];

    // Compute line subtotal, tax 11%, line rounding (SR-14)
    const lines = (data.lines || []).map(line => {
      const subtotal = Math.round(line.quantity * line.unit_price * (1 - line.discount_pct / 100));
      const tax = Math.round(subtotal * 0.11);
      return {
        ...line,
        subtotal,
        tax_amount: tax,
        total: subtotal + tax
      };
    });

    const untaxed = lines.reduce((sum, l) => sum + l.subtotal, 0);
    const tax = lines.reduce((sum, l) => sum + l.tax_amount, 0);

    const hasHighDiscount = lines.some(l => l.discount_pct > 10);

    const newSO: SalesOrder = {
      id: newId,
      customer_id: cust.id,
      customer_name: cust.name,
      date: new Date().toISOString().split('T')[0],
      status: 'Quotation',
      is_confirmed: false,
      approval_status: hasHighDiscount ? 'Pending Owner Approval' : 'None',
      lines,
      untaxed_amount: untaxed,
      tax_amount: tax,
      total_amount: untaxed + tax,
      related_crm_id: data.related_crm_id,
      revision_history: [
        {
          actor: currentUser?.name || 'Sales',
          timestamp: new Date().toLocaleString('id-ID'),
          action: `Quotation ${newId} dibuat untuk ${cust.name}`
        }
      ]
    };

    setSalesOrders(prev => [newSO, ...prev]);
    return newSO;
  };

  // Action: Confirm Sales Order (F-05, F-06, F-07, F-10)
  const confirmSalesOrder = (soId: string, actor: string) => {
    const so = salesOrders.find(s => s.id === soId);
    if (!so) return { success: false, message: 'Sales Order tidak ditemukan' };
    if (so.is_confirmed) return { success: false, message: 'Sales Order sudah berstatus Confirmed' };

    // Check discount approval gate (SR-07, SR-08)
    const highDiscountLine = so.lines.find(l => l.discount_pct > 10);
    if (highDiscountLine && so.approval_status !== 'Approved') {
      return {
        success: false,
        message: `Diskon sebesar ${highDiscountLine.discount_pct}% melampaui batas 10%. Membutuhkan persetujuan Owner sebelum Confirmed (SR-08).`
      };
    }

    // Check Credit Limit Exposure gate (SR-09, F-10, T-04)
    const exposure = calculateCreditExposure(so.customer_id);
    if (exposure.totalExposure + so.total_amount > exposure.creditLimit) {
      return {
        success: false,
        message: `Batas kredit terlampaui! Credit Exposure saat ini Rp${exposure.totalExposure.toLocaleString('id-ID')} + pesanan baru Rp${so.total_amount.toLocaleString('id-ID')} = Rp${(exposure.totalExposure + so.total_amount).toLocaleString('id-ID')} melampaui Limit Rp${exposure.creditLimit.toLocaleString('id-ID')} (SR-09). Konfirmasi ditahan.`
      };
    }

    // Check stock availability at WH-PKU (SR-03, SR-04, T-12)
    for (const line of so.lines) {
      const stockLevel = getStockLevel(line.variant_sku, 'WH-PKU');
      if (line.quantity > stockLevel.available) {
        return {
          success: false,
          message: `Stok tidak mencukupi untuk ${line.variant_sku}! Kebutuhan: ${line.quantity}, Tersedia di WH-PKU: ${stockLevel.available}. Stok negatif dan pengambilan reservasi pesanan lain dilarang (SR-04).`
        };
      }
    }

    // Allocate reservation (SR-04, F-07, T-11)
    const newReservations = { ...reservations };
    so.lines.forEach(line => {
      if (!newReservations[line.variant_sku]) {
        newReservations[line.variant_sku] = { 'WH-PKU': 0, 'OUT-MRP': 0 };
      }
      newReservations[line.variant_sku]['WH-PKU'] += line.quantity;
    });
    setReservations(newReservations);

    // Create Delivery Order in 'Ready' state
    const nextDoSeq = (deliveryOrders.length + 1).toString().padStart(4, '0');
    const doId = `WH/OUT/${nextDoSeq}`;
    const newDO: DeliveryOrder = {
      id: doId,
      order_id: so.id,
      customer_id: so.customer_id,
      customer_name: so.customer_name,
      warehouse_code: 'WH-PKU',
      date: new Date().toISOString().split('T')[0],
      status: 'Ready',
      lines: so.lines.map(line => {
        const prod = products.find(p => p.variant_sku === line.variant_sku);
        const cost = prod ? prod.standard_cost : 9000;
        return {
          id: `DOL-${line.id}`,
          variant_sku: line.variant_sku,
          name: line.name,
          ordered_qty: line.quantity,
          delivered_qty: 0,
          backorder_qty: line.quantity,
          cogs_unit: cost,
          cogs_total: 0
        };
      }),
      total_delivered_qty: 0,
      total_cogs: 0,
      is_validated: false,
      related_so_id: so.id
    };
    setDeliveryOrders(prev => [newDO, ...prev]);

    // Update SO to Confirmed & lock
    const updatedSO: SalesOrder = {
      ...so,
      status: 'Sales Order',
      is_confirmed: true,
      related_do_id: doId,
      revision_history: [
        ...so.revision_history,
        {
          actor,
          timestamp: new Date().toLocaleString('id-ID'),
          action: `Confirmed SO & Alokasi Reservasi ${so.lines.map(l => `${l.quantity} ${l.variant_sku}`).join(', ')} di WH-PKU`
        }
      ]
    };

    setSalesOrders(prev => prev.map(s => s.id === soId ? updatedSO : s));

    // Audit log
    setAuditLogs(prev => [
      {
        id: `AUD-${Date.now()}`,
        document_id: soId,
        actor,
        action: 'Confirmed + reserve',
        timestamp: new Date().toLocaleString('id-ID'),
        reference: `${soId} · stock reservation`,
        linked_docs: `SO → DO (${doId})`,
        post_count: 1,
        details: `Reservasi berhasil dibentuk di WH-PKU.`
      },
      ...prev
    ]);

    return { success: true, message: `Sales Order ${soId} berhasil dikonfirmasi! Dokumen Delivery ${doId} telah disiapkan.` };
  };

  // Action: Approve Sales Order Discount by Owner (SR-08, F-06)
  const approveSalesOrderDiscount = (soId: string, actor: string) => {
    const so = salesOrders.find(s => s.id === soId);
    if (!so) return { success: false, message: 'Sales Order tidak ditemukan' };

    const updatedSO: SalesOrder = {
      ...so,
      approval_status: 'Approved',
      revision_history: [
        ...so.revision_history,
        {
          actor,
          timestamp: new Date().toLocaleString('id-ID'),
          action: `Diskon pesanan disetujui oleh Owner (${actor})`
        }
      ]
    };

    setSalesOrders(prev => prev.map(s => s.id === soId ? updatedSO : s));
    return { success: true, message: `Diskon Sales Order ${soId} berhasil disetujui oleh Owner.` };
  };

  // Action: Validate Delivery Order (F-08, F-15, SR-02, SR-04, SR-15)
  const validateDeliveryOrder = (doId: string, deliveredQtyMap: Record<string, number>, actor: string) => {
    const dOrder = deliveryOrders.find(d => d.id === doId);
    if (!dOrder) return { success: false, message: 'Delivery Order tidak ditemukan' };
    if (dOrder.is_validated) return { success: false, message: 'Delivery Order sudah divalidasi sebelumnya (Idempotent: SR-15)' };

    // Validate quantities
    let totalDelivered = 0;
    let totalCogs = 0;
    let hasBackorder = false;

    const newLines = dOrder.lines.map(line => {
      const delivered = deliveredQtyMap[line.variant_sku] ?? line.ordered_qty;
      const backorder = Math.max(0, line.ordered_qty - delivered);
      if (backorder > 0) hasBackorder = true;
      const lineCogs = delivered * line.cogs_unit;
      totalDelivered += delivered;
      totalCogs += lineCogs;
      return {
        ...line,
        delivered_qty: delivered,
        backorder_qty: backorder,
        cogs_total: lineCogs
      };
    });

    // Reduce on-hand stock and release reservation at WH-PKU
    const newStock = stock.map(s => {
      const line = newLines.find(l => l.variant_sku === s.variant_sku);
      if (line && line.delivered_qty > 0) {
        const newWh = Math.max(0, s.wh_qty - line.delivered_qty);
        return {
          ...s,
          wh_qty: newWh,
          total_qty: newWh + s.out_qty,
          standard_value: (newWh + s.out_qty) * (s.standard_value / s.total_qty)
        };
      }
      return s;
    });
    setStock(newStock);

    // Release reservation
    const newReservations = { ...reservations };
    newLines.forEach(line => {
      if (newReservations[line.variant_sku]) {
        newReservations[line.variant_sku]['WH-PKU'] = Math.max(0, newReservations[line.variant_sku]['WH-PKU'] - line.ordered_qty + line.backorder_qty);
      }
    });
    setReservations(newReservations);

    // Post double entry COGS Journal: Dr COGS (5100) / Cr Stock Valuation (1200) (SR-14, SR-15, F-15, T-25)
    const journalId = `JE-COGS-${doId.replace(/\//g, '-')}`;
    const newJournal: JournalEntry = {
      id: journalId,
      reference: doId,
      date: new Date().toISOString().split('T')[0],
      move_type: 'Delivery / COGS',
      posting_policy: 'Standard Cost',
      lines: [
        { account_code: '5100', account_name: 'Cost of Goods Sold', debit: totalCogs, credit: 0 },
        { account_code: '1200', account_name: 'Stock Valuation', debit: 0, credit: totalCogs }
      ],
      total_debit: totalCogs,
      total_credit: totalCogs,
      balance_difference: 0,
      idempotent_key: `${doId}_VALIDATE`
    };
    setJournalEntries(prev => [newJournal, ...prev]);

    // Update Accounts
    setAccounts(prev => prev.map(acc => {
      if (acc.account_code === '5100') return { ...acc, balance: acc.balance + totalCogs };
      if (acc.account_code === '1200') return { ...acc, balance: Math.max(0, acc.balance - totalCogs) };
      return acc;
    }));

    // Update DO
    const updatedDO: DeliveryOrder = {
      ...dOrder,
      status: hasBackorder ? 'Partial' : 'Done',
      lines: newLines,
      total_delivered_qty: totalDelivered,
      total_cogs: totalCogs,
      is_validated: true
    };
    setDeliveryOrders(prev => prev.map(d => d.id === doId ? updatedDO : d));

    // Audit log
    setAuditLogs(prev => [
      {
        id: `AUD-${Date.now()}`,
        document_id: doId,
        actor,
        action: 'Validated Delivery',
        timestamp: new Date().toLocaleString('id-ID'),
        reference: `${doId} · delivery goods`,
        linked_docs: `SO (${dOrder.related_so_id}) → DO (${doId}) → Journal (${journalId})`,
        post_count: 1,
        details: `Barang terkirim: ${totalDelivered} unit, COGS diakui Rp${totalCogs.toLocaleString('id-ID')}`
      },
      ...prev
    ]);

    return {
      success: true,
      message: `Delivery Order ${doId} berhasil divalidasi! ${totalDelivered} unit terkirim. COGS dibukukan Rp${totalCogs.toLocaleString('id-ID')}. Jurnal COGS ${journalId} terbentuk.`
    };
  };

  // Action: Post Customer Invoice based on Delivery (F-09, SR-01, SR-02, SR-14)
  const postCustomerInvoice = (invId: string, actor: string) => {
    const inv = customerInvoices.find(i => i.id === invId);
    if (!inv) return { success: false, message: 'Invoice tidak ditemukan' };
    if (inv.is_posted) return { success: false, message: 'Invoice sudah diposting sebelumnya (Idempotent: SR-15)' };

    // Update Customer AR
    setCustomers(prev => prev.map(c => {
      if (c.id === inv.customer_id) {
        return { ...c, opening_ar: c.opening_ar + inv.amount_due };
      }
      return c;
    }));

    // Post double entry invoice journal: Dr AR (1100) / Cr Sales Revenue (4100) / Cr VAT Output (2200)
    const journalId = `JE-INV-${inv.id.replace(/\//g, '-')}`;
    const newJournal: JournalEntry = {
      id: journalId,
      reference: inv.id,
      date: new Date().toISOString().split('T')[0],
      move_type: 'Customer Invoice',
      posting_policy: 'Accrual Delivery',
      lines: [
        { account_code: '1100', account_name: 'Accounts Receivable', debit: inv.amount_due, credit: 0 },
        { account_code: '4100', account_name: 'Sales Revenue', debit: 0, credit: inv.untaxed_amount },
        { account_code: '2200', account_name: 'VAT Output', debit: 0, credit: inv.tax_amount }
      ],
      total_debit: inv.amount_due,
      total_credit: inv.untaxed_amount + inv.tax_amount,
      balance_difference: 0,
      idempotent_key: `${inv.id}_POST`
    };
    setJournalEntries(prev => [newJournal, ...prev]);

    // Update Accounts
    setAccounts(prev => prev.map(acc => {
      if (acc.account_code === '1100') return { ...acc, balance: acc.balance + inv.amount_due };
      if (acc.account_code === '4100') return { ...acc, balance: acc.balance + inv.untaxed_amount };
      if (acc.account_code === '2200') return { ...acc, balance: acc.balance + inv.tax_amount };
      return acc;
    }));

    const updatedInv: CustomerInvoice = {
      ...inv,
      status: 'Posted',
      payment_status: 'Unpaid',
      residual_amount: inv.amount_due,
      is_posted: true
    };
    setCustomerInvoices(prev => prev.map(i => i.id === invId ? updatedInv : i));

    // Audit log
    setAuditLogs(prev => [
      {
        id: `AUD-${Date.now()}`,
        document_id: inv.id,
        actor,
        action: 'Posted Invoice',
        timestamp: new Date().toLocaleString('id-ID'),
        reference: `${inv.id} · customer bill`,
        linked_docs: `DO (${inv.source_delivery_id}) → Invoice (${inv.id}) → Journal (${journalId})`,
        post_count: 1,
        details: `Piutang bertambah Rp${inv.amount_due.toLocaleString('id-ID')}`
      },
      ...prev
    ]);

    return {
      success: true,
      message: `Invoice ${inv.id} berhasil diposting! Piutang diakui Rp${inv.amount_due.toLocaleString('id-ID')}, PPN Keluaran Rp${inv.tax_amount.toLocaleString('id-ID')}.`
    };
  };

  // Action: Create Purchase Order (F-11, F-22)
  const createPurchaseOrder = (data: Partial<PurchaseOrder>): PurchaseOrder => {
    const nextSeq = (purchaseOrders.length + 4).toString().padStart(5, '0');
    const newId = `PO${nextSeq}`;
    const vendor = vendors.find(v => v.id === data.vendor_id) || vendors[0];

    const lines = (data.lines || []).map(line => {
      const subtotal = line.quantity * line.unit_cost;
      const tax = Math.round(subtotal * 0.11);
      return {
        ...line,
        subtotal,
        tax_amount: tax,
        gross_amount: subtotal + tax
      };
    });

    const untaxed = lines.reduce((sum, l) => sum + l.subtotal, 0);
    const tax = lines.reduce((sum, l) => sum + l.tax_amount, 0);
    const gross = untaxed + tax;

    const needsOwner = untaxed > 1000000;

    const newPO: PurchaseOrder = {
      id: newId,
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      date: new Date().toISOString().split('T')[0],
      currency: 'IDR',
      status: 'RFQ',
      is_confirmed: false,
      needs_owner_approval: needsOwner,
      approval_status: needsOwner ? 'Pending Owner Approval' : 'None',
      lines,
      untaxed_amount: untaxed,
      tax_amount: tax,
      gross_amount: gross
    };

    setPurchaseOrders(prev => [newPO, ...prev]);
    return newPO;
  };

  // Action: Confirm Purchase Order (SR-20, F-11, F-22, T-18)
  const confirmPurchaseOrder = (poId: string, actor: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return { success: false, message: 'Purchase Order tidak ditemukan' };
    if (po.is_confirmed) return { success: false, message: 'Purchase Order sudah berstatus Confirmed' };

    // Approval Gate > Rp1.000.000 (SR-20)
    if (po.untaxed_amount > 1000000 && po.approval_status !== 'Approved by Owner') {
      const updatedPO: PurchaseOrder = {
        ...po,
        status: 'Pending Approval',
        approval_status: 'Pending Owner Approval'
      };
      setPurchaseOrders(prev => prev.map(p => p.id === poId ? updatedPO : p));
      return {
        success: false,
        message: `PO dengan subtotal Rp${po.untaxed_amount.toLocaleString('id-ID')} melampaui batas Rp1.000.000. Memerlukan persetujuan Owner sebelum Confirmed (SR-20). Status diubah menjadi Pending Approval.`
      };
    }

    // Create Receipt for warehouse
    const nextRcSeq = (receipts.length + 1).toString().padStart(4, '0');
    const rcId = `WH/IN/${nextRcSeq}`;

    const newReceipt: Receipt = {
      id: rcId,
      po_id: po.id,
      vendor_id: po.vendor_id,
      warehouse_code: 'WH-PKU',
      date: new Date().toISOString().split('T')[0],
      status: 'Waiting',
      lines: po.lines.map(line => ({
        id: `RCL-${line.id}`,
        variant_sku: line.variant_sku,
        name: line.name,
        ordered_qty: line.quantity,
        inspected_qty: 0,
        accepted_qty: 0,
        rejected_qty: 0
      })),
      is_validated: false
    };
    setReceipts(prev => [newReceipt, ...prev]);

    // Create Quality Check record
    const nextQcSeq = (qualityChecks.length + 1).toString().padStart(5, '0');
    const qcId = `QC${nextQcSeq}`;
    const firstLine = po.lines[0];
    const newQC: QualityCheck = {
      id: qcId,
      reference_po: po.id,
      receipt_id: rcId,
      product_sku: firstLine.variant_sku,
      product_name: firstLine.name,
      inspected_qty: 0,
      passed_qty: 0,
      failed_qty: 0,
      fail_reason: '',
      check_type: 'Pass - Fail',
      inspector: 'Tika / Quality',
      status: 'To Do',
      date: new Date().toISOString().split('T')[0]
    };
    setQualityChecks(prev => [newQC, ...prev]);

    const updatedPO: PurchaseOrder = {
      ...po,
      status: 'Purchase Order',
      is_confirmed: true,
      related_receipt_id: rcId
    };
    setPurchaseOrders(prev => prev.map(p => p.id === poId ? updatedPO : p));

    return {
      success: true,
      message: `Purchase Order ${poId} berhasil dikonfirmasi! Dokumen Penerimaan Gudang ${rcId} & Jadwal QC ${qcId} telah disiapkan.`
    };
  };

  // Action: Approve Purchase Order by Owner (SR-20, F-22)
  const approvePurchaseOrder = (poId: string, actor: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return { success: false, message: 'PO tidak ditemukan' };

    const updatedPO: PurchaseOrder = {
      ...po,
      approval_status: 'Approved by Owner',
      approval_actor: actor,
      approval_timestamp: new Date().toLocaleString('id-ID')
    };
    setPurchaseOrders(prev => prev.map(p => p.id === poId ? updatedPO : p));
    return { success: true, message: `PO ${poId} berhasil disetujui oleh Owner (${actor}). Sekarang dapat dikonfirmasi.` };
  };

  // Action: Record Quality Check (SR-06, SR-11, F-13, T-21, T-22)
  const recordQualityCheck = (qcId: string, passedQty: number, failedQty: number, failReason: string, actor: string) => {
    const qc = qualityChecks.find(q => q.id === qcId);
    if (!qc) return { success: false, message: 'Quality Check tidak ditemukan' };

    const totalInspected = passedQty + failedQty;
    const updatedQC: QualityCheck = {
      ...qc,
      inspected_qty: totalInspected,
      passed_qty: passedQty,
      failed_qty: failedQty,
      fail_reason: failReason,
      inspector: actor,
      status: 'Passed / Failed'
    };
    setQualityChecks(prev => prev.map(q => q.id === qcId ? updatedQC : q));

    // Update receipt status to 'Quality Hold' or prepared with accepted qty
    if (qc.receipt_id) {
      setReceipts(prev => prev.map(rc => {
        if (rc.id === qc.receipt_id) {
          const lines = rc.lines.map(l => ({
            ...l,
            inspected_qty: totalInspected,
            accepted_qty: passedQty,
            rejected_qty: failedQty,
            fail_reason: failReason
          }));
          return {
            ...rc,
            status: failedQty > 0 ? 'Quality Hold' : 'Waiting',
            lines
          };
        }
        return rc;
      }));
    }

    // Audit log
    setAuditLogs(prev => [
      {
        id: `AUD-${Date.now()}`,
        document_id: qcId,
        actor,
        action: 'QC Completed',
        timestamp: new Date().toLocaleString('id-ID'),
        reference: `${qc.reference_po} / ${qcId}`,
        linked_docs: `PO (${qc.reference_po}) → QC (${qcId})`,
        post_count: 1,
        details: `Inspeksi fisik: ${passedQty} Pass, ${failedQty} Fail (${failReason || 'Kemasan rusak'}).`
      },
      ...prev
    ]);

    return {
      success: true,
      message: `Hasil QC ${qcId} tersimpan: ${passedQty} Lulus, ${failedQty} Gagal (${failReason}). Unit rusak diisolasi (SR-11).`
    };
  };

  // Action: Validate Receipt (SR-04, SR-06, SR-11, F-12, T-19)
  const validateReceipt = (receiptId: string, actor: string) => {
    const rc = receipts.find(r => r.id === receiptId);
    if (!rc) return { success: false, message: 'Receipt tidak ditemukan' };
    if (rc.is_validated) return { success: false, message: 'Receipt sudah divalidasi sebelumnya (Idempotent: SR-15)' };

    // Calculate total accepted quantity
    let totalAccepted = 0;
    let acceptedValue = 0;

    const newStock = stock.map(s => {
      const line = rc.lines.find(l => l.variant_sku === s.variant_sku);
      if (line && line.accepted_qty > 0) {
        totalAccepted += line.accepted_qty;
        const prod = products.find(p => p.variant_sku === line.variant_sku);
        const cost = prod ? prod.standard_cost : 15000;
        acceptedValue += line.accepted_qty * cost;
        const newWh = s.wh_qty + line.accepted_qty;
        return {
          ...s,
          wh_qty: newWh,
          total_qty: newWh + s.out_qty,
          standard_value: s.standard_value + (line.accepted_qty * cost)
        };
      }
      return s;
    });
    setStock(newStock);

    // Book GRNI Journal: Dr Stock Valuation (1200) / Cr GRNI (1210)
    const journalId = `JE-RC-${rc.id.replace(/\//g, '-')}`;
    const newJournal: JournalEntry = {
      id: journalId,
      reference: rc.id,
      date: new Date().toISOString().split('T')[0],
      move_type: 'Receipt / GRNI',
      posting_policy: 'Standard Cost',
      lines: [
        { account_code: '1200', account_name: 'Stock Valuation', debit: acceptedValue, credit: 0 },
        { account_code: '1210', account_name: 'Stock Interim Received / GRNI', debit: 0, credit: acceptedValue }
      ],
      total_debit: acceptedValue,
      total_credit: acceptedValue,
      balance_difference: 0,
      idempotent_key: `${rc.id}_VALIDATE`
    };
    setJournalEntries(prev => [newJournal, ...prev]);

    // Update Accounts
    setAccounts(prev => prev.map(acc => {
      if (acc.account_code === '1200') return { ...acc, balance: acc.balance + acceptedValue };
      if (acc.account_code === '1210') return { ...acc, balance: acc.balance + acceptedValue };
      return acc;
    }));

    // Update Receipt
    const updatedRC: Receipt = {
      ...rc,
      status: 'Done',
      is_validated: true
    };
    setReceipts(prev => prev.map(r => r.id === receiptId ? updatedRC : r));

    return {
      success: true,
      message: `Penerimaan ${receiptId} berhasil divalidasi! Stok gudang bertambah ${totalAccepted} unit (Rp${acceptedValue.toLocaleString('id-ID')}). Unit ditolak tidak masuk stok (SR-11).`
    };
  };

  // Action: Post Vendor Bill with 3-Way Match (SR-05, SR-06, F-14, T-23, T-24)
  const postVendorBill = (billId: string, actor: string) => {
    const bill = vendorBills.find(b => b.id === billId);
    if (!bill) return { success: false, message: 'Vendor Bill tidak ditemukan' };
    if (bill.is_posted) return { success: false, message: 'Vendor Bill sudah diposting sebelumnya (Idempotent: SR-15)' };

    if (bill.match_status === 'Variance Hold') {
      return {
        success: false,
        message: `Vendor Bill ditahan! Terjadi selisih kuantitas tagihan dengan unit diterima QC (SR-06). Vendor hanya berhak menagih unit yang diterima (${bill.variance_note}).`
      };
    }

    // Book 3-way match journal: Dr GRNI (1210) / Dr VAT Input (1300) / Cr Accounts Payable (2100)
    const journalId = `JE-BILL-${bill.id.replace(/\//g, '-')}`;
    const newJournal: JournalEntry = {
      id: journalId,
      reference: bill.id,
      date: new Date().toISOString().split('T')[0],
      move_type: 'Vendor Bill',
      posting_policy: '3-Way Match',
      lines: [
        { account_code: '1210', account_name: 'Stock Interim Received / GRNI', debit: bill.untaxed_amount, credit: 0 },
        { account_code: '1300', account_name: 'VAT Input', debit: bill.tax_amount, credit: 0 },
        { account_code: '2100', account_name: 'Accounts Payable', debit: 0, credit: bill.total_amount }
      ],
      total_debit: bill.total_amount,
      total_credit: bill.total_amount,
      balance_difference: 0,
      idempotent_key: `${bill.id}_POST`
    };
    setJournalEntries(prev => [newJournal, ...prev]);

    // Update Accounts
    setAccounts(prev => prev.map(acc => {
      if (acc.account_code === '1210') return { ...acc, balance: Math.max(0, acc.balance - bill.untaxed_amount) };
      if (acc.account_code === '1300') return { ...acc, balance: acc.balance + bill.tax_amount };
      if (acc.account_code === '2100') return { ...acc, balance: acc.balance + bill.total_amount };
      return acc;
    }));

    const updatedBill: VendorBill = {
      ...bill,
      status: 'Posted',
      payment_status: 'Unpaid',
      residual_amount: bill.total_amount,
      is_posted: true
    };
    setVendorBills(prev => prev.map(b => b.id === billId ? updatedBill : b));

    return {
      success: true,
      message: `Vendor Bill ${billId} berhasil diposting! Utang Usaha (AP) bertambah Rp${bill.total_amount.toLocaleString('id-ID')}, Akun GRNI telah dikliring.`
    };
  };

  // Action: Register Payment (SR-10, F-16, T-27, T-28)
  const registerPayment = (invId: string, amount: number, type: 'customer' | 'vendor', actor: string) => {
    if (amount <= 0) {
      return { success: false, message: 'Nominal pembayaran harus lebih besar dari 0 (SR-10).' };
    }

    if (type === 'customer') {
      const inv = customerInvoices.find(i => i.id === invId);
      if (!inv) return { success: false, message: 'Invoice tidak ditemukan' };
      if (amount > inv.residual_amount) {
        return {
          success: false,
          message: `Nominal pembayaran Rp${amount.toLocaleString('id-ID')} melampaui sisa tagihan Rp${inv.residual_amount.toLocaleString('id-ID')} (SR-10).`
        };
      }

      const newResidual = inv.residual_amount - amount;
      const newPaid = inv.paid_amount + amount;
      const newStatus = newResidual === 0 ? 'Paid' : 'Partial';

      // Update invoice
      setCustomerInvoices(prev => prev.map(i => i.id === invId ? {
        ...i,
        payment_status: newStatus,
        status: newResidual === 0 ? 'Paid' : 'Posted',
        paid_amount: newPaid,
        residual_amount: newResidual
      } : i));

      // Update Customer AR
      setCustomers(prev => prev.map(c => {
        if (c.id === inv.customer_id) {
          return { ...c, opening_ar: Math.max(0, c.opening_ar - amount) };
        }
        return c;
      }));

      // Book Journal: Dr Bank (1010) / Cr AR (1100)
      const journalId = `JE-PAY-${Date.now()}`;
      setJournalEntries(prev => [
        {
          id: journalId,
          reference: inv.id,
          date: new Date().toISOString().split('T')[0],
          move_type: 'Payment',
          posting_policy: 'Cash Received',
          lines: [
            { account_code: '1010', account_name: 'Bank', debit: amount, credit: 0 },
            { account_code: '1100', account_name: 'Accounts Receivable', debit: 0, credit: amount }
          ],
          total_debit: amount,
          total_credit: amount,
          balance_difference: 0,
          idempotent_key: `${inv.id}_PAY_${Date.now()}`
        },
        ...prev
      ]);

      // Update Bank & AR accounts
      setAccounts(prev => prev.map(acc => {
        if (acc.account_code === '1010') return { ...acc, balance: acc.balance + amount };
        if (acc.account_code === '1100') return { ...acc, balance: Math.max(0, acc.balance - amount) };
        return acc;
      }));

      return {
        success: true,
        message: `Pembayaran sebesar Rp${amount.toLocaleString('id-ID')} berhasil dicatat! Sisa tagihan (Residual): Rp${newResidual.toLocaleString('id-ID')}. Status invoice: ${newStatus}.`
      };
    } else {
      // Vendor payment
      const bill = vendorBills.find(b => b.id === invId);
      if (!bill) return { success: false, message: 'Vendor Bill tidak ditemukan' };
      if (amount > bill.residual_amount) {
        return {
          success: false,
          message: `Nominal pembayaran Rp${amount.toLocaleString('id-ID')} melampaui sisa tagihan Rp${bill.residual_amount.toLocaleString('id-ID')} (SR-10).`
        };
      }

      const newResidual = bill.residual_amount - amount;
      const newPaid = bill.paid_amount + amount;
      const newStatus = newResidual === 0 ? 'Paid' : 'Partial';

      setVendorBills(prev => prev.map(b => b.id === invId ? {
        ...b,
        payment_status: newStatus,
        status: newResidual === 0 ? 'Paid' : 'Posted',
        paid_amount: newPaid,
        residual_amount: newResidual
      } : b));

      // Book Journal: Dr AP (2100) / Cr Bank (1010)
      const journalId = `JE-VPAY-${Date.now()}`;
      setJournalEntries(prev => [
        {
          id: journalId,
          reference: bill.id,
          date: new Date().toISOString().split('T')[0],
          move_type: 'Payment',
          posting_policy: 'Cash Disbursed',
          lines: [
            { account_code: '2100', account_name: 'Accounts Payable', debit: amount, credit: 0 },
            { account_code: '1010', account_name: 'Bank', debit: 0, credit: amount }
          ],
          total_debit: amount,
          total_credit: amount,
          balance_difference: 0,
          idempotent_key: `${bill.id}_PAY_${Date.now()}`
        },
        ...prev
      ]);

      setAccounts(prev => prev.map(acc => {
        if (acc.account_code === '2100') return { ...acc, balance: Math.max(0, acc.balance - amount) };
        if (acc.account_code === '1010') return { ...acc, balance: Math.max(0, acc.balance - amount) };
        return acc;
      }));

      return {
        success: true,
        message: `Pembayaran vendor sebesar Rp${amount.toLocaleString('id-ID')} berhasil dicatat! Sisa utang: Rp${newResidual.toLocaleString('id-ID')}.`
      };
    }
  };

  // Action: Internal Stock Transfer (SR-12, F-17, T-29, T-30)
  const executeStockTransfer = (transferId: string, actor: string) => {
    const tr = stockTransfers.find(t => t.id === transferId);
    if (!tr) return { success: false, message: 'Dokumen Transfer tidak ditemukan' };
    if (tr.is_validated) return { success: false, message: 'Transfer sudah divalidasi sebelumnya (Idempotent: SR-15)' };

    // Move stock from WH to OUT (or vice versa)
    const newStock = stock.map(s => {
      if (s.variant_sku === tr.sku) {
        let newWh = s.wh_qty;
        let newOut = s.out_qty;
        if (tr.from_location === 'WH-PKU' && tr.to_location === 'OUT-MRP') {
          if (newWh < tr.quantity) throw new Error('Stok asal tidak mencukupi');
          newWh -= tr.quantity;
          newOut += tr.quantity;
        } else if (tr.from_location === 'OUT-MRP' && tr.to_location === 'WH-PKU') {
          if (newOut < tr.quantity) throw new Error('Stok asal tidak mencukupi');
          newOut -= tr.quantity;
          newWh += tr.quantity;
        }
        return {
          ...s,
          wh_qty: newWh,
          out_qty: newOut,
          total_qty: newWh + newOut // Total remains identical!
        };
      }
      return s;
    });
    setStock(newStock);

    setStockTransfers(prev => prev.map(t => t.id === transferId ? {
      ...t,
      status: 'Done',
      is_validated: true
    } : t));

    return {
      success: true,
      message: `Transfer ${transferId} berhasil! ${tr.quantity} botol ${tr.sku} dipindahkan ke ${tr.to_location}. Total stok perusahaan tetap tidak berubah (SR-12).`
    };
  };

  // Action: Customer Return & Credit Note (SR-13, SR-14, F-18, T-31, T-32)
  const processCustomerReturn = (returnId: string, actor: string) => {
    const ret = customerReturns.find(r => r.id === returnId);
    if (!ret) return { success: false, message: 'Dokumen Retur tidak ditemukan' };
    if (ret.status === 'Credited') return { success: false, message: 'Retur sudah dikreditkan sebelumnya (Idempotent: SR-15)' };

    // Return to sellable stock if saleable
    if (ret.inspection_status === 'Saleable') {
      const prod = products.find(p => p.variant_sku === ret.sku);
      const cost = prod ? prod.standard_cost : 9000;
      const cogsReversal = ret.return_qty * cost;

      // Increase on hand WH-PKU
      setStock(prev => prev.map(s => {
        if (s.variant_sku === ret.sku) {
          const newWh = s.wh_qty + ret.return_qty;
          return {
            ...s,
            wh_qty: newWh,
            total_qty: newWh + s.out_qty,
            standard_value: s.standard_value + cogsReversal
          };
        }
        return s;
      }));

      // Reverse COGS Journal: Dr Stock Valuation (1200) / Cr COGS (5100)
      const journalCOGSId = `JE-RET-COGS-${ret.id}`;
      setJournalEntries(prev => [
        {
          id: journalCOGSId,
          reference: ret.id,
          date: new Date().toISOString().split('T')[0],
          move_type: 'Return / Credit Note',
          posting_policy: 'COGS Reversal',
          lines: [
            { account_code: '1200', account_name: 'Stock Valuation', debit: cogsReversal, credit: 0 },
            { account_code: '5100', account_name: 'Cost of Goods Sold', debit: 0, credit: cogsReversal }
          ],
          total_debit: cogsReversal,
          total_credit: cogsReversal,
          balance_difference: 0,
          idempotent_key: `${ret.id}_COGS`
        },
        ...prev
      ]);

      // Reverse Invoice Journal via Credit Note: Dr Sales Revenue (4100) / Dr VAT Output (2200) / Cr AR (1100)
      const journalCreditId = `JE-CN-${ret.credit_note_number}`;
      setJournalEntries(prev => [
        {
          id: journalCreditId,
          reference: ret.credit_note_number,
          date: new Date().toISOString().split('T')[0],
          move_type: 'Return / Credit Note',
          posting_policy: 'Credit Note Reversal',
          lines: [
            { account_code: '4100', account_name: 'Sales Revenue', debit: ret.untaxed_credit, credit: 0 },
            { account_code: '2200', account_name: 'VAT Output', debit: ret.tax_credit, credit: 0 },
            { account_code: '1100', account_name: 'Accounts Receivable', debit: 0, credit: ret.total_credit }
          ],
          total_debit: ret.total_credit,
          total_credit: ret.total_credit,
          balance_difference: 0,
          idempotent_key: `${ret.id}_CREDIT`
        },
        ...prev
      ]);

      // Update accounts
      setAccounts(prev => prev.map(acc => {
        if (acc.account_code === '1200') return { ...acc, balance: acc.balance + cogsReversal };
        if (acc.account_code === '5100') return { ...acc, balance: Math.max(0, acc.balance - cogsReversal) };
        if (acc.account_code === '4100') return { ...acc, balance: Math.max(0, acc.balance - ret.untaxed_credit) };
        if (acc.account_code === '2200') return { ...acc, balance: Math.max(0, acc.balance - ret.tax_credit) };
        if (acc.account_code === '1100') return { ...acc, balance: Math.max(0, acc.balance - ret.total_credit) };
        return acc;
      }));

      // Reduce Customer AR
      setCustomers(prev => prev.map(c => {
        if (c.id === ret.customer_id) {
          return { ...c, opening_ar: Math.max(0, c.opening_ar - ret.total_credit) };
        }
        return c;
      }));
    }

    setCustomerReturns(prev => prev.map(r => r.id === returnId ? {
      ...r,
      status: 'Credited'
    } : r));

    return {
      success: true,
      message: `Retur ${returnId} berhasil divalidasi! Stok dipulihkan, COGS dibalik, dan Nota Kredit ${ret.credit_note_number} sebesar Rp${ret.total_credit.toLocaleString('id-ID')} diterbitkan (SR-13).`
    };
  };

  // Action: Convert CRM Lead to Quotation (SR-18, F-04, T-07, T-08)
  const convertCrmToQuotation = (crmId: string) => {
    const lead = crmLeads.find(l => l.id === crmId);
    if (!lead) return { success: false, message: 'Prospek CRM tidak ditemukan' };

    const prod = products.find(p => p.variant_sku === lead.expected_sku) || products[0];

    const newQuotation = createQuotation({
      customer_id: lead.customer_id,
      customer_name: lead.customer_name,
      related_crm_id: lead.id,
      lines: [
        {
          id: `L-${Date.now()}`,
          variant_sku: prod.variant_sku,
          name: prod.name,
          quantity: lead.quantity,
          unit_price: prod.sales_price,
          discount_pct: 0,
          subtotal: lead.quantity * prod.sales_price,
          tax_amount: Math.round(lead.quantity * prod.sales_price * 0.11),
          total: Math.round(lead.quantity * prod.sales_price * 1.11)
        }
      ]
    });

    // Update CRM Lead stage to Won
    setCrmLeads(prev => prev.map(l => l.id === crmId ? {
      ...l,
      stage: 'Won',
      history: [...l.history, `Dikonversi menjadi Penawaran ${newQuotation.id} pada ${new Date().toLocaleString('id-ID')}`]
    } : l));

    return {
      success: true,
      quotationId: newQuotation.id,
      message: `Prospek ${crmId} berhasil dikonversi menjadi Penawaran ${newQuotation.id}! Stage menjadi Won tanpa mengakui pendapatan prematur (SR-18).`
    };
  };

  // Action: Update CRM Stage
  const updateCrmStage = (crmId: string, newStage: 'New' | 'Qualified' | 'Won' | 'Lost', actor: string) => {
    setCrmLeads(prev => prev.map(l => l.id === crmId ? {
      ...l,
      stage: newStage,
      history: [...l.history, `Stage diubah ke ${newStage} oleh ${actor} (${new Date().toLocaleString('id-ID')})`]
    } : l));
  };

  return (
    <ErpContext.Provider value={{
      currentUser, setCurrentUser, switchRole, logout,
      customers, vendors, products, stock, reservations, accounts,
      crmLeads, salesOrders, deliveryOrders, customerInvoices,
      purchaseOrders, receipts, qualityChecks, vendorBills,
      journalEntries, stockTransfers, customerReturns, auditLogs,
      calculateCreditExposure, getStockLevel, getAggregateStock, getDashboardKpi,
      createQuotation, confirmSalesOrder, approveSalesOrderDiscount,
      validateDeliveryOrder, postCustomerInvoice, createPurchaseOrder,
      confirmPurchaseOrder, approvePurchaseOrder, createReceiptFromPO,
      recordQualityCheck, validateReceipt, postVendorBill, registerPayment,
      executeStockTransfer, processCustomerReturn, convertCrmToQuotation,
      updateCrmStage, resetToBaseline
    }}>
      {children}
    </ErpContext.Provider>
  );
};

export const useErp = () => {
  const context = useContext(ErpContext);
  if (!context) {
    throw new Error('useErp must be used within an ErpProvider');
  }
  return context;
};
