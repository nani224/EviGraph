import { create } from 'zustand';
import type { AuthUser, UserRole } from '../types/auth';
import { loginUser, fetchCurrentUser, logoutUser } from '../api/client';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  permissions: string[];
  assignedCases: string[];
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('evigraph_auth_token'),
  permissions: [],
  assignedCases: [],
  isAuthenticated: Boolean(localStorage.getItem('evigraph_auth_token')),
  loading: true,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const data = await loginUser(username, password);
      localStorage.setItem('evigraph_auth_token', data.access_token);
      
      // Fetch full profile with permissions
      const me = await fetchCurrentUser();
      set({
        token: data.access_token,
        user: me.user,
        permissions: me.permissions || [],
        assignedCases: me.assigned_cases || [],
        isAuthenticated: true,
        loading: false,
        error: null,
      });
      return me.user;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please check your credentials.';
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try {
      await logoutUser();
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('evigraph_auth_token');
    set({
      user: null,
      token: null,
      permissions: [],
      assignedCases: [],
      isAuthenticated: false,
      loading: false,
      error: null,
    });
  },

  initAuth: async () => {
    const token = localStorage.getItem('evigraph_auth_token');
    if (!token) {
      set({ loading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const me = await fetchCurrentUser();
      set({
        token,
        user: me.user,
        permissions: me.permissions || [],
        assignedCases: me.assigned_cases || [],
        isAuthenticated: true,
        loading: false,
        error: null,
      });
    } catch (err) {
      // Invalid/expired token
      localStorage.removeItem('evigraph_auth_token');
      set({
        token: null,
        user: null,
        permissions: [],
        assignedCases: [],
        isAuthenticated: false,
        loading: false,
      });
    }
  },

  hasRole: (role) => {
    const { user } = get();
    return user?.role === role;
  },

  hasPermission: (permission) => {
    const { permissions, user } = get();
    if (user?.role === 'ADMIN') return true;
    return permissions.includes(permission);
  },
}));
