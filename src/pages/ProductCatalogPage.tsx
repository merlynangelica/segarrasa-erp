import React, { useState } from 'react';
import {
  Package, Search, Filter, Plus, Check, AlertCircle,
  TrendingUp, DollarSign, Layers, ArrowRight, ShieldCheck
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { Product } from '../types';

export const ProductCatalogPage: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const { products, stock, getStockLevel } = useErp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSku, setSelectedSku] = useState<string>('BVG-250-LEM');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isAdding, setIsAdding] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New product form for testing uniqueness (T-06)
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newSize, setNewSize] = useState('500 ml');
  const [newPrice, setNewPrice] = useState(20000);
  const [newCost, setNewCost] = useState(12000);

  const selectedProduct = products.find(p => p.variant_sku === selectedSku) || products[0];

  const filteredProducts = products.filter(p =>
    p.variant_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.size.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    // Uniqueness validation (SR-17, T-06)
    const exists = products.some(p => p.variant_sku.trim().toUpperCase() === newSku.trim().toUpperCase());
    if (exists) {
      setNotification({
        type: 'error',
        message: `SKU '${newSku.toUpperCase()}' sudah terdaftar dalam sistem! Setiap varian ukuran/rasa wajib memiliki variant SKU yang unik (SR-17 / T-06).`
      });
      return;
    }

    setNotification({
      type: 'success',
      message: `Validasi SKU '${newSku.toUpperCase()}' lolos! (Simulasi penambahan master berhasil).`
    });
    setIsAdding(false);
  };

  const currentStockWh = getStockLevel(selectedProduct.variant_sku, 'WH-PKU');
  const currentStockOut = getStockLevel(selectedProduct.variant_sku, 'OUT-MRP');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-03</span>
            <span>·</span>
            <span>Feature F-03</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-17 (Unique SKU & Cost)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Katalog Varian Produk (15 Master SKU)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar Minuman Siap Minum & Camilan Kemasan Non-Mewah dengan Standard Cost dan Harga Jual Terpisah
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-white text-brand-900 font-bold shadow-2xs' : 'text-slate-600'}`}
            >
              List (15)
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'kanban' ? 'bg-white text-brand-900 font-bold shadow-2xs' : 'text-slate-600'}`}
            >
              Kanban
            </button>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Uji Tambah SKU Baru (T-06)
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

      {/* Test T-06 Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 text-slate-800 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Uji Validasi Keunikan SKU (Skenario T-06)</h3>
                <p className="text-[11px] text-slate-500">Coba masukkan SKU yang sudah ada (misal: BVG-250-LEM) untuk membuktikan pencegahan duplikasi.</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode SKU Varian</label>
                <input
                  type="text"
                  required
                  placeholder="contoh: BVG-250-LEM"
                  value={newSku}
                  onChange={e => setNewSku(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => {
                    setNewSku('BVG-250-LEM');
                    setNewName('Sparkling Lemon');
                  }}
                  className="mt-1 text-[11px] text-brand-700 hover:underline font-semibold block"
                >
                  ⚡ Klik di sini untuk isi otomatis SKU duplikat 'BVG-250-LEM' (Uji Kasus Batas T-06)
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  placeholder="Nama produk..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={e => setNewPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Standard Cost (Rp)</label>
                  <input
                    type="number"
                    value={newCost}
                    onChange={e => setNewCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-800 text-white font-bold rounded-lg hover:bg-brand-900 transition"
                >
                  Simpan & Validasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Grid: Master List and Detail Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 15 Products List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari SKU, Nama Produk, Ukuran..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold shrink-0">
              {filteredProducts.length} SKU
            </span>
          </div>

          <div className="overflow-x-auto divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4">SKU Varian</th>
                  <th className="py-2.5 px-3">Nama Produk</th>
                  <th className="py-2.5 px-3">Ukuran & Satuan</th>
                  <th className="py-2.5 px-3 text-right">Harga Jual</th>
                  <th className="py-2.5 px-3 text-right">Standard Cost</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(p => {
                  const isSelected = selectedSku === p.variant_sku;
                  return (
                    <tr
                      key={p.variant_sku}
                      onClick={() => setSelectedSku(p.variant_sku)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-brand-50/80 font-semibold text-brand-950' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {p.variant_sku}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="block text-slate-800">{p.name}</span>
                        <span className="text-[10px] text-slate-400">Vendor: {p.default_vendor}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {p.size} ({p.unit})
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                        Rp{p.sales_price.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        Rp{p.standard_cost.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedSku(p.variant_sku);
                          }}
                          className="px-2 py-1 bg-white border border-slate-200 hover:border-brand-500 rounded text-[11px] font-medium"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Selected Product Detail Card (S-03 Wireframe View) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                  {selectedProduct.variant_sku}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedProduct.name}
                </h2>
              </div>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                {selectedProduct.size} · {selectedProduct.unit}
              </span>
            </div>

            {/* Core Card Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 block text-[11px] font-semibold">Harga Jual (Sales Price)</span>
                <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                  Rp{selectedProduct.sales_price.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-500">Sebelum PPN 11%</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 block text-[11px] font-semibold">Standard Cost (HPP)</span>
                <span className="text-base font-black text-emerald-800 font-mono mt-0.5 block">
                  Rp{selectedProduct.standard_cost.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-500">Valuasi &amp; Beban COGS</span>
              </div>
            </div>

            {/* Stock Levels per Location (SR-04, SR-12) */}
            <div className="pt-2">
              <h3 className="font-bold text-slate-800 text-xs mb-2">Posisi Stok Fisik &amp; Ketersediaan:</h3>
              <div className="space-y-2">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block">WH-PKU (Gudang Utama)</span>
                    <span className="text-[10px] text-slate-500">Reservasi: {currentStockWh.reserved} unit</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{currentStockWh.onHand} On Hand</span>
                    <span className="block text-[11px] font-bold text-emerald-700">
                      {currentStockWh.available} Tersedia
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block">OUT-MRP (Titik Ambil Marpoyan)</span>
                    <span className="text-[10px] text-slate-500">Reservasi: {currentStockOut.reserved} unit</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{currentStockOut.onHand} On Hand</span>
                    <span className="block text-[11px] font-bold text-emerald-700">
                      {currentStockOut.available} Tersedia
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compare Mini Cards (S-03 Wireframe Spec: Lemon 250 vs 500) */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2 uppercase">
                Perbandingan Varian Ukuran (T-05):
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/60">
                  <span className="font-mono font-bold text-amber-950 block">BVG-250-LEM (250 ml)</span>
                  <span className="text-slate-600 block">Jual: Rp15.000</span>
                  <span className="text-slate-600 block">Cost: Rp9.000</span>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/60">
                  <span className="font-mono font-bold text-amber-950 block">BVG-500-LEM (500 ml)</span>
                  <span className="text-slate-600 block">Jual: Rp25.000</span>
                  <span className="text-slate-600 block">Cost: Rp15.000</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => onNavigateScreen('S-06')}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-center transition"
              >
                Lihat Reservasi (S-06)
              </button>
              <button
                onClick={() => onNavigateScreen('S-05')}
                className="flex-1 py-2 bg-brand-800 hover:bg-brand-900 text-white font-semibold rounded-lg text-center transition"
              >
                Buat Penawaran SO (S-05)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
