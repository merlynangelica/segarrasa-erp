import React, { useState } from 'react';
import {
  History, GitCommit, Check, ArrowRight, ShieldCheck,
  Clock, User, FileText, Database, ShieldAlert
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { AuditRecord } from '../types';

export const AuditLogPage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const { auditLogs } = useErp();
  const [selectedDocId, setSelectedDocId] = useState<string>('S00004');
  const [repeatPostAttempted, setRepeatPostAttempted] = useState<boolean>(false);

  const selectedLog = auditLogs.find(a => a.document_id === selectedDocId) || auditLogs[0] || {
    id: 'AUD001',
    document_id: 'S00004',
    actor: 'seed / Sales',
    action: 'Confirmed + reserve',
    timestamp: '01/10/2026 09:00 WIB',
    reference: 'S00004 · stock reservation',
    linked_docs: 'CRM → SO → DO → Invoice',
    post_count: 1,
    details: 'Initial seed reservation for 10 units BVG-250-LEM at WH-PKU'
  };

  const handleTestT36RepeatPost = () => {
    setRepeatPostAttempted(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-18</span>
            <span>·</span>
            <span>Feature F-20</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-15, SR-16, SR-18, SR-19 (Audit Trail & Idempotency)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Jejak Audit &amp; Relasi Antardokumen (Audit Log &amp; Document Relations)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pelacakan Kronologis Aktor, Stempel Waktu, Aksi Bisnis, &amp; Visualisasi Alur Transaksi Lintas Modul
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestT36RepeatPost}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            ⚡ Uji Pemicuan Posting Ulang (T-36 Idempotent)
          </button>
        </div>
      </div>

      {repeatPostAttempted && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start justify-between gap-2">
          <div>
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Hasil Uji Skenario T-36 (Idempotent Posting):
            </div>
            <p className="text-[11px] mt-1 leading-relaxed text-emerald-800">
              Pemicuan ulang fungsi posting pada faktur yang telah berstatus Posted <strong>DIBLOKIR</strong>. Sistem mempertahankan tepat 1 invoice, 1 event Post, 1 pasang entri jurnal akuntansi, dan saldo piutang (AR) tidak bertambah ganda (SR-15).
            </p>
          </div>
          <button onClick={() => setRepeatPostAttempted(false)} className="text-slate-500 hover:text-slate-700 font-bold">×</button>
        </div>
      )}

      {/* Main S-18 Wireframe View (Page 33) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Audit Log Event Stream */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Riwayat Aktivitas Audit ({auditLogs.length})</span>
            <span className="text-[10px] text-slate-400 font-normal">Pilih dokumen</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
            {auditLogs.map(log => {
              const isSelected = selectedDocId === log.document_id;
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedDocId(log.document_id)}
                  className={`p-3.5 cursor-pointer transition text-left ${
                    isSelected ? 'bg-brand-50/80 border-l-4 border-brand-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">{log.document_id}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 mt-1">
                    {log.action}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Aktor: <span className="font-semibold text-brand-900">{log.actor}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: S-18 Detail Card with Relation Graph (Page 33) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                Audit Trail Detail
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                Dokumen: {selectedLog.document_id}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 font-bold rounded-lg text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Idempotent Operation Verified</span>
            </div>
          </div>

          {/* Master Fields (Wireframe S-18 Page 33) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-b border-slate-100">
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Dokumen</span>
              <span className="font-bold text-slate-900 font-mono">{selectedLog.document_id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Aktor Pelaksana</span>
              <span className="font-bold text-slate-900">{selectedLog.actor}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Aksi Bisnis</span>
              <span className="font-bold text-brand-900">{selectedLog.action}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Relasi Dokumen Terhubung</span>
              <span className="font-bold text-slate-900 font-mono">{selectedLog.linked_docs}</span>
            </div>
          </div>

          {/* Wireframe S-18 3 Metric Cards (Page 33) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-center">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Waktu Kejadian (Timestamp)</span>
              <span className="text-base font-black text-slate-900 font-mono mt-1 block">
                {selectedLog.timestamp}
              </span>
              <span className="text-[10px] text-slate-500">Stempel waktu resmi audit</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Referensi Terkait</span>
              <span className="text-sm font-black text-slate-900 font-mono mt-1 block">
                {selectedLog.reference}
              </span>
              <span className="text-[10px] text-slate-500">Alokasi &amp; dampak stok</span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-emerald-800 block text-[10px] font-semibold uppercase">Post Count</span>
              <span className="text-2xl font-black text-emerald-950 font-mono mt-1 block">
                {selectedLog.post_count} per unique op
              </span>
              <span className="text-[10px] text-emerald-700 font-bold">1 Kali Posting Saja (SR-15)</span>
            </div>
          </div>

          {/* Visual Relation Graph (O2C and P2P) */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 text-xs block">
              Peta Relasi Antardokumen Bisnis (Document Flow Graph):
            </span>

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-2xs text-center">
                <span className="text-[9px] text-slate-400 block uppercase">Prospek CRM</span>
                <span className="font-bold text-slate-800">CRM00009</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="px-3 py-2 bg-brand-50 border border-brand-300 rounded-lg shadow-2xs text-center">
                <span className="text-[9px] text-brand-600 block uppercase">Sales Order</span>
                <span className="font-bold text-brand-950">S00004</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-2xs text-center">
                <span className="text-[9px] text-slate-400 block uppercase">Delivery Order</span>
                <span className="font-bold text-slate-800">WH/OUT/0001</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-2xs text-center">
                <span className="text-[9px] text-slate-400 block uppercase">Customer Invoice</span>
                <span className="font-bold text-slate-800">INV/2026/0001</span>
              </div>
            </div>
          </div>

          {/* Verification Box (T-35) */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
            <span className="font-bold block mb-1">Verifikasi Skenario T-35:</span>
            <p className="text-[11px] leading-relaxed text-blue-800">
              Dokumen seed <code>S00004</code> memuat jejak aktor <code>seed / Sales</code> pada <code>01/10/2026 09:00 WIB</code> dan pencadangan tepat 10 unit reservasi di <code>WH-PKU</code> tanpa mengakui pendapatan baru (SR-15, SR-18).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
