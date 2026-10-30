export type UserRole = 'sales' | 'warehouse' | 'procurement' | 'finance' | 'quality' | 'owner';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatarColor: string;
}

export interface Customer {
  id: string;
  name: string;
  type: string;
  city: string;
  credit_limit: number;
  payment_terms: string;
  opening_ar: number;
}

export interface Vendor {
  id: string;
  name: string;
  city: string;
  payment_terms: string;
  tax_status: 'PKP' | 'Non-PKP';
}

export interface Product {
  variant_sku: string;
  name: string;
  size: string;
  color: string;
  unit: string;
  sales_price: number;
  standard_cost: number;
  default_vendor: string;
}

export interface WarehouseLocation {
  location_code: string;
  name: string;
  city: string;
  type: string;
}

export interface StockEntry {
  variant_sku: string;
  wh_qty: number;
  out_qty: number;
  total_qty: number;
  standard_value: number;
}

export interface Account {
  account_code: string;
  account_name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Contra Revenue' | 'Expense';
  normal_balance: 'Debit' | 'Credit';
  balance: number;
}

export interface CRMLead {
  id: string;
  customer_id: string;
  customer_name: string;
  expected_sku: string;
  quantity: number;
  stage: 'New' | 'Qualified' | 'Won' | 'Lost';
  created_at: string;
  history: string[];
}

export interface OrderLine {
  id: string;
  variant_sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

export interface SalesOrder {
  id: string;
  customer_id: string;
  customer_name: string;
  date: string;
  status: 'Quotation' | 'Sales Order' | 'Locked' | 'Cancelled';
  is_confirmed: boolean;
  approval_status?: 'Pending Owner Approval' | 'Approved' | 'Rejected' | 'None';
  lines: OrderLine[];
  untaxed_amount: number;
  tax_amount: number;
  total_amount: number;
  related_crm_id?: string;
  related_do_id?: string;
  related_inv_id?: string;
  revision_history: {
    actor: string;
    timestamp: string;
    action: string;
  }[];
}

export interface DeliveryLine {
  id: string;
  variant_sku: string;
  name: string;
  ordered_qty: number;
  delivered_qty: number;
  backorder_qty: number;
  cogs_unit: number;
  cogs_total: number;
}

export interface DeliveryOrder {
  id: string;
  order_id: string;
  customer_id: string;
  customer_name: string;
  warehouse_code: string;
  date: string;
  status: 'Ready' | 'Partial' | 'Done' | 'Cancelled';
  lines: DeliveryLine[];
  total_delivered_qty: number;
  total_cogs: number;
  is_validated: boolean;
  related_so_id: string;
  related_inv_id?: string;
}

export interface InvoiceLine {
  id: string;
  variant_sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

export interface CustomerInvoice {
  id: string;
  customer_id: string;
  customer_name: string;
  source_delivery_id: string;
  source_order_id: string;
  date: string;
  status: 'Draft' | 'Posted' | 'Paid';
  payment_status: 'Unpaid' | 'Partial' | 'Paid';
  tax_label: string;
  tax_effective_rate: number;
  lines: InvoiceLine[];
  untaxed_amount: number;
  tax_amount: number;
  amount_due: number;
  paid_amount: number;
  residual_amount: number;
  is_posted: boolean;
}

export interface POLine {
  id: string;
  variant_sku: string;
  name: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  tax_amount: number;
  gross_amount: number;
}

export interface PurchaseOrder {
  id: string;
  vendor_id: string;
  vendor_name: string;
  date: string;
  currency: string;
  status: 'RFQ' | 'Pending Approval' | 'Purchase Order' | 'Done' | 'Cancelled';
  is_confirmed: boolean;
  needs_owner_approval: boolean;
  approval_status?: 'Pending Owner Approval' | 'Approved by Owner' | 'Rejected' | 'None';
  approval_actor?: string;
  approval_timestamp?: string;
  lines: POLine[];
  untaxed_amount: number;
  tax_amount: number;
  gross_amount: number;
  related_receipt_id?: string;
  related_bill_id?: string;
}

export interface ReceiptLine {
  id: string;
  variant_sku: string;
  name: string;
  ordered_qty: number;
  inspected_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  fail_reason?: string;
}

export interface Receipt {
  id: string;
  po_id: string;
  vendor_id: string;
  warehouse_code: string;
  date: string;
  status: 'Waiting' | 'Quality Hold' | 'Done';
  lines: ReceiptLine[];
  is_validated: boolean;
  related_qc_id?: string;
  related_bill_id?: string;
}

export interface QualityCheck {
  id: string;
  reference_po: string;
  receipt_id: string;
  product_sku: string;
  product_name: string;
  inspected_qty: number;
  passed_qty: number;
  failed_qty: number;
  fail_reason: string;
  check_type: 'Pass - Fail';
  inspector: string;
  status: 'To Do' | 'Passed / Failed' | 'Closed';
  date: string;
}

export interface VendorBillLine {
  id: string;
  variant_sku: string;
  name: string;
  billable_qty: number;
  unit_cost: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

export interface VendorBill {
  id: string;
  vendor_id: string;
  vendor_name: string;
  po_reference: string;
  receipt_reference: string;
  date: string;
  status: 'Draft' | 'Posted' | 'Paid';
  payment_status: 'Unpaid' | 'Partial' | 'Paid';
  lines: VendorBillLine[];
  untaxed_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  residual_amount: number;
  match_status: 'Matched' | 'Variance Hold';
  variance_qty?: number;
  is_posted: boolean;
}

export interface JournalLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  reference: string;
  date: string;
  move_type: 'Delivery / COGS' | 'Customer Invoice' | 'Vendor Bill' | 'Receipt / GRNI' | 'Payment' | 'Return / Credit Note';
  posting_policy: string;
  lines: JournalLine[];
  total_debit: number;
  total_credit: number;
  balance_difference: number;
  idempotent_key: string;
}

export interface StockTransfer {
  id: string;
  sku: string;
  product_name: string;
  from_location: string;
  to_location: string;
  quantity: number;
  status: 'Draft' | 'Ready' | 'Done';
  date: string;
  is_validated: boolean;
}

export interface CustomerReturn {
  id: string;
  original_delivery_id: string;
  original_invoice_id: string;
  customer_id: string;
  customer_name: string;
  sku: string;
  product_name: string;
  return_qty: number;
  inspection_status: 'Saleable' | 'Damaged';
  credit_note_number: string;
  untaxed_credit: number;
  tax_credit: number;
  total_credit: number;
  status: 'Requested' | 'Validated' | 'Credited';
  date: string;
}

export interface AuditRecord {
  id: string;
  document_id: string;
  actor: string;
  action: string;
  timestamp: string;
  reference: string;
  linked_docs: string;
  post_count: number;
  details?: string;
}
