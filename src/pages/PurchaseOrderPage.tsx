import React, { useState } from 'react';
import {
  ShoppingBag, Plus, Search, Filter, Check, Clock,
  AlertCircle, ShieldCheck, ArrowRight, CheckCircle2,
  Lock, ExternalLink
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { PurchaseOrder } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { SmartButtons } from '../components/common/SmartButtons';
import { Chatter } from '../components/common/Chatter';

export const PurchaseOrderPage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const {
    purchaseOrders, vendors, products, currentUser,
    createPurchaseOrder, confirmPurchaseOrder, approvePurchaseOrder
  } = useErp();

  const [selectedPoId, setSelectedPoId] = useState<string>(purchaseOrders[0]?.id || 'PO00003');
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New PO form state
  const [newVendorId, setNewVendorId] = useState('V01');
  const [newSku, setNewSku] = useState('BVG-500-LEM');
  const [newQty, setNewQty] = useState(12);

  const selectedPo = purchaseOrders.find(p => p.id === selectedPoId) || purchaseOrders[0];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.variant_sku === newSku) || products[0];
    const cost = prod.standard_cost;

    const newPO = createPurchaseOrder({
      vendor_id: newVendorId,
      lines: [
        {
          id: `POL-${Date.now()}`,
          variant_sku: prod.variant_sku,
          name: `${prod.name} ${prod.size}`,
          quantity: Number(newQty),
          unit_cost: cost,
          subtotal: Number(newQty) * cost,
          tax_amount: Math.round(Number(newQty) * cost * 0.11),
          gross_amount: Math.round(Number(newQty) * cost * 1.11)
        }
      ]
    });

    setIsCreating(false);
    setSelectedPoId(newPO.id);
    setNotification({
      type: 'success',
      message: `Dokumen RFQ ${newPO.id} berhasil dibuat!`
    });
  };

  const handleConfirmClick = () => {
    if (!selectedPo) return;
    const res = confirmPurchaseOrder(selectedPo.id, currentUser?.name || 'Procurement');
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  const handleApproveClick = () => {
    if (!selectedPo) return;
    const res = approvePurchaseOrder(selectedPo.id, currentUser?.name || 'Owner');
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-09</span>
            <span>·</span>
            <span>Features F-11 & F-22</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-05, SR-20</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            RFQ / Purchase Order (Pengadaan)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen Permintaan Penawaran, Order Pembelian ke Vendor, & Gerbang Persetujuan Owner &gt; Rp1.000.000
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Buat RFQ Baru
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

      {/* Main Content: Split Master List and Document Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: List of POs */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col max-h-[750px]">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Daftar Purchase Orders ({purchaseOrders.length})</span>
            <span className="text-[10px] text-slate-400 font-normal">Pilih untuk detail</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {purchaseOrders.map(po => {
              const isSelected = selectedPo?.id === po.id;
              return (
                <div
                  key={po.id}
                  onClick={() => {
                    setSelectedPoId(po.id);
                    setIsCreating(false);
                  }}
                  className={`p-3.5 cursor-pointer transition text-left ${
                    isSelected ? 'bg-brand-50/80 border-l-4 border-brand-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">{po.id}</span>
                    <StatusBadge status={po.status} />
                  </div>
                  <div className="text-xs font-semibold text-slate-800 mt-1 truncate">
                    {po.vendor_name}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                    <span>{po.date}</span>
                    <span className="font-bold text-slate-900">Rp{po.gross_amount.toLocaleString('id-ID')}</span>
                  </div>
                  {po.needs_owner_approval && po.approval_status !== 'Approved by Owner' && (
                    <div className="mt-2 text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Subtotal &gt; Rp1 Jt: Butuh Approval Owner</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Document Detail Form */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          {isCreating ? (
            /* Create New RFQ Form */
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Form Permintaan Pembelian (RFQ Baru)</h2>
                  <p className="text-xs text-slate-500">Pilih vendor dan produk minuman/camilan dari master data</p>
                </div>
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pilih Vendor (Pemasok Resmi)</label>
                    <select
                      value={newVendorId}
                      onChange={e => setNewVendorId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.id} — {v.name} ({v.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pilih Varian Produk (15 SKU)</label>
                    <select
                      value={newSku}
                      onChange={e => setNewSku(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    >
                      {products.map(p => (
                        <option key={p.variant_sku} value={p.variant_sku}>
                          {p.variant_sku} — {p.name} {p.size} (Cost: Rp{p.standard_cost.toLocaleString('id-ID')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kuantitas Pesanan (Unit/Botol)</label>
                    <input
                      type="number"
                      min="1"
                      value={newQty}
                      onChange={e => setNewQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Tip: Kuantitas 70 botol BVG-500-LEM menghasilkan subtotal Rp1.050.000 (&gt; Rp1 Jt) untuk menguji SR-20 (T-18)!
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mata Uang</label>
                    <input
                      type="text"
                      disabled
                      value="IDR (Rupiah Indonesia)"
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-semibold"
                    />
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
                    Simpan RFQ Baru
                  </button>
                </div>
              </form>
            </div>
          ) : selectedPo ? (
            /* Document View of selected PO */
            <div>
              {/* Odoo-style Statusbar Lifecycle Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-900 font-mono">{selectedPo.id}</span>
                  <StatusBadge status={selectedPo.status} />
                  {selectedPo.approval_status === 'Approved by Owner' && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Disetujui Owner
                    </span>
                  )}
                </div>

                {/* Statusbar stages */}
                <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-semibold text-slate-500">
                  <span className={`px-3 py-1 rounded ${selectedPo.status === 'RFQ' ? 'bg-white text-brand-900 shadow-xs' : ''}`}>
                    RFQ
                  </span>
                  <span>→</span>
                  <span className={`px-3 py-1 rounded ${selectedPo.status === 'Pending Approval' ? 'bg-amber-200 text-amber-900 shadow-xs font-bold' : ''}`}>
                    Pending Approval
                  </span>
                  <span>→</span>
                  <span className={`px-3 py-1 rounded ${selectedPo.status === 'Purchase Order' || selectedPo.status === 'Done' ? 'bg-emerald-600 text-white shadow-xs' : ''}`}>
                    Purchase Order
                  </span>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-2 py-3 border-b border-slate-100">
                {selectedPo.status === 'RFQ' && (
                  <button
                    onClick={handleConfirmClick}
                    className="px-4 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Konfirmasi Order (Confirm PO)
                  </button>
                )}

                {selectedPo.status === 'Pending Approval' && (
                  <>
                    {currentUser?.role === 'owner' ? (
                      <button
                        onClick={handleApproveClick}
                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Setujui PO (Owner Approval: SR-20)
                      </button>
                    ) : (
                      <div className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Menunggu persetujuan Owner. Login sebagai Owner untuk menyetujui.</span>
                      </div>
                    )}
                  </>
                )}

                {selectedPo.approval_status === 'Approved by Owner' && selectedPo.status === 'Pending Approval' && (
                  <button
                    onClick={handleConfirmClick}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Lanjutkan Konfirmasi PO
                  </button>
                )}

                {selectedPo.is_confirmed && (
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => onNavigateScreen('S-10')}
                      className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Lihat Penerimaan Gudang (S-10)
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onNavigateScreen('S-11')}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Lihat QC Inbound (S-11)
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Document Master Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Vendor (Pemasok)</span>
                  <span className="font-bold text-slate-800">{selectedPo.vendor_name} ({selectedPo.vendor_id})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Tanggal Dokumen</span>
                  <span className="font-bold text-slate-800">{selectedPo.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Mata Uang</span>
                  <span className="font-bold text-slate-800">{selectedPo.currency}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Pajak Pertambahan Nilai</span>
                  <span className="font-bold text-slate-800">PPN Efektif 11% (SR-14)</span>
                </div>
              </div>

              {/* Order Lines Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                      <th className="py-2">SKU & Produk</th>
                      <th className="py-2 text-right">Kuantitas</th>
                      <th className="py-2 text-right">Harga Beli (Cost)</th>
                      <th className="py-2 text-right">Subtotal</th>
                      <th className="py-2 text-right">PPN 11%</th>
                      <th className="py-2 text-right">Total Kotor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPo.lines.map(line => (
                      <tr key={line.id} className="hover:bg-slate-50">
                        <td className="py-2.5">
                          <span className="font-mono font-bold text-slate-900">{line.variant_sku}</span>
                          <span className="text-slate-500 block text-[11px]">{line.name}</span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-slate-800">
                          {line.quantity} botol
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-700">
                          Rp{line.unit_cost.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-700">
                          Rp{line.subtotal.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-700">
                          Rp{line.tax_amount.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                          Rp{line.gross_amount.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculation Summary Footer */}
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1 text-slate-500 text-[11px]">
                  <div>* PPN dihitung per baris dibulatkan ke rupiah terdekat (12% × 11/12 = 11% efektif)</div>
                  <div>* Pembelian belum menambah stok fisik sampai barang lolos QC di gudang (T-17)</div>
                </div>

                <div className="space-y-1 sm:text-right font-mono">
                  <div className="flex justify-between sm:justify-end gap-6 text-slate-600">
                    <span>Subtotal Sebelum Pajak:</span>
                    <span className="font-bold text-slate-900">Rp{selectedPo.untaxed_amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 text-slate-600">
                    <span>PPN Efektif 11%:</span>
                    <span className="font-bold text-slate-900">Rp{selectedPo.tax_amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 text-sm font-black text-brand-900 pt-1 border-t border-slate-200">
                    <span>Total Tagihan (Gross):</span>
                    <span>Rp{selectedPo.gross_amount.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Chatter Audit Logs */}
              <Chatter
                documentId={selectedPo.id}
                notes={[
                  {
                    actor: selectedPo.approval_actor || 'seed / Procurement',
                    timestamp: selectedPo.approval_timestamp || `${selectedPo.date} 08:00 WIB`,
                    action: `Dokumen dibuat dengan status ${selectedPo.status}`,
                    details: selectedPo.needs_owner_approval ? 'Subtotal > Rp1.000.000 mewajibkan otorisasi Owner (SR-20).' : 'Di bawah ambang batas persetujuan.'
                  }
                ]}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Pilih Purchase Order dari daftar di sebelah kiri untuk melihat detail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
