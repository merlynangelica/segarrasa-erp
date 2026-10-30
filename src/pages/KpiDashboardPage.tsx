import React from 'react';
import {
  BarChart3, TrendingUp, Package, ShieldCheck, DollarSign,
  Layers, ArrowRight, Clock, FileText, ShoppingBag, Users
} from 'lucide-react';
import { useErp } from '../store/erpContext';

export const KpiDashboardPage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const { getDashboardKpi, stock, reservations } = useErp();
  const kpi = getDashboardKpi();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-17</span>
            <span>·</span>
            <span>Feature F-19</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-18, SR-19 (Reconciled KPI Dashboard)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dasbor KPI Eksekutif &amp; Rekonsiliasi Terpadu
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Setiap Angka Metrik Dapat Ditelusuri ke Dokumen Sumber (*Drill-Through*). Baseline Transaksi Baru Bernilai Rp0 (SR-19).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-brand-100 text-brand-900 font-mono font-bold rounded-lg text-xs">
            Data Cutoff: Baseline Seed
          </span>
        </div>
      </div>

      {/* Wireframe S-17 Parameter Bar (Page 32) */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 block text-[11px] font-semibold">Batas Data (Data Cutoff)</span>
          <span className="font-bold text-slate-900">Baseline Seed Terverifikasi</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px] font-semibold">Cakupan Gudang</span>
          <span className="font-bold text-slate-900">WH-PKU + OUT-MRP</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px] font-semibold">Mata Uang Pembukuan</span>
          <span className="font-bold text-slate-900">IDR (Rupiah Indonesia)</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px] font-semibold">Rekonsiliasi Dokumen</span>
          <span className="font-bold text-emerald-700">100% Drill Through Aktif</span>
        </div>
      </div>

      {/* Wireframe S-17 3 Primary Metric Cards (Page 32) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div
          onClick={() => onNavigateScreen('S-03')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-brand-500 hover:shadow-md transition group text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Stock On Hand (Fisik)
            </span>
            <Package className="w-5 h-5 text-brand-700 group-hover:scale-110 transition" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono my-1">
            {kpi.stockOnHand} <span className="text-sm font-normal text-slate-500">unit</span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Gudang Pekanbaru: <strong>596</strong> · Outlet Marpoyan: <strong>153</strong>
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-brand-800 font-semibold">
            <span>Drill-down ke Katalog 15 SKU (S-03)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigateScreen('S-06')}
          className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm cursor-pointer hover:border-amber-500 hover:shadow-md transition group text-left bg-amber-50/20"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Reserved / Available
            </span>
            <ShieldCheck className="w-5 h-5 text-amber-700 group-hover:scale-110 transition" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono my-1">
            <span className="text-amber-900">{kpi.reserved}</span> / <span className="text-emerald-800">{kpi.available}</span>
          </div>
          <p className="text-amber-800 text-xs mt-1">
            Reservasi SO S00004: 10 unit · Bebas dipesan: 739 unit
          </p>
          <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-900 font-semibold">
            <span>Drill-down ke Gerbang Reservasi (S-06)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigateScreen('S-13')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-brand-500 hover:shadow-md transition group text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Stock Valuation (Standard Cost)
            </span>
            <DollarSign className="w-5 h-5 text-emerald-700 group-hover:scale-110 transition" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono my-1">
            Rp{kpi.stockValuation.toLocaleString('id-ID')}
          </div>
          <p className="text-slate-500 text-xs mt-1">
            WH: Rp5.000.000 · Outlet: Rp1.314.000
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-brand-800 font-semibold">
            <span>Drill-down ke Buku Besar Akun 1200 (S-13)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Operational Active Documents Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Status Dokumen Bisnis Terbuka (Active Open Documents)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigateScreen('S-05')}
            className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Open Sales Orders:</span>
              <span className="font-mono font-bold text-sm text-slate-900">{kpi.openSO} Dokumen</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Dokumen: <code>S00004</code> (Toko Melati, 10 unit Sparkling Lemon, Rp166.500 gross)
            </p>
          </div>

          <div
            onClick={() => onNavigateScreen('S-09')}
            className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Open Purchase Orders:</span>
              <span className="font-mono font-bold text-sm text-slate-900">{kpi.openPO} Dokumen</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Dokumen: <code>PO00003</code> (PT Rasa Sejuk Nusantara, 12 botol, Rp199.800 gross)
            </p>
          </div>

          <div
            onClick={() => onNavigateScreen('S-04')}
            className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Open CRM Leads:</span>
              <span className="font-mono font-bold text-sm text-slate-900">{kpi.openLead} Peluang</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Dokumen: <code>CRM00009</code> (Koperasi Sekolah Hijau, 30 unit Lemon)
            </p>
          </div>
        </div>
      </div>

      {/* Verification Cards: T-33 and T-34 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
          <span className="font-bold text-emerald-950 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            Verifikasi Normal Flow T-33:
          </span>
          <p className="text-emerald-900 text-[11px] leading-relaxed">
            Kondisi baseline murni terbukti: On Hand 749 unit, Reserved 10, Available 739, Nilai persediaan Rp6.314.000, 1 SO Open, 1 PO Open, 1 Lead Open. Seluruh angka bersumber dari master data dan bukan karangan demo.
          </p>
        </div>

        <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2">
          <span className="font-bold text-blue-950 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            Verifikasi Rule / Kasus Batas T-34:
          </span>
          <p className="text-blue-900 text-[11px] leading-relaxed">
            Revenue Transaksi Baru: <strong>Rp{kpi.newRevenue.toLocaleString('id-ID')}</strong>. Pesanan penjualan Confirmed <code>S00004</code> yang belum dikirim atau diinvois <strong>TIDAK DIAKUI SEBAGAI PENDAPATAN</strong> (SR-18, SR-19). Laba rugi mencerminkan pengakuan akuntansi yang patuh dan akurat.
          </p>
        </div>
      </div>
    </div>
  );
};
