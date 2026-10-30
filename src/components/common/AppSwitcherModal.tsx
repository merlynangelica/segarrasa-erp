import React from 'react';
import {
  FileText, Kanban, ShoppingBag, Package,
  BookOpen, CheckCircle2, BarChart3, X, Shield, ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useErp } from '../../store/erpContext';
import { canRoleAccess } from '../../config/navigation';

interface AppSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScreen: (screenId: string) => void;
}

interface AppCard {
  id: string;
  name: string;
  targetScreenId: string;
  description: string;
  icon: React.ElementType;
  color: string;
  moduleKey: string;
}

export const AppSwitcherModal: React.FC<AppSwitcherModalProps> = ({
  isOpen,
  onClose,
  onSelectScreen
}) => {
  const { currentUser } = useErp();

  if (!isOpen || !currentUser) return null;

  const APPS: AppCard[] = [
    {
      id: 'app-sales',
      name: 'Sales',
      targetScreenId: 'S-05',
      description: 'Penawaran, Pesanan Penjualan, & Gerbang Diskon',
      icon: FileText,
      color: 'bg-emerald-600',
      moduleKey: 'S-05'
    },
    {
      id: 'app-crm',
      name: 'CRM',
      targetScreenId: 'S-04',
      description: 'Pipeline Prospek Pelanggan & Opportunity',
      icon: Kanban,
      color: 'bg-teal-600',
      moduleKey: 'S-04'
    },
    {
      id: 'app-purchase',
      name: 'Purchase',
      targetScreenId: 'S-09',
      description: 'Pengadaan, RFQ, & Purchase Order Approval',
      icon: ShoppingBag,
      color: 'bg-purple-600',
      moduleKey: 'S-09'
    },
    {
      id: 'app-inventory',
      name: 'Inventory',
      targetScreenId: 'S-03',
      description: 'Katalog 15 SKU, Reservasi, Delivery, & Transfer',
      icon: Package,
      color: 'bg-blue-600',
      moduleKey: 'S-03'
    },
    {
      id: 'app-accounting',
      name: 'Accounting & Invoicing',
      targetScreenId: 'S-13',
      description: 'Buku Besar, COGS, Faktur Penjualan, Tagihan Vendor, & Kas',
      icon: BookOpen,
      color: 'bg-amber-600',
      moduleKey: 'S-13'
    },
    {
      id: 'app-quality',
      name: 'Quality',
      targetScreenId: 'S-11',
      description: 'Pemeriksaan Kualitas Segel/Kemasan Pass/Fail',
      icon: CheckCircle2,
      color: 'bg-rose-600',
      moduleKey: 'S-11'
    },
    {
      id: 'app-reporting',
      name: 'Reporting & KPI',
      targetScreenId: 'S-17',
      description: 'Dasbor Eksekutif, Rekonsiliasi, & Jejak Audit',
      icon: BarChart3,
      color: 'bg-indigo-600',
      moduleKey: 'S-17'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full p-8 overflow-hidden relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-800 text-xs font-bold rounded-full mb-2 border border-brand-200">
            <span>Beranda App Switcher</span>
            <span>·</span>
            <span>S-01 / F-01</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Peluncur Aplikasi SegarRasa ERP
          </h2>
          <p className="text-slate-600 text-xs mt-1">
            Masuk sebagai: <strong className="text-slate-900 capitalize">{currentUser.name} ({currentUser.role})</strong> — Hak akses modul disesuaikan secara otomatis.
          </p>
        </div>

        {/* 7 App Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {APPS.map(app => {
            const Icon = app.icon;
            const hasAccess = canRoleAccess(currentUser.role, app.moduleKey);

            return (
              <div
                key={app.id}
                onClick={() => {
                  if (hasAccess) {
                    onSelectScreen(app.targetScreenId);
                    onClose();
                  }
                }}
                className={`relative p-5 rounded-2xl border transition-all text-left flex flex-col justify-between group ${
                  hasAccess
                    ? 'bg-slate-50 hover:bg-white border-slate-200 hover:border-brand-500 hover:shadow-xl cursor-pointer hover:-translate-y-0.5'
                    : 'bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${app.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {hasAccess ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                        Buka
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md border border-rose-200 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Dibatasi
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-900 transition flex items-center gap-1">
                    {app.name}
                  </h3>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    {app.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-400 font-semibold">{app.targetScreenId}</span>
                  {hasAccess && (
                    <span className="text-brand-700 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Akses <ArrowRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Banner */}
        <div className="mt-8 p-3.5 bg-brand-50/70 border border-brand-200/80 rounded-xl flex items-center justify-between text-xs text-brand-900">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-700" />
            <span>
              <strong>Owner (Ratna Putri)</strong> memiliki hak khusus melihat seluruh modul dan data bisnis tanpa pembatasan tampilan.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-brand-800 text-white rounded-lg font-medium hover:bg-brand-900 transition shrink-0 ml-3"
          >
            Tutup Peluncur
          </button>
        </div>
      </div>
    </div>
  );
};
