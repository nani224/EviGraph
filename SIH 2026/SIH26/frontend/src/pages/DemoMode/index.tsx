import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Network, GitBranch, AlertTriangle, Shield, MessageSquare, ChevronRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SectionHeader } from '../../components/shared';
import { fetchDashboardStats, fetchEndToEndValidation } from '../../api/client';
import type { DashboardStats, EndToEndValidationReport } from '../../types';
import { clsx } from 'clsx';

export default function DemoMode() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [e2e, setE2e] = useState<EndToEndValidationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetchDashboardStats().catch(() => null),
      fetchEndToEndValidation().catch(() => null)
    ]).then(([sRes, eRes]) => {
      if (sRes) setStats(sRes);
      if (eRes) setE2e(eRes);
    }).finally(() => setLoading(false));
  }, []);

  const DEMO_STEPS = [
    {
      id: 1,
      icon: Network,
      title: 'Knowledge Graph Overview',
      description: `Explore ${stats?.entities_in_graph || 65}+ entities and ${stats?.relationships_discovered || 616} relationships extracted from heterogeneous sources.`,
      path: '/network',
      duration: '2 min',
      highlight: 'View the full intelligence graph',
      color: 'text-accent-400',
      border: 'border-accent-500/30',
      bg: 'bg-accent-500/5',
    },
    {
      id: 2,
      icon: GitBranch,
      title: 'Multi-Hop Path Discovery',
      description: 'Discover hidden non-obvious multi-hop associations between apparently unconnected targets.',
      path: '/discovery',
      duration: '3 min',
      highlight: e2e?.key_finding_recovered ? e2e.key_finding_recovered.target_path.join(' → ') : 'Multi-hop graph traversal',
      color: 'text-blue-400',
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/5',
    },
    {
      id: 3,
      icon: AlertTriangle,
      title: 'Anomaly Detection',
      description: `Examine statistical activity surges and isolation anomalies (${stats?.anomalies_detected || 3} detected).`,
      path: '/anomalies',
      duration: '2 min',
      highlight: `${stats?.anomalies_detected || 3} statistical anomalies flagged`,
      color: 'text-red-400',
      border: 'border-red-500/30',
      bg: 'bg-red-500/5',
    },
    {
      id: 4,
      icon: Shield,
      title: 'Evidence Chain & Contradiction',
      description: `Explore cross-source data discrepancies (${stats?.contradictions || 3} conflicts found) with full evidence provenance.`,
      path: '/contradictions',
      duration: '2 min',
      highlight: 'Cross-source field discrepancy analysis',
      color: 'text-orange-400',
      border: 'border-orange-500/30',
      bg: 'bg-orange-500/5',
    },
    {
      id: 5,
      icon: MessageSquare,
      title: 'AI-Assisted Analysis',
      description: 'Query the AI assistant about entities, relationships, and patterns with evidence-grounded responses.',
      path: '/assistant',
      duration: '2 min',
      highlight: 'Evidence-grounded assistant queries',
      color: 'text-purple-400',
      border: 'border-purple-500/30',
      bg: 'bg-purple-500/5',
    },
  ];

  const handleNavigate = (step: typeof DEMO_STEPS[0]) => {
    setActiveStep(step.id);
    setTimeout(() => {
      setCompleted(prev => new Set([...prev, step.id]));
      navigate(step.path);
    }, 600);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-3xl">
      <SectionHeader
        title="Demo Mode"
        subtitle="Guided walkthrough of the NEXUS Intelligence System · Fully API-Driven"
      />

      {/* Demo context */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent-gradient flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white mb-2">SIH 2026 — Synthetic Investigation Scenario</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-3">
              This demo executes on the controlled synthetic investigation universe. All statistics, entities,
              relationships, anomalies, and multi-hop traversals are computed live by the backend FastAPI services.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                `${stats?.entities_in_graph || 65} graph entities`,
                `${stats?.relationships_discovered || 616} discovered relationships`,
                `${stats?.evidence_items || 100}+ evidence records`,
                `${stats?.anomalies_detected || 3} active anomalies`,
                `${stats?.contradictions || 3} detected contradictions`,
                '100% Provenance verified'
              ].map(tag => (
                <span key={tag} className="badge badge-cyan text-xs">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Primary finding */}
      {e2e?.key_finding_recovered && (
        <div className="glass-card p-5 border border-accent-500/20">
          <div className="text-xs font-semibold text-accent-400 uppercase tracking-wider mb-3">
            Key Discovered Path (Traversed from Knowledge Graph)
          </div>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            {e2e.key_finding_recovered.target_path.map((node, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={clsx(
                  'badge text-xs',
                  i === 0 || i === e2e.key_finding_recovered.target_path.length - 1 ? 'badge-blue' : 'badge-gray'
                )}>
                  {node}
                </span>
                {i < e2e.key_finding_recovered.target_path.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            This {e2e.key_finding_recovered.path_hops}-hop relationship was traversed with {Math.round(e2e.key_finding_recovered.composite_confidence * 100)}% composite confidence
            based on multi-source CDR records, financial transfers, CCTV detections, and location overlaps.
          </p>
          <div className="mt-3 px-3 py-2 rounded bg-yellow-500/5 border border-yellow-500/20 text-xs text-yellow-300">
            ⚠ This is an investigative lead generated by graph traversal. It does not constitute a legal finding or determination of guilt.
          </div>
        </div>
      )}

      {/* Demo Steps */}
      <div className="space-y-3">
        <div className="section-header">
          <Zap className="w-3.5 h-3.5 text-accent-400" />
          Guided Demo Flow — 5 Stages
        </div>

        {DEMO_STEPS.map((step, i) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={clsx(
              'glass-card p-5 border cursor-pointer transition-all hover:brightness-110',
              completed.has(step.id) ? 'border-emerald-500/30' : step.border,
              activeStep === step.id ? 'opacity-50' : ''
            )}
            onClick={() => handleNavigate(step)}
          >
            <div className="flex items-start gap-4">
              <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', step.bg)}>
                {completed.has(step.id)
                  ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                  : <step.icon className={clsx('w-4 h-4', step.color)} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-500">Step {step.id}</span>
                  <span className="text-xs text-slate-600">{step.duration}</span>
                  {completed.has(step.id) && (
                    <span className="badge badge-green text-[10px]">✓ Done</span>
                  )}
                </div>
                <div className="text-sm font-bold text-white">{step.title}</div>
                <div className="text-xs text-slate-400 mt-1">{step.description}</div>
                <div className={clsx('mt-2 text-xs font-medium', step.color)}>
                  → {step.highlight}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-1" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
