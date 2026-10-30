import React, { useState } from 'react';
import {
  CreditCard, DollarSign, Check, AlertCircle, ArrowRight,
  ShieldCheck, Banknote, Clock
} from 'lucide-react';
import { useErp } from '../store/erpContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Chatter } from '../components/common/Chatter';

export const RegisterPaymentDialog: React.FC<{ onNavigateScreen: (screenId: string) => void }> = ({
  onNavigateScreen
}) => {
  const {
    customerInvoices, registerPayment, accounts, currentUser
  } = useErp();

  const [selectedInvId, setSelectedInvId] = useState<string>(customerInvoices[0]?.id || 'INV/2026/0001');
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(40000);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // If no customer invoices, fallback for demo matching S-14 wireframe
  const defaultInvoice = customerInvoices.find(i => i.id === selectedInvId) || customerInvoices[0] || {
    id: 'INV/2026/0001',
    customer_id: 'C01',
    customer_name: 'Toko Melati',
    source_delivery_id: 'WH/OUT/0001',
    source_order_id: 'S00005',
    date: '2026-10-01',
    status: 'Posted',
    payment_status: 'Unpaid',
    tax_label: 'PPN efektif 11%',
    tax_effective_rate: 0.11,
    lines: [],
    untaxed_amount: 90000,
    tax_amount: 9900,
    amount_due: 99900,
    paid_amount: 0,
    residual_amount: 99900,
    is_posted: true
  };

  const handleRegisterPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    // Call registerPayment action in context
    const res = registerPayment(
      defaultInvoice.id,
      Number(paymentAmountInput),
      'customer',
      currentUser?.name || 'Finance'
    );

    if (res.success) {
      setNotification({ type: 'success', message: res.message });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  const handleQuickTestNegative = () => {
    setPaymentAmountInput(-10000);
    const res = registerPayment(defaultInvoice.id, -10000, 'customer', currentUser?.name || 'Finance');
    setNotification({
      type: 'error',
      message: `Uji Skenario T-28 (Nilai Negatif): ${res.message}`
    });
  };

  const handleQuickTestExceed = () => {
    setPaymentAmountInput(110000);
    const res = registerPayment(defaultInvoice.id, 110000, 'customer', currentUser?.name || 'Finance');
    setNotification({
      type: 'error',
      message: `Uji Skenario T-28 (Melebihi Sisa Tagihan Rp99.900): ${res.message}`
    });
  };

  const currentBankBalance = accounts.find(a => a.account_code === '1010')?.balance || 7000000;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-brand-800 font-semibold mb-1">
            <span className="px-2 py-0.5 bg-brand-100 rounded">Screen S-14</span>
            <span>·</span>
            <span>Feature F-16</span>
            <span>·</span>
            <span className="text-slate-500 font-mono">SR-10 (Partial Payments & Residuals)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Registrasi Pembayaran &amp; Penerimaan Kas (Register Payment)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan Pembayaran Parsial, Pelacakan Nilai Sisa (Residual), &amp; Mutasi Akun Bank 1010
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickTestNegative}
            className="px-3 py-1.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-semibold hover:bg-rose-200 transition"
          >
            ⚡ Tes Bayar Negatif (-Rp10k)
          </button>
          <button
            onClick={handleQuickTestExceed}
            className="px-3 py-1.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold hover:bg-amber-200 transition"
          >
            ⚡ Tes Lebih Bayar (Rp110k)
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

      {/* Main S-14 Wireframe Box (Page 29) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-6 max-w-4xl mx-auto">
        {/* Form Title & Stepper */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
          <div>
            <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
              Register Payment — Dialog
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              Pembayaran Faktur: {defaultInvoice.id}
            </h2>
            <p className="text-[11px] text-slate-500">
              Pelanggan: <strong className="text-slate-800">{defaultInvoice.customer_name}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={defaultInvoice.payment_status || 'Unpaid'} />
          </div>
        </div>

        {/* Master Fields (Wireframe S-14 Page 29) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-b border-slate-100">
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Nomor Invoice</span>
            <span className="font-bold text-slate-900 font-mono">{defaultInvoice.id}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Total Tagihan Awal</span>
            <span className="font-bold text-slate-900 font-mono">Rp{defaultInvoice.amount_due.toLocaleString('id-ID')}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Sisa Tagihan (Amount Due)</span>
            <span className="font-bold text-rose-700 font-mono">Rp{defaultInvoice.residual_amount.toLocaleString('id-ID')}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Jurnal Kas / Bank</span>
            <span className="font-bold text-slate-900">Bank (1010)</span>
          </div>
        </div>

        {/* Wireframe S-14 3-Metric Cards (Page 29) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-center">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-emerald-800 block text-[10px] font-semibold uppercase">Dibayar (Paid)</span>
            <span className="text-2xl font-black text-emerald-950 font-mono mt-1 block">
              Rp{defaultInvoice.paid_amount.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-emerald-700">Akumulasi pembayaran diterima</span>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <span className="text-amber-800 block text-[10px] font-semibold uppercase">Sisa Tagihan (Residual)</span>
            <span className="text-2xl font-black text-amber-950 font-mono mt-1 block">
              Rp{defaultInvoice.residual_amount.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-amber-700">Sisa piutang yang belum dilunasi</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">Saldo Bank (1010)</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              Rp{currentBankBalance.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-slate-500">Saldo Awal Rp7.000.000 + Kas Masuk</span>
          </div>
        </div>

        {/* Payment Submission Form */}
        {defaultInvoice.residual_amount > 0 ? (
          <form onSubmit={handleRegisterPaymentSubmit} className="space-y-4 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Nominal Pembayaran Diterima (Rp)
                </label>
                <input
                  type="number"
                  min="1"
                  max={defaultInvoice.residual_amount}
                  value={paymentAmountInput}
                  onChange={e => setPaymentAmountInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-sm focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Tip Pengujian T-27: Masukkan Rp40.000 untuk menghasilkan Residual Rp59.900 &amp; Bank Rp7.040.000!
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Metode Penyetoran
                </label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-700">
                  <option value="bank">Transfer Bank Mandiri (1010 Bank)</option>
                  <option value="cash">Kas Tunai (1020 Cash on Hand)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Validasi Pembayaran (Post Payment)
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-emerald-50 text-emerald-800 font-bold rounded-xl text-center border border-emerald-200">
            Faktur ini telah berstatus LUNAS (Paid). Saldo sisa piutang: Rp0.
          </div>
        )}

        {/* Chatter */}
        <Chatter
          documentId={defaultInvoice.id}
          notes={[
            {
              actor: 'finance / Sari Permata',
              timestamp: '01/10/2026 11:30 WIB',
              action: `Penerimaan kas dicatat untuk faktur ${defaultInvoice.id}`,
              details: 'Jurnal terbentuk: Dr Bank (1010) / Cr Accounts Receivable (1100). Status faktur diperbarui (SR-10 / T-27).'
            }
          ]}
        />
      </div>
    </div>
  );
};
