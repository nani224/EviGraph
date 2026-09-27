import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Network, Users, TrendingUp, Award, FolderPlus } from 'lucide-react';
import { fetchAnalytics } from '../../api/client';
import { SectionHeader, ConfidenceBar, Skeleton } from '../../components/shared';
import { useAppStore } from '../../store/appStore';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import type { GraphAnalytics } from '../../types';
import { clsx } from 'clsx';

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function GraphAnalyticsPage() {
  const { activeCase } = useAppStore();
  const [analytics, setAnalytics] = useState<GraphAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'degree' | 'betweenness' | 'pagerank'>('degree');

  useEffect(() => {
    setLoading(true);
    fetchAnalytics(activeCase?.id)
      .then(d => setAnalytics(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeCase?.id]);

  const tabData = analytics ? {
    degree: analytics.degree_centrality,
    betweenness: analytics.betweenness_centrality,
    pagerank: analytics.pagerank,
  }[activeTab] : [];

  const isBlank = !loading && (!analytics || analytics.total_nodes === 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <SectionHeader
        title="Graph Analytics"
        subtitle={activeCase ? `Centrality metrics and community detection scoped to Case ${activeCase.case_number}` : "Centrality metrics, community detection, and structural analysis"}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Nodes', value: isBlank ? 0 : analytics?.total_nodes, icon: Network, color: 'text-accent-400' },
          { label: 'Total Edges', value: isBlank ? 0 : analytics?.total_edges, icon: TrendingUp, color: 'text-blue-400' },
          { label: 'Communities', value: isBlank ? 0 : analytics?.community_count, icon: Users, color: 'text-purple-400' },
          { label: 'Max Centrality', value: isBlank ? '0.0%' : (analytics?.degree_centrality?.[0] ? `${(analytics.degree_centrality[0]?.score * 100).toFixed(1)}%` : '—'), icon: Award, color: 'text-emerald-400' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4"
          >
            <s.icon className={clsx('w-4 h-4 mb-2', s.color)} />
            <div className="text-xl font-bold text-white font-mono">{s.value ?? '—'}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {isBlank && (
        <div className="glass-card p-12 text-center space-y-4 max-w-lg mx-auto border border-white/10 my-6">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <Network className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">
              No Network Topology Available {activeCase ? `for ${activeCase.case_number}` : ''}
            </h3>
            <p className="text-xs text-slate-400">
              This newly created investigation does not have enough graph nodes or relationships to calculate PageRank, Louvain communities, or Betweenness Centrality.
            </p>
          </div>
          <a
            href="/datasources"
            className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-2"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Upload Evidence for this Case</span>
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Centrality Tab */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-1 mb-4">
            {[
              { key: 'degree', label: 'Degree' },
              { key: 'betweenness', label: 'Betweenness' },
              { key: 'pagerank', label: 'PageRank' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeTab === t.key
                    ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? <Skeleton className="h-48" /> : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tabData?.slice(0, 10)} layout="vertical" margin={{ left: 60, right: 20 }}>
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                  <YAxis type="category" dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip
                    contentStyle={{ background: '#0d1526', border: '1px solid rgba(34,211,238,0.15)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: any) => [`${(Number(v) * 100).toFixed(2)}%`, activeTab]}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {tabData?.slice(0, 10).map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top entities list */}
          <div className="mt-4 space-y-2">
            {tabData?.slice(0, 5).map((n: any, i: number) => (
              <div key={n.id} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-slate-300">{n.label}</span>
                    <span className="text-slate-500 font-mono">{(n.score * 100).toFixed(1)}%</span>
                  </div>
                  <ConfidenceBar value={n.score} showPercent={false} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Communities */}
        <div className="glass-card p-5">
          <div className="section-header">
            <Users className="w-3.5 h-3.5 text-accent-400" />
            Detected Communities (Louvain Algorithm)
          </div>
          {loading ? <Skeleton className="h-48" /> : (
            <div className="space-y-3">
              {analytics?.communities.map((c, i) => (
                <motion.div
                  key={c.community_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-3 rounded-lg bg-navy-900/80 border border-[rgba(34,211,238,0.08)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-white">{c.label}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.member_count} members · {c.edge_count} connections
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.members.slice(0, 5).map(m => (
                      <span key={m} className="badge badge-gray text-[10px] font-mono">{m}</span>
                    ))}
                    {c.members.length > 5 && (
                      <span className="badge badge-gray text-[10px]">+{c.members.length - 5}</span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-2">
                    {c.entity_types.map(t => (
                      <span key={t} className="text-[10px] text-slate-500">{t}</span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
