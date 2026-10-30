import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStyle = (s: string) => {
    switch (s.toLowerCase()) {
      case 'draft':
      case 'rfq':
      case 'to do':
      case 'new':
      case 'requested':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'pending approval':
      case 'pending owner approval':
      case 'quality hold':
      case 'partial':
        return 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse';
      case 'confirmed':
      case 'ready':
      case 'sales order':
      case 'purchase order':
      case 'qualified':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'posted':
      case 'done':
      case 'passed':
      case 'won':
      case 'credited':
      case 'paid':
      case 'approved':
      case 'approved by owner':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium';
      case 'failed':
      case 'rejected':
      case 'cancelled':
      case 'variance hold':
      case 'lost':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-medium';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${getStyle(status)} ${className}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-70"></span>
      {status}
    </span>
  );
};
