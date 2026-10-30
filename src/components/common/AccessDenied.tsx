import React from 'react';
import { ShieldX, ArrowLeft, KeyRound } from 'lucide-react';
import { useErp, DEMO_USERS } from '../../store/erpContext';
import { UserRole } from '../../types';

interface AccessDeniedProps {
  requiredModule?: string;
  onNavigateHome: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ requiredModule = 'Modul ini', onNavigateHome }) => {
  const { currentUser, switchRole } = useErp();

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 min-h-[70vh]">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg border border-rose-100 p-8 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-rose-200">
          <ShieldX className="w-9 h-9" />
        </div>

        <div className="inline-block px-3 py-1 bg-rose-100 text-rose-800 text-xs font-semibold rounded-full uppercase tracking-wider mb-3">
          HTTP 403 · Akses Ditolak (Access Denied)
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Otorisasi Tidak Memadai (SR-16)
        </h2>

        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          Akun Anda dengan peran <span className="font-semibold text-slate-900 capitalize">"{currentUser?.role}"</span> ({currentUser?.title}) tidak memiliki hak akses untuk membuka <span className="font-semibold text-rose-700">{requiredModule}</span>. Akses langsung melalui rute URL diblokir demi menjaga integritas data akuntansi dan pemisahan tugas (*Separation of Duties*).
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left mb-6 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-2">
            <KeyRound className="w-4 h-4 text-brand-700" />
            Uji Cepat Pergantian Peran (Demo RBAC):
          </div>
          <p className="mb-2.5">
            Untuk menguji layar ini sebagai pemangku kepentingan yang berwenang, pilih role di bawah ini:
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DEMO_USERS) as UserRole[]).map(role => (
              <button
                key={role}
                onClick={() => switchRole(role)}
                className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                  currentUser?.role === role
                    ? 'bg-brand-800 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {role.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
};
