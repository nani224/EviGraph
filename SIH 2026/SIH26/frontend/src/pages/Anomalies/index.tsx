import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, BarChart2, ArrowUp, CheckCircle, XCircle, Clock, ChevronDown, ShieldCheck } from 'lucide-react';
import { fetchAnomalies, updateAnomaly } from '../../api/client';
import { ConfidenceBar, SectionHeader, VerifyActions } from '../../components/shared';
import { useAppStore } from '../../store/appStore';
import type { Anomaly } from '../../types';
import { clsx } from 'clsx';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const SEVERITY_CONFIG = {
  high:     { cls: 'border-red-500/30 bg-red-500/5',    badge: 'badge-red',    dot: 'bg-red-500' },
  medium:   { cls: 'border-orange-500/30 bg-orange-500/5', badge: 'badge-yellow', dot: 'bg-orange-500' },
  low:      { cls: 'border-yellow-500/20 bg-yellow-500/5', badge: 'badge-yellow', dot: 'bg-yellow-500' },
  critical: { cls: 'border-red-500/50 bg-red-500/10',   badge: 'badge-red',    dot: 'bg-red-500' },
};

export default function Anomalies() {
  const { activeCase } = useAppStore();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    fetchAnomalies(undefined, activeCase?.id)
      .then(d => setAnomalies(d.anomalies || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeCase?.id]);

  const handleDecision = async (anomaly: Anomaly, decision: string) => {
    await updateAnomaly(anomaly.id, decision);
    setAnomalies(prev => prev.map(a => a.id === anomaly.id ? { ...a, status: decision as any } : a));
  };

  const filtered = statusFilter === 'all' ? anomalies : anomalies.filter(a => a.status === statusFilter);

  const chartData = [
    { name: 'Jan–Jul', value: 2.1 },
    { name: 'Aug',     value: 9.3 },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <SectionHeader
        title="Anomaly Detection"
        subtitle="Entities with statistically unusual activity relative to historical baseline"
      />

      {/* Safety notice */}
      <div className="px-4 py-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-sm text-blue-300 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        Anomalies indicate unusual activity patterns. They do not indicate wrongdoing. All findings require investigator review.
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Detected', value: anomalies.length, color: 'text-slate-300' },
          { label: 'Pending Review', value: anomalies.filter(a => a.status === 'pending').length, color: 'text-yellow-400' },
          { label: 'Marked Relevant', value: anomalies.filter(a => ['mark_relevant','relevant'].includes(a.status)).length, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className={clsx('text-2xl font-bold font-mono', s.color)}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'pending', 'mark_relevant', 'reject'].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              statusFilter === f
                ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30'
                : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-[rgba(34,211,238,0.1)]'
            )}
          >
            {f === 'all' ? 'All' : f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Anomaly Cards */}
      <div className="space-y-4">
        {loading && [...Array(3)].map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-xl" />
        ))}

        {!loading && filtered.length === 0 && (
          <div className="glass-card p-12 text-center space-y-4 max-w-lg mx-auto border border-white/10 my-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                No Inconsistencies or Anomalies Flagged {activeCase ? `for ${activeCase.case_number}` : ''}
              </h3>
              <p className="text-xs text-slate-400">
                Statistical frequency tests and baseline deviation models show normal patterns for this case or no suspect telecommunication/financial transactions have been ingested yet.
              </p>
            </div>
          </div>
        )}

        {filtered.map((anomaly, i) => {
          const cfg = SEVERITY_CONFIG[anomaly.severity] || SEVERITY_CONFIG.medium;
          const isExpanded = expanded === anomaly.id;

          return (
            <motion.div
              key={anomaly.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={clsx('glass-card border', cfg.cls)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={clsx('anomaly-pulse mt-1 flex-shrink-0', cfg.dot)} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{anomaly.entity_name}</span>
                        <span className={clsx('badge', cfg.badge)}>{anomaly.severity.toUpperCase()}</span>
                        {anomaly.status !== 'pending' && (
                          <span className={clsx('badge',
                            anomaly.status === 'mark_relevant' ? 'badge-green' :
                            anomaly.status === 'reject' ? 'badge-red' : 'badge-yellow'
                          )}>
                            {anomaly.status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{anomaly.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-400 font-mono">+{anomaly.change_pct}%</div>
                      <div className="text-xs text-slate-500">{anomaly.metric.replace(/_/g, ' ')}</div>
                    </div>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : anomaly.id)}
                      className="btn-ghost p-1"
                    >
                      <ChevronDown className={clsx('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                  </div>
                </div>

                {/* Before/After bar */}
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Before ({anomaly.baseline_period})</span>
                      <span className="font-mono">{anomaly.before_value} {anomaly.unit.split('/')[0]}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-500"
                        style={{ width: `${(anomaly.before_value / anomaly.after_value) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-red-400 font-mono">→</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-red-400 mb-1">
                      <span>After ({anomaly.period})</span>
                      <span className="font-mono">{anomaly.after_value} {anomaly.unit.split('/')[0]}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full bg-red-500" style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-[rgba(34,211,238,0.08)]"
                  >
                    <div className="p-5 space-y-4">
                      {/* Contributing factors */}
                      <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Why was this flagged?
                        </div>
                        <div className="space-y-1.5">
                          {anomaly.contributing_factors.map((f, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                              <span className="text-accent-400 mt-0.5 flex-shrink-0">✓</span>
                              {f}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>Algorithm: <span className="text-slate-300">{anomaly.algorithm}</span></span>
                        <span>Source: <span className="text-slate-300">{anomaly.source}</span></span>
                      </div>

                      {/* Investigator verification */}
                      <div className="pt-3 border-t border-[rgba(34,211,238,0.08)]">
                        <div className="text-xs text-slate-500 mb-2">Investigator Decision</div>
                        <VerifyActions
                          findingId={anomaly.id}
                          findingType="anomaly"
                          onDecision={(d) => handleDecision(anomaly, d)}
                          size="sm"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
