import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle, XCircle, ChevronDown, Fingerprint, ShieldCheck } from 'lucide-react';
import { fetchCandidates, submitResolution } from '../../api/client';
import { ConfidenceBar, SectionHeader } from '../../components/shared';
import { useAppStore } from '../../store/appStore';
import type { ResolutionCandidate } from '../../types';
import { clsx } from 'clsx';

export default function EntityResolution() {
  const { activeCase } = useAppStore();
  const [candidates, setCandidates] = useState<ResolutionCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    fetchCandidates(undefined, activeCase?.id)
      .then(d => setCandidates(d.candidates || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeCase?.id]);

  const decide = async (id: string, decision: string) => {
    await submitResolution(id, decision);
    setDecisions(prev => ({ ...prev, [id]: decision }));
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <SectionHeader
        title="Entity Resolution"
        subtitle={activeCase ? `Candidate alias resolution scoped to Case ${activeCase.case_number}` : "Potential duplicate or alias relationships across data sources"}
      />

      <div className="px-4 py-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-sm text-blue-300 flex items-center gap-2">
        <Fingerprint className="w-4 h-4 flex-shrink-0" />
        Entity resolution identifies entities that may refer to the same real-world subject across different data sources. Requires investigator confirmation.
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Candidates', value: candidates.length },
          { label: 'Confirmed Same', value: Object.values(decisions).filter(d => d === 'same_entity').length },
          { label: 'Different Entities', value: Object.values(decisions).filter(d => d === 'different_entity').length },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-white font-mono">{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {loading && [...Array(3)].map((_, i) => <div key={i} className="shimmer h-28 rounded-xl" />)}

        {!loading && candidates.length === 0 && (
          <div className="glass-card p-12 text-center space-y-4 max-w-lg mx-auto border border-white/10 my-6">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                No Duplicate Entities Detected {activeCase ? `for ${activeCase.case_number}` : ''}
              </h3>
              <p className="text-xs text-slate-400">
                All entities in this investigation have unique identities or no cross-source phonetic duplicates were found.
              </p>
            </div>
          </div>
        )}

        {candidates.map((c, i) => {
          const decided = decisions[c.id];
          const isExpanded = expanded === c.id;

          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={clsx('glass-card',
                decided === 'same_entity' ? 'border-emerald-500/30' :
                decided === 'different_entity' ? 'border-red-500/30' :
                'border-[rgba(34,211,238,0.10)]'
              )}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Entity pair */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="px-3 py-2 rounded-lg bg-navy-900 border border-[rgba(34,211,238,0.1)] text-sm font-medium text-white">
                        {c.entity_a.name}
                        <div className="text-xs text-slate-500">{c.entity_a.source}</div>
                      </div>
                      <div className="text-xs text-slate-600">might be</div>
                      <div className="px-3 py-2 rounded-lg bg-navy-900 border border-[rgba(34,211,238,0.1)] text-sm font-medium text-white">
                        {c.entity_b.name}
                        <div className="text-xs text-slate-500">{c.entity_b.source}</div>
                      </div>
                    </div>
                    <ConfidenceBar value={c.confidence} label="Match Confidence" size="sm" />
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {decided ? (
                      <span className={clsx('badge text-xs',
                        decided === 'same_entity' ? 'badge-green' : 'badge-red'
                      )}>
                        {decided === 'same_entity' ? '✓ Same Entity' : '✗ Different'}
                      </span>
                    ) : null}
                    <button onClick={() => setExpanded(isExpanded ? null : c.id)} className="btn-ghost p-1">
                      <ChevronDown className={clsx('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                  </div>
                </div>

                {!decided && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => decide(c.id, 'same_entity')}
                      className="btn-success text-xs"
                    >
                      <CheckCircle className="w-3 h-3" /> Same Entity
                    </button>
                    <button
                      onClick={() => decide(c.id, 'different_entity')}
                      className="btn-danger text-xs"
                    >
                      <XCircle className="w-3 h-3" /> Different
                    </button>
                    <button
                      onClick={() => decide(c.id, 'needs_investigation')}
                      className="btn-ghost text-xs border border-yellow-500/20 text-yellow-400"
                    >
                      Investigate
                    </button>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-[rgba(34,211,238,0.08)]"
                  >
                    <div className="p-5">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Matching Evidence
                      </div>
                      <div className="space-y-2">
                        {c.evidence.map((ev, j) => (
                          <div key={j} className="flex items-start gap-3 text-xs">
                            <div className="w-8 h-1.5 mt-1.5 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
                              <div
                                className="h-full bg-accent-500 rounded-full"
                                style={{ width: `${ev.weight * 100}%` }}
                              />
                            </div>
                            <div>
                              <span className="badge badge-gray mr-2">{ev.type}</span>
                              <span className="text-slate-300">{ev.description}</span>
                            </div>
                          </div>
                        ))}
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
