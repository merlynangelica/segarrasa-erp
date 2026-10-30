import React, { useState } from 'react';
import {
  Inbox, Check, AlertCircle, ArrowRight, ShieldCheck,
  CheckCircle2, ShoppingBag, AlertTriangle, Layers
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { Receipt } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Chatter } from '../components/common/Chatter';

export const ReceiptPage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const { receipts, validateReceipt, currentUser } = useErp();
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>(receipts[0]?.id || '');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedRC = receipts.find(r => r.id === selectedReceiptId) || receipts[0];

  const handleValidateClick = () => {
    if (!selectedRC) return;
    const res = validateReceipt(selectedRC.id, currentUser?.name || 'Warehouse');
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
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-10</span>
            <span>·</span>
            <span>Feature F-12</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-04, SR-06, SR-11 (Accepted Qty Inbound)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Penerimaan Barang Gudang (Receipt &amp; Accepted Qty)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Penerimaan Fisik dari Purchase Order Terintegrasi Hasil QC. Hanya Unit Accepted yang Menambah Stok Gudang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateScreen('S-11')}
            className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Buka Lembar Uji QC (S-11)
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
        {/* Left: Receipts List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Daftar Penerimaan ({receipts.length})</span>
            <span className="text-[10px] text-slate-400 font-normal">Pilih dokumen</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
            {receipts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Belum ada dokumen penerimaan. Konfirmasi PO di modul Purchase (S-09) untuk membentuk Receipt gudang.
              </div>
            ) : (
              receipts.map(rc => {
                const isSelected = selectedReceiptId === rc.id || (!selectedReceiptId && receipts[0]?.id === rc.id);
                return (
                  <div
                    key={rc.id}
                    onClick={() => setSelectedReceiptId(rc.id)}
                    className={`p-3.5 cursor-pointer transition text-left ${
                      isSelected ? 'bg-brand-50/80 border-l-4 border-brand-800' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">{rc.id}</span>
                      <StatusBadge status={rc.status} />
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-1">
                      Ref PO: {rc.po_id}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Gudang: {rc.warehouse_code} · {rc.date}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Wireframe S-10 View */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-6">
          {selectedRC ? (
            <div>
              {/* Statusbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-900 font-mono">{selectedRC.id}</span>
                  <StatusBadge status={selectedRC.status} />
                </div>

                <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-semibold text-slate-500">
                  <span className={`px-3 py-1 rounded ${selectedRC.status === 'Waiting' ? 'bg-white text-brand-900 shadow-xs' : ''}`}>
                    Waiting
                  </span>
                  <span>→</span>
                  <span className={`px-3 py-1 rounded ${selectedRC.status === 'Quality Hold' ? 'bg-amber-100 text-amber-900 shadow-xs font-bold' : ''}`}>
                    Quality Hold
                  </span>
                  <span>→</span>
                  <span className={`px-3 py-1 rounded ${selectedRC.status === 'Done' ? 'bg-emerald-600 text-white shadow-xs font-bold' : ''}`}>
                    Done
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2 py-3 border-b border-slate-100">
                {!selectedRC.is_validated ? (
                  <button
                    onClick={handleValidateClick}
                    className="px-4 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    Validasi Penerimaan Barang (Validate Receipt)
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigateScreen('S-12')}
                    className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Cocokkan Tagihan Vendor 3-Way Match (S-12)
                  </button>
                )}

                <button
                  onClick={() => onNavigateScreen('S-11')}
                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-lg text-xs font-semibold transition"
                >
                  Lihat QC Inbound (S-11)
                </button>
              </div>

              {/* Master Fields (Wireframe S-10) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Purchase Order</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedRC.po_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Gudang Penerima</span>
                  <span className="font-bold text-slate-900">{selectedRC.warehouse_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">SKU Produk</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedRC.lines[0]?.variant_sku}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Kuantitas Dipesan</span>
                  <span className="font-bold text-slate-900">{selectedRC.lines[0]?.ordered_qty} botol</span>
                </div>
              </div>

              {/* Wireframe S-10 3-Metric Block: Inspected, Accepted, Rejected */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-center">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Diperiksa (Inspected)</span>
                  <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                    {selectedRC.lines[0]?.inspected_qty || selectedRC.lines[0]?.ordered_qty} botol
                  </span>
                  <span className="text-[10px] text-slate-500">Pemeriksaan fisik oleh QC</span>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 block text-[10px] font-semibold uppercase">Diterima (Accepted)</span>
                  <span className="text-2xl font-black text-emerald-950 font-mono mt-1 block">
                    {selectedRC.lines[0]?.accepted_qty || 10} botol
                  </span>
                  <span className="text-[10px] text-emerald-700">Masuk On Hand gudang (+Rp150.000)</span>
                </div>

                <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-rose-800 block text-[10px] font-semibold uppercase">Ditolak (Rejected)</span>
                  <span className="text-2xl font-black text-rose-950 font-mono mt-1 block">
                    {selectedRC.lines[0]?.rejected_qty || 2} botol
                  </span>
                  <span className="text-[10px] text-rose-700">Diisolasi (Segel rusak) · Tidak masuk stok</span>
                </div>
              </div>

              {/* Chatter */}
              <Chatter
                documentId={selectedRC.id}
                notes={[
                  {
                    actor: 'warehouse / Yusuf',
                    timestamp: `${selectedRC.date} 10:30 WIB`,
                    action: `Penerimaan barang dicatat untuk pesanan ${selectedRC.po_id}`,
                    details: 'Unit yang lulus QC menambah stok layak jual dan mengkredit akun GRNI perantara (SR-06, SR-11 / T-19).'
                  }
                ]}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Pilih dokumen penerimaan dari daftar di sebelah kiri.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
