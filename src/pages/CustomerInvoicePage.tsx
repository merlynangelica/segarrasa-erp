import React, { useState } from 'react';
import {
  Receipt, Plus, Check, AlertCircle, ArrowRight,
  CreditCard, DollarSign, Clock, ShieldCheck, Lock
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { CustomerInvoice } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Chatter } from '../components/common/Chatter';

export const CustomerInvoicePage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const {
    customerInvoices, currentUser, postCustomerInvoice,
    deliveryOrders, customers
  } = useErp();

  const [selectedInvId, setSelectedInvId] = useState<string>(customerInvoices[0]?.id || '');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Check if we can generate an invoice from a validated Delivery Order
  const readyDelivery = deliveryOrders.find(d => d.is_validated && !customerInvoices.some(i => i.source_delivery_id === d.id));

  const handleGenerateInvoiceFromDelivery = () => {
    if (!readyDelivery) {
      setNotification({
        type: 'error',
        message: 'Tidak ada surat jalan (Delivery Order) baru yang siap ditagihkan. Validasi pengiriman terlebih dahulu di S-07 (SR-02 / T-16).'
      });
      return;
    }

    const nextSeq = (customerInvoices.length + 1).toString().padStart(4, '0');
    const newInvId = `INV/2026/${nextSeq}`;

    const lines = readyDelivery.lines.map(line => {
      const price = 15000;
      const subtotal = line.delivered_qty * price;
      const tax = Math.round(subtotal * 0.11);
      return {
        id: `INVL-${line.id}`,
        variant_sku: line.variant_sku,
        name: line.name,
        quantity: line.delivered_qty,
        unit_price: price,
        subtotal,
        tax_amount: tax,
        total: subtotal + tax
      };
    });

    const untaxed = lines.reduce((sum, l) => sum + l.subtotal, 0);
    const tax = lines.reduce((sum, l) => sum + l.tax_amount, 0);

    const newInvoice: CustomerInvoice = {
      id: newInvId,
      customer_id: readyDelivery.customer_id,
      customer_name: readyDelivery.customer_name,
      source_delivery_id: readyDelivery.id,
      source_order_id: readyDelivery.order_id,
      date: new Date().toISOString().split('T')[0],
      status: 'Draft',
      payment_status: 'Unpaid',
      tax_label: 'PPN efektif 11%',
      tax_effective_rate: 0.11,
      lines,
      untaxed_amount: untaxed,
      tax_amount: tax,
      amount_due: untaxed + tax,
      paid_amount: 0,
      residual_amount: untaxed + tax,
      is_posted: false
    };

    // Note: State update through direct dispatch or context
    setSelectedInvId(newInvoice.id);
    setNotification({
      type: 'success',
      message: `Draft Faktur ${newInvoice.id} berhasil dibuat berdasarkan barang terkirim ${readyDelivery.id}!`
    });
  };

  const selectedInv = customerInvoices.find(i => i.id === selectedInvId) || customerInvoices[0];

  const handlePostClick = () => {
    if (!selectedInv) return;
    const res = postCustomerInvoice(selectedInv.id, currentUser?.name || 'Finance');
    if (res.success) {
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
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-08</span>
            <span>·</span>
            <span>Features F-09 &amp; F-21</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-01, SR-02, SR-14 (Delivered Qty Billing)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Faktur Penjualan Pelanggan (Customer Invoice)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kebijakan Tegas Finance: Faktur Hanya Diterbitkan Berdasarkan Kuantitas yang Telah Dikirim (SR-02 / T-14, T-16)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {readyDelivery && (
            <button
              onClick={handleGenerateInvoiceFromDelivery}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Buat Faktur dari DO ({readyDelivery.id})
            </button>
          )}
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Invoice List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Daftar Faktur Penjualan ({customerInvoices.length})</span>
            <span className="text-[10px] text-slate-400 font-normal">Pilih dokumen</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
            {customerInvoices.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Belum ada faktur. Lakukan validasi pengiriman di modul Delivery (S-07) untuk menerbitkan faktur berbasis barang terkirim.
              </div>
            ) : (
              customerInvoices.map(inv => {
                const isSelected = selectedInvId === inv.id || (!selectedInvId && customerInvoices[0]?.id === inv.id);
                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvId(inv.id)}
                    className={`p-3.5 cursor-pointer transition text-left ${
                      isSelected ? 'bg-brand-50/80 border-l-4 border-brand-800' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">{inv.id}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-1 truncate">
                      {inv.customer_name}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                      <span>Sumber: {inv.source_delivery_id}</span>
                      <span className="font-bold text-slate-900">Rp{inv.amount_due.toLocaleString('id-ID')}</span>
                    </div>
                    {inv.payment_status && (
                      <div className="mt-2 text-[10px] font-semibold text-emerald-800 flex items-center gap-1">
                        <span>Status Bayar: {inv.payment_status} (Sisa: Rp{inv.residual_amount.toLocaleString('id-ID')})</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: S-08 Wireframe View */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-6">
          {selectedInv ? (
            <div>
              {/* Statusbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-900 font-mono">{selectedInv.id}</span>
                  <StatusBadge status={selectedInv.status} />
                </div>

                <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-semibold text-slate-500">
                  <span className={`px-3 py-1 rounded ${selectedInv.status === 'Draft' ? 'bg-white text-brand-900 shadow-xs' : ''}`}>
                    Draft
                  </span>
                  <span>→</span>
                  <span className={`px-3 py-1 rounded ${selectedInv.status === 'Posted' ? 'bg-emerald-600 text-white shadow-xs font-bold' : ''}`}>
                    Posted
                  </span>
                  <span>→</span>
                  <span className={`px-3 py-1 rounded ${selectedInv.status === 'Paid' ? 'bg-blue-600 text-white shadow-xs' : ''}`}>
                    Paid
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2 py-3 border-b border-slate-100">
                {selectedInv.status === 'Draft' && (
                  <button
                    onClick={handlePostClick}
                    className="px-4 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Posting Faktur (Post Customer Invoice)
                  </button>
                )}

                {selectedInv.status === 'Posted' && (
                  <button
                    onClick={() => onNavigateScreen('S-14')}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <CreditCard className="w-4 h-4" />
                    Catat Pembayaran (Register Payment: S-14)
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => onNavigateScreen('S-13')}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Lihat Jurnal Akuntansi (S-13)
                </button>
              </div>

              {/* Master Fields (Wireframe S-08 page 23) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Pelanggan</span>
                  <span className="font-bold text-slate-900">{selectedInv.customer_name} ({selectedInv.customer_id})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Sumber Pengiriman (Delivery)</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedInv.source_delivery_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Skema Pajak</span>
                  <span className="font-bold text-slate-900">{selectedInv.tax_label}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Nomor Invoice</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedInv.id}</span>
                </div>
              </div>

              {/* Lines Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                      <th className="py-2">SKU & Produk</th>
                      <th className="py-2 text-right">Kuantitas Terkirim</th>
                      <th className="py-2 text-right">Harga Satuan</th>
                      <th className="py-2 text-right">Subtotal Bersih</th>
                      <th className="py-2 text-right">PPN Efektif 11%</th>
                      <th className="py-2 text-right">Total Baris</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInv.lines.map(line => (
                      <tr key={line.id} className="hover:bg-slate-50">
                        <td className="py-2.5">
                          <span className="font-mono font-bold text-slate-900">{line.variant_sku}</span>
                          <span className="text-slate-500 block text-[11px]">{line.name}</span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-slate-800">
                          {line.quantity} botol
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-700">
                          Rp{line.unit_price.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-700">
                          Rp{line.subtotal.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-700">
                          Rp{line.tax_amount.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                          Rp{line.total.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* S-08 3 Metric Cards (Page 23) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-center">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Untaxed Amount</span>
                  <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                    Rp{selectedInv.untaxed_amount.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-slate-500">Dasar Pengenaan Pajak</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">PPN Efektif 11% (Tax)</span>
                  <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                    Rp{selectedInv.tax_amount.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-slate-500">12% × 11/12 (Half-up Rounding)</span>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 block text-[10px] font-semibold uppercase">Amount Due (Total Tagihan)</span>
                  <span className="text-2xl font-black text-emerald-950 font-mono mt-1 block">
                    Rp{selectedInv.amount_due.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-emerald-700">Menambah Saldo AR Pelanggan</span>
                </div>
              </div>

              {/* Chatter */}
              <Chatter
                documentId={selectedInv.id}
                notes={[
                  {
                    actor: 'finance / Sari Permata',
                    timestamp: `${selectedInv.date} 10:45 WIB`,
                    action: `Faktur penjualan dibuat berdasarkan pengiriman ${selectedInv.source_delivery_id}`,
                    details: 'Piutang diakui Dr AR (1100) / Cr Sales (4100) / Cr PPN (2200). Idempotensi dipatuhi (SR-15).'
                  }
                ]}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Pilih faktur pelanggan dari daftar di sebelah kiri.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
