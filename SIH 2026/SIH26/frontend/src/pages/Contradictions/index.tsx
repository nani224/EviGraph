import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Microscope, ChevronDown, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { fetchContradictions, updateContradiction } from '../../api/client';
import { SectionHeader, VerifyActions } from '../../components/shared';
import type { Contradiction } from '../../types';
import { clsx } from 'clsx';

const SEVERITY_BADGE: Record<string, string> = {
  high: 'badge-red', medium: 'badge-yellow', low: 'badge-gray', critical: 'badge-red',
};

export default function Contradictions() {
  const [items, setItems] = useState<Contradiction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchContradictions()
      .then(d => setItems(d.contradictions))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDecision = async (id: string, decision: string) => {
    await updateContradiction(id, decision);
    setItems(prev => prev.map(c => c.id === id ? { ...c, status: decision as any } : c));
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <SectionHeader
        title="Contradiction Detection"
        subtitle="Cross-source inconsistencies that may require investigative attention"
      />

      <div className="px-4 py-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-sm text-blue-300 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        Contradictions are data inconsistencies that may indicate errors, aliases, or deception. Each requires investigator review.
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Found', value: items.length, color: 'text-slate-300' },
          { label: 'Unresolved', value: items.filter(c => c.status === 'unresolved').length, color: 'text-red-400' },
          { label: 'Resolved', value: items.filter(c => c.status === 'resolved').length, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className={clsx('text-2xl font-bold font-mono', s.color)}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {loading && [...Array(3)].map((_, i) => <div key={i} className="shimmer h-28 rounded-xl" />)}
        {items.map((item, i) => {
          const isExpanded = expanded === item.id;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass-card border border-orange-500/20"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <span className="text-sm font-bold text-white">{item.entity_label}</span>
                      <span className={clsx('badge', SEVERITY_BADGE[item.severity])}>{item.severity.toUpperCase()}</span>
                      <span className="badge badge-gray">{item.type.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-xs text-slate-400">{item.description}</div>
                  </div>
                  <button onClick={() => setExpanded(isExpanded ? null : item.id)} className="btn-ghost p-1">
                    <ChevronDown className={clsx('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                  </button>
                </div>

                {/* Source records summary */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {item.records.map((r, ri) => (
                    <div key={ri} className="px-2 py-1 rounded-lg bg-navy-900/80 border border-[rgba(34,211,238,0.08)] text-xs">
                      <span className="badge badge-gray mr-1.5">{r.source_type}</span>
                      <span className="text-slate-400">{r.field}: </span>
                      <span className="text-slate-300 font-medium">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-[rgba(34,211,238,0.08)]"
                  >
                    <div className="p-5 space-y-4">
                      <div className="section-header">
                        <Shield className="w-3.5 h-3.5 text-accent-400" />
                        Source Records Comparison
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {item.records.map((r, ri) => (
                          <div key={ri} className="p-3 rounded-lg bg-navy-900 border border-[rgba(34,211,238,0.08)]">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={clsx('badge', SEVERITY_BADGE[item.severity] || 'badge-gray')}>{r.source_type}</span>
                              <span className="text-xs text-slate-500 font-mono">{r.record_id}</span>
                            </div>
                            <div className="text-xs space-y-1">
                              <div><span className="text-slate-500">Field: </span><span className="text-slate-300">{r.field}</span></div>
                              <div><span className="text-slate-500">Value: </span><span className="text-white font-medium">{r.value}</span></div>
                              <div><span className="text-slate-500">When: </span><span className="text-slate-400">{new Date(r.timestamp).toLocaleString('en-IN')}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-[rgba(34,211,238,0.08)]">
                        <div className="text-xs text-slate-500 mb-2">Investigator Decision</div>
                        <VerifyActions
                          findingId={item.id}
                          findingType="contradiction"
                          onDecision={(d) => handleDecision(item.id, d)}
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
