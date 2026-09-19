import React, { useState } from 'react';
import { 
  authenticateWithUsernamePassword, 
  DEFAULT_STATIC_ACCOUNTS 
} from '../lib/auth';
import { AuthUser } from '../types';
import { 
  Lock, 
  User as UserIcon, 
  Store, 
  Database, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  KeyRound
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: (user: AuthUser) => void;
  canDismiss?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  canDismiss = true,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = authenticateWithUsernamePassword(username, password);
    if (!result.success) {
      setError(result.error || 'Invalid credentials.');
      return;
    }

    if (result.user && onSuccess) {
      onSuccess(result.user);
    }
    if (onClose) {
      onClose();
    }
  };

  const fillQuickCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Branding */}
        <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">ApparelPOS Login</h3>
                <p className="text-xs text-slate-400">Terminal & Store Database Access</p>
              </div>
            </div>

            {canDismiss && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Close"
              >
                ✕
              </button>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-indigo-300">
            <div className="flex items-center space-x-1.5">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Cloud Firestore Database Active</span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-500/30">
              Live Sync
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="input-login-username"
                  type="text"
                  required
                  autoFocus
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="input-login-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Sign In as Admin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick-Select Static Admin Account Section */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center">
                <KeyRound className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Admin Credentials
              </span>
              <span className="text-[10px] text-slate-400">Click to autofill</span>
            </div>

            <button
              type="button"
              onClick={() => fillQuickCredentials('admin', 'admin123')}
              className="w-full p-2.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-xl flex items-center justify-between transition-colors group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  A
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                    admin
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Password: admin123
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold uppercase tracking-wider">
                Admin
              </span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mr-1 shrink-0" />
            <span>All inventory & sales changes are stored directly in Cloud Firestore.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
