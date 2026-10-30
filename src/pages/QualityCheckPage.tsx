import React, { useState } from 'react';
import {
  CheckCircle2, AlertTriangle, Shield, Check, X,
  User, Clock, ArrowRight, AlertCircle, ShoppingBag,
  Lock, RefreshCw
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { QualityCheck } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Chatter } from '../components/common/Chatter';

export const QualityCheckPage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const {
    qualityChecks, currentUser, recordQualityCheck, receipts, purchaseOrders
  } = useErp();

  const [selectedQcId, setSelectedQcId] = useState<string>(qualityChecks[0]?.id || 'QC00001');
  const [passedInput, setPassedInput] = useState<number>(10);
  const [failedInput, setFailedInput] = useState<number>(2);
  const [failReasonInput, setFailReasonInput] = useState<string>('Segel rusak pada 2 botol');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedQc = qualityChecks.find(q => q.id === selectedQcId) || qualityChecks[0];

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQc) return;

    // Check Role Authority (SR-11, T-22)
    if (currentUser?.role === 'procurement') {
      setNotification({
        type: 'error',
        message: 'Akses Ditolak! Role Procurement dilarang mengubah hasil inspeksi kualitas atau menyatakan unit gagal menjadi diterima (SR-06, SR-11 / T-22).'
      });
      return;
    }

    const res = recordQualityCheck(
      selectedQc.id,
      Number(passedInput),
      Number(failedInput),
      failReasonInput,
      currentUser?.name || 'Tika / Quality'
    );

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
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-11</span>
            <span>·</span>
            <span>Feature F-13</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-06, SR-11 (QC Pass/Fail Gate)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Pemeriksaan Kualitas Barang Masuk (QC Inbound)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspeksi Segel, Botol Pecah, & Kuantitas Layak Terima F&B Sebelum Masuk Stok Komersial
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Penanggung Jawab: <strong className="text-slate-800">Tika Maharani (Quality Lead)</strong>
          </span>
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

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: QC List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Daftar Pemeriksaan QC ({qualityChecks.length})</span>
            <span className="text-[10px] text-slate-400 font-normal">Pilih dokumen</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
            {qualityChecks.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Belum ada antrean QC. Buat dan konfirmasi PO terlebih dahulu.
              </div>
            ) : (
              qualityChecks.map(qc => {
                const isSelected = selectedQcId === qc.id;
                return (
                  <div
                    key={qc.id}
                    onClick={() => setSelectedQcId(qc.id)}
                    className={`p-3.5 cursor-pointer transition text-left ${
                      isSelected ? 'bg-brand-50/80 border-l-4 border-brand-800' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">{qc.id}</span>
                      <StatusBadge status={qc.status} />
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-1">
                      {qc.product_name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Ref PO: <span className="font-mono">{qc.reference_po}</span>
                    </div>
                    {qc.inspected_qty > 0 && (
                      <div className="flex items-center gap-2 mt-2 text-[10px] font-semibold">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Pass: {qc.passed_qty}
                        </span>
                        {qc.failed_qty > 0 && (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Fail: {qc.failed_qty}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Inspection Form & Details (Wireframe S-11) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-6">
          {selectedQc ? (
            <div>
              {/* Lifecycle statusbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-900 font-mono">{selectedQc.id}</span>
                  <StatusBadge status={selectedQc.status} />
                </div>

                <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-semibold text-slate-500">
                  <span className={`px-3 py-1 rounded ${selectedQc.status === 'To Do' ? 'bg-white text-brand-900 shadow-xs' : ''}`}>
                    To Do
                  </span>
                  <span>→</span>
                  <span className={`px-3 py-1 rounded ${selectedQc.status === 'Passed / Failed' ? 'bg-amber-100 text-amber-900 shadow-xs font-bold' : ''}`}>
                    Passed / Failed
                  </span>
                  <span>→</span>
                  <span className={`px-3 py-1 rounded ${selectedQc.status === 'Closed' ? 'bg-emerald-600 text-white shadow-xs' : ''}`}>
                    Closed
                  </span>
                </div>
              </div>

              {/* Master Header Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Referensi PO / QC</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedQc.reference_po} / {selectedQc.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Produk Diperiksa</span>
                  <span className="font-bold text-slate-900">{selectedQc.product_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Tipe Pemeriksaan</span>
                  <span className="font-bold text-slate-900">{selectedQc.check_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Inspektur Bertugas</span>
                  <span className="font-bold text-slate-900">{selectedQc.inspector}</span>
                </div>
              </div>

              {/* Inspection Entry Form (T-21 & T-22) */}
              <form onSubmit={handleRecordSubmit} className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-700" />
                  Lembar Kerja Hasil Uji Fisik Kemasan (S-11):
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                    <label className="block font-bold text-emerald-950 mb-1">
                      Kuantitas Lolos Uji (Passed Quantity)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={passedInput}
                      onChange={e => setPassedInput(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg font-bold text-sm text-emerald-900"
                    />
                    <span className="text-[10px] text-emerald-700 mt-1 block">
                      * Unit lulus akan masuk ke stok layak jual On-Hand gudang (SR-11).
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                    <label className="block font-bold text-rose-950 mb-1">
                      Kuantitas Gagal Uji (Failed Quantity)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={failedInput}
                      onChange={e => setFailedInput(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg font-bold text-sm text-rose-900"
                    />
                    <span className="text-[10px] text-rose-700 mt-1 block">
                      * DITOLAK: Tidak masuk stok jual dan tidak boleh ditagihkan vendor (SR-06).
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alasan Penolakan (Fail Reason)
                  </label>
                  <input
                    type="text"
                    value={failReasonInput}
                    onChange={e => setFailReasonInput(e.target.value)}
                    placeholder="contoh: Segel rusak / botol penyok / bocor..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                {/* Role Permission Hint for T-22 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Pengujian Aturan Bisnis (T-22):</strong> Jika Anda login sebagai Procurement dan berupaya merevisi unit Fail menjadi 0 (menerima semua barang rusak), sistem akan memblokir tindakan ini secara ketat demi menegakkan SR-06 & SR-11.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Simpan Hasil Pemeriksaan QC
                  </button>
                </div>
              </form>

              {/* Summary Cards of Current Record */}
              {selectedQc.inspected_qty > 0 && (
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-semibold">Total Diperiksa</span>
                    <span className="text-base font-black text-slate-800">{selectedQc.inspected_qty} botol</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-emerald-700 block text-[10px] font-semibold">Lulus (Accepted)</span>
                    <span className="text-base font-black text-emerald-900">{selectedQc.passed_qty} botol</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-rose-700 block text-[10px] font-semibold">Gagal (Rejected)</span>
                    <span className="text-base font-black text-rose-900">{selectedQc.failed_qty} botol</span>
                  </div>
                </div>
              )}

              {/* Chatter */}
              <Chatter
                documentId={selectedQc.id}
                notes={[
                  {
                    actor: selectedQc.inspector,
                    timestamp: `${selectedQc.date} 10:15 WIB`,
                    action: `Pemeriksaan kualitas dicatat: ${selectedQc.passed_qty} Pass, ${selectedQc.failed_qty} Fail`,
                    details: selectedQc.failed_qty > 0 ? `Alasan penolakan: ${selectedQc.fail_reason}. Unit diisolasi di area karantina gudang.` : 'Seluruh barang dalam kondisi prima.'
                  }
                ]}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Pilih dokumen QC untuk melihat rincian pemeriksaan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
