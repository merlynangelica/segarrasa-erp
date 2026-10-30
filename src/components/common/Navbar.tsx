import React, { useState } from 'react';
import {
  LayoutGrid, Search, RotateCcw, ChevronDown, Check,
  LogOut, Shield, Sparkles, Building2, UserCheck
} from 'lucide-react';
import { useErp, DEMO_USERS } from '../../store/erpContext';
import { UserRole } from '../../types';
import { ERP_NAV_ITEMS } from '../../config/navigation';

interface NavbarProps {
  currentScreenId: string;
  onNavigateScreen: (screenId: string) => void;
  onOpenTestRunner: () => void;
  onToggleAppSwitcher: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreenId,
  onNavigateScreen,
  onOpenTestRunner,
  onToggleAppSwitcher
}) => {
  const { currentUser, switchRole, logout, resetToBaseline } = useErp();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const currentNav = ERP_NAV_ITEMS.find(n => n.screenId === currentScreenId);

  return (
    <>
      <header className="sticky top-0 z-30 bg-brand-900 text-white shadow-md border-b border-brand-800">
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Left section: App Switcher & Brand & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleAppSwitcher}
              className="p-2 hover:bg-brand-800 rounded-lg text-brand-100 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
              title="Buka App Switcher (Odoo 17 Web Style)"
            >
              <LayoutGrid className="w-5 h-5 text-gold-500" />
              <span className="hidden sm:inline">Apps</span>
            </button>

            <div className="h-5 w-px bg-brand-800 hidden sm:block"></div>

            {/* Brand Logo & Name */}
            <div
              onClick={() => onNavigateScreen('S-01')}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-7 h-7 bg-brand-800 border border-brand-700 rounded-lg flex items-center justify-center font-bold text-sm text-gold-500 group-hover:bg-brand-700 transition">
                SR
              </div>
              <div className="hidden md:block">
                <span className="font-bold text-sm tracking-tight text-white block leading-tight">
                  SegarRasa
                </span>
                <span className="text-[10px] text-brand-200 block leading-tight">
                  Enterprise Core · PT Segar Rasa Riau
                </span>
              </div>
            </div>

            <div className="h-5 w-px bg-brand-800 hidden md:block"></div>

            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-brand-200">
              <span className="hover:text-white cursor-pointer" onClick={() => onNavigateScreen('S-01')}>
                Beranda
              </span>
              <span>/</span>
              <span className="text-white font-medium">
                {currentNav ? `${currentNav.name} (${currentNav.screenId})` : 'Halaman ERP'}
              </span>
            </div>
          </div>

          {/* Right section: Test Runner, Reset Seed, User Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 36 Tests Runner button */}
            <button
              onClick={onOpenTestRunner}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-gold-600 to-amber-600 hover:from-gold-500 hover:to-amber-500 text-white text-xs font-bold rounded-lg shadow-sm transition"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">36 Uji Skenario</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded text-[10px]">T-01 s.d. T-36</span>
            </button>

            {/* Reset to Baseline Seed button */}
            <button
              onClick={() => setResetModalOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs text-brand-200 hover:text-white hover:bg-brand-800 rounded-lg transition flex items-center gap-1"
              title="Reset Baseline Dataset (Fixture Awal)"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden xl:inline">Reset Baseline</span>
            </button>

            {/* Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-brand-800/80 hover:bg-brand-800 border border-brand-700/60 rounded-xl transition text-left"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${currentUser?.avatarColor || 'bg-brand-700'}`}>
                  {currentUser?.name.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white capitalize leading-none">
                      {currentUser?.role}
                    </span>
                    {currentUser?.role === 'owner' && (
                      <span className="px-1.5 py-0.2 bg-gold-500 text-brand-950 font-black text-[9px] rounded uppercase">
                        Full ERP
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-brand-200 block truncate max-w-[120px] leading-tight mt-0.5">
                    {currentUser?.name}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-brand-300 ml-1" />
              </button>

              {/* Dropdown Menu */}
              {roleDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 text-xs"
                  onClick={() => setRoleDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="font-semibold text-slate-800">Pilih Role Demo (RBAC Simulation)</div>
                    <div className="text-[11px] text-slate-500">
                      Uji perbedaan akses 6 role sesuai spesifikasi PDF:
                    </div>
                  </div>

                  <div className="py-1">
                    {(Object.keys(DEMO_USERS) as UserRole[]).map(roleKey => {
                      const u = DEMO_USERS[roleKey];
                      const isSelected = currentUser?.role === roleKey;
                      return (
                        <button
                          key={roleKey}
                          onClick={() => switchRole(roleKey)}
                          className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition ${
                            isSelected ? 'bg-brand-50 text-brand-900 font-semibold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${u.avatarColor}`}>
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <div className="capitalize flex items-center gap-1.5">
                                <span>{u.role}</span>
                                {u.role === 'owner' && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                                    Lihat Seluruh ERP
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">{u.name} · {u.title}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-brand-700" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1 mt-1 border-t border-slate-100 px-2">
                    <button
                      onClick={logout}
                      className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Keluar ke Halaman Login
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Confirmation Modal for Reset Baseline */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-slate-800 text-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              Reset ke Baseline Dataset (Fixture Awal)?
            </h3>
            <p className="text-slate-600 mb-4 leading-relaxed text-xs">
              Tindakan ini akan mengembalikan seluruh data master, 15 SKU, persediaan awal 749 unit (596 WH-PKU / 153 OUT-MRP), saldo awal bank Rp7.000.000, serta dokumen terbuka awal (CRM00009, S00004, PO00003) sesuai kondisi awal pengujian dokumen PDF.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  resetToBaseline();
                  setResetModalOpen(false);
                }}
                className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-medium text-xs transition"
              >
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
