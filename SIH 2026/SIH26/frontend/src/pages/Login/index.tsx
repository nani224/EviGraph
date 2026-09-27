import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, User, ArrowRight, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const user = await login(username.trim(), password);
      // Strictly route based on backend-determined role
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full bg-navy-950 grid-bg bg-grid flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header Badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-gradient shadow-[0_0_25px_rgba(34,211,238,0.45)] mb-3 border border-cyan-400/30">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            EviGraph
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
            AI-Powered Criminal Network Analysis System
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl bg-navy-900/80">
          <div className="border-b border-white/10 pb-4 mb-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              Secure Law Enforcement Authentication
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter official credentials. Role and case authorizations are verified server-side.
            </p>
          </div>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Authentication Denied</div>
                <div>{errorMessage}</div>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Username or Official Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or investigator"
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-950/70 border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-950/70 border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 mt-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Authenticate & Enter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Seed accounts helper for development & jury review */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Development / Demo Seeds</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                TEST CREDENTIALS
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'Admin@123')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 text-left transition-all group"
              >
                <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Role: ADMIN</div>
                <div className="text-white font-medium text-xs mt-0.5">admin</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">Admin@123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('investigator', 'Investigator@123')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 text-left transition-all group"
              >
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Role: INVESTIGATOR</div>
                <div className="text-white font-medium text-xs mt-0.5">investigator</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">Investigator@123</div>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Server-enforced RBAC: The backend assigns dashboard permissions based on authoritative database record.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Secure Authentication · Role & Case Authorization enforced by Backend</span>
        </div>
      </motion.div>
    </div>
  );
}
