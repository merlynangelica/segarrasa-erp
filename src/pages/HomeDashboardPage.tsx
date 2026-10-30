import React, { useState } from 'react';
import {
  LayoutGrid, Users, Package, Kanban, FileText,
  ShoppingBag, Truck, Receipt, CheckCircle2, BookOpen,
  BarChart3, History, ArrowRight, Shield, Sparkles,
  TrendingUp, AlertTriangle, Clock, Layers
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { canRoleAccess } from '../config/navigation';

export const HomeDashboardPage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const { currentUser, getDashboardKpi, products, salesOrders, purchaseOrders, receipts } = useErp();
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'activity'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');

  if (!currentUser) return null;

  const kpi = getDashboardKpi();

  const MODULE_SHORTCUTS = [
    {
      title: 'Sales & Penjualan',
      screenId: 'S-05',
      desc: 'Quotation, Sales Orders, & Otorisasi Diskon',
      icon: FileText,
      badge: `${salesOrders.length} Pesanan`,
      allowed: canRoleAccess(currentUser.role, 'S-05')
    },
    {
      title: 'CRM Pipeline',
      screenId: 'S-04',
      desc: 'Prospek Pelanggan (New → Qualified → Won)',
      icon: Kanban,
      badge: '1 Peluang Aktif',
      allowed: canRoleAccess(currentUser.role, 'S-04')
    },
    {
      title: 'Pengadaan (Purchase)',
      screenId: 'S-09',
      desc: 'RFQ, Purchase Order, & Gerbang Approval Owner > Rp1 Jt',
      icon: ShoppingBag,
      badge: `${purchaseOrders.length} PO Aktif`,
      allowed: canRoleAccess(currentUser.role, 'S-09')
    },
    {
      title: 'Persediaan & Stok',
      screenId: 'S-03',
      desc: 'Katalog 15 SKU, Stok WH-PKU & OUT-MRP',
      icon: Package,
      badge: `${kpi.stockOnHand} Unit On-Hand`,
      allowed: canRoleAccess(currentUser.role, 'S-03')
    },
    {
      title: 'Pengiriman & Backorder',
      screenId: 'S-07',
      desc: 'Validasi Surat Jalan & Alokasi Reservasi',
      icon: Truck,
      badge: 'Siap Kirim',
      allowed: canRoleAccess(currentUser.role, 'S-07')
    },
    {
      title: 'Pemeriksaan Kualitas (QC)',
      screenId: 'S-11',
      desc: 'Inspeksi Fisik Kemasan Pass/Fail Barang Masuk',
      icon: CheckCircle2,
      badge: 'QC Masuk',
      allowed: canRoleAccess(currentUser.role, 'S-11')
    },
    {
      title: 'Faktur & Piutang (AR)',
      screenId: 'S-08',
      desc: 'Penagihan Berbasis Kuantitas Terkirim',
      icon: Receipt,
      badge: `AR Rp${kpi.totalAR.toLocaleString('id-ID')}`,
      allowed: canRoleAccess(currentUser.role, 'S-08')
    },
    {
      title: 'Buku Besar & Keuangan',
      screenId: 'S-13',
      desc: 'Jurnal Berpasangan Otomatis & Laporan Ledger',
      icon: BookOpen,
      badge: 'Balanced Dr/Cr',
      allowed: canRoleAccess(currentUser.role, 'S-13')
    },
    {
      title: 'Dasbor KPI Eksekutif',
      screenId: 'S-17',
      desc: 'Rekonsiliasi Lintas Modul & Drill-through',
      icon: BarChart3,
      badge: 'Metrik Terpadu',
      allowed: canRoleAccess(currentUser.role, 'S-17')
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Breadcrumb & View Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-01</span>
            <span>·</span>
            <span>Feature F-01</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Beranda App Switcher & Dasbor Operasional
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Perusahaan: <strong className="text-slate-700">PT Segar Rasa Riau</strong> · Pengguna Aktif: <strong className="text-brand-900 capitalize">{currentUser.name} ({currentUser.role})</strong>
          </p>
        </div>

        {/* View Switcher Controls (List, Kanban, Activity) */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium text-slate-600">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'kanban' ? 'bg-white text-brand-900 font-bold shadow-2xs' : 'hover:text-slate-900'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-white text-brand-900 font-bold shadow-2xs' : 'hover:text-slate-900'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('activity')}
              className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'activity' ? 'bg-white text-brand-900 font-bold shadow-2xs' : 'hover:text-slate-900'}`}
            >
              Activity Log
            </button>
          </div>
        </div>
      </div>

      {/* Role Notice Banner */}
      {currentUser.role === 'owner' ? (
        <div className="p-4 bg-gradient-to-r from-brand-900 to-brand-800 text-white rounded-2xl shadow-sm flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-700/60 rounded-xl text-gold-500">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">Mode Otoritas Owner (Ratna Putri)</div>
              <div className="text-brand-200 text-xs mt-0.5">
                Anda memiliki hak istimewa melihat seluruh 18 layar, dokumen bisnis lintas fungsi, dan audit trail perusahaan tanpa restriksi filter.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateScreen('S-17')}
            className="px-3 py-1.5 bg-gold-600 hover:bg-gold-500 text-slate-950 font-bold rounded-lg text-xs transition shrink-0 ml-3"
          >
            Buka KPI Eksekutif
          </button>
        </div>
      ) : (
        <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-700" />
            <span>
              Peran Anda saat ini adalah <strong className="capitalize text-slate-900">{currentUser.role}</strong> ({currentUser.title}). Hanya modul dan aksi sesuai tanggung jawab bisnis Anda yang dapat dibuka.
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">SR-16 Enforced</span>
        </div>
      )}

      {/* Quick KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Stok Fisik (On-Hand)
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {kpi.stockOnHand} <span className="text-xs font-normal text-slate-500">unit</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>WH: 596 · OUT: 153</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Reservasi / Tersedia
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {kpi.reserved} / <span className="text-emerald-700">{kpi.available}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Available = On Hand − Reserved
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Valuasi Persediaan
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Rp{kpi.stockValuation.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Standard Cost Fixture
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Kas & Bank (1010)
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Rp{kpi.bankBalance.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Saldo Bank Awal 01/10/2026
          </div>
        </div>
      </div>

      {/* Module Navigation Grid (Kanban View) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Akses Cepat Modul ERP Sesuai Peran ({currentUser.role.toUpperCase()})
          </h2>
          <span className="text-xs text-slate-400">Pola Navigasi Terpadu</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULE_SHORTCUTS.map(m => {
            const Icon = m.icon;
            return (
              <div
                key={m.screenId}
                onClick={() => {
                  if (m.allowed) onNavigateScreen(m.screenId);
                }}
                className={`p-4 rounded-2xl border transition text-left flex flex-col justify-between ${
                  m.allowed
                    ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-brand-500 hover:shadow-md cursor-pointer group'
                    : 'bg-slate-100/60 border-slate-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${m.allowed ? 'bg-brand-50 text-brand-800 group-hover:bg-brand-800 group-hover:text-white transition' : 'bg-slate-200 text-slate-500'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
                        {m.screenId}
                      </span>
                      {m.allowed ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          {m.badge}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                          Dibatasi
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-900 transition">
                    {m.title}
                  </h3>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    {m.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {m.allowed ? 'Klik untuk membuka modul' : 'Akses ditolak untuk role ini (SR-16)'}
                  </span>
                  {m.allowed && (
                    <ArrowRight className="w-4 h-4 text-brand-700 group-hover:translate-x-1 transition-transform" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info Box */}
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            Baseline Dokumen Awal Aktif: <strong>CRM00009</strong> (Lead), <strong>S00004</strong> (Sales Order Confirmed), <strong>PO00003</strong> (Purchase Order Confirmed).
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span>PT Segar Rasa Riau</span>
          <span>·</span>
          <span>Pekanbaru, Riau</span>
        </div>
      </div>
    </div>
  );
};
