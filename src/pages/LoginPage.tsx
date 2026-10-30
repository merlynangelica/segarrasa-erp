import React, { useState } from 'react';
import {
  Eye, EyeOff, Lock, Mail, Shield, AlertCircle,
  Sparkles, CheckCircle2, UserCheck, ArrowRight
} from 'lucide-react';
import { useErp, DEMO_USERS } from '../store/erpContext';
import { UserRole } from '../types';

export const LoginPage: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const { setCurrentUser } = useErp();
  const [email, setEmail] = useState('sales@segarrasa.id');
  const [password, setPassword] = useState('sales123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole>('sales');

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Silakan masukkan email dan kata sandi Anda.');
      return;
    }

    // Match demo accounts
    const foundRole = (Object.keys(DEMO_USERS) as UserRole[]).find(
      r => DEMO_USERS[r].email.toLowerCase() === email.trim().toLowerCase()
    );

    if (foundRole) {
      setCurrentUser(DEMO_USERS[foundRole]);
      onLoginSuccess();
    } else {
      setErrorMsg('Kredensial tidak dikenali. Silakan gunakan salah satu Akun Demo Resmi di bawah.');
    }
  };

  const handleSelectDemoRole = (role: UserRole) => {
    setSelectedDemoRole(role);
    setEmail(DEMO_USERS[role].email);
    setPassword(`${role}123`);
    setErrorMsg('');
  };

  const handleInstantLogin = (role: UserRole) => {
    setCurrentUser(DEMO_USERS[role]);
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-brand-500 selection:text-white">
      {/* Background ambient gradient */}
      <div className="absolute inset-0 bg-radial from-brand-900/40 via-slate-950 to-slate-950 pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 border border-brand-500/30 text-gold-500 font-extrabold text-2xl shadow-xl shadow-brand-900/40 mb-4">
            SR
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            SegarRasa Enterprise Core
          </h1>
          <p className="mt-1 text-xs text-brand-200">
            Sistem Informasi Distribusi F&B Mandiri · PT Segar Rasa Riau
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-200 text-slate-800">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Masuk ke Portal Operasional</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulasi otorisasi berbasis peran (RBAC) 6 pemangku kepentingan
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Email Pengguna
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contoh: sales@segarrasa.id"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
            >
              <span>Masuk Aplikasi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                Pilih Akun Demo Resmi (6 Peran):
              </span>
              <span className="text-[10px] text-slate-400">1-Klik Langsung Masuk</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {(Object.keys(DEMO_USERS) as UserRole[]).map(role => {
                const u = DEMO_USERS[role];
                const isSelected = selectedDemoRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleInstantLogin(role)}
                    className={`p-2 rounded-xl border text-left transition flex items-center gap-2 group ${
                      isSelected
                        ? 'bg-brand-50 border-brand-500 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${u.avatarColor}`}>
                      {u.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-slate-900 capitalize flex items-center gap-1 leading-tight">
                        <span>{u.role}</span>
                        {u.role === 'owner' && (
                          <span className="text-[8px] bg-amber-200 text-amber-900 px-1 rounded font-black">
                            FULL
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate leading-tight">
                        {u.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-6 text-center text-xs text-slate-500 leading-relaxed">
          <p>
            Simulasi Otentikasi Frontend untuk Evaluasi Akademik & Uji Dosen.
          </p>
          <p className="text-[11px] text-slate-600 mt-1">
            Data persisten di browser (localStorage) · Mendukung pengujian skenario T-01 hingga T-36.
          </p>
        </div>
      </div>
    </div>
  );
};
