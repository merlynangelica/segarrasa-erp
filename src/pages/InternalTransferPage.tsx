import React, { useState } from 'react';
import {
  ArrowLeftRight, Check, AlertCircle, ArrowRight,
  ShieldCheck, Package, Layers, RefreshCw
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { StockTransfer } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Chatter } from '../components/common/Chatter';

export const InternalTransferPage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const { stock, executeStockTransfer, currentUser } = useErp();

  // Baseline data for TEA-350-ORI
  const teaStock = stock.find(s => s.variant_sku === 'TEA-350-ORI') || {
    variant_sku: 'TEA-350-ORI',
    wh_qty: 60,
    out_qty: 18,
    total_qty: 78,
    standard_value: 546000
  };

  const [quantity, setQuantity] = useState<number>(5);
  const [transferStatus, setTransferStatus] = useState<'Draft' | 'Ready' | 'Done'>('Ready');
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExecuteTransfer = () => {
    // Skenario T-30: Second validate attempt on already Done transfer
    if (hasExecuted) {
      setNotification({
        type: 'error',
        message: 'Idempotency Gate (T-30 / SR-15): Transfer sudah berstatus Done. Penekanan kedua kali ditolak dan saldo tetap bergeser 5 unit, bukan 10 unit!'
      });
      return;
    }

    const res = executeStockTransfer('TR-001', currentUser?.name || 'Warehouse');
    setHasExecuted(true);
    setTransferStatus('Done');
    setNotification({
      type: 'success',
      message: 'Transfer 5 botol TEA-350-ORI berhasil! Stok WH-PKU turun 60 ➔ 55, OUT-MRP naik 18 ➔ 23. Total stok perusahaan tetap 78 unit (SR-12 / T-29).'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-15</span>
            <span>·</span>
            <span>Feature F-17</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-12, SR-15 (Internal Transfer & Aggregation)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Transfer Stok Antar-Gudang (Internal Stock Transfer)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mutasi Fisik antara Gudang Utama (WH-PKU) &amp; Titik Ambil Marpoyan (OUT-MRP) Menjaga Nilai Valuasi Total Perusahaan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateScreen('S-03')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
          >
            Lihat Katalog Stok (S-03)
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

      {/* Main S-15 Wireframe Box (Page 30) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-6 max-w-4xl mx-auto">
        {/* Statusbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-slate-900 font-mono">WH/INT/0001</span>
            <StatusBadge status={transferStatus} />
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-semibold text-slate-500">
            <span className={`px-3 py-1 rounded ${transferStatus === 'Draft' ? 'bg-white text-brand-900 shadow-xs' : ''}`}>
              Draft
            </span>
            <span>→</span>
            <span className={`px-3 py-1 rounded ${transferStatus === 'Ready' ? 'bg-white text-brand-900 shadow-xs' : ''}`}>
              Ready
            </span>
            <span>→</span>
            <span className={`px-3 py-1 rounded ${transferStatus === 'Done' ? 'bg-emerald-600 text-white shadow-xs font-bold' : ''}`}>
              Done
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 py-3 border-b border-slate-100">
          <button
            onClick={handleExecuteTransfer}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
              hasExecuted
                ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                : 'bg-brand-800 hover:bg-brand-900 text-white'
            }`}
          >
            <Check className="w-4 h-4" />
            {hasExecuted ? 'Uji Validasi Kedua Kali (T-30 Idempotency)' : 'Validasi Transfer (Validate Transfer)'}
          </button>
        </div>

        {/* Master Fields (Wireframe S-15 Page 30) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-b border-slate-100">
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">SKU Produk</span>
            <span className="font-bold text-slate-900 font-mono">TEA-350-ORI</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Lokasi Asal (From)</span>
            <span className="font-bold text-slate-900">WH-PKU (Gudang Utama)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Lokasi Tujuan (To)</span>
            <span className="font-bold text-slate-900">OUT-MRP (Titik Ambil)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Kuantitas Transfer</span>
            <span className="font-bold text-brand-900">{quantity} botol</span>
          </div>
        </div>

        {/* Wireframe S-15 3 Metric Cards (Page 30) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-center">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">WH On Hand</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              {!hasExecuted ? '60' : '55'} <span className="text-xs text-slate-400 font-normal">botol</span>
            </span>
            <span className="text-[10px] text-slate-500">
              {!hasExecuted ? 'Stok awal gudang' : '60 ➔ 55 (-5 unit)'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Outlet On Hand</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              {!hasExecuted ? '18' : '23'} <span className="text-xs text-slate-400 font-normal">botol</span>
            </span>
            <span className="text-[10px] text-slate-500">
              {!hasExecuted ? 'Stok awal outlet' : '18 ➔ 23 (+5 unit)'}
            </span>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-emerald-800 block text-[10px] font-semibold uppercase">Company Total (Agregat)</span>
            <span className="text-2xl font-black text-emerald-950 font-mono mt-1 block">
              78 <span className="text-xs text-emerald-700 font-normal">botol</span>
            </span>
            <span className="text-[10px] text-emerald-700 font-bold">Total &amp; Valuasi Tidak Berubah (SR-12)</span>
          </div>
        </div>

        {/* Chatter */}
        <Chatter
          documentId="WH/INT/0001"
          notes={[
            {
              actor: 'warehouse / Yusuf',
              timestamp: '01/10/2026 13:00 WIB',
              action: 'Transfer stok antar-lokasi TEA-350-ORI disiapkan',
              details: 'Memindahkan fisik barang tanpa mengubah laba rugi atau nilai total persediaan (SR-12).'
            }
          ]}
        />
      </div>
    </div>
  );
};
