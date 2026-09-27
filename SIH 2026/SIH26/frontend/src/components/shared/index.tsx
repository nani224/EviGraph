import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';

// ─── Animated Stat Card ────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  color?: 'cyan' | 'blue' | 'red' | 'green' | 'yellow';
  delay?: number;
  suffix?: string;
}

export function StatCard({ label, value, icon, trend, color = 'cyan', delay = 0, suffix = '' }: StatCardProps) {
  const [displayed, setDisplayed] = useState(0);
  const numVal = typeof value === 'number' ? value : 0;

  useEffect(() => {
    if (typeof value !== 'number') return;
    let start = 0;
    const duration = 1200;
    const step = 16;
    const increment = numVal / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= numVal) { setDisplayed(numVal); clearInterval(timer); }
      else setDisplayed(Math.floor(start));
    }, step);
    return () => clearInterval(timer);
  }, [value]);

  const colorMap = {
    cyan:   { icon: 'text-accent-400',  glow: 'shadow-glow-cyan', bar: 'bg-accent-gradient' },
    blue:   { icon: 'text-blue-400',    glow: 'shadow-glow-blue', bar: 'bg-blue-500' },
    red:    { icon: 'text-red-400',     glow: 'shadow-glow-red',  bar: 'bg-red-500' },
    green:  { icon: 'text-emerald-400', glow: '',                  bar: 'bg-emerald-500' },
    yellow: { icon: 'text-yellow-400',  glow: '',                  bar: 'bg-yellow-500' },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="stat-card"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('p-2 rounded-lg bg-white/5', c.icon)}>{icon}</div>
        {trend && (
          <span className={clsx('text-xs font-medium px-1.5 py-0.5 rounded',
            trend.startsWith('+') ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
          )}>
            {trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white font-mono">
        {typeof value === 'number' ? displayed.toLocaleString() : value}{suffix}
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
      <div className={clsx('h-0.5 mt-3 rounded-full opacity-40', c.bar)} />
    </motion.div>
  );
}

// ─── Confidence Bar ────────────────────────────────────────
interface ConfidenceBarProps {
  value: number; // 0-1
  label?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md';
}

export function ConfidenceBar({ value, label, showPercent = true, size = 'md' }: ConfidenceBarProps) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'from-emerald-500 to-cyan-500'
               : pct >= 60 ? 'from-cyan-500 to-blue-500'
               : pct >= 40 ? 'from-yellow-500 to-orange-500'
               : 'from-red-500 to-orange-500';

  return (
    <div className="space-y-1">
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-slate-500">{label}</span>}
          {showPercent && <span className="text-slate-300 font-mono">{pct}%</span>}
        </div>
      )}
      <div className={clsx('confidence-track', size === 'sm' ? 'h-1' : 'h-1.5')}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
          className={clsx('h-full rounded-full bg-gradient-to-r', color)}
        />
      </div>
    </div>
  );
}

// ─── Evidence Card ─────────────────────────────────────────
interface EvidenceCardProps {
  id: string;
  type: string;
  source: string;
  timestamp?: string;
  confidence?: number;
  description?: string;
  onClick?: () => void;
}

export function EvidenceCard({ id, type, source, timestamp, confidence, description, onClick }: EvidenceCardProps) {
  const typeColors: Record<string, string> = {
    CDR: 'badge-green', Financial: 'badge-blue', CCTV: 'badge-yellow',
    FIR: 'badge-cyan', Location: 'badge-cyan', Vehicle: 'badge-yellow',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 2 }}
      onClick={onClick}
      className={clsx('glass-card p-3 cursor-pointer hover:border-[rgba(34,211,238,0.2)] transition-all', onClick && 'cursor-pointer')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={clsx('badge text-xs flex-shrink-0', typeColors[type] || 'badge-gray')}>{type}</span>
          <span className="text-xs text-slate-400 font-mono truncate">{id}</span>
        </div>
        {confidence !== undefined && (
          <span className="text-xs text-slate-500 flex-shrink-0">{Math.round(confidence * 100)}%</span>
        )}
      </div>
      {description && <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{description}</p>}
      <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
        <span>{source}</span>
        {timestamp && <span>{new Date(timestamp).toLocaleDateString('en-IN')}</span>}
      </div>
    </motion.div>
  );
}

// ─── Entity Badge ──────────────────────────────────────────
export function EntityBadge({ type, label }: { type: string; label: string }) {
  const cls: Record<string, string> = {
    person: 'badge-blue', phone: 'badge-green', vehicle: 'badge-yellow',
    account: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
    location: 'badge-cyan', organization: 'badge-gray',
  };
  return <span className={clsx('badge', cls[type] || 'badge-gray')}>{label}</span>;
}

// ─── Section Header ───────────────────────────────────────
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('shimmer rounded', className)} />;
}

// ─── Verification Buttons ─────────────────────────────────
interface VerifyActionsProps {
  findingId: string;
  findingType: string;
  onDecision: (decision: string) => void;
  size?: 'sm' | 'md';
}

export function VerifyActions({ findingId, findingType, onDecision, size = 'md' }: VerifyActionsProps) {
  const [decided, setDecided] = useState<string | null>(null);

  const handleDecision = (d: string) => {
    setDecided(d);
    onDecision(d);
  };

  if (decided) {
    const labels: Record<string, { label: string; cls: string }> = {
      mark_relevant:    { label: '✓ Marked Relevant', cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
      reject:           { label: '✗ Rejected',        cls: 'text-red-400 border-red-500/30 bg-red-500/10' },
      needs_review:     { label: '⚑ Needs Review',    cls: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
    };
    const info = labels[decided];
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium', info?.cls)}
      >
        {info?.label}
        <button onClick={() => setDecided(null)} className="ml-2 opacity-50 hover:opacity-100">↩</button>
      </motion.div>
    );
  }

  const btnCls = size === 'sm'
    ? 'px-2 py-1 text-xs rounded'
    : 'px-3 py-1.5 text-xs rounded-lg';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => handleDecision('mark_relevant')}
        className={clsx('btn-success', btnCls)}
      >
        Mark Relevant
      </button>
      <button
        onClick={() => handleDecision('reject')}
        className={clsx('btn-danger', btnCls)}
      >
        Reject
      </button>
      <button
        onClick={() => handleDecision('needs_review')}
        className={clsx('btn-ghost border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10', btnCls)}
      >
        Needs Review
      </button>
    </div>
  );
}

// ─── Pipeline Progress ────────────────────────────────────
const PIPELINE_STEPS = [
  'Uploading', 'Parsing', 'Cleaning', 'Entity Extraction',
  'Relationship Extraction', 'Validation', 'Graph Insertion', 'Complete',
];

interface PipelineProps { activeStep: number; }

export function PipelineProgress({ activeStep }: PipelineProps) {
  return (
    <div className="space-y-2">
      {PIPELINE_STEPS.map((step, i) => (
        <motion.div
          key={step}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={clsx(
            'pipeline-step',
            i < activeStep ? 'complete' : i === activeStep ? 'active' : 'pending'
          )}
        >
          <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0',
            i < activeStep  ? 'bg-emerald-500/30 text-emerald-300' :
            i === activeStep ? 'bg-accent-500/30 text-accent-300' :
            'bg-slate-700/30 text-slate-600'
          )}>
            {i < activeStep ? '✓' : i === activeStep ? (
              <span className="animate-spin text-xs">◌</span>
            ) : i + 1}
          </div>
          <span className="text-sm">{step}</span>
          {i === activeStep && <span className="ml-auto text-xs text-accent-400 animate-pulse">Processing...</span>}
          {i < activeStep && <span className="ml-auto text-xs text-emerald-400">Done</span>}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Why? Explanation Panel ────────────────────────────────
interface WhyPanelProps {
  reasons: string[];
  confidence: number;
  evidenceIds: string[];
}

export function WhyPanel({ reasons, confidence, evidenceIds }: WhyPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost text-xs border border-[rgba(34,211,238,0.15)] px-2 py-1"
      >
        {open ? '▲' : '▼'} Why?
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-3 rounded-lg bg-navy-900/80 border border-[rgba(34,211,238,0.10)]"
          >
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">WHY THIS RESULT?</div>
            <ol className="space-y-1.5">
              {reasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-300">
                  <span className="text-accent-400 flex-shrink-0">{i + 1}.</span>
                  {r}
                </li>
              ))}
            </ol>
            <div className="mt-3 pt-3 border-t border-[rgba(34,211,238,0.08)]">
              <ConfidenceBar value={confidence} label="Overall Confidence" />
            </div>
            {evidenceIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {evidenceIds.map(id => (
                  <span key={id} className="badge badge-gray text-xs font-mono">{id}</span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// AnimatePresence re-export for convenience
export { AnimatePresence };
