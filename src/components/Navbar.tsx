import React from 'react';
import { SalesType, AuthUser } from '../types';
import { Database, LogIn, LogOut, Shield } from 'lucide-react';

interface NavbarProps {
  activeTab: 'pos' | 'inventory' | 'categories' | 'reports';
  setActiveTab: (tab: 'pos' | 'inventory' | 'categories' | 'reports') => void;
  salesType: SalesType;
  setSalesType: (type: SalesType) => void;
  lowStockCount: number;
  user: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  salesType,
  setSalesType,
  lowStockCount,
  user,
  onOpenAuth,
  onLogout,
  isSyncing = false,
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
          
          {/* Brand Identity */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <span className="font-extrabold text-base tracking-tight text-white whitespace-nowrap">
              ApparelPOS
            </span>
            <div className="hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium text-slate-300 bg-slate-800 border border-slate-700/60 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Database className="w-3 h-3 text-emerald-400 mr-0.5" />
              <span>Cloud Database Sync</span>
            </div>
          </div>

          {/* Center Navigation Links */}
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

          {/* Right Controls: Mode Switcher, Clear Data & Auth User */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700 text-xs">
              <button
                id="btn-mode-retail"
                type="button"
                onClick={() => setSalesType('retail')}
                className={`px-2.5 py-1 rounded text-xs whitespace-nowrap transition-all ${
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
                className={`px-2.5 py-1 rounded text-xs whitespace-nowrap transition-all ${
                  salesType === 'wholesale'
                    ? 'bg-purple-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to B2B Wholesale pricing"
              >
                Wholesale
              </button>
            </div>

            {/* User Login/Account Button */}
            {user ? (
              <div className="flex items-center space-x-1.5 pl-1.5 border-l border-slate-800">
                <div 
                  className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-750 rounded-lg text-xs border border-slate-700/60"
                  title={`Logged in as ${user.displayName} (@${user.username})`}
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="text-slate-200 font-semibold text-[11px] capitalize">
                      {user.username}
                    </span>
                    <span className="text-indigo-300 text-[9px] uppercase font-bold tracking-wider">
                      {user.role}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
            )}
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
