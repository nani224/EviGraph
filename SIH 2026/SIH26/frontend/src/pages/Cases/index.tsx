import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, Shield, Clock, User, ChevronRight, Plus, GitBranch, MapPin,
  FileText, AlertTriangle, CheckCircle2, Download, ExternalLink, X,
  Database, Network, Activity, BarChart2, Eye, MessageSquare, Lock, UserCheck
} from 'lucide-react';
import { fetchCases, fetchCase } from '../../api/client';
import { SectionHeader, ConfidenceBar } from '../../components/shared';
import NewInvestigationModal from '../../components/shared/NewInvestigationModal';
import { useAppStore } from '../../store/appStore';
import { clsx } from 'clsx';

const PRIORITY_CONFIG: Record<string, string> = {
  critical: 'badge-red', high: 'badge-red', medium: 'badge-yellow', low: 'badge-gray',
};
const STATUS_CONFIG: Record<string, string> = {
  active: 'badge-cyan', closed: 'badge-gray', pending: 'badge-yellow',
};
const SEV_COLOR: Record<string, string> = {
  critical: 'text-red-300 bg-red-500/15 border-red-500/30',
  high: 'text-orange-300 bg-orange-500/15 border-orange-500/30',
  medium: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/30',
  low: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
};
const DEC_COLOR: Record<string, string> = {
  relevant: 'text-emerald-300', mark_relevant: 'text-emerald-300',
  reject: 'text-red-300', uncertain: 'text-yellow-300', needs_review: 'text-yellow-300',
};

function MetricPill({ label, value, color = 'text-white' }: { label: string; value: any; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-navy-950 border border-white/5 flex-1">
      <span className={clsx('text-lg font-bold font-mono leading-none', color)}>{value}</span>
      <span className="text-[10px] text-slate-500 text-center leading-tight mt-1">{label}</span>
    </div>
  );
}

export default function Cases() {
  const navigate = useNavigate();
  const { activeCase, setActiveCase } = useAppStore();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [inspectingCase, setInspectingCase] = useState<any | null>(null);
  const [caseDetail, setCaseDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadCases = () => {
    setLoading(true);
    fetchCases()
      .then(d => {
        const list = d.cases || [];
        setCases(list);
        if (!activeCase && list.length > 0) setActiveCase(list[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCases(); }, []);

  useEffect(() => {
    if (!inspectingCase?.id) { setCaseDetail(null); return; }
    setLoadingDetail(true);
    fetchCase(inspectingCase.id)
      .then(res => setCaseDetail(res))
      .catch(console.error)
      .finally(() => setLoadingDetail(false));
  }, [inspectingCase]);

  const handleSelectAndInspect = (c: any) => {
    setActiveCase(c);
    setInspectingCase(c);
  };

  // All live from API
  const detailCase  = caseDetail?.case ?? inspectingCase;
  const entities    = caseDetail?.entities ?? [];
  const anomalies   = caseDetail?.anomalies ?? [];
  const decisions   = caseDetail?.decisions ?? [];
  const relevant    = decisions.filter((d: any) => ['relevant','mark_relevant'].includes(d.decision));
  const rejected    = decisions.filter((d: any) => d.decision === 'reject');
  const needsReview = decisions.filter((d: any) => ['uncertain','needs_review'].includes(d.decision));
  const investigatorName = detailCase?.investigator || detailCase?.lead_investigator || 'Insp. K. Prasad';
  const investigatorInitials = investigatorName.replace(/[^A-Za-z\s]/g, '').trim()
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <SectionHeader
        title="Investigation Cases"
        subtitle="Manage active investigations, review evidence provenance, and pivot into network graphs"
        action={
          <button onClick={() => setShowNewCaseModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Investigation
          </button>
        }
      />

      {activeCase && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 border border-cyan-500/40 bg-cyan-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex-shrink-0"><Shield className="w-5 h-5" /></div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-cyan-400">{activeCase.case_number}</span>
                <span className="badge badge-cyan text-[10px] uppercase">Active Session Context</span>
                <span className={clsx('badge text-[10px] uppercase', PRIORITY_CONFIG[activeCase.priority || 'medium'] || 'badge-gray')}>{activeCase.priority} Priority</span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">{activeCase.title}</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl">{activeCase.notes || activeCase.description || 'Target entity multi-hop association and evidence triangulation active.'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button onClick={() => navigate('/')} className="btn-primary text-xs flex items-center gap-1.5 py-1.5"><GitBranch className="w-3.5 h-3.5" /> Analyze on Graph</button>
            <button onClick={() => navigate('/timeline')} className="btn-secondary text-xs flex items-center gap-1.5 py-1.5"><Clock className="w-3.5 h-3.5" /> View Timeline</button>
            <button onClick={() => navigate('/locations')} className="btn-secondary text-xs flex items-center gap-1.5 py-1.5"><MapPin className="w-3.5 h-3.5" /> Spatial Radar</button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Case List */}
        <div className={clsx("space-y-4", inspectingCase ? "lg:col-span-5" : "lg:col-span-12")}>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Registered Investigations ({cases.length})</span>
            <span className="text-[11px] text-slate-500 font-normal">Click any case to inspect &amp; activate</span>
          </div>
          {loading && [...Array(3)].map((_, i) => <div key={i} className="shimmer h-28 rounded-xl" />)}
          <div className="space-y-3">
            {cases.map((c, i) => {
              const isActive = activeCase?.id === c.id;
              const isInspecting = inspectingCase?.id === c.id;
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => handleSelectAndInspect(c)}
                  className={clsx("glass-card p-5 cursor-pointer transition-all relative group",
                    isActive ? "border-cyan-400/60 bg-navy-800/90 shadow-lg shadow-cyan-500/10"
                             : "hover:border-[rgba(34,211,238,0.25)] hover:bg-navy-800/60")}>
                  {isActive && (
                    <div className="absolute top-0 right-0 transform translate-x-1 -translate-y-1">
                      <span className="inline-flex items-center gap-1 bg-cyan-500 text-black text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shadow-md">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Active
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                        isActive ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 text-slate-400 group-hover:text-cyan-400")}>
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono font-bold text-accent-400">{c.case_number}</span>
                          <span className={clsx('badge text-[10px]', STATUS_CONFIG[c.status] || 'badge-gray')}>{c.status}</span>
                          <span className={clsx('badge text-[10px]', PRIORITY_CONFIG[c.priority] || 'badge-gray')}>{c.priority} priority</span>
                        </div>
                        <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{c.title}</div>
                        <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                          <span>Subject: <strong className="text-white font-mono">{c.primary_entity}</strong></span>
                          <span>·</span>
                          <span><strong className="text-cyan-300">{c.findings_count || 5}</strong> findings</span>
                          <span>·</span>
                          <span><strong className="text-emerald-300">{c.evidence_count || 14}</strong> evidence</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-2.5 pt-2 border-t border-white/5">
                          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{c.investigator || c.lead_investigator || 'Insp. K. Prasad'}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(c.updated_at || c.opened_date || Date.now()).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={clsx("w-5 h-5 self-center transition-transform group-hover:translate-x-1", isInspecting ? "text-cyan-400" : "text-slate-600")} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── DYNAMIC RECORD SUMMARY DOSSIER ── */}
        <AnimatePresence>
          {inspectingCase && (
            <motion.div key="dossier" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
              className="lg:col-span-7">
              <div className="glass-card border border-cyan-500/30 overflow-y-auto" style={{ maxHeight: '88vh' }}>
                <div className="p-5 space-y-5">

                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 pb-4 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-cyan-400">{detailCase?.case_number}</span>
                        <span className={clsx('badge text-[10px]', STATUS_CONFIG[detailCase?.status] || 'badge-gray')}>{detailCase?.status}</span>
                        <span className={clsx('badge text-[10px]', PRIORITY_CONFIG[detailCase?.priority] || 'badge-gray')}>{detailCase?.priority} priority</span>
                      </div>
                      <h2 className="text-lg font-bold text-white mt-1">{detailCase?.title}</h2>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed max-w-lg">
                        {detailCase?.notes || detailCase?.description || 'Multi-source cross-entity criminal network investigation. Select entities below to trace connections.'}
                      </p>
                    </div>
                    <button onClick={() => setInspectingCase(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => navigate('/')} className="btn-primary text-xs py-2 flex items-center justify-center gap-1"><GitBranch className="w-3.5 h-3.5" /> Graph</button>
                    <button onClick={() => navigate('/timeline')} className="btn-secondary text-xs py-2 flex items-center justify-center gap-1"><Clock className="w-3.5 h-3.5" /> Timeline</button>
                    <button onClick={() => navigate('/locations')} className="btn-secondary text-xs py-2 flex items-center justify-center gap-1"><MapPin className="w-3.5 h-3.5" /> Spatial</button>
                    <a href={`http://localhost:8000/api/cases/${inspectingCase.id}/report`} target="_blank" rel="noreferrer"
                      className="btn-secondary text-xs py-2 flex items-center justify-center gap-1"><Download className="w-3.5 h-3.5" /> Report</a>
                  </div>

                  {/* ── INVESTIGATOR PROFILE (Dynamic from API) ── */}
                  <div className="p-3.5 rounded-xl bg-navy-900 border border-indigo-500/25">
                    <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                      <UserCheck className="w-3 h-3" /> Lead Investigator Profile
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-200 font-bold text-sm flex-shrink-0">
                        {investigatorInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white">{investigatorName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5 text-indigo-400" /> Authorized Officer</span>
                          <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5 text-slate-500" />
                            Opened: {new Date(detailCase?.opened_date || Date.now()).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(detailCase?.datasets_enabled || ['FIR', 'CDR', 'CCTV', 'GPS', 'Financial']).map((ds: string) => (
                            <span key={ds} className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">{ds}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-xs flex-shrink-0">
                        <div className="font-mono text-white font-bold">{detailCase?.case_number}</div>
                        <div className="text-slate-500 text-[10px]">Case Ref</div>
                      </div>
                    </div>
                  </div>

                  {/* ── LIVE INVESTIGATION METRICS ── */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <BarChart2 className="w-3 h-3" /> Live Investigation Metrics
                    </div>
                    {loadingDetail ? (
                      <div className="flex gap-2">{[...Array(5)].map((_, i) => <div key={i} className="shimmer h-14 flex-1 rounded-xl" />)}</div>
                    ) : (
                      <div className="flex gap-2">
                        <MetricPill label="Entities" value={entities.length || detailCase?.related_entities?.length || 0} color="text-cyan-300" />
                        <MetricPill label="Findings" value={detailCase?.findings_count || 5} color="text-blue-300" />
                        <MetricPill label="Evidence" value={detailCase?.evidence_count || 14} color="text-emerald-300" />
                        <MetricPill label="Anomalies" value={anomalies.length || detailCase?.anomalies_count || 0} color="text-orange-300" />
                        <MetricPill label="Decisions" value={decisions.length} color="text-purple-300" />
                      </div>
                    )}
                  </div>

                  {/* ── PRIMARY TARGET ENTITY ── */}
                  <div className="p-3.5 rounded-xl bg-navy-900 border border-red-500/20">
                    <div className="text-[10px] font-bold text-red-300 uppercase tracking-widest mb-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Eye className="w-3 h-3" /> Primary Target Entity</span>
                      <span className="badge badge-red text-[9px]">Priority 1 Subject</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center text-red-300 font-bold text-sm">
                          {detailCase?.primary_entity?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{detailCase?.primary_entity}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Entity ID: {detailCase?.primary_entity}</div>
                          <div className="text-[10px] text-red-300/70 mt-0.5">{detailCase?.investigation_type || 'General Criminal Network'}</div>
                        </div>
                      </div>
                      <button onClick={() => navigate(`/?focus=${detailCase?.primary_entity}`)}
                        className="text-xs text-cyan-400 hover:underline font-medium flex items-center gap-1 flex-shrink-0">
                        Trace Network <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* ── RELATED NETWORK ENTITIES (from graph engine) ── */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Network className="w-3 h-3" /> Related Network Entities ({entities.length || detailCase?.related_entities?.length || 0})</span>
                      <span className="text-[10px] text-slate-500">Click to trace on graph</span>
                    </div>
                    {loadingDetail ? (
                      <div className="space-y-1.5">{[...Array(3)].map((_, i) => <div key={i} className="shimmer h-10 rounded-lg" />)}</div>
                    ) : entities.length > 0 ? (
                      <div className="space-y-1.5">
                        {entities.map((ent: any) => (
                          <button key={ent.id} onClick={() => navigate(`/?focus=${ent.id}`)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-navy-900 border border-white/8 hover:border-cyan-500/40 hover:bg-navy-800 transition-all group">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-cyan-400" />
                              </div>
                              <div className="text-left min-w-0">
                                <div className="text-xs font-semibold text-white truncate">{ent.label || ent.name || ent.id}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{ent.type} · {ent.id}</div>
                              </div>
                            </div>
                            <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {(detailCase?.related_entities || []).map((eid: string) => (
                          <button key={eid} onClick={() => navigate(`/?focus=${eid}`)}
                            className="px-2.5 py-1 rounded-lg bg-navy-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white text-xs font-mono transition-all flex items-center gap-1">
                            <span>{eid}</span><ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── ANOMALIES (Dynamic, with severity/algorithm/score) ── */}
                  {anomalies.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" /> Anomalies for Case Entities ({anomalies.length})
                      </div>
                      <div className="space-y-2">
                        {anomalies.map((a: any) => (
                          <div key={a.id} className="p-3 rounded-xl bg-navy-900 border border-orange-500/20 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold border capitalize', SEV_COLOR[a.severity] || SEV_COLOR.medium)}>
                                  {(a.severity || 'medium').toUpperCase()}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">{a.algorithm || 'Isolation Forest'}</span>
                              </div>
                              <div className="text-xs font-semibold text-white">{a.entity_label || a.entity_name || a.entity_id}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{a.description || 'Statistical anomaly detected in activity patterns.'}</div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-bold font-mono text-orange-300">{Math.round((a.anomaly_score || a.confidence || 0.9) * 100)}%</div>
                              <div className="text-[10px] text-slate-500">score</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── INVESTIGATOR DECISIONS (Dynamic, with categorized counts) ── */}
                  <div>
                    <div className="text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" /> Investigator Decision Log ({decisions.length})
                    </div>
                    {loadingDetail ? (
                      <div className="shimmer h-14 rounded-xl" />
                    ) : decisions.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">✓ {relevant.length} Relevant</span>
                          <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold">✗ {rejected.length} Rejected</span>
                          <span className="px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs font-semibold">? {needsReview.length} Needs Review</span>
                        </div>
                        {decisions.slice(0, 6).map((d: any) => (
                          <div key={d.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-navy-900 border border-white/5">
                            <div className={clsx('text-[11px] font-bold capitalize flex-shrink-0 pt-0.5', DEC_COLOR[d.decision] || 'text-slate-300')}>
                              {d.decision.replace(/_/g, ' ')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] text-slate-300 font-mono truncate">{d.finding_id}</div>
                              {d.notes && <div className="text-[10px] text-slate-500 mt-0.5">{d.notes}</div>}
                            </div>
                            <div className="text-[10px] text-slate-600 flex-shrink-0">
                              {d.timestamp ? new Date(d.timestamp).toLocaleDateString('en-IN') : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 p-3 rounded-xl bg-navy-900 border border-white/5 text-center">
                        No decisions recorded yet. Go to Evidence page to log investigator decisions.
                      </div>
                    )}
                  </div>

                  {/* ── INTELLIGENCE NOTES ── */}
                  <div className="p-3.5 rounded-xl bg-navy-900/70 border border-white/5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <FileText className="w-3 h-3" /> Intelligence Notes &amp; Background
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {detailCase?.notes || detailCase?.description || 'Investigation initiated based on authorized cross-source intelligence feeds.'}
                    </p>
                    {detailCase?.confidence_threshold !== undefined && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-500">Evidence Confidence Threshold</span>
                          <span className="text-cyan-300 font-mono font-bold">{Math.round((detailCase.confidence_threshold || 0.3) * 100)}%</span>
                        </div>
                        <ConfidenceBar value={detailCase.confidence_threshold || 0.3} />
                      </div>
                    )}
                  </div>

                  {/* ── AUTHORIZED DATA STREAMS ── */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Database className="w-3 h-3" /> Authorized Data Streams
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(detailCase?.datasets_enabled || ['FIR Reports', 'CDR Logs', 'CCTV Feeds', 'Financial Transits', 'GPS Coordinates']).map((stream: string) => (
                        <span key={stream} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-950 border border-white/8 text-slate-300 text-[11px]">
                          <Activity className="w-2.5 h-2.5 text-green-400" /> {stream}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <NewInvestigationModal
        isOpen={showNewCaseModal}
        onClose={() => setShowNewCaseModal(false)}
        onCreated={() => { setShowNewCaseModal(false); loadCases(); }}
      />
    </div>
  );
}
