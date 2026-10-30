import React, { useState } from 'react';
import {
  ShieldAlert, Package, Check, AlertCircle, ArrowRight,
  TrendingDown, Layers, ShieldCheck, Database
} from 'lucide-react';
import { useErp } from '../store/erpContext';

export const ReservationCreditGatePage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const { stock, reservations, calculateCreditExposure, products, getStockLevel } = useErp();
  const [selectedSku, setSelectedSku] = useState('BVG-250-LEM');
  const [selectedWarehouse, setSelectedWarehouse] = useState<'WH-PKU' | 'OUT-MRP'>('WH-PKU');

  const stockLevel = getStockLevel(selectedSku, selectedWarehouse);
  const prod = products.find(p => p.variant_sku === selectedSku);
  const c01Exp = calculateCreditExposure('C01');
  const c02Exp = calculateCreditExposure('C02');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-06</span>
            <span>·</span>
            <span>Features F-07 &amp; F-10</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-03, SR-04, SR-09</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Gerbang Reservasi Stok &amp; Kontrol Kredit (Credit Gate)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Logika Ketat: Available = On Hand − Reserved. Sistem Melarang Stok Negatif &amp; Menjaga Plafon Kredit Pelanggan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateScreen('S-05')}
            className="px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            Buka Sales Order (S-05)
          </button>
        </div>
      </div>

      {/* Select SKU and Warehouse Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Pilih Gudang / Lokasi:</label>
            <select
              value={selectedWarehouse}
              onChange={e => setSelectedWarehouse(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
            >
              <option value="WH-PKU">WH-PKU (Gudang Utama Pekanbaru)</option>
              <option value="OUT-MRP">OUT-MRP (Titik Ambil Marpoyan)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Pilih SKU Produk:</label>
            <select
              value={selectedSku}
              onChange={e => setSelectedSku(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-brand-900"
            >
              {products.map(p => (
                <option key={p.variant_sku} value={p.variant_sku}>
                  {p.variant_sku} — {p.name} {p.size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-right">
          <span className="text-slate-400 block text-[11px] font-semibold">Produk Terpilih</span>
          <span className="font-bold text-slate-900 text-sm">{prod?.name} ({prod?.size})</span>
        </div>
      </div>

      {/* Main Stock Math Visualizer (Wireframe S-06 Spec) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Stok Fisik Tersimpan (On Hand)
          </span>
          <div className="text-4xl font-black text-slate-900 font-mono my-2">
            {stockLevel.onHand} <span className="text-sm font-normal text-slate-500">unit</span>
          </div>
          <p className="text-slate-500 text-xs">
            Barang fisik aktual yang ada di lokasi {selectedWarehouse}.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-2xs text-center bg-amber-50/30">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block mb-1">
            Dicadangkan Pesanan (Reserved)
          </span>
          <div className="text-4xl font-black text-amber-900 font-mono my-2">
            {stockLevel.reserved} <span className="text-sm font-normal text-amber-700">unit</span>
          </div>
          <p className="text-amber-800 text-xs">
            Dialokasikan untuk Sales Order Confirmed (terkunci dari pesanan lain).
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-2xs text-center bg-emerald-50/30">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
            Bebas Dipesan (Available)
          </span>
          <div className="text-4xl font-black text-emerald-900 font-mono my-2">
            {stockLevel.available} <span className="text-sm font-normal text-emerald-700">unit</span>
          </div>
          <p className="text-emerald-800 text-xs font-semibold">
            On Hand ({stockLevel.onHand}) − Reserved ({stockLevel.reserved}) = {stockLevel.available} unit
          </p>
        </div>
      </div>

      {/* Two Critical Rule Defense Cards: T-11 and T-12 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* T-11 Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              Skenario Normal: Alokasi Reservasi SO (T-11)
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-bold text-[10px]">
              T-11 PASS
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Pada baseline awal, <code>BVG-250-LEM</code> di <code>WH-PKU</code> memiliki stok <strong>50 On Hand</strong> dan <strong>10 Reserved</strong> (pesanan seed S00004), sehingga <strong>Available = 40</strong>.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 font-mono text-[11px] text-slate-700 space-y-1">
            <div>• Tambahan 8 unit SO dikonfirmasi:</div>
            <div>• Reserved naik: 10 + 8 = <strong className="text-amber-900">18 unit</strong></div>
            <div>• Available turun: 50 − 18 = <strong className="text-emerald-800">32 unit</strong></div>
            <div>• On Hand fisik tetap: <strong>50 unit</strong> (belum berkurang sebelum Delivery divalidasi)</div>
          </div>
        </div>

        {/* T-12 Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Skenario Batas: Blokir Stok Negatif (T-12 / SR-03 vs SR-04)
            </span>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-mono font-bold text-[10px]">
              T-12 PASS
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Jika pelanggan meminta pesanan <strong>45 botol</strong> sementara Available hanya <strong>40 botol</strong>, klaim Sales (SR-03) yang meminta stok negatif hingga -5 unit <strong>DITOLAK</strong> oleh sistem demi menegakkan aturan Kepala Gudang Yusuf Hidayat (SR-04).
          </p>
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 font-mono text-[11px] text-rose-900 space-y-1">
            <div>✕ Permintaan: 45 botol &gt; Available: 40 botol</div>
            <div>✕ Sistem melarang mengambil 10 unit Reserved milik pesanan lain!</div>
            <div>✓ Hasil: Konfirmasi pesanan diblokir secara otomatis sampai stok baru masuk.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
