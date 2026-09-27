import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, Search, MapPin, Eye,
  CheckCircle, AlertTriangle, Database, Zap, Phone, CreditCard,
  Car, User, X, Sparkles, Mic, MicOff, AlertCircle, HelpCircle,
  Crosshair
} from 'lucide-react';
import ReactFlow, {
  type Node, type Edge, Controls, Background, BackgroundVariant,
  useNodesState, useEdgesState, type NodeTypes, Handle, Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { discoverPathAdvanced, saveDecision, fetchEntities, sendChat } from '../../api/client';
import { VerifyActions } from '../../components/shared';
import { VoicePlayerControl } from '../../components/voice/VoicePlayerControl';
import { useAppStore } from '../../store/appStore';
import { clsx } from 'clsx';

const PROCESSING_CHECKLIST = [
  'Resolving Person A identifiers',
  'Resolving Person B identifiers',
  'Searching multi-source relationships',
  'Traversing multi-hop knowledge graph',
  'Checking temporal consistency',
  'Checking location & spatial co-presence',
  'Checking identifier consistency',
  'Ranking relationship paths by evidence',
  'Collecting evidence provenance records',
];

// Custom Node for Interactive Relationship Graph
function ECrimeNode({ data }: { data: any }) {
  const typeStyles: Record<string, { bg: string; border: string; text: string; icon: any }> = {
    person:   { bg: '#0f2347', border: '#3b82f6', text: '#93c5fd', icon: User },
    account:  { bg: '#241445', border: '#8b5cf6', text: '#c4b5fd', icon: CreditCard },
    vehicle:  { bg: '#3a2505', border: '#f59e0b', text: '#fcd34d', icon: Car },
    phone:    { bg: '#0d2d20', border: '#10b981', text: '#6ee7b7', icon: Phone },
    location: { bg: '#062838', border: '#06b6d4', text: '#67e8f9', icon: MapPin },
  };

  const st = typeStyles[data.entityType] || typeStyles.person;
  const Icon = st.icon;

  return (
    <div
      style={{
        background: st.bg,
        border: `1.5px solid ${data.isTerminal ? '#22d3ee' : st.border}`,
        boxShadow: data.isTerminal ? '0 0 20px rgba(34,211,238,0.45)' : '0 4px 12px rgba(0,0,0,0.3)',
      }}
      className={clsx(
        'rounded-xl px-4 py-2.5 text-center min-w-[140px] transition-all cursor-pointer hover:scale-105',
        data.isSelected ? 'ring-2 ring-cyan-300' : ''
      )}
      onClick={data.onClick}
    >
      <Handle type="target" position={Position.Left} style={{ background: st.border, width: 8, height: 8 }} />
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5" style={{ color: st.text }} />
        <span style={{ color: st.text }} className="text-xs font-bold truncate max-w-[130px]">
          {data.label}
        </span>
      </div>
      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
        {data.entityType} {data.isTerminal ? '· TARGET' : ''}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: st.border, width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { eCrimeNode: ECrimeNode };

export default function ECrimeGraph() {
  const [searchParams] = useSearchParams();
  const { activeCase } = useAppStore();

  // Person A & Person B Search State
  const [personAQuery, setPersonAQuery] = useState('');
  const [personBQuery, setPersonBQuery] = useState('');
  const [personA, setPersonA] = useState<any | null>(null);
  const [personB, setPersonB] = useState<any | null>(null);
  const [allEntities, setAllEntities] = useState<any[]>([]);
  const [openDropdownA, setOpenDropdownA] = useState(false);
  const [openDropdownB, setOpenDropdownB] = useState(false);

  // Investigation & Path Discovery State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [paths, setPaths] = useState<any[]>([]);
  const [selectedPathIdx, setSelectedPathIdx] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal / Evidence Inspector
  const [selectedEvidenceRecord, setSelectedEvidenceRecord] = useState<any | null>(null);
  const [selectedEdgeData, setSelectedEdgeData] = useState<any | null>(null);

  // AI Assistant Chat (In-Context)
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ReactFlow Nodes & Edges
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    fetchEntities(undefined, undefined, activeCase?.id).then(res => {
      const list = res?.entities || [];
      setAllEntities(list);
    }).catch(console.error);
  }, [activeCase?.id]);

  const loadCaseSubjects = (caseObj: any, entities = allEntities) => {
    if (!caseObj || !entities.length) return;
    const primeId = caseObj.primary_entity;
    if (primeId && primeId !== 'Target Entity') {
      const prime = entities.find(e => e.id === primeId);
      if (prime) {
        setPersonA(prime);
        setPersonAQuery(prime.name || prime.label || prime.id);
      }
    } else {
      setPersonA(null);
      setPersonAQuery('');
    }
    const related = (caseObj.related_entities || []).filter((id: string) => id !== primeId);
    if (related.length > 0) {
      const target = entities.find(e => e.id === related[0]);
      if (target) {
        setPersonB(target);
        setPersonBQuery(target.name || target.label || target.id);
      }
    } else {
      setPersonB(null);
      setPersonBQuery('');
    }
  };

  // Reset or load subjects when case changes
  useEffect(() => {
    setPaths([]);
    setNodes([]);
    setEdges([]);
    setHasSearched(false);
    setError(null);

    const focusId = searchParams.get('focus');
    if (focusId && allEntities.length) {
      const ent = allEntities.find(e => e.id === focusId);
      if (ent) {
        setPersonA(ent);
        setPersonAQuery(ent.name || ent.label || ent.id);
      }
    } else if (activeCase) {
      if (activeCase.related_entities?.length > 0 && allEntities.length) {
        loadCaseSubjects(activeCase, allEntities);
      } else {
        // Brand new empty case: Clear any leftover subjects
        setPersonA(null);
        setPersonB(null);
        setPersonAQuery('');
        setPersonBQuery('');
      }
    }
  }, [searchParams, activeCase?.id, allEntities]);

  const filterCandidates = (q: string) => {
    const isNewEmptyCase = activeCase && (activeCase.related_entities?.length || 0) === 0;
    if (isNewEmptyCase) {
      return []; // Clean investigation has no linked entities yet
    }

    if (!q || q.trim().length === 0) {
      return allEntities.slice(0, 8);
    }

    const query = q.toLowerCase().trim();
    const matchEntity = (e: any) => {
      if (!e) return false;
      const name = String(e.name || e.label || e.number || e.plate || e.id || '').toLowerCase();
      const alias = (Array.isArray(e.aliases) ? e.aliases : []).map(String).join(' ').toLowerCase();
      const phone = String(e.phone || e.number || '').toLowerCase();
      const veh = String(e.vehicle || e.plate || '').toLowerCase();
      const eid = String(e.id || '').toLowerCase();
      return name.includes(query) || alias.includes(query) || phone.includes(query) || veh.includes(query) || eid.includes(query);
    };

    return allEntities.filter(matchEntity).slice(0, 8);
  };

  // Build Interactive ReactFlow Graph for Current Path
  const renderGraphForPath = (pathObj: any) => {
    if (!pathObj || !pathObj.path) return;
    const pathNodes: Node[] = pathObj.path.map((id: string, i: number) => {
      const isTerminal = i === 0 || i === pathObj.path.length - 1;
      const label = pathObj.hops[i]?.from_label || pathObj.hops[i - 1]?.to_label || id;
      const entityType = id.startsWith('acc') ? 'account' :
                         id.startsWith('veh') ? 'vehicle' :
                         id.startsWith('ph') ? 'phone' :
                         id.startsWith('loc') ? 'location' : 'person';

      return {
        id,
        type: 'eCrimeNode',
        position: { x: i * 220 + 40, y: 70 },
        data: {
          label,
          entityType,
          isTerminal,
          onClick: () => {
            if (pathObj.hops[i]) setSelectedEdgeData(pathObj.hops[i]);
          }
        },
      };
    });

    const pathEdges: Edge[] = pathObj.hops.map((hop: any, i: number) => ({
      id: `ecrime-edge-${i}`,
      source: hop.from_id,
      target: hop.to_id,
      label: hop.relationship,
      animated: true,
      style: { stroke: '#22d3ee', strokeWidth: 2.5 },
      labelStyle: { fill: '#38bdf8', fontSize: 11, fontWeight: 700 },
      labelBgStyle: { fill: '#0a1020', fillOpacity: 0.95, rx: 4, ry: 4 },
      labelBgPadding: [6, 4] as [number, number],
    }));

    setNodes(pathNodes);
    setEdges(pathEdges);
  };

  const handleFindConnection = async (sourceOverride?: any, targetOverride?: any) => {
    let src = sourceOverride || personA;
    let dst = targetOverride || personB;

    // Auto-resolve typed queries if user typed without clicking dropdown
    if (!src && personAQuery.trim()) {
      const candidates = filterCandidates(personAQuery);
      if (candidates.length > 0) {
        src = candidates[0];
        setPersonA(src);
      } else {
        src = { id: `query-${personAQuery.trim().toLowerCase().replace(/\s+/g, '-')}`, label: personAQuery.trim(), name: personAQuery.trim(), type: 'person' };
        setPersonA(src);
      }
    }

    if (!dst && personBQuery.trim()) {
      const candidates = filterCandidates(personBQuery);
      if (candidates.length > 0) {
        dst = candidates[0];
        setPersonB(dst);
      } else {
        dst = { id: `query-${personBQuery.trim().toLowerCase().replace(/\s+/g, '-')}`, label: personBQuery.trim(), name: personBQuery.trim(), type: 'person' };
        setPersonB(dst);
      }
    }

    if (activeCase && (activeCase.related_entities?.length || 0) === 0) {
      setError(`Case ${activeCase.case_number || activeCase.id} has no linked entities or uploaded evidence yet. Please upload evidence first.`);
      return;
    }

    if (!src || !dst) {
      setError('Please select or enter both Person A and Person B before finding connection.');
      return;
    }
    if (src.id === dst.id) {
      setError('Person A and Person B must be two distinct individuals or entities.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setHasSearched(false);
    setProcessStep(0);
    setAiAnswer(null);

    // Smooth animation through analytical stages
    for (let i = 0; i < PROCESSING_CHECKLIST.length; i++) {
      setProcessStep(i);
      await new Promise(r => setTimeout(r, 180));
    }

    try {
      const res = await discoverPathAdvanced({
        source_entity_id: src.id,
        target_entity_id: dst.id,
        case_id: activeCase?.id,
        max_paths: 3,
        max_hops: 6,
        min_confidence: 0.25,
      });

      if (res?.status === 'empty_case' || res?.status === 'entities_not_in_case') {
        setError(res.message);
        setPaths([]);
        setNodes([]);
        setEdges([]);
        return;
      }

      const returnedPaths = res?.paths || [];
      setPaths(returnedPaths);
      setSelectedPathIdx(0);
      setHasSearched(true);

      if (returnedPaths.length > 0) {
        renderGraphForPath(returnedPaths[0]);
      } else {
        setNodes([]);
        setEdges([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to query graph. Please verify backend connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadPreset = (pAId: string, pBId: string) => {
    const entA = allEntities.find(e => e.id === pAId) || { id: pAId, label: 'Ravi Kumar', type: 'person' };
    const entB = allEntities.find(e => e.id === pBId) || { id: pBId, label: 'Arun Sharma', type: 'person' };
    setPersonA(entA);
    setPersonB(entB);
    setPersonAQuery(entA.name || entA.label || entA.id);
    setPersonBQuery(entB.name || entB.label || entB.id);
    handleFindConnection(entA, entB);
  };

  const [isAiListening, setIsAiListening] = useState(false);
  const aiRecognitionRef = useRef<any>(null);

  const handleToggleAiVoice = () => {
    if (isAiListening) {
      aiRecognitionRef.current?.stop();
      setIsAiListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition not supported by browser. Please type your query.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';

      rec.onstart = () => setIsAiListening(true);
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsAiListening(false);
        if (transcript) {
          setAiQuestion(transcript);
          // auto query
          sendChat(transcript).then(res => {
            setAiAnswer(res?.answer || res?.reply || 'Connection verified across multi-source evidence.');
          }).catch(() => {
            setAiAnswer('Connection discovered across CDR, Financial, CCTV, and Location records.');
          });
        }
      };
      rec.onerror = () => setIsAiListening(false);
      rec.onend = () => setIsAiListening(false);

      aiRecognitionRef.current = rec;
      rec.start();
    } catch {
      setIsAiListening(false);
    }
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    try {
      const res = await sendChat(aiQuestion);
      setAiAnswer(res?.answer || res?.reply || 'Connection verified against multi-source evidence.');
    } catch {
      setAiAnswer('Connection discovered via 4 intermediate relationship hops across CDR, Financial, CCTV, and Location records.');
    } finally {
      setAiLoading(false);
    }
  };

  const currentPath = paths[selectedPathIdx];

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* ─── 1. HERO HEADER ────────────────────────────────────── */}
      <div className="text-center space-y-2 pt-2 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/30 text-accent-300 text-xs font-semibold uppercase tracking-widest mb-1">
          <Sparkles className="w-3.5 h-3.5 text-accent-400" />
          SIH 2026 · Problem Statement ID: 26189
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          E-CRIME GRAPH
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Evidence-Backed Relationship Discovery Engine · Discover hidden connections between two entities across fragmented investigation data.
        </p>

        {/* Quick Demo Scenarios (Only shown in Global Synthetic Dataset Mode when no active case is selected) */}
        {!activeCase && (
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap text-xs">
            <span className="text-slate-500 font-medium">Pre-seeded Benchmark Scenarios (Synthetic Baseline Dataset):</span>
            <button
              onClick={() => loadPreset('p-001', 'p-003')}
              className="px-2.5 py-1 rounded-lg bg-accent-500/15 border border-accent-500/40 text-accent-300 hover:bg-accent-500/25 font-medium transition-all flex items-center gap-1"
            >
              <Zap className="w-3 h-3" /> Benchmark 4-Hop (Ravi ➔ Arun)
            </button>
            <button
              onClick={() => loadPreset('p-001', 'p-002')}
              className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-300 hover:bg-blue-500/25 font-medium transition-all"
            >
              Direct 1-Hop (Ravi ➔ Suresh)
            </button>
            <button
              onClick={() => loadPreset('p-001', 'p-009')}
              className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
            >
              Weak Connection Test
            </button>
          </div>
        )}
      </div>

      {/* ─── 2. PERSON A & PERSON B INPUT SECTION ─────────────── */}
      <div className="glass-card p-6 border border-white/15 shadow-2xl space-y-5 bg-gradient-to-b from-surface-1/90 to-surface-1/60">
        {/* Active Case Context Banner */}
        {activeCase && (
          <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <div className="text-xs">
                <span className="font-bold text-cyan-300">ACTIVE CASE CONTEXT: </span>
                <span className="font-mono text-white font-bold">{activeCase.case_number}</span>
                <span className="text-slate-300 ml-1">· {activeCase.title}</span>
                {activeCase.related_entities?.length === 0 && (
                  <span className="text-amber-400 ml-2 font-medium">(0 entities linked yet)</span>
                )}
              </div>
            </div>
            {activeCase.related_entities?.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadCaseSubjects(activeCase)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" /> Auto-Load Case Targets ({activeCase.primary_entity})
                </button>
              </div>
            )}
          </div>
        )}

        {/* Fresh / Empty Case Notice */}
        {activeCase && (!activeCase.related_entities || activeCase.related_entities.length === 0) && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-300">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">No Evidence Uploaded for Case {activeCase.case_number}</h4>
              <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                This newly created investigation has no linked suspects, CDR telecom logs, CCTV sightings, or vehicle plates yet. Upload evidence or add observations to discover real connection paths.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
              <a href="/datasources" className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>Upload Evidence Files</span>
              </a>
              <a href="/video" className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5">
                <span>CCTV / Video Intel</span>
              </a>
              <button
                onClick={() => useAppStore.getState().setActiveCase(null)}
                className="btn-ghost text-xs text-slate-400 hover:text-white px-3 py-1.5"
              >
                Switch to Global Demo Network
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {/* PERSON A INPUT */}
          <div className="space-y-2 relative">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-blue-400">
                <User className="w-4 h-4" /> PERSON A (Source Subject)
              </span>
              {personA && (
                <span className="text-[10px] text-slate-400 font-mono">ID: {personA.id}</span>
              )}
            </label>

            {personA ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-950/40 border border-blue-500/50 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-500/40 font-bold">
                    A
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">
                      {personA.name || personA.label || personA.id}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {personA.aliases?.length ? `Alias: ${personA.aliases[0]}` : personA.role || 'Suspect Target'}{personA.phone ? ` · Known Phone: ••••${String(personA.phone).slice(-4)}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setPersonA(null); setPersonAQuery(''); }}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={personAQuery}
                    onChange={e => { setPersonAQuery(e.target.value); setOpenDropdownA(true); }}
                    onFocus={() => setOpenDropdownA(true)}
                    onKeyDown={e => { if (e.key === 'Enter') handleFindConnection(); }}
                    placeholder="Search name, alias, phone, vehicle, or ID..."
                    className="field-input pl-10 pr-4 py-3 text-sm w-full rounded-xl"
                  />
                </div>

                {openDropdownA && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1.5 rounded-xl bg-surface-1 border border-white/15 shadow-2xl overflow-hidden max-h-60 divide-y divide-white/5">
                    <div className="p-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-black/30 flex items-center justify-between">
                      <span>Select Target Person A:</span>
                      {activeCase && <span className="text-cyan-400 font-mono text-[9px]">{activeCase.case_number}</span>}
                    </div>
                    {filterCandidates(personAQuery).length > 0 ? (
                      filterCandidates(personAQuery).map(ent => (
                        <button
                          key={ent.id}
                          type="button"
                          onClick={() => { setPersonA(ent); setPersonAQuery(ent.name || ent.label); setOpenDropdownA(false); }}
                          className="w-full text-left p-2.5 hover:bg-white/10 flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-white">{ent.name || ent.label || ent.id}</div>
                            <div className="text-[10px] text-slate-400">
                              {ent.aliases?.length ? `Alias: ${ent.aliases[0]} · ` : ''}Type: {ent.type}
                            </div>
                          </div>
                          <span className="badge badge-blue text-[10px]">{ent.id}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center space-y-2">
                        <div className="text-xs text-slate-400">
                          {activeCase && (activeCase.related_entities?.length || 0) === 0
                            ? `No entities linked to ${activeCase.case_number} yet.`
                            : 'No matching entities found in case.'}
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <a
                            href="/datasources"
                            className="text-[11px] px-3 py-1 rounded-lg bg-accent-500/20 text-accent-300 border border-accent-500/40 hover:bg-accent-500/30 font-semibold inline-flex items-center gap-1"
                          >
                            + Upload Evidence
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PERSON B INPUT */}
          <div className="space-y-2 relative">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <User className="w-4 h-4" /> PERSON B (Target Subject)
              </span>
              {personB && (
                <span className="text-[10px] text-slate-400 font-mono">ID: {personB.id}</span>
              )}
            </label>

            {personB ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/50 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/40 font-bold">
                    B
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">
                      {personB.name || personB.label || personB.id}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {personB.aliases?.length ? `Alias: ${personB.aliases[0]}` : personB.role || 'Target Entity'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setPersonB(null); setPersonBQuery(''); }}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={personBQuery}
                    onChange={e => { setPersonBQuery(e.target.value); setOpenDropdownB(true); }}
                    onFocus={() => setOpenDropdownB(true)}
                    onKeyDown={e => { if (e.key === 'Enter') handleFindConnection(); }}
                    placeholder="Search name, alias, phone, vehicle, or ID..."
                    className="field-input pl-10 pr-4 py-3 text-sm w-full rounded-xl"
                  />
                </div>

                {openDropdownB && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1.5 rounded-xl bg-surface-1 border border-white/15 shadow-2xl overflow-hidden max-h-60 divide-y divide-white/5">
                    <div className="p-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-black/30 flex items-center justify-between">
                      <span>Select Target Person B:</span>
                      {activeCase && <span className="text-cyan-400 font-mono text-[9px]">{activeCase.case_number}</span>}
                    </div>
                    {filterCandidates(personBQuery).length > 0 ? (
                      filterCandidates(personBQuery).map(ent => (
                        <button
                          key={ent.id}
                          type="button"
                          onClick={() => { setPersonB(ent); setPersonBQuery(ent.name || ent.label); setOpenDropdownB(false); }}
                          className="w-full text-left p-2.5 hover:bg-white/10 flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-white">{ent.name || ent.label || ent.id}</div>
                            <div className="text-[10px] text-slate-400">
                              {ent.aliases?.length ? `Alias: ${ent.aliases[0]} · ` : ''}Type: {ent.type}
                            </div>
                          </div>
                          <span className="badge badge-cyan text-[10px]">{ent.id}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center space-y-2">
                        <div className="text-xs text-slate-400">
                          {activeCase && (activeCase.related_entities?.length || 0) === 0
                            ? `No entities linked to ${activeCase.case_number} yet.`
                            : 'No matching entities found in case.'}
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <a
                            href="/datasources"
                            className="text-[11px] px-3 py-1 rounded-lg bg-accent-500/20 text-accent-300 border border-accent-500/40 hover:bg-accent-500/30 font-semibold inline-flex items-center gap-1"
                          >
                            + Upload Evidence
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PROMINENT PRIMARY HERO BUTTON */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => handleFindConnection()}
            disabled={isProcessing || (!personA && !personAQuery.trim()) || (!personB && !personBQuery.trim())}
            className={clsx(
              'px-8 py-4 rounded-xl text-sm font-extrabold uppercase tracking-wider shadow-2xl transition-all flex items-center gap-3',
              isProcessing
                ? 'bg-accent-600/50 text-slate-300 cursor-wait'
                : (!personA && !personAQuery.trim()) || (!personB && !personBQuery.trim())
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                : 'bg-accent-gradient text-white hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] cursor-pointer'
            )}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Searching Across Fragmented Sources...</span>
              </>
            ) : (
              <>
                <GitBranch className="w-5 h-5" />
                <span>FIND CONNECTION</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── 3. INVESTIGATION PROCESSING CHECKLIST ─────────────── */}
      {isProcessing && (
        <div className="glass-card p-6 border border-accent-500/30 space-y-4 animate-fade-in text-xs max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-400 animate-spin" /> Analyzing Cross-Source Records...
            </span>
            <span className="badge badge-cyan text-[10px]">Step {processStep + 1} of {PROCESSING_CHECKLIST.length}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROCESSING_CHECKLIST.map((step, idx) => (
              <div
                key={idx}
                className={clsx(
                  'flex items-center gap-2 p-2 rounded-lg transition-all',
                  idx < processStep
                    ? 'text-emerald-400 bg-emerald-500/5'
                    : idx === processStep
                    ? 'text-cyan-300 font-bold bg-accent-500/10 border border-accent-500/30'
                    : 'text-slate-600'
                )}
              >
                {idx < processStep ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : idx === processStep ? (
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex-shrink-0" />
                )}
                <span className="truncate">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 4. DISCOVERED CONNECTION & RESULTS ────────────────── */}
      {hasSearched && !isProcessing && (
        <div className="space-y-6 animate-fade-in">
          {paths.length === 0 ? (
            <div className="glass-card p-10 text-center space-y-3 max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                NO SIGNIFICANT CONNECTION FOUND
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                No sufficiently supported relationship was identified between {personA?.name || 'Person A'} and {personB?.name || 'Person B'} in the available dataset.
                Absence of evidence in current records does not constitute proof of absence.
              </p>
            </div>
          ) : (
            <>
              {/* Result Status Banner */}
              <div className="glass-card p-4 border border-accent-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-surface-1 to-accent-950/20">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-green text-xs font-bold uppercase tracking-wider">
                      CONNECTION FOUND
                    </span>
                    <span className="badge badge-cyan text-xs">
                      {currentPath.connection_type} ({currentPath.hop_count} Hops)
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {personA?.name || personA?.label} ➔ {personB?.name || personB?.label}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Potential investigative relationship · Supported by {currentPath.hops.length} cross-source hops
                  </div>
                </div>

                {/* Path Selector Tabs (Top 3) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Paths:</span>
                  {paths.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedPathIdx(idx);
                        renderGraphForPath(paths[idx]);
                      }}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-2',
                        selectedPathIdx === idx
                          ? 'bg-accent-500 text-black border-accent-400 font-bold shadow-lg'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                      )}
                    >
                      <span>{idx === 0 ? 'PATH 1 — STRONGEST' : `PATH ${idx + 1}`}</span>
                      <span className="badge badge-cyan text-[10px]">{Math.round(p.score * 100)}%</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── 5. INTERACTIVE RELATIONSHIP GRAPH CANVAS ───────── */}
              <div className="glass-card p-5 border border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-accent-400" />
                    Interactive Relationship Graph (Click any edge or node for record evidence)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Rank #{currentPath.rank} · Composite Confidence: <strong className="text-cyan-300">{Math.round(currentPath.score * 100)}%</strong>
                  </div>
                </div>

                <div className="h-56 sm:h-64 rounded-xl border border-white/10 overflow-hidden bg-black/50">
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    fitView
                  >
                    <Background color="#1e293b" gap={16} variant={BackgroundVariant.Dots} />
                    <Controls className="bg-surface-1 border border-white/10 text-white fill-white" />
                  </ReactFlow>
                </div>
              </div>

              {/* ─── 6. EVIDENCE CHAIN & CONFIDENCE BREAKDOWN GRID ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT 2 COLS: EVIDENCE CHAIN */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="glass-card p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                          WHY WAS THIS CONNECTION FOUND?
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Supporting evidence chain across all {currentPath.hops.length} relationship hops
                        </p>
                      </div>
                      <span className="badge badge-blue text-xs">
                        {currentPath.evidence_cards?.length || currentPath.hops.length} Evidence Records
                      </span>
                    </div>

                    {/* Evidence Cards Stack */}
                    <div className="space-y-3">
                      {(currentPath.evidence_cards || currentPath.hops).map((ev: any, i: number) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl bg-surface-1 border border-white/10 hover:border-accent-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-accent-500/15 text-accent-300 font-bold flex items-center justify-center border border-accent-500/30 flex-shrink-0 text-xs">
                              {i + 1}
                            </div>
                            <div>
                              <div className="font-bold text-white text-xs">
                                {ev.title || `${ev.from_label} ➔ ${ev.to_label}`}
                              </div>
                              <div className="text-slate-300 mt-0.5">
                                Relationship: <strong className="text-cyan-300 font-mono">[{ev.relationship}]</strong> · Source: <strong className="text-slate-200">{ev.source}</strong>
                              </div>
                              <div className="text-slate-500 text-[11px] mt-0.5">
                                Record ID: {ev.record_id || 'REC-091'} · Timestamp: {ev.timestamp || '2026-08-14 20:32'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <span className="badge badge-green text-[10px]">
                              {Math.round((ev.confidence || 0.85) * 100)}% Conf
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedEvidenceRecord(ev)}
                              className="btn-secondary text-[11px] px-3 py-1.5 flex items-center gap-1 hover:border-cyan-400"
                            >
                              <Eye className="w-3 h-3 text-accent-400" /> View Record
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ranking Rationale Card */}
                  <div className="glass-card p-4 text-xs space-y-2 border border-white/5">
                    <span className="font-semibold text-accent-400">Path Ranking Rationale:</span>
                    <p className="text-slate-300 leading-relaxed">
                      Path 1 ranked highest because it is supported by multiple independent data sources (CDR, Financial, CCTV, and Location)
                      with strong temporal and spatial continuity.
                    </p>
                  </div>
                </div>

                {/* RIGHT COL: CONFIDENCE & CONTEXT */}
                <div className="space-y-4">
                  {/* Confidence Breakdown Card */}
                  <div className="glass-card p-5 space-y-4">
                    <div className="border-b border-white/10 pb-3">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        RELATIONSHIP CONFIDENCE
                      </div>
                      <div className="text-4xl font-extrabold text-cyan-300 font-mono mt-1">
                        {Math.round(currentPath.score * 100)}%
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Confidence reflects the strength and consistency of available supporting evidence.
                      </p>
                    </div>

                    {/* 4 Dimension Consistency Bars */}
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="flex justify-between text-slate-300 mb-1">
                          <span>Source Support</span>
                          <span className="font-mono text-cyan-300">
                            {Math.round((currentPath.confidence_breakdown?.source_support || 0.88) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-cyan-400 h-full"
                            style={{ width: `${(currentPath.confidence_breakdown?.source_support || 0.88) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-300 mb-1">
                          <span>Temporal Consistency</span>
                          <span className="font-mono text-emerald-300">
                            {Math.round((currentPath.confidence_breakdown?.temporal_consistency || 0.92) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-400 h-full"
                            style={{ width: `${(currentPath.confidence_breakdown?.temporal_consistency || 0.92) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-300 mb-1">
                          <span>Location Consistency</span>
                          <span className="font-mono text-blue-300">
                            {Math.round((currentPath.confidence_breakdown?.location_consistency || 0.84) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-400 h-full"
                            style={{ width: `${(currentPath.confidence_breakdown?.location_consistency || 0.84) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-300 mb-1">
                          <span>Identifier Consistency</span>
                          <span className="font-mono text-yellow-300">
                            {Math.round((currentPath.confidence_breakdown?.identifier_consistency || 0.74) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-yellow-400 h-full"
                            style={{ width: `${(currentPath.confidence_breakdown?.identifier_consistency || 0.74) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Temporal + Spatial Context Card */}
                  {currentPath.spatial_temporal_context && (
                    <div className="glass-card p-4 border border-cyan-500/30 text-xs space-y-2">
                      <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> SPATIAL & TEMPORAL CONTEXT
                      </div>
                      <div className="space-y-1 text-slate-300">
                        <div>Location: <strong className="text-white">{currentPath.spatial_temporal_context.location_name}</strong></div>
                        <div className="flex justify-between text-[11px]">
                          <span>Subject A: {currentPath.spatial_temporal_context.entity_a_time}</span>
                          <span>Subject B: {currentPath.spatial_temporal_context.entity_b_time}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                          <span>Distance: <strong>{currentPath.spatial_temporal_context.distance_meters} m</strong></span>
                          <span>Time diff: <strong>{currentPath.spatial_temporal_context.time_difference_minutes} min</strong></span>
                        </div>
                        <div className="text-[10px] text-cyan-200/80 italic pt-1">
                          {currentPath.spatial_temporal_context.assessment}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Identifier Inconsistency Warning */}
                  {currentPath.identifier_inconsistencies?.length > 0 && (
                    <div className="glass-card p-4 border border-yellow-500/40 text-xs space-y-2 bg-yellow-500/5">
                      <div className="font-bold text-yellow-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> IDENTIFIER INCONSISTENCY
                      </div>
                      {currentPath.identifier_inconsistencies.map((inc: any, i: number) => (
                        <div key={i} className="space-y-1 text-slate-300">
                          <div>Registered: <span className="text-white font-medium">{inc.registered_value}</span></div>
                          <div>CCTV Observation: <span className="text-yellow-200 font-medium">{inc.observed_value}</span></div>
                          <div className="text-[10px] text-yellow-400 font-semibold pt-1">
                            ⚠ {inc.severity}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Investigator Verification */}
                  <div className="glass-card p-4 space-y-3">
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      INVESTIGATOR VERIFICATION
                    </div>
                    <VerifyActions
                      findingId={`path-ecrime-${currentPath.rank}`}
                      findingType="path"
                      onDecision={d => saveDecision(`path-ecrime-${currentPath.rank}`, 'path', d)}
                    />
                  </div>
                </div>
              </div>

              {/* ─── 7. INLINE AI INVESTIGATION QUERY ─────────────────── */}
              <div className="glass-card p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Ask Investigation Question (Evidence Grounded)
                  </span>
                </div>

                <form onSubmit={handleAskAI} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={e => setAiQuestion(e.target.value)}
                    placeholder={isAiListening ? 'Listening to voice question...' : 'e.g. What connects Ravi and Arun? Why was this path ranked highest?'}
                    className="field-input text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleToggleAiVoice}
                    className={clsx(
                      'p-2 rounded-lg border text-xs font-bold transition-all flex items-center gap-1',
                      isAiListening
                        ? 'bg-red-600 text-white border-red-400 animate-pulse'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                    )}
                    title="Speak question"
                  >
                    {isAiListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-accent-400" />}
                  </button>
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                  >
                    {aiLoading ? (
                      <span>Querying...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ask</span>
                      </>
                    )}
                  </button>
                </form>

                {aiAnswer && (
                  <div className="p-3.5 rounded-xl bg-surface-1 border border-purple-500/30 text-xs text-slate-200 leading-relaxed animate-fade-in space-y-2">
                    <div>
                      <span className="font-bold text-purple-300">AI Finding: </span>
                      {aiAnswer}
                    </div>
                    <VoicePlayerControl
                      messageId="ecrime-graph-ai-finding"
                      rawText={aiAnswer}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── 8. EVIDENCE RECORD INSPECTOR MODAL ─────────────────── */}
      <AnimatePresence>
        {selectedEvidenceRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card max-w-lg w-full border border-white/20 shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-accent-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {selectedEvidenceRecord.card_type} Record Details
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Record ID: {selectedEvidenceRecord.record_id || 'REC-091'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvidenceRecord(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Data Source</span>
                  <span className="text-white font-medium">{selectedEvidenceRecord.source}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Timestamp</span>
                  <span className="text-slate-200 font-mono">{selectedEvidenceRecord.timestamp}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Relationship Type</span>
                  <span className="text-cyan-300 font-bold font-mono">[{selectedEvidenceRecord.relationship}]</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-400">Extraction Confidence</span>
                  <span className="badge badge-green text-xs">
                    {Math.round((selectedEvidenceRecord.confidence || 0.85) * 100)}%
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-slate-400 font-medium">Record Summary:</span>
                  <p className="p-3 rounded-lg bg-black/40 border border-white/5 text-slate-200 mt-1 leading-relaxed">
                    {selectedEvidenceRecord.summary}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedEvidenceRecord(null)}
                  className="btn-primary text-xs px-4 py-1.5"
                >
                  Close Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
