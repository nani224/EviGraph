import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Network, AlertTriangle, Shield, Database,
  Users, Activity, TrendingUp, GitBranch, Zap, ArrowRight, Clock,
  FolderPlus, Search, Play, FileText, CheckCircle, Lock
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { fetchDashboardStats, fetchDashboardLeads, fetchTimeline, fetchCases } from '../../api/client';
import { StatCard, SectionHeader, Skeleton } from '../../components/shared';
import NewInvestigationModal from '../../components/shared/NewInvestigationModal';
import { useAppStore } from '../../store/appStore';
import type { DashboardStats } from '../../types';
import { clsx } from 'clsx';

export default function Dashboard() {
  const { activeCase, setActiveCase } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [casesList, setCasesList] = useState<any[]>([]);
  const navigate = useNavigate();

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchDashboardStats().catch(() => null),
      fetchDashboardLeads().catch(() => ({ leads: [] })),
      fetchTimeline().catch(() => ({ monthly_summary: [] })),
      fetchCases().catch(() => ({ cases: [] }))
    ]).then(([statsRes, leadsRes, timeRes, casesRes]) => {
      if (statsRes) setStats(statsRes);
      if (leadsRes?.leads) setLeads(leadsRes.leads);
      if (casesRes?.cases) {
        setCasesList(casesRes.cases);
        if (!activeCase && casesRes.cases.length > 0) {
          setActiveCase(casesRes.cases[0]);
        }
      }
      if (timeRes?.monthly_summary) {
        setActivityData(timeRes.monthly_summary.map((m: any) => ({
          month: m.month_label || `M${m.month}`,
          cdr: m.cdr_events || 0,
          financial: m.financial_events || 0,
          location: m.location_events || 0
        })));
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header with Quick Action Buttons */}
      <SectionHeader
        title="Investigation Command Center"
        subtitle="AI-Powered Criminal Network Intelligence System · User-Driven Investigation Platform"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewCaseModal(true)}
              className="btn-primary flex items-center gap-1.5 text-xs px-3.5 py-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Investigation</span>
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="btn-secondary flex items-center gap-1.5 text-xs px-3.5 py-1.5 text-accent-300 border-accent-500/30 hover:bg-accent-500/10"
            >
              <Zap className="w-3.5 h-3.5 text-accent-400" />
              <span>Judge Demo</span>
            </button>
          </div>
        }
      />

      {/* Investigation Hub Welcome Card */}
      <div className="glass-card p-5 border border-accent-500/20 shadow-xl bg-gradient-to-r from-surface-1 via-surface-1 to-accent-950/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-accent-gradient flex items-center justify-center text-white flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {activeCase ? `${activeCase.case_number} · ${activeCase.title}` : 'Select or Start an Investigation'}
                </h2>
                {activeCase && (
                  <span className={clsx('badge text-[10px]', activeCase.priority === 'critical' ? 'badge-red' : activeCase.priority === 'high' ? 'badge-cyan' : 'badge-green')}>
                    {activeCase.priority?.toUpperCase()} PRIORITY
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeCase?.description || 'Initialize a new case or discover multi-hop connections across authorized data.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/discovery')}
              className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5 hover:border-cyan-500/40"
            >
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span>Find Connections</span>
            </button>
            <button
              onClick={() => navigate('/assistant')}
              className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5 hover:border-purple-500/40"
            >
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Ask AI Question</span>
            </button>
            <button
              onClick={() => navigate('/datasources')}
              className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5 hover:border-emerald-500/40"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Upload / Data Sources</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Investigations"
          value={stats?.active_cases ?? casesList.length}
          icon={<Shield className="w-4 h-4" />}
          color="cyan"
          delay={0}
        />
        <StatCard
          label="Entities in Graph"
          value={stats?.entities_in_graph ?? 0}
          icon={<Users className="w-4 h-4" />}
          color="blue"
          delay={0.05}
        />
        <StatCard
          label="Relationships Discovered"
          value={stats?.relationships_discovered ?? 0}
          icon={<Network className="w-4 h-4" />}
          color="cyan"
          delay={0.1}
        />
        <StatCard
          label="Anomalies Flagged"
          value={stats?.anomalies_detected ?? 0}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="red"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Evidence Records"
          value={stats?.evidence_items ?? 0}
          icon={<Database className="w-4 h-4" />}
          color="green"
          delay={0.2}
        />
        <StatCard
          label="Contradictions Detected"
          value={stats?.contradictions ?? 0}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="yellow"
          delay={0.25}
        />
        <StatCard
          label="Data Sources Online"
          value={stats?.data_sources_healthy ?? 0}
          icon={<Activity className="w-4 h-4" />}
          color="green"
          suffix={`/${stats?.data_sources?.length || 9}`}
          delay={0.3}
        />
        <StatCard
          label="Graph Communities"
          value={stats?.node_types ? Object.keys(stats.node_types).length : 4}
          icon={<TrendingUp className="w-4 h-4" />}
          color="blue"
          delay={0.35}
        />
      </div>

      {/* Evidence Integrity & Blockchain Security Summary */}
      <div className="glass-card p-4 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-surface-1 via-slate-900 to-cyan-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Evidence Integrity & Blockchain Ledger</span>
              <span className="badge badge-cyan text-[9px] font-mono">Hyperledger Fabric · SHA-256</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic cryptographic fingerprints anchored off-chain. Tamper-evident Section 65B legal provenance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-2 md:pt-0">
          <div className="text-center md:text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Records</div>
            <div className="font-bold text-white">{(stats as any)?.integrity_summary?.total_evidence_records || stats?.evidence_items || 65}</div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="text-center md:text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Fabric Anchored</div>
            <div className="font-bold text-cyan-400">{(stats as any)?.integrity_summary?.fabric_anchored || stats?.evidence_items || 65}</div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="text-center md:text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Verified</div>
            <div className="font-bold text-emerald-400">{(stats as any)?.integrity_summary?.verified || stats?.evidence_items || 65}</div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="text-center md:text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Tampered</div>
            <div className={clsx("font-bold", ((stats as any)?.integrity_summary?.tampered ?? 0) > 0 ? "text-rose-400 font-extrabold" : "text-slate-400")}>
              {(stats as any)?.integrity_summary?.tampered ?? 0}
            </div>
          </div>
          <button
            onClick={() => navigate('/evidence')}
            className="btn-ghost text-xs text-cyan-400 hover:text-cyan-300 ml-2"
          >
            Review <ArrowRight className="w-3 h-3 inline ml-0.5" />
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Dynamic High-Priority Leads from API */}
        <div className="lg:col-span-2 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="section-header mb-0">
              <AlertTriangle className="w-3.5 h-3.5 text-accent-400" />
              High-Priority Investigation Leads (API Computed)
            </div>
            <button onClick={() => navigate('/cases')} className="btn-ghost text-xs">
              View All Cases <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {leads.map((lead, i) => (
                <motion.div
                  key={lead.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 + 0.4 }}
                  onClick={() => navigate(lead.link || '/discovery')}
                  className="flex items-start justify-between p-3.5 rounded-lg border border-[rgba(34,211,238,0.12)] bg-navy-900/80 cursor-pointer hover:border-accent-500/40 hover:bg-navy-900 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={clsx('badge text-[10px]', lead.badgeClass || 'badge-cyan')}>
                        {lead.badge}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-white truncate">{lead.title}</div>
                    {lead.evidence && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {lead.evidence.map((s: string) => (
                          <span key={s} className="badge badge-gray text-[10px]">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0 text-right">
                    <div className="text-sm font-bold font-mono text-cyan-300">
                      {Math.round((lead.confidence || 0.85) * 100)}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">confidence</div>
                  </div>
                </motion.div>
              ))}

              {leads.length === 0 && !loading && (
                <div className="text-xs text-slate-500 text-center py-6">
                  No high-priority leads active in the current case.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Multi-Source Activity Stream */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <div>
            <div className="section-header">
              <Activity className="w-3.5 h-3.5 text-accent-400" />
              Temporal Event Distribution
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Monthly cross-source ingested event volume
            </p>

            <div className="h-44">
              {activityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="cdrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0e1628', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Area type="monotone" dataKey="cdr" stroke="#22d3ee" fill="url(#cdrGrad)" name="CDR Calls" />
                    <Area type="monotone" dataKey="financial" stroke="#3b82f6" fill="url(#finGrad)" name="Transactions" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Loading activity timeline...
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400">Investigate temporal patterns:</span>
            <button onClick={() => navigate('/timeline')} className="text-accent-400 hover:text-accent-300 font-semibold flex items-center gap-1">
              Open Timeline <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* New Investigation Modal */}
      <NewInvestigationModal
        isOpen={showNewCaseModal}
        onClose={() => setShowNewCaseModal(false)}
        onCreated={() => {
          loadData();
          navigate('/cases');
        }}
      />
    </div>
  );
}
