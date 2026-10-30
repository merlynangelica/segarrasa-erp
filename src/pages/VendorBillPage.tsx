import React, { useState } from 'react';
import {
  FileSpreadsheet, Check, AlertCircle, ArrowRight,
  ShieldAlert, ShieldCheck, DollarSign, Clock, Lock
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { VendorBill } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Chatter } from '../components/common/Chatter';

export const VendorBillPage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const {
    vendorBills, postVendorBill, currentUser, receipts,
    purchaseOrders
  } = useErp();

  // Create demo vendor bill state matching S-12
  const [billableQtyInput, setBillableQtyInput] = useState<number>(10);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Check if simulated bill exists or default
  const defaultBill: VendorBill = vendorBills[0] || {
    id: 'BILL/2026/0001',
    vendor_id: 'V01',
    vendor_name: 'PT Rasa Sejuk Nusantara',
    po_reference: 'PO00003',
    receipt_reference: 'WH/IN/0001',
    date: '2026-10-01',
    status: 'Draft',
    payment_status: 'Unpaid',
    lines: [
      {
        id: 'BL-01',
        variant_sku: 'BVG-500-LEM',
        name: 'Sparkling Lemon 500 ml',
        billable_qty: 10,
        unit_cost: 15000,
        subtotal: 150000,
        tax_amount: 16500,
        total: 166500
      }
    ],
    untaxed_amount: 150000,
    tax_amount: 16500,
    total_amount: 166500,
    paid_amount: 0,
    residual_amount: 166500,
    match_status: 'Matched',
    is_posted: false
  };

  const [activeBill, setActiveBill] = useState<VendorBill>(defaultBill);

  const handleTest12UnitsVariance = () => {
    // T-24: Vendor bills 12 units instead of 10 accepted
    const subtotal = 12 * 15000;
    const tax = Math.round(subtotal * 0.11);
    const total = subtotal + tax;

    setActiveBill({
      ...activeBill,
      match_status: 'Variance Hold',
      variance_qty: 2,
      variance_note: 'Vendor menagih 12 botol, padahal penerimaan QC gudang hanya menerima 10 botol (2 rusak).',
      untaxed_amount: subtotal,
      tax_amount: tax,
      total_amount: total,
      lines: [
        {
          ...activeBill.lines[0],
          billable_qty: 12,
          subtotal,
          tax_amount: tax,
          total
        }
      ]
    });
    setNotification({
      type: 'error',
      message: 'Uji Skenario T-24: Vendor mengajukan tagihan 12 botol. Sistem 3-Way Match mendeteksi selisih 2 botol rusak yang ditolak QC. Status ditahan di "Variance Hold" (SR-05, SR-06).'
    });
  };

  const handleResetTo10UnitsMatched = () => {
    // T-23: Matched 10 units
    setActiveBill(defaultBill);
    setNotification({
      type: 'success',
      message: 'Tagihan disesuaikan kembali menjadi 10 botol (sesuai unit accepted QC). Status: Matched (3-Way Match Lolos).'
    });
  };

  const handlePostClick = () => {
    if (activeBill.match_status === 'Variance Hold') {
      setNotification({
        type: 'error',
        message: 'Posting Ditolak! Tagihan berstatus Variance Hold. Sistem dilarang membukukan utang atas kemasan rusak yang ditolak Quality (SR-06 / T-24).'
      });
      return;
    }

    const res = postVendorBill(activeBill.id, currentUser?.name || 'Finance');
    if (res.success) {
      setActiveBill(prev => ({ ...prev, status: 'Posted', is_posted: true }));
      setNotification({ type: 'success', message: res.message });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-12</span>
            <span>·</span>
            <span>Feature F-14</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-05, SR-06 (3-Way Match Gate)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tagihan Vendor &amp; Pencocokan 3 Arah (3-Way Match)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekonsiliasi Ketat: Purchase Order (12 botol) vs QC Receipt (10 botol diterima) vs Vendor Bill
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTest12UnitsVariance}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            ⚡ Uji Tagihan 12 Unit (T-24 Variance Hold)
          </button>
          <button
            onClick={handleResetTo10UnitsMatched}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
          >
            Reset 10 Unit (T-23 Matched)
          </button>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-xs flex items-start justify-between gap-3 border ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-start gap-2">
            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${notification.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`} />
            <span className="font-medium leading-relaxed">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="font-bold text-slate-500 hover:text-slate-700">×</button>
        </div>
      )}

      {/* Main Document View (Wireframe S-12 Spec) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-6">
        {/* Statusbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-slate-900 font-mono">{activeBill.id}</span>
            <StatusBadge status={activeBill.status} />
            {activeBill.match_status === 'Variance Hold' ? (
              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-lg border border-rose-300 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4" /> Variance Hold (Selisih 2 Unit)
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> 3-Way Matched (100% Cocok)
              </span>
            )}
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-semibold text-slate-500">
            <span className={`px-3 py-1 rounded ${activeBill.status === 'Draft' ? 'bg-white text-brand-900 shadow-xs' : ''}`}>
              Draft
            </span>
            <span>→</span>
            <span className={`px-3 py-1 rounded ${activeBill.status === 'Posted' ? 'bg-emerald-600 text-white shadow-xs font-bold' : ''}`}>
              Posted
            </span>
            <span>→</span>
            <span className={`px-3 py-1 rounded ${activeBill.status === 'Paid' ? 'bg-blue-600 text-white shadow-xs' : ''}`}>
              Paid
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 py-3 border-b border-slate-100">
          {!activeBill.is_posted ? (
            <button
              onClick={handlePostClick}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                activeBill.match_status === 'Variance Hold'
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-brand-800 hover:bg-brand-900 text-white'
              }`}
            >
              <Check className="w-4 h-4" />
              Posting Tagihan Vendor (Post Vendor Bill)
            </button>
          ) : (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-xs flex items-center gap-1">
              <Check className="w-4 h-4" /> Tagihan Telah Diposting (Utang AP Diakui)
            </span>
          )}

          <button
            onClick={() => onNavigateScreen('S-13')}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition"
          >
            Buka Buku Besar (S-13)
          </button>
        </div>

        {/* Master Fields (Wireframe S-12 Page 27) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-100">
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Vendor</span>
            <span className="font-bold text-slate-900">{activeBill.vendor_name} ({activeBill.vendor_id})</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Referensi Purchase Order</span>
            <span className="font-bold text-slate-900 font-mono">{activeBill.po_reference}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Diterima Gudang (Accepted Qty)</span>
            <span className="font-bold text-emerald-700">10 / 12 botol (2 Fail di QC)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Pajak Masukan</span>
            <span className="font-bold text-slate-900">PPN efektif 11% (SR-14)</span>
          </div>
        </div>

        {/* Wireframe S-12 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-center">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Billable Qty</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              {activeBill.lines[0]?.billable_qty} × Rp15.000
            </span>
            <span className="text-[10px] text-slate-500 font-bold">
              Rp{activeBill.untaxed_amount.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">PPN Masukan (1300)</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              Rp{activeBill.tax_amount.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-slate-500">11% Efektif Per Line</span>
          </div>

          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
            <span className="text-purple-800 block text-[10px] font-semibold uppercase">Total Utang Dagang (AP)</span>
            <span className="text-2xl font-black text-purple-950 font-mono mt-1 block">
              Rp{activeBill.total_amount.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-purple-700">Mengkredit Akun 2100 Accounts Payable</span>
          </div>
        </div>

        {/* 3-Way Match Analysis Box */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <span className="font-bold text-slate-800 block mb-2">Status Rekonsiliasi Tiga Arah:</span>
          <div className="grid grid-cols-3 gap-3 text-center font-mono">
            <div className="p-2 bg-white rounded border border-slate-200">
              <span className="text-[10px] text-slate-400 block">1. PO Dipesan</span>
              <span className="font-bold text-slate-800">12 Botol</span>
            </div>
            <div className="p-2 bg-white rounded border border-slate-200">
              <span className="text-[10px] text-slate-400 block">2. QC Diterima</span>
              <span className="font-bold text-emerald-700">10 Botol (Pass)</span>
            </div>
            <div className="p-2 bg-white rounded border border-slate-200">
              <span className="text-[10px] text-slate-400 block">3. Tagihan Vendor</span>
              <span className={`font-bold ${activeBill.lines[0]?.billable_qty > 10 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {activeBill.lines[0]?.billable_qty} Botol
              </span>
            </div>
          </div>
          {activeBill.match_status === 'Variance Hold' && (
            <p className="mt-3 text-[11px] text-rose-800 bg-rose-50 p-2.5 rounded border border-rose-200 font-semibold">
              ⚠️ Peringatan: Terdapat selisih 2 botol rusak yang ditolak QC. Vendor hanya boleh dibayar untuk 10 botol (Rp166.500) sesuai aturan Kepala Finance Sari Permata (SR-06).
            </p>
          )}
        </div>

        {/* Chatter */}
        <Chatter
          documentId={activeBill.id}
          notes={[
            {
              actor: 'finance / Sari Permata',
              timestamp: '01/10/2026 11:00 WIB',
              action: `Pencocokan 3-Way Match untuk PO00003 dan WH/IN/0001`,
              details: 'Mengosongkan akun perantara GRNI (1210) dan membukukan PPN Masukan (1300) serta AP (2100).'
            }
          ]}
        />
      </div>
    </div>
  );
};
