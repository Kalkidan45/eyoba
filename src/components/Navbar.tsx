import React from 'react';
import { SalesType } from '../types';

interface NavbarProps {
  activeTab: 'pos' | 'inventory' | 'categories' | 'reports';
  setActiveTab: (tab: 'pos' | 'inventory' | 'categories' | 'reports') => void;
  salesType: SalesType;
  setSalesType: (type: SalesType) => void;
  lowStockCount: number;
  onClearAllData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  salesType,
  setSalesType,
  lowStockCount,
  onClearAllData,
}) => {
  const navItems = [
    {
      id: 'pos' as const,
      label: 'POS Register',
      badge: null,
    },
    {
      id: 'inventory' as const,
      label: 'Inventory',
      badge: lowStockCount > 0 ? lowStockCount : null,
    },
    {
      id: 'categories' as const,
      label: 'Categories',
      badge: null,
    },
    {
      id: 'reports' as const,
      label: 'Reports',
      badge: null,
    },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          
          {/* Brand Identity - Clean text-only branding */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <span className="font-extrabold text-base tracking-tight text-white whitespace-nowrap">
              ApparelPOS
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400 bg-slate-800 border border-slate-700/60 whitespace-nowrap">
              Retail & Wholesale
            </span>
          </div>

          {/* Center Navigation Links - Icon-free text tabs to maximize desktop space */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center px-3.5 py-1.5 rounded-md text-xs lg:text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span
                      title={`${item.badge} low stock items`}
                      className={`ml-1.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full leading-tight ${
                        isActive
                          ? 'bg-white text-indigo-900'
                          : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Clear Data & Mode Switcher */}
          <div className="flex items-center space-x-2 shrink-0">
            {onClearAllData && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all stored inventory, categories, and sales transactions?')) {
                    onClearAllData();
                  }
                }}
                className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors whitespace-nowrap"
                title="Wipe all data and start completely fresh"
              >
                Clear Data
              </button>
            )}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700 text-xs">
              <button
                id="btn-mode-retail"
                type="button"
                onClick={() => setSalesType('retail')}
                className={`px-3 py-1 rounded text-xs whitespace-nowrap transition-all ${
                  salesType === 'retail'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to Storefront Retail pricing (MSRP)"
              >
                Retail
              </button>
              <button
                id="btn-mode-wholesale"
                type="button"
                onClick={() => setSalesType('wholesale')}
                className={`px-3 py-1 rounded text-xs whitespace-nowrap transition-all ${
                  salesType === 'wholesale'
                    ? 'bg-purple-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to B2B Wholesale pricing"
              >
                Wholesale
              </button>
            </div>
          </div>

        </div>

        {/* Mobile Navigation bar - Compact text pills */}
        <div className="md:hidden flex items-center justify-between py-1.5 border-t border-slate-800 overflow-x-auto gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white font-medium shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== null && (
                  <span className="ml-1 px-1 py-0.2 text-[10px] font-bold rounded bg-amber-500 text-slate-950">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
