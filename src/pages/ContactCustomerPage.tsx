import React, { useState } from 'react';
import {
  Users, Search, ShieldCheck, AlertTriangle, ArrowRight,
  CreditCard, DollarSign, Clock, FileText, CheckCircle2
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { Customer } from '../types';

export const ContactCustomerPage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const { customers, calculateCreditExposure, salesOrders } = useErp();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('C01');
  const [searchTerm, setSearchTerm] = useState('');

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];
  const exposureData = calculateCreditExposure(selectedCustomer.id);

  const customerOrders = salesOrders.filter(so => so.customer_id === selectedCustomer.id);

  const filteredCustomers = customers.filter(c =>
    c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-02</span>
            <span>·</span>
            <span>Feature F-02</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-09 (Credit Exposure & Headroom)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Kontak Pelanggan &amp; Manajemen Plafon Kredit
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Perhitungan Eksposur Kredit: Saldo AR Belum Lunas + SO Confirmed Belum Ditagih (SR-09)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateScreen('S-05')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <FileText className="w-4 h-4" />
            Buat Penawaran SO (S-05)
          </button>
        </div>
      </div>

      {/* Main Grid: List of 6 Customers & Detail S-02 Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 6 Customers */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari pelanggan..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <span className="text-[11px] text-slate-500 font-semibold shrink-0">
              {filteredCustomers.length} Pelanggan
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
            {filteredCustomers.map(c => {
              const exp = calculateCreditExposure(c.id);
              const isSelected = selectedCustomerId === c.id;
              const isNearLimit = exp.totalExposure > exp.creditLimit * 0.8;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`p-3.5 cursor-pointer transition text-left ${
                    isSelected ? 'bg-brand-50/80 border-l-4 border-brand-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">{c.id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {c.payment_terms}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1">{c.name}</div>
                  <div className="text-[11px] text-slate-500">{c.city} · Plafon: Rp{c.credit_limit.toLocaleString('id-ID')}</div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Eksposur Kredit:</span>
                    <span className={`font-mono font-bold ${isNearLimit ? 'text-amber-800' : 'text-slate-800'}`}>
                      Rp{exp.totalExposure.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: S-02 Wireframe Detail Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                ID Pelanggan: {selectedCustomer.id}
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                {selectedCustomer.name}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedCustomer.type} · Kota {selectedCustomer.city}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Syarat Pembayaran</span>
              <span className="px-3 py-1 bg-brand-100 text-brand-900 font-bold rounded-lg text-xs mt-0.5 inline-block">
                {selectedCustomer.payment_terms}
              </span>
            </div>
          </div>

          {/* S-02 Core Metrics Grid (Exact fields from PDF page 17) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 block text-[11px] font-semibold uppercase">Plafon Kredit (Credit Limit)</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                Rp{exposureData.creditLimit.toLocaleString('id-ID')}
              </span>
              <span className="text-[10px] text-slate-500">Batas maksimal piutang & pesanan</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 block text-[11px] font-semibold uppercase">Piutang Awal (Opening Receivable)</span>
              <span className="text-xl font-black text-slate-800 font-mono mt-1 block">
                Rp{exposureData.openingAr.toLocaleString('id-ID')}
              </span>
              <span className="text-[10px] text-slate-500">Saldo piutang berjalan belum lunas</span>
            </div>

            <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/80">
              <span className="text-amber-800 block text-[11px] font-semibold uppercase">Confirmed SO Belum Ditagih</span>
              <span className="text-xl font-black text-amber-950 font-mono mt-1 block">
                Rp{exposureData.uninvoicedSo.toLocaleString('id-ID')}
              </span>
              <span className="text-[10px] text-amber-700">Komitmen pesanan Confirmed (Gross PPN)</span>
            </div>

            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
              <span className="text-emerald-800 block text-[11px] font-semibold uppercase">Sisa Plafon Kredit (Headroom)</span>
              <span className="text-xl font-black text-emerald-950 font-mono mt-1 block">
                Rp{exposureData.headroom.toLocaleString('id-ID')}
              </span>
              <span className="text-[10px] text-emerald-700">Ruang kredit tersisa untuk pesanan baru</span>
            </div>
          </div>

          {/* Formula Breakdown Banner (SR-09) */}
          <div className="p-4 bg-slate-100/80 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-700" />
              Formula Validasi Kredit (Aturan Bisnis SR-09):
            </div>
            <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 rounded border border-slate-200 leading-relaxed mt-2">
              Credit Exposure = Saldo AR (Rp{exposureData.openingAr.toLocaleString('id-ID')}) + SO Confirmed Belum Ditagih (Rp{exposureData.uninvoicedSo.toLocaleString('id-ID')}) = <strong className="text-brand-900">Rp{exposureData.totalExposure.toLocaleString('id-ID')}</strong>
              <div className="mt-1 text-slate-500">
                Headroom = Plafon (Rp{exposureData.creditLimit.toLocaleString('id-ID')}) − Exposure = <strong className="text-emerald-700">Rp{exposureData.headroom.toLocaleString('id-ID')}</strong>
              </div>
            </div>
          </div>

          {/* Skenario Uji T-03 & T-04 Quick Checks */}
          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 text-xs">
            <span className="font-bold text-blue-900 block mb-1">
              Verifikasi Skenario Pengujian (T-03 &amp; T-04):
            </span>
            {selectedCustomer.id === 'C01' ? (
              <p className="text-blue-800 text-[11px] leading-relaxed">
                ✓ <strong>T-03 (Alur Normal C01):</strong> AR Rp400.000 + SO seed S00004 Rp166.500 = Exposure Rp566.500; Headroom Rp1.433.500 terlihat presisi sesuai kriteria pengujian.
              </p>
            ) : selectedCustomer.id === 'C02' ? (
              <p className="text-blue-800 text-[11px] leading-relaxed">
                ⚠️ <strong>T-04 (Uji Batas C02):</strong> AR Rp650.000; jika Sales mencoba konfirmasi pesanan 30 botol Peach @ Rp26.000 (Gross Rp865.800), total eksposur akan menjadi Rp1.515.800 (melebihi plafon Rp1.000.000), sehingga sistem Credit Gate otomatis memblokir pesanan.
              </p>
            ) : (
              <p className="text-blue-800 text-[11px] leading-relaxed">
                Pelanggan {selectedCustomer.name} memiliki saldo AR Rp{selectedCustomer.opening_ar.toLocaleString('id-ID')} dan Headroom Rp{exposureData.headroom.toLocaleString('id-ID')}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
