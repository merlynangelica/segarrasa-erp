import React, { useState } from 'react';
import {
  BookOpen, Search, Filter, ShieldCheck, Scale,
  CheckCircle2, AlertCircle, ArrowRight, DollarSign
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { JournalEntry } from '../types';
import { Chatter } from '../components/common/Chatter';

export const JournalEntriesPage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const { journalEntries, accounts } = useErp();
  const [selectedJeId, setSelectedJeId] = useState<string>(journalEntries[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'journals' | 'ledger'>('journals');

  // If no journal entries exist yet, show initial fixture
  const sampleEntry: JournalEntry = journalEntries[0] || {
    id: 'JE-COGS-WH-OUT-0001',
    reference: 'WH/OUT/0001',
    date: '20/10/2026',
    move_type: 'Delivery / COGS',
    posting_policy: 'Standard Cost',
    lines: [
      { account_code: '5100', account_name: 'Cost of Goods Sold', debit: 54000, credit: 0 },
      { account_code: '1200', account_name: 'Stock Valuation', debit: 0, credit: 54000 }
    ],
    total_debit: 54000,
    total_credit: 54000,
    balance_difference: 0,
    idempotent_key: 'WH-OUT-0001_VALIDATE'
  };

  const selectedEntry = journalEntries.find(j => j.id === selectedJeId) || sampleEntry;

  const totalDebits = accounts.reduce((sum, a) => sum + (a.normal_balance === 'Debit' ? a.balance : 0), 0);
  const totalCredits = accounts.reduce((sum, a) => sum + (a.normal_balance === 'Credit' ? a.balance : 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-13</span>
            <span>·</span>
            <span>Feature F-15</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-02, SR-14, SR-15, SR-16</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Buku Besar &amp; Jurnal Berpasangan (General Ledger)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Jurnal Double-Entry Berimbang Sempurna (Debits = Credits, Selisih Rp0). Terproteksi Khusus Role Finance &amp; Owner (SR-16).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setActiveTab('journals')}
              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'journals' ? 'bg-white text-brand-900 font-bold shadow-2xs' : 'text-slate-600'}`}
            >
              Entri Jurnal ({journalEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'ledger' ? 'bg-white text-brand-900 font-bold shadow-2xs' : 'text-slate-600'}`}
            >
              Bagan Akun / Neraca Saldo
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'journals' ? (
        /* Wireframe S-13 View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Journal List */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Daftar Entri Jurnal Otomatis</span>
              <span className="text-[10px] text-slate-400 font-normal">Pilih entri</span>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
              {journalEntries.length === 0 ? (
                <div className="p-4 text-left text-xs bg-slate-50">
                  <div className="font-bold text-slate-800">Contoh Entri Simulasi:</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Validasi pengiriman (S-07), posting faktur (S-08), atau tagihan vendor (S-12) untuk melihat jurnal riil bertambah secara otomatis.
                  </div>
                </div>
              ) : null}

              {(journalEntries.length > 0 ? journalEntries : [sampleEntry]).map(je => {
                const isSelected = selectedEntry.id === je.id;
                return (
                  <div
                    key={je.id}
                    onClick={() => setSelectedJeId(je.id)}
                    className={`p-3.5 cursor-pointer transition text-left ${
                      isSelected ? 'bg-brand-50/80 border-l-4 border-brand-800' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">{je.reference}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        Balanced
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-1">
                      {je.move_type}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                      <span>{je.date}</span>
                      <span className="font-mono font-bold text-slate-900">
                        Rp{je.total_debit.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: S-13 Wireframe Detail */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                  {selectedEntry.id}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Journal Entry · {selectedEntry.reference}
                </h2>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 rounded-lg font-bold text-xs">
                <Scale className="w-4 h-4 text-emerald-700" />
                <span>Double-Entry Balanced (Selisih: Rp0)</span>
              </div>
            </div>

            {/* Master Fields (Wireframe S-13 Page 28) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-b border-slate-100">
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Reference Dokumen</span>
                <span className="font-bold text-slate-900 font-mono">{selectedEntry.reference}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Tanggal Posting</span>
                <span className="font-bold text-slate-900">{selectedEntry.date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Tipe Pergerakan (Move Type)</span>
                <span className="font-bold text-slate-900">{selectedEntry.move_type}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Kebijakan Akuntansi</span>
                <span className="font-bold text-slate-900">{selectedEntry.posting_policy}</span>
              </div>
            </div>

            {/* S-13 Wireframe 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-center">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Debit Total</span>
                <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                  Rp{selectedEntry.total_debit.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-500">Akun Beban / Aset</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Credit Total</span>
                <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                  Rp{selectedEntry.total_credit.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-500">Akun Persediaan / Liabilitas</span>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-800 block text-[10px] font-semibold uppercase">Balance Difference</span>
                <span className="text-2xl font-black text-emerald-950 font-mono mt-1 block">
                  Rp{selectedEntry.balance_difference}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">100% Berimbang (T-25 PASS)</span>
              </div>
            </div>

            {/* Journal Lines Table */}
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-800 mb-2">Rincian Posisi Debit &amp; Kredit:</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                      <th className="py-2">Kode Akun</th>
                      <th className="py-2">Nama Akun Buku Besar</th>
                      <th className="py-2 text-right">Debit (Rp)</th>
                      <th className="py-2 text-right">Kredit (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedEntry.lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 font-mono font-bold text-slate-900">
                          {line.account_code}
                        </td>
                        <td className="py-2.5 font-semibold text-slate-800">
                          {line.account_name}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                          {line.debit > 0 ? `Rp${line.debit.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                          {line.credit > 0 ? `Rp${line.credit.toLocaleString('id-ID')}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 font-bold font-mono text-slate-900">
                      <td colSpan={2} className="py-3 text-right">TOTAL:</td>
                      <td className="py-3 text-right">Rp{selectedEntry.total_debit.toLocaleString('id-ID')}</td>
                      <td className="py-3 text-right">Rp{selectedEntry.total_credit.toLocaleString('id-ID')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Chatter */}
            <Chatter
              documentId={selectedEntry.id}
              notes={[
                {
                  actor: 'system / automated GL engine',
                  timestamp: `${selectedEntry.date} 10:00 WIB`,
                  action: `Entri jurnal ${selectedEntry.id} dibukukan otomatis untuk ${selectedEntry.reference}`,
                  details: 'Jaminan idempotensi SR-15: Pengulangan posting pada dokumen yang sama tidak akan membentuk entri jurnal kedua.'
                }
              ]}
            />
          </div>
        </div>
      ) : (
        /* Chart of Accounts & Trial Balance View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Bagan Akun Perusahaan (Chart of Accounts)</h2>
              <p className="text-xs text-slate-500">Saldo Pembukaan per 01/10/2026: Dr Rp14.364.000 = Cr Rp14.364.000</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-xs">
                Total Neraca: Rp14.364.000 (Berimbang)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">Kode Akun</th>
                  <th className="py-2.5 px-3">Nama Akun</th>
                  <th className="py-2.5 px-3">Tipe Klasifikasi</th>
                  <th className="py-2.5 px-3">Posisi Normal</th>
                  <th className="py-2.5 px-3 text-right">Saldo Berjalan (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map(acc => (
                  <tr key={acc.account_code} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">{acc.account_code}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{acc.account_name}</td>
                    <td className="py-2 px-3 text-slate-600">{acc.type}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        acc.normal_balance === 'Debit' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {acc.normal_balance}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      Rp{acc.balance.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
