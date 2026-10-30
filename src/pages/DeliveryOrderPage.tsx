import React, { useState } from 'react';
import {
  Truck, Check, AlertCircle, ArrowRight, Package,
  Layers, FileText, CheckCircle2, ShieldCheck, Receipt
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { DeliveryOrder } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Chatter } from '../components/common/Chatter';

export const DeliveryOrderPage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const {
    deliveryOrders, currentUser, validateDeliveryOrder, products
  } = useErp();

  const [selectedDoId, setSelectedDoId] = useState<string>(deliveryOrders[0]?.id || '');
  const [deliveredQtyInput, setDeliveredQtyInput] = useState<number>(6);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedDO = deliveryOrders.find(d => d.id === selectedDoId) || deliveryOrders[0];

  const handleValidateClick = () => {
    if (!selectedDO) return;
    const firstLine = selectedDO.lines[0];
    const qtyMap: Record<string, number> = {};
    if (firstLine) {
      qtyMap[firstLine.variant_sku] = Number(deliveredQtyInput);
    }

    const res = validateDeliveryOrder(selectedDO.id, qtyMap, currentUser?.name || 'Warehouse');
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
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-07</span>
            <span>·</span>
            <span>Feature F-08</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-02, SR-04 (Partial Delivery & Backorder)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Pengiriman Barang &amp; Surat Jalan (Delivery Order)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Validasi Pengiriman Fisik Gudang, Pembentukan Backorder Otomatis, &amp; Pengakuan Beban COGS Standar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateScreen('S-08')}
            className="px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            <Receipt className="w-4 h-4" />
            Buka Faktur Penjualan (S-08)
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: DO List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Daftar Surat Jalan ({deliveryOrders.length})</span>
            <span className="text-[10px] text-slate-400 font-normal">Pilih dokumen</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
            {deliveryOrders.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Belum ada pengiriman aktif. Konfirmasi Quotation di modul Sales (S-05) untuk membentuk Delivery Order.
              </div>
            ) : (
              deliveryOrders.map(d => {
                const isSelected = selectedDoId === d.id || (!selectedDoId && deliveryOrders[0]?.id === d.id);
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDoId(d.id)}
                    className={`p-3.5 cursor-pointer transition text-left ${
                      isSelected ? 'bg-brand-50/80 border-l-4 border-brand-800' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">{d.id}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-1">
                      {d.customer_name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Sumber SO: <span className="font-mono">{d.order_id}</span> · {d.warehouse_code}
                    </div>
                    {d.is_validated && (
                      <div className="mt-2 text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Tervalidasi: {d.total_delivered_qty} unit dikirim (COGS: Rp{d.total_cogs.toLocaleString('id-ID')})
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: S-07 Wireframe Form View */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-6">
          {selectedDO ? (
            <div>
              {/* Statusbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-900 font-mono">{selectedDO.id}</span>
                  <StatusBadge status={selectedDO.status} />
                </div>

                <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-semibold text-slate-500">
                  <span className={`px-3 py-1 rounded ${selectedDO.status === 'Ready' ? 'bg-white text-brand-900 shadow-xs' : ''}`}>
                    Ready
                  </span>
                  <span>→</span>
                  <span className={`px-3 py-1 rounded ${selectedDO.status === 'Partial' ? 'bg-amber-100 text-amber-900 shadow-xs font-bold' : ''}`}>
                    Partial
                  </span>
                  <span>→</span>
                  <span className={`px-3 py-1 rounded ${selectedDO.status === 'Done' ? 'bg-emerald-600 text-white shadow-xs' : ''}`}>
                    Done
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2 py-3 border-b border-slate-100">
                {!selectedDO.is_validated ? (
                  <button
                    onClick={handleValidateClick}
                    className="px-4 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Validasi Pengiriman (Validate Delivery)
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigateScreen('S-08')}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Receipt className="w-4 h-4" />
                    Terbitkan Faktur Penjualan (S-08)
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Master Fields (Wireframe S-07) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Pesanan Asal (Order)</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedDO.order_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Pelanggan</span>
                  <span className="font-bold text-slate-900">{selectedDO.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Gudang Asal</span>
                  <span className="font-bold text-slate-900">{selectedDO.warehouse_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Tanggal Dokumen</span>
                  <span className="font-bold text-slate-900">{selectedDO.date}</span>
                </div>
              </div>

              {/* Delivery Lines Table with Partial Delivery Input (T-13) */}
              <div className="pt-2">
                <h3 className="text-xs font-bold text-slate-800 mb-2">Item Barang Yang Dikirim:</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                        <th className="py-2">SKU & Produk</th>
                        <th className="py-2 text-right">Dipesan (Ordered)</th>
                        <th className="py-2 text-right">Kuantitas Dikirim</th>
                        <th className="py-2 text-right">Sisa Backorder</th>
                        <th className="py-2 text-right">COGS Standard Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedDO.lines.map(line => (
                        <tr key={line.id} className="hover:bg-slate-50">
                          <td className="py-2.5">
                            <span className="font-mono font-bold text-slate-900">{line.variant_sku}</span>
                            <span className="text-slate-500 block text-[11px]">{line.name}</span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-slate-800">
                            {line.ordered_qty} botol
                          </td>
                          <td className="py-2.5 text-right">
                            {!selectedDO.is_validated ? (
                              <input
                                type="number"
                                min="1"
                                max={line.ordered_qty}
                                value={deliveredQtyInput}
                                onChange={e => setDeliveredQtyInput(Number(e.target.value))}
                                className="w-20 px-2 py-1 text-right font-bold bg-white border border-brand-500 rounded-md text-brand-900"
                              />
                            ) : (
                              <span className="font-bold text-emerald-800">{line.delivered_qty} botol</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right font-bold text-amber-800">
                            {!selectedDO.is_validated
                              ? Math.max(0, line.ordered_qty - deliveredQtyInput)
                              : line.backorder_qty}{' '}
                            botol
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-slate-800">
                            {!selectedDO.is_validated
                              ? `Rp${(deliveredQtyInput * line.cogs_unit).toLocaleString('id-ID')}`
                              : `Rp${line.cogs_total.toLocaleString('id-ID')}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* S-07 Wireframe Core Metric Summary (Page 22) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-center">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 block text-[10px] font-semibold uppercase">Terkirim (Delivered)</span>
                  <span className="text-2xl font-black text-emerald-950 font-mono mt-1 block">
                    {!selectedDO.is_validated ? deliveredQtyInput : selectedDO.total_delivered_qty} botol
                  </span>
                  <span className="text-[10px] text-emerald-700">Barang keluar gudang</span>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-amber-800 block text-[10px] font-semibold uppercase">Tersisa (Backorder)</span>
                  <span className="text-2xl font-black text-amber-950 font-mono mt-1 block">
                    {!selectedDO.is_validated
                      ? Math.max(0, selectedDO.lines[0]?.ordered_qty - deliveredQtyInput)
                      : selectedDO.lines[0]?.backorder_qty}{' '}
                    botol
                  </span>
                  <span className="text-[10px] text-amber-700">Belum tertagih &amp; belum terkirim</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-semibold uppercase">Beban COGS Diakui</span>
                  <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                    {!selectedDO.is_validated
                      ? `Rp${(deliveredQtyInput * 9000).toLocaleString('id-ID')}`
                      : `Rp${selectedDO.total_cogs.toLocaleString('id-ID')}`}
                  </span>
                  <span className="text-[10px] text-slate-500">Dr COGS (5100) / Cr Inv (1200)</span>
                </div>
              </div>

              {/* Chatter */}
              <Chatter
                documentId={selectedDO.id}
                notes={[
                  {
                    actor: 'warehouse / Yusuf',
                    timestamp: `${selectedDO.date} 09:30 WIB`,
                    action: `Surat jalan disiapkan untuk pesanan ${selectedDO.order_id}`,
                    details: 'Pengiriman parsial membentuk kuantitas backorder otomatis (SR-02 / T-13).'
                  }
                ]}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Pilih dokumen Surat Jalan dari daftar di sebelah kiri untuk melihat rincian.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
