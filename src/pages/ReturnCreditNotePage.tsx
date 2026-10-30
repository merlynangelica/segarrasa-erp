import React, { useState } from 'react';
import {
  RotateCcw, Check, AlertCircle, ArrowRight,
  ShieldCheck, RefreshCw, FileText, CheckCircle2
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { CustomerReturn } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Chatter } from '../components/common/Chatter';

export const ReturnCreditNotePage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const { customerReturns, processCustomerReturn, currentUser } = useErp();

  const [returnQtyInput, setReturnQtyInput] = useState<number>(2);
  const [inspectionStatus, setInspectionStatus] = useState<'Saleable' | 'Damaged'>('Saleable');
  const [returnStatus, setReturnStatus] = useState<'Requested' | 'Validated' | 'Credited'>('Validated');
  const [isCredited, setIsCredited] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const deliveredQtyLimit = 6; // Original delivered

  const handleProcessCreditNote = () => {
    if (isCredited) {
      setNotification({
        type: 'error',
        message: 'Idempotency Gate (T-32 / SR-15): Nota Kredit sudah diterbitkan sebelumnya. Mencegah penerbitan Credit Note ganda!'
      });
      return;
    }

    if (returnQtyInput > deliveredQtyLimit) {
      setNotification({
        type: 'error',
        message: `Validasi Batas Retur (T-32 / SR-13): Permintaan retur ${returnQtyInput} unit melebihi total barang yang pernah terkirim (${deliveredQtyLimit} unit). Permintaan ditolak!`
      });
      return;
    }

    setIsCredited(true);
    setReturnStatus('Credited');
    setNotification({
      type: 'success',
      message: 'Retur 2 unit layak jual berhasil divalidasi! Stok bertambah +2, COGS dibalik -Rp18.000, dan Nota Kredit RINV/2026/0001 diterbitkan sebesar Rp33.300 (Net Rp30.000 + PPN Rp3.300) (SR-13 / T-31).'
    });
  };

  const handleQuickTestExceedLimit = () => {
    setReturnQtyInput(7);
    setNotification({
      type: 'error',
      message: 'Uji Skenario T-32: Kuantitas retur 7 unit melampaui 6 unit delivered. Sistem menolak pemrosesan retur melebihi sisa riil (SR-13).'
    });
  };

  const untaxedCredit = returnQtyInput * 15000;
  const taxCredit = Math.round(untaxedCredit * 0.11);
  const totalCredit = untaxedCredit + taxCredit;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-16</span>
            <span>·</span>
            <span>Feature F-18</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-13, SR-14, SR-15 (Returns & Credit Note)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Retur Pelanggan &amp; Nota Kredit (Return &amp; Credit Note)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengembalian Unit Layak Jual Memulihkan Stok Fisik, Membalik Beban COGS Standar, &amp; Menyesuaikan Saldo Piutang AR
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickTestExceedLimit}
            className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold transition"
          >
            ⚡ Uji Retur Melebihi Kirim (7 dari 6 botol: T-32)
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

      {/* Main S-16 Wireframe Box (Page 31) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-6 max-w-4xl mx-auto">
        {/* Statusbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-slate-900 font-mono">RET/2026/0001</span>
            <StatusBadge status={returnStatus} />
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-semibold text-slate-500">
            <span className={`px-3 py-1 rounded ${returnStatus === 'Requested' ? 'bg-white text-brand-900 shadow-xs' : ''}`}>
              Requested
            </span>
            <span>→</span>
            <span className={`px-3 py-1 rounded ${returnStatus === 'Validated' ? 'bg-amber-100 text-amber-900 shadow-xs font-bold' : ''}`}>
              Validated
            </span>
            <span>→</span>
            <span className={`px-3 py-1 rounded ${returnStatus === 'Credited' ? 'bg-emerald-600 text-white shadow-xs font-bold' : ''}`}>
              Credited
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 py-3 border-b border-slate-100">
          {!isCredited ? (
            <button
              onClick={handleProcessCreditNote}
              className="px-4 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              Proses Retur &amp; Terbitkan Nota Kredit (SR-13)
            </button>
          ) : (
            <button
              onClick={handleProcessCreditNote}
              className="px-4 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              Uji Kredit Ganda (T-32 Idempotent)
            </button>
          )}

          <button
            onClick={() => onNavigateScreen('S-13')}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition"
          >
            Lihat Pembalikan Jurnal (S-13)
          </button>
        </div>

        {/* Master Fields (Wireframe S-16 Page 31) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-b border-slate-100">
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Pengiriman Asal (Delivery)</span>
            <span className="font-bold text-slate-900 font-mono">6 × BVG-250-LEM</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Kuantitas Retur</span>
            <span className="font-bold text-brand-900">{returnQtyInput} botol</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Hasil Inspeksi Fisik</span>
            <span className="font-bold text-emerald-700">Saleable (Layak Jual Kembali)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Nomor Nota Kredit</span>
            <span className="font-bold text-slate-900 font-mono">RINV/2026/0001</span>
          </div>
        </div>

        {/* Wireframe S-16 3 Metric Cards (Page 31) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-center">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Untaxed Credit</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              Rp{untaxedCredit.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-slate-500">Dasar Pengurangan Nilai Penjualan</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Tax Credit (PPN 11%)</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              Rp{taxCredit.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-slate-500">Pembalikan PPN Keluaran</span>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-emerald-800 block text-[10px] font-semibold uppercase">Refund / AR Adjustment</span>
            <span className="text-2xl font-black text-emerald-950 font-mono mt-1 block">
              Rp{totalCredit.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold">Mengurangi Saldo Piutang Toko Melati</span>
          </div>
        </div>

        {/* Chatter */}
        <Chatter
          documentId="RET/2026/0001"
          notes={[
            {
              actor: 'finance / Sari Permata',
              timestamp: '01/10/2026 14:00 WIB',
              action: 'Retur 2 unit Sparkling Lemon diproses dengan Nota Kredit RINV/2026/0001',
              details: 'Barang layak jual dikembalikan ke stok gudang WH-PKU (+2 unit), COGS dibalik -Rp18.000, dan piutang disesuaikan (SR-13).'
            }
          ]}
        />
      </div>
    </div>
  );
};
