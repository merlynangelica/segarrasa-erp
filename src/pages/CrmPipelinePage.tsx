import React, { useState } from 'react';
import {
  Kanban, Plus, Check, AlertCircle, ArrowRight,
  TrendingUp, Users, FileText, Clock, Sparkles
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { CRMLead } from '../types';
import { Chatter } from '../components/common/Chatter';

export const CrmPipelinePage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const {
    crmLeads, updateCrmStage, convertCrmToQuotation, currentUser,
    accounts
  } = useErp();

  const [selectedLeadId, setSelectedLeadId] = useState<string>('CRM00009');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedLead = crmLeads.find(l => l.id === selectedLeadId) || crmLeads[0];

  const handleStageChange = (newStage: 'New' | 'Qualified' | 'Won' | 'Lost') => {
    if (!selectedLead) return;
    updateCrmStage(selectedLead.id, newStage, currentUser?.name || 'Sales');
    setNotification({
      type: 'success',
      message: `Peluang ${selectedLead.id} berhasil dipindahkan ke tahap "${newStage}"! (Buku besar & revenue baru tetap Rp0: SR-18 / T-07).`
    });
  };

  const handleConvertToQuotation = () => {
    if (!selectedLead) return;
    const res = convertCrmToQuotation(selectedLead.id);
    if (res.success) {
      setNotification({
        type: 'success',
        message: `${res.message} Anda sekarang dapat meninjau penawaran di modul Sales (S-05).`
      });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  const leadsByStage = {
    New: crmLeads.filter(l => l.stage === 'New'),
    Qualified: crmLeads.filter(l => l.stage === 'Qualified'),
    Won: crmLeads.filter(l => l.stage === 'Won'),
    Lost: crmLeads.filter(l => l.stage === 'Lost')
  };

  const currentRevenue = accounts.find(a => a.account_code === '4100')?.balance || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-04</span>
            <span>·</span>
            <span>Feature F-04</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-18 (Lead to Opportunity Pipeline)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Pipeline Prospek Pelanggan (CRM Pipeline)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pelacakan Jejak Prospek dari Lead ke Sales Order. Tidak Mengakui Pendapatan Sebelum Faktur Ter-Posting (SR-18 / T-07, T-08).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateScreen('S-05')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
          >
            Buka Modul Sales (S-05)
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

      {/* Wireframe S-04 Kanban Board (Page 19) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column New */}
        <div className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider">New (Baru)</span>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full font-bold text-[10px]">
              {leadsByStage.New.length}
            </span>
          </div>
          <div className="space-y-3 flex-1">
            {leadsByStage.New.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Tidak ada prospek di tahap ini.
              </div>
            ) : (
              leadsByStage.New.map(l => (
                <div
                  key={l.id}
                  onClick={() => setSelectedLeadId(l.id)}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:border-brand-500 transition"
                >
                  <span className="font-mono font-bold text-xs text-brand-900">{l.id}</span>
                  <div className="font-bold text-xs text-slate-800 mt-1">{l.customer_name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Produk: {l.expected_sku} ({l.quantity} botol)</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column Qualified (Initial Seed CRM00009 is here) */}
        <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-200 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-blue-200 text-xs">
            <span className="font-bold text-blue-900 uppercase tracking-wider">Qualified (Terkualifikasi)</span>
            <span className="px-2 py-0.5 bg-blue-200 text-blue-900 rounded-full font-bold text-[10px]">
              {leadsByStage.Qualified.length}
            </span>
          </div>
          <div className="space-y-3 flex-1">
            {leadsByStage.Qualified.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Tidak ada prospek di tahap ini.
              </div>
            ) : (
              leadsByStage.Qualified.map(l => (
                <div
                  key={l.id}
                  onClick={() => setSelectedLeadId(l.id)}
                  className={`bg-white p-4 rounded-xl border shadow-2xs cursor-pointer transition ${
                    selectedLeadId === l.id ? 'border-brand-600 ring-2 ring-brand-100' : 'border-slate-200 hover:border-brand-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-brand-900">{l.id}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                      Seed Prospek
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 mt-1.5">{l.customer_name}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Kebutuhan: <strong className="text-slate-800">{l.quantity} botol</strong> {l.expected_sku}
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{l.customer_id}</span>
                    <span className="text-brand-700 font-semibold">Klik untuk aksi</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column Won */}
        <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-200 text-xs">
            <span className="font-bold text-emerald-900 uppercase tracking-wider">Won (Peluang Menang)</span>
            <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full font-bold text-[10px]">
              {leadsByStage.Won.length}
            </span>
          </div>
          <div className="space-y-3 flex-1">
            {leadsByStage.Won.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada prospek berstatus Won.
              </div>
            ) : (
              leadsByStage.Won.map(l => (
                <div
                  key={l.id}
                  onClick={() => setSelectedLeadId(l.id)}
                  className="bg-white p-4 rounded-xl border border-emerald-300 shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-emerald-800">{l.id}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                      Won
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 mt-1">{l.customer_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{l.quantity} botol {l.expected_sku}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Selected Lead Action Card (S-04 Detail View) */}
      {selectedLead && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                Opportunity: {selectedLead.id}
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                {selectedLead.customer_name} ({selectedLead.customer_id})
              </h2>
            </div>

            {/* Stage Selector Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {(['New', 'Qualified', 'Won', 'Lost'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => handleStageChange(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedLead.stage === st
                      ? 'bg-brand-800 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Master Fields (Wireframe S-04 Page 19) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-b border-slate-100">
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Nomor Peluang</span>
              <span className="font-bold text-slate-900 font-mono">{selectedLead.id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Pelanggan Sasaran</span>
              <span className="font-bold text-slate-900">{selectedLead.customer_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Produk Diinginkan</span>
              <span className="font-bold text-slate-900 font-mono">{selectedLead.expected_sku}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold">Tahap Saat Ini (Stage)</span>
              <span className="font-bold text-brand-900">{selectedLead.stage}</span>
            </div>
          </div>

          {/* Action to Convert into Quotation (T-08) */}
          <div className="p-4 bg-brand-50/60 rounded-xl border border-brand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-brand-950 text-sm">Konversi Peluang ke Penawaran Penjualan (S-05)</h3>
              <p className="text-slate-600 text-xs mt-0.5">
                Menerbitkan dokumen Quotation terhubung dengan kuantitas {selectedLead.quantity} unit tanpa membukukan jurnal pendapatan prematur (SR-18 / T-08).
              </p>
            </div>
            <button
              onClick={handleConvertToQuotation}
              className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <FileText className="w-4 h-4" />
              Konversi Jadi Quotation (S-05)
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Chatter History */}
          <Chatter
            documentId={selectedLead.id}
            notes={selectedLead.history.map(h => ({
              actor: 'sales / Dimas',
              timestamp: selectedLead.created_at,
              action: h
            }))}
          />
        </div>
      )}
    </div>
  );
};
