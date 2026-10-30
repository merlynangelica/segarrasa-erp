import React from 'react';
import {
  LayoutGrid, Users, Package, Kanban, FileText,
  ShieldAlert, Truck, Receipt, ShoppingBag, Inbox,
  CheckCircle2, FileSpreadsheet, BookOpen, CreditCard,
  ArrowLeftRight, RotateCcw, BarChart3, History, Shield,
  ChevronRight
} from 'lucide-react';
import { useErp } from '../../store/erpContext';
import { ERP_NAV_ITEMS, canRoleAccess } from '../../config/navigation';

interface SidebarProps {
  currentScreenId: string;
  onNavigateScreen: (screenId: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutGrid, Users, Package, Kanban, FileText,
  ShieldAlert, Truck, Receipt, ShoppingBag, Inbox,
  CheckCircle2, FileSpreadsheet, BookOpen, CreditCard,
  ArrowLeftRight, RotateCcw, BarChart3, History
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreenId,
  onNavigateScreen,
  isOpen,
  onCloseMobile
}) => {
  const { currentUser } = useErp();

  if (!currentUser) return null;

  // Filter items strictly based on role
  const accessibleItems = ERP_NAV_ITEMS.filter(item =>
    canRoleAccess(currentUser.role, item.screenId)
  );

  // Group items by moduleGroup
  const groupedItems = accessibleItems.reduce((acc, item) => {
    if (!acc[item.moduleGroup]) acc[item.moduleGroup] = [];
    acc[item.moduleGroup].push(item);
    return acc;
  }, {} as Record<string, typeof accessibleItems>);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-2xs lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Role badge header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Akses Peran Aktif
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-brand-100 text-brand-800 border border-brand-200">
              {currentUser.role}
            </span>
          </div>
          <div className="mt-1 font-bold text-xs text-slate-800 truncate">
            {currentUser.name}
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {currentUser.title}
          </div>
          {currentUser.role === 'owner' && (
            <div className="mt-2 text-[10px] bg-amber-50 text-amber-900 border border-amber-200 rounded p-1.5 leading-tight flex items-center gap-1 font-medium">
              <Shield className="w-3.5 h-3.5 shrink-0 text-amber-700" />
              <span>Owner berhak melihat seluruh 18 layar & modul ERP.</span>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {Object.entries(groupedItems).map(([group, items]) => (
            <div key={group}>
              <div className="px-2 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {group}
              </div>
              <div className="space-y-0.5">
                {items.map(item => {
                  const Icon = ICON_MAP[item.icon] || LayoutGrid;
                  const isActive = currentScreenId === item.screenId;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigateScreen(item.screenId);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                        isActive
                          ? 'bg-brand-800 text-white shadow-xs font-semibold'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-gold-500' : 'text-slate-400'}`} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 ml-1.5 ${
                        isActive ? 'bg-brand-900 text-brand-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {item.screenId}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* System info footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-[10px] text-slate-400 text-center">
          <div>PT Segar Rasa Riau · SR-Core v1.0</div>
          <div className="text-slate-500 font-mono text-[9px] mt-0.5">24SI3 - Group 01 FMCG ERP</div>
        </div>
      </aside>
    </>
  );
};
