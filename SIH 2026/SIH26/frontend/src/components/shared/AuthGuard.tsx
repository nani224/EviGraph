import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Shield, Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'INVESTIGATOR';
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { isAuthenticated, loading, user, initAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-navy-950 flex flex-col items-center justify-center gap-4 text-slate-300">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-accent-gradient flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.4)]">
            <Shield className="w-6 h-6 text-white animate-pulse" />
          </div>
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin absolute -top-2 -left-2 opacity-50" />
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-white tracking-wider">EVIGRAPH SECURE GATEWAY</div>
          <div className="text-xs text-slate-500 font-mono mt-1">Verifying backend session & permissions...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Active check
  if (user.is_active === false) {
    return <Navigate to="/login" replace />;
  }

  // Role check
  if (requiredRole && user.role !== requiredRole && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
