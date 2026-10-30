import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface SmartButtonItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  onClick?: () => void;
  badgeColor?: string;
  active?: boolean;
}

interface SmartButtonsProps {
  items: SmartButtonItem[];
}

export const SmartButtons: React.FC<SmartButtonsProps> = ({ items }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <button
            key={idx}
            onClick={item.onClick}
            type="button"
            className="flex items-center gap-2.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg shadow-xs text-xs font-medium text-slate-700 transition"
          >
            <div className={`p-1 rounded bg-slate-100 text-slate-600 ${item.badgeColor || ''}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block text-slate-400 text-[10px] uppercase font-semibold leading-none">{item.label}</span>
              <span className="block text-slate-800 text-xs font-bold leading-tight mt-0.5">{item.value}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
