import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Network, Search, MapPin, Clock, AlertTriangle,
  Shield, Database, Video, MessageSquare, Settings, FolderOpen,
  GitBranch, ChevronLeft, ChevronRight, Zap,
  FileText, Users, BarChart2, Cpu, Sparkles, ShieldAlert, LogOut
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { clsx } from 'clsx';

type NavItem = { path: string; icon: React.FC<any>; label: string; accent?: boolean; badge?: string };
type NavGroup = { group: string; items: NavItem[] };

const NAV_ITEMS: NavGroup[] = [
  { group: 'CORE ENGINE', items: [
    { path: '/',           icon: GitBranch,       label: 'Find Connection', accent: true },
    { path: '/overview',   icon: LayoutDashboard, label: 'Command Center' },
    { path: '/cases',      icon: FolderOpen,      label: 'Investigations' },
  ]},
  { group: 'GRAPH & DISCOVERY', items: [
    { path: '/network',    icon: Network,         label: 'Network Graph' },
    { path: '/analytics',  icon: BarChart2,       label: 'Graph Analytics' },
    { path: '/search',     icon: Search,          label: 'Entity Search' },
  ]},
  { group: 'EVIDENCE & CONTEXT', items: [
    { path: '/evidence',   icon: Shield,          label: 'Evidence Chain' },
    { path: '/locations',  icon: MapPin,          label: 'Spatial Context' },
    { path: '/timeline',   icon: Clock,           label: 'Temporal Context' },
    { path: '/anomalies',  icon: AlertTriangle,   label: 'Inconsistencies', badge: 'alert' },
    { path: '/resolution', icon: Users,           label: 'Entity Resolution' },
  ]},
  { group: 'BENCHMARKS & AI', items: [
    { path: '/datasources', icon: Database,       label: 'Data Sources' },
    { path: '/validation',  icon: Cpu,            label: 'Model Benchmarks', accent: true },
    { path: '/video',       icon: Video,          label: 'Video Intel' },
    { path: '/assistant',   icon: MessageSquare,  label: 'AI Assistant' },
  ]},
  { group: 'DEMO & SYSTEM', items: [
    { path: '/demo',        icon: Zap,            label: 'Hero Demo Mode', accent: true },
    { path: '/settings',    icon: Settings,       label: 'Settings' },
  ]},
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const navGroups: NavGroup[] = [
    ...(user?.role === 'ADMIN' ? [{
      group: 'ADMINISTRATION',
      items: [
        { path: '/admin', icon: ShieldAlert, label: 'Admin Command', accent: true, badge: 'ADMIN' },
      ]
    }] : []),
    ...NAV_ITEMS
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 236 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex-shrink-0 bg-navy-900 border-r border-[rgba(34,211,238,0.1)] flex flex-col h-screen overflow-hidden z-30 shadow-xl"
    >
      {/* Logo Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[rgba(34,211,238,0.1)] min-h-[64px] bg-navy-950/50">
        <div className="w-8 h-8 rounded-lg bg-accent-gradient flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.4)]">
          <GitBranch className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <div className="text-sm font-extrabold text-white leading-tight tracking-tight flex items-center gap-1">
                E-CRIME GRAPH
              </div>
              <div className="text-[10px] text-accent-400 uppercase tracking-widest font-semibold">
                Relationship Engine
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-4">
        {navGroups.map(group => (
          <div key={group.group}>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500"
                >
                  {group.group}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink key={item.path} to={item.path} end={item.path === '/'}>
                  {({ isActive }) => (
                    <motion.div
                      whileHover={{ x: 2 }}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer relative group',
                        isActive
                          ? 'text-accent-300 bg-accent-500/15 border border-accent-500/30 shadow-[0_0_12px_rgba(34,211,238,0.15)] font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
                        item.accent && !isActive && 'text-cyan-400'
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r-full bg-accent-500 shadow-[0_0_8px_#22d3ee]"
                        />
                      )}
                      <item.icon className={clsx(
                        'flex-shrink-0 transition-colors',
                        sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4',
                        isActive ? 'text-accent-400' : ''
                      )} />
                      <AnimatePresence>
                        {!sidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="truncate flex-1 text-xs"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {!sidebarCollapsed && item.badge && (
                        <span className="badge badge-red text-[9px] px-1.5 py-0.5 ml-auto">
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer: Sign Out & Collapse Toggle */}
      <div className="p-2 border-t border-[rgba(34,211,238,0.08)] bg-navy-950/60 space-y-1.5">
        <button
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className={clsx(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all",
            sidebarCollapsed ? "justify-center px-0" : ""
          )}
          title="Sign Out of EviGraph"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 text-red-400" />
          {!sidebarCollapsed && <span className="truncate">Sign Out</span>}
        </button>

        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-xs"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
