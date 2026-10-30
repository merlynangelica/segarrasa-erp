import React, { useState } from 'react';
import {
  FileText, Plus, Search, Check, AlertCircle,
  Clock, ShieldCheck, Lock, ArrowRight, Truck,
  Receipt, Percent
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { SalesOrder } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Chatter } from '../components/common/Chatter';

export const QuotationSalesOrderPage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const {
    salesOrders, customers, products, currentUser,
    createQuotation, confirmSalesOrder, approveSalesOrderDiscount,
    calculateCreditExposure
  } = useErp();

  const [selectedSoId, setSelectedSoId] = useState<string>(salesOrders[0]?.id || 'S00004');
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Quotation form
  const [customerId, setCustomerId] = useState('C01');
  const [sku, setSku] = useState('BVG-250-LEM');
  const [quantity, setQuantity] = useState(8);
  const [discountPct, setDiscountPct] = useState(0);

  const selectedSo = salesOrders.find(s => s.id === selectedSoId) || salesOrders[0];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.variant_sku === sku) || products[0];

    const newSO = createQuotation({
      customer_id: customerId,
      lines: [
        {
          id: `L-${Date.now()}`,
          variant_sku: prod.variant_sku,
          name: `${prod.name} ${prod.size}`,
          quantity: Number(quantity),
          unit_price: prod.sales_price,
          discount_pct: Number(discountPct),
          subtotal: Math.round(Number(quantity) * prod.sales_price * (1 - Number(discountPct) / 100)),
          tax_amount: Math.round(Number(quantity) * prod.sales_price * (1 - Number(discountPct) / 100) * 0.11),
          total: Math.round(Number(quantity) * prod.sales_price * (1 - Number(discountPct) / 100) * 1.11)
        }
      ]
    });

    setIsCreating(false);
    setSelectedSoId(newSO.id);
    setNotification({
      type: 'success',
      message: `Penawaran ${newSO.id} berhasil dibuat!`
    });
  };

  const handleConfirmClick = () => {
    if (!selectedSo) return;
    const res = confirmSalesOrder(selectedSo.id, currentUser?.name || 'Sales');
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  const handleApproveDiscount = () => {
    if (!selectedSo) return;
    const res = approveSalesOrderDiscount(selectedSo.id, currentUser?.name || 'Owner');
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  const custExp = selectedSo ? calculateCreditExposure(selectedSo.customer_id) : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-05</span>
            <span>·</span>
            <span>Features F-05 & F-06</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-01, SR-02, SR-07, SR-08</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quotation &amp; Sales Order (Penjualan)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Siklus Penawaran ke Pesanan Penjualan, Tata Kelola Diskon &gt; 10%, &amp; Penguncian Angka Pasca-Konfirmasi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Buat Penawaran Baru
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

      {/* Main Grid: Split List and Detail Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Orders List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col max-h-[750px]">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Daftar Pesanan ({salesOrders.length})</span>
            <span className="text-[10px] text-slate-400 font-normal">Pilih untuk detail</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {salesOrders.map(so => {
              const isSelected = selectedSo?.id === so.id;
              return (
                <div
                  key={so.id}
                  onClick={() => {
                    setSelectedSoId(so.id);
                    setIsCreating(false);
                  }}
                  className={`p-3.5 cursor-pointer transition text-left ${
                    isSelected ? 'bg-brand-50/80 border-l-4 border-brand-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">{so.id}</span>
                    <StatusBadge status={so.status} />
                  </div>
                  <div className="text-xs font-semibold text-slate-800 mt-1 truncate">
                    {so.customer_name}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                    <span>{so.date}</span>
                    <span className="font-bold text-slate-900">Rp{so.total_amount.toLocaleString('id-ID')}</span>
                  </div>
                  {so.approval_status === 'Pending Owner Approval' && (
                    <div className="mt-2 text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Diskon &gt; 10%: Butuh Approval Owner</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Document View or Create Form */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          {isCreating ? (
            /* Create Form */
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Buat Penawaran Penjualan (Quotation)</h2>
                  <p className="text-xs text-slate-500">Pilih pelanggan, produk, dan opsi diskon</p>
                </div>
                <button onClick={() => setIsCreating(false)} className="px-3 py-1.5 text-xs text-slate-600">Batal</button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pelanggan</label>
                    <select
                      value={customerId}
                      onChange={e => setCustomerId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.id} — {c.name} (Limit: Rp{c.credit_limit.toLocaleString('id-ID')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pilih Produk</label>
                    <select
                      value={sku}
                      onChange={e => setSku(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    >
                      {products.map(p => (
                        <option key={p.variant_sku} value={p.variant_sku}>
                          {p.variant_sku} — {p.name} {p.size} (Rp{p.sales_price.toLocaleString('id-ID')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kuantitas Pesanan</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Tip: Kuantitas 8 unit Sparkling Lemon (T-09).
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Diskon Komersial (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={discountPct}
                      onChange={e => setDiscountPct(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-brand-900"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      * Diskon &gt; 10% (misal 20%) membutuhkan persetujuan Owner (SR-08 / T-10).
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold transition"
                  >
                    Simpan Penawaran
                  </button>
                </div>
              </form>
            </div>
          ) : selectedSo ? (
            /* Document View (Wireframe S-05) */
            <div>
              {/* Statusbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-900 font-mono">{selectedSo.id}</span>
                  <StatusBadge status={selectedSo.status} />
                  {selectedSo.is_confirmed && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded border border-slate-300 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" /> Terkunci (Locked: SR-08)
                    </span>
                  )}
                </div>

                <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-semibold text-slate-500">
                  <span className={`px-3 py-1 rounded ${selectedSo.status === 'Quotation' ? 'bg-white text-brand-900 shadow-xs' : ''}`}>
                    Quotation
                  </span>
                  <span>→</span>
                  <span className={`px-3 py-1 rounded ${selectedSo.status === 'Sales Order' ? 'bg-emerald-600 text-white shadow-xs' : ''}`}>
                    Sales Order
                  </span>
                  <span>→</span>
                  <span className={`px-3 py-1 rounded ${selectedSo.is_confirmed ? 'bg-slate-700 text-white shadow-xs' : ''}`}>
                    Locked
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2 py-3 border-b border-slate-100">
                {!selectedSo.is_confirmed && (
                  <button
                    onClick={handleConfirmClick}
                    className="px-4 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Konfirmasi Penjualan (Confirm SO)
                  </button>
                )}

                {selectedSo.approval_status === 'Pending Owner Approval' && (
                  <>
                    {currentUser?.role === 'owner' ? (
                      <button
                        onClick={handleApproveDiscount}
                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Setujui Diskon &gt; 10% (Owner Approval)
                      </button>
                    ) : (
                      <div className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Diskon &gt; 10% memerlukan persetujuan Owner sebelum Confirmed (SR-08).</span>
                      </div>
                    )}
                  </>
                )}

                {selectedSo.is_confirmed && (
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => onNavigateScreen('S-07')}
                      className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Lihat Dokumen Pengiriman (S-07)
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onNavigateScreen('S-06')}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      Lihat Reservasi Gudang (S-06)
                    </button>
                  </div>
                )}
              </div>

              {/* Master Fields (Wireframe S-05) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Pelanggan</span>
                  <span className="font-bold text-slate-900">{selectedSo.customer_name} ({selectedSo.customer_id})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Tanggal Pesanan</span>
                  <span className="font-bold text-slate-900">{selectedSo.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Eksposur Kredit Saat Ini</span>
                  <span className="font-bold text-slate-900">
                    Rp{custExp?.totalExposure.toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Sisa Plafon (Headroom)</span>
                  <span className="font-bold text-emerald-700">
                    Rp{custExp?.headroom.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Lines Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                      <th className="py-2">SKU & Produk</th>
                      <th className="py-2 text-right">Kuantitas</th>
                      <th className="py-2 text-right">Harga Satuan</th>
                      <th className="py-2 text-right">Diskon</th>
                      <th className="py-2 text-right">Subtotal</th>
                      <th className="py-2 text-right">PPN 11%</th>
                      <th className="py-2 text-right">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSo.lines.map(line => (
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
                        <td className="py-2.5 text-right font-bold text-slate-700">
                          {line.discount_pct}%
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

              {/* Total Calculation Footer */}
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="text-slate-500 text-[11px] space-y-0.5">
                  <div>* Formula PPN Efektif: 12% × 11/12 = 11% dibulatkan ke rupiah terdekat per line (SR-14)</div>
                  <div>* Setelah Confirmed, harga dan diskon terkunci dari perubahan langsung (SR-08)</div>
                </div>

                <div className="space-y-1 sm:text-right font-mono">
                  <div className="flex justify-between sm:justify-end gap-6 text-slate-600">
                    <span>Subtotal Bersih (Net):</span>
                    <span className="font-bold text-slate-900">Rp{selectedSo.untaxed_amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 text-slate-600">
                    <span>PPN Efektif 11%:</span>
                    <span className="font-bold text-slate-900">Rp{selectedSo.tax_amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 text-sm font-black text-brand-900 pt-1 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span>Rp{selectedSo.total_amount.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Chatter */}
              <Chatter
                documentId={selectedSo.id}
                notes={selectedSo.revision_history}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
