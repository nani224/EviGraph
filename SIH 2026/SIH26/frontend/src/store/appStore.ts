import { create } from 'zustand';
import type { Case, DashboardStats, Entity, DataMode } from '../types';

interface AppState {
  // Active case
  activeCase: Case | null;
  setActiveCase: (c: Case | null) => void;

  // Data Mode
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => void;

  // Dashboard
  dashboardStats: DashboardStats | null;
  setDashboardStats: (s: DashboardStats) => void;

  // Selected entity (for cross-page context)
  selectedEntity: Entity | null;
  setSelectedEntity: (e: Entity | null) => void;

  // Global search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Notifications
  notifications: Notification[];
  addNotification: (n: Notification) => void;
  clearNotification: (id: string) => void;

  // Demo mode
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  demoStep: number;
  setDemoStep: (s: number) => void;

  // Graph filter state
  graphFilters: {
    entityTypes: string[];
    relationshipTypes: string[];
    dateFrom: string;
    dateTo: string;
    sources: string[];
    minConfidence: number;
  };
  setGraphFilters: (f: Partial<AppState['graphFilters']>) => void;

  // Processing state for data source ingestion
  processingSourceId: string | null;
  setProcessingSourceId: (id: string | null) => void;
}

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
}

export const useAppStore = create<AppState>((set) => ({
  activeCase: null,
  setActiveCase: (c) => set({ activeCase: c }),

  dataMode: 'synthetic_investigation',
  setDataMode: (mode) => set({ dataMode: mode }),

  dashboardStats: null,
  setDashboardStats: (s) => set({ dashboardStats: s }),

  selectedEntity: null,
  setSelectedEntity: (e) => set({ selectedEntity: e }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  notifications: [],
  addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications].slice(0, 10) })),
  clearNotification: (id) => set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) })),

  demoMode: false,
  setDemoMode: (v) => set({ demoMode: v }),
  demoStep: 0,
  setDemoStep: (s) => set({ demoStep: s }),

  graphFilters: {
    entityTypes: [],
    relationshipTypes: [],
    dateFrom: '',
    dateTo: '',
    sources: [],
    minConfidence: 0,
  },
  setGraphFilters: (f) => set((s) => ({ graphFilters: { ...s.graphFilters, ...f } })),

  processingSourceId: null,
  setProcessingSourceId: (id) => set({ processingSourceId: id }),
}));

