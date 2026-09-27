import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Search, ChevronDown, ChevronRight, Shield, Clock, ArrowDown, Eye, CheckCircle, Sliders, Calendar, Filter, Database, AlertCircle, History } from 'lucide-react';
import ReactFlow, { type Node, type Edge, Controls, Background, BackgroundVariant, useNodesState, useEdgesState, type NodeTypes, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { discoverPathAdvanced, saveDecision, recordInvestigationQuery, fetchInvestigationHistory } from '../../api/client';
import { ConfidenceBar, EvidenceCard, VerifyActions, WhyPanel, SectionHeader } from '../../components/shared';
import EntitySearchSelector from '../../components/shared/EntitySearchSelector';
import type { DiscoveredPath } from '../../types';
import { clsx } from 'clsx';

const DISCOVERY_STEPS = [
  'Parsing user-selected entity parameters',
  'Filtering graph by confidence threshold & source types',
  'Searching multi-hop traversal paths',
  'Validating evidence chains per hop',
  'Ranking paths by composite relevance',
  'Generating explainable evidence trace',
];

const SOURCE_TYPE_COLORS: Record<string, string> = {
  CDR: 'badge-green',
  'Financial Records': 'badge-blue',
  CCTV: 'badge-yellow',
  'Location Records': 'badge-cyan',
  'Vehicle Records': 'badge-yellow',
  'FIR / Police Reports': 'badge-gray',
};

// Path visualization node
function PathNode({ data }: { data: any }) {
  const typeColors: Record<string, { bg: string; border: string; text: string }> = {
    person:  { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' },
    account: { bg: '#2d1f5e', border: '#8b5cf6', text: '#c4b5fd' },
    vehicle: { bg: '#3d2f0a', border: '#f59e0b', text: '#fcd34d' },
    phone:   { bg: '#1a3d2e', border: '#10b981', text: '#6ee7b7' },
    location:{ bg: '#0e3040', border: '#06b6d4', text: '#67e8f9' },
  };
  const c = typeColors[data.entityType] || typeColors.person;

  return (
    <div
      style={{ background: c.bg, border: `1.5px solid ${data.highlight ? '#22d3ee' : c.border}`, boxShadow: data.highlight ? '0 0 16px rgba(34,211,238,0.5)' : '' }}
      className="rounded-xl px-4 py-2 text-center min-w-[120px]"
    >
      <Handle type="target" position={Position.Left} style={{ background: c.border }} />
      <div style={{ color: c.text }} className="text-xs font-semibold">{data.label}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{data.entityType}</div>
      <Handle type="source" position={Position.Right} style={{ background: c.border }} />
    </div>
  );
}
const pathNodeTypes: NodeTypes = { pathNode: PathNode };

function buildPathGraph(path: DiscoveredPath): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = path.path.map((id, i) => ({
    id,
    type: 'pathNode',
    position: { x: i * 210 + 40, y: 80 },
    data: {
      label: path.hops[i]?.from_label || path.hops[i - 1]?.to_label || id,
      entityType: id.startsWith('acc') ? 'account' : id.startsWith('veh') ? 'vehicle' : id.startsWith('ph') ? 'phone' : id.startsWith('loc') ? 'location' : 'person',
      highlight: i === 0 || i === path.path.length - 1,
    },
  }));

  const edges: Edge[] = path.hops.map((hop, i) => ({
    id: `pe-${i}`,
    source: hop.from_id,
    target: hop.to_id,
    label: hop.relationship,
    animated: true,
    style: { stroke: '#22d3ee', strokeWidth: 2 },
    labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#0a1020', fillOpacity: 0.9 },
  }));

  return { nodes, edges };
}

export default function MultiHopDiscovery() {
  // User input states (no hardcoded entities)
  const [entityA, setEntityA] = useState<any | null>(null);
  const [entityB, setEntityB] = useState<any | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [maxHops, setMaxHops] = useState<number>(5);
  const [minConfidence, setMinConfidence] = useState<number>(30); // in percent
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filter checkboxes
  const [selectedRelTypes, setSelectedRelTypes] = useState<string[]>(['ALL']);
  const [selectedSources, setSelectedSources] = useState<string[]>([
    'FIR', 'CDR', 'CCTV', 'GPS', 'Financial', 'Vehicle'
  ]);

  // Discovery execution states
  const [searching, setSearching] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [paths, setPaths] = useState<DiscoveredPath[]>([]);
  const [selectedPathIndex, setSelectedPathIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<'chain' | 'cards' | 'why'>('chain');

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const relTypeOptions = [
    { label: 'All Types', value: 'ALL' },
    { label: 'Communication (CALLED)', value: 'CALLED' },
    { label: 'Financial (TRANSFERRED)', value: 'TRANSFERRED' },
    { label: 'Location (VISITED)', value: 'VISITED' },
    { label: 'Ownership (OWNS/REG)', value: 'OWNS' },
    { label: 'Surveillance (SEEN_WITH)', value: 'SEEN_WITH' },
  ];

  const sourceOptions = ['FIR', 'CDR', 'CCTV', 'GPS', 'Financial', 'Vehicle', 'Surveillance'];

  const toggleRelType = (val: string) => {
    if (val === 'ALL') {
      setSelectedRelTypes(['ALL']);
      return;
    }
    const next = selectedRelTypes.includes(val)
      ? selectedRelTypes.filter(x => x !== val)
      : [...selectedRelTypes.filter(x => x !== 'ALL'), val];
    setSelectedRelTypes(next.length === 0 ? ['ALL'] : next);
  };

  const toggleSource = (src: string) => {
    setSelectedSources(prev =>
      prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]
    );
  };

  const handleDiscover = async () => {
    if (!entityA || !entityB) {
      setError('Please select both Entity A and Entity B before starting path discovery.');
      return;
    }
    if (entityA.id === entityB.id) {
      setError('Source and target entities must be distinct. Please select different entities.');
      return;
    }

    setError(null);
    setSearching(true);
    setStepIndex(0);
    setSearched(false);

    // Step animation
    for (let i = 0; i < DISCOVERY_STEPS.length; i++) {
      setStepIndex(i);
      await new Promise(r => setTimeout(r, 220));
    }

    try {
      const params = {
        source_entity_id: entityA.id,
        target_entity_id: entityB.id,
        max_paths: 3,
        max_hops: maxHops,
        min_confidence: minConfidence / 100.0,
        relationship_types: selectedRelTypes,
        sources: selectedSources,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };

      const res = await discoverPathAdvanced(params);
      const returnedPaths: DiscoveredPath[] = res?.paths || [];
      setPaths(returnedPaths);
      setSelectedPathIndex(0);
      setSearched(true);

      if (returnedPaths.length > 0) {
        const { nodes: gn, edges: ge } = buildPathGraph(returnedPaths[0]);
        setNodes(gn);
        setEdges(ge);
      }

      // Record query in investigation audit log
      recordInvestigationQuery({
        question: `Multi-hop path between ${entityA.name || entityA.label || entityA.id} and ${entityB.name || entityB.label || entityB.id}`,
        parameters: params,
        paths_count: returnedPaths.length,
      }).catch(console.error);

    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to query knowledge graph. Please check backend connection.');
    } finally {
      setSearching(false);
    }
  };

  const currentPath = paths[selectedPathIndex];

  const handleSelectPath = (idx: number) => {
    setSelectedPathIndex(idx);
    if (paths[idx]) {
      const { nodes: gn, edges: ge } = buildPathGraph(paths[idx]);
      setNodes(gn);
      setEdges(ge);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <SectionHeader
        title="Multi-Hop Relationship Discovery"
        subtitle="User-driven knowledge graph traversal · Discover hidden non-obvious paths with complete evidence chains"
      />

      {/* Investigator Input Card */}
      <div className="glass-card p-6 border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-accent-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Configure Path Discovery Parameters</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 font-medium transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Entity Selectors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EntitySearchSelector
            label="Primary Source Entity (Entity A)"
            placeholder="Search suspect, phone, plate, or account..."
            selectedId={entityA?.id}
            onSelect={ent => setEntityA(ent)}
            required
          />
          <EntitySearchSelector
            label="Target Destination Entity (Entity B)"
            placeholder="Search target subject, organization, or vehicle..."
            selectedId={entityB?.id}
            onSelect={ent => setEntityB(ent)}
            required
          />
        </div>

        {/* Advanced Filters Drawer */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-4 border-t border-white/10 space-y-4 overflow-hidden text-xs"
            >
              {/* Sliders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-1/60 p-4 rounded-lg border border-white/5">
                <div>
                  <div className="flex justify-between mb-1.5 font-medium text-slate-300">
                    <span>Maximum Relationship Hops</span>
                    <span className="badge badge-cyan text-xs">{maxHops} Hops</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={maxHops}
                    onChange={e => setMaxHops(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>1 (Direct Only)</span>
                    <span>5 (Standard)</span>
                    <span>10 (Deep Network)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1.5 font-medium text-slate-300">
                    <span>Minimum Edge Confidence</span>
                    <span className="badge badge-green text-xs">{minConfidence}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={minConfidence}
                    onChange={e => setMinConfidence(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>0% (All Edges)</span>
                    <span>50% (Medium Confidence)</span>
                    <span>90% (Strict Corroboration)</span>
                  </div>
                </div>
              </div>

              {/* Date Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-accent-400" /> Date From (Optional)
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="field-input text-xs w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Date To (Optional)
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="field-input text-xs w-full"
                  />
                </div>
              </div>

              {/* Relationship Types Filter */}
              <div className="space-y-2">
                <label className="text-slate-400 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" /> Allowed Relationship Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {relTypeOptions.map(opt => {
                    const isSelected = selectedRelTypes.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleRelType(opt.value)}
                        className={clsx(
                          'px-2.5 py-1 rounded text-xs transition-colors',
                          isSelected
                            ? 'bg-accent-500/20 border border-accent-500/50 text-accent-300 font-semibold'
                            : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data Sources Filter */}
              <div className="space-y-2">
                <label className="text-slate-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400" /> Participating Sources
                </label>
                <div className="flex flex-wrap gap-2">
                  {sourceOptions.map(src => {
                    const isSelected = selectedSources.includes(src);
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => toggleSource(src)}
                        className={clsx(
                          'px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1',
                          isSelected
                            ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300 font-semibold'
                            : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                        )}
                      >
                        <span>{src}</span>
                        {isSelected && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Discovery Action Button */}
        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {entityA && entityB ? (
              <span>Ready to traverse connection between <strong className="text-white">{entityA.name || entityA.label}</strong> and <strong className="text-white">{entityB.name || entityB.label}</strong></span>
            ) : (
              <span>Select both entities above to execute path discovery</span>
            )}
          </div>
          <button
            onClick={handleDiscover}
            disabled={searching || !entityA || !entityB}
            className={clsx(
              'btn-primary flex items-center gap-2 px-6 py-2.5 text-xs',
              (searching || !entityA || !entityB) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {searching ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Traversing Graph...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Discover Connection</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Searching State Animation */}
      {searching && (
        <div className="glass-card p-6 text-center space-y-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full border-2 border-accent-500/30 border-t-accent-400 animate-spin mx-auto" />
          <div>
            <h3 className="text-sm font-semibold text-white">Analyzing Selected Data Sources...</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">{DISCOVERY_STEPS[stepIndex]}</p>
          </div>
          <div className="w-48 bg-white/10 rounded-full h-1.5 mx-auto overflow-hidden">
            <div
              className="bg-accent-gradient h-full transition-all duration-300"
              style={{ width: `${((stepIndex + 1) / DISCOVERY_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Results View */}
      {searched && !searching && (
        <div className="space-y-6 animate-fade-in">
          {paths.length === 0 ? (
            <div className="glass-card p-8 text-center space-y-2">
              <div className="text-slate-500 text-sm font-semibold">No Connected Path Found</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No relationship path was discovered between the selected entities under current constraints ({maxHops} hops, {minConfidence}% min confidence).
                Try increasing maximum hops or lowering the confidence threshold.
              </p>
            </div>
          ) : (
            <>
              {/* Path Selector Chips */}
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex-shrink-0">
                  {paths.length} Paths Discovered:
                </span>
                {paths.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectPath(idx)}
                    className={clsx(
                      'p-2.5 rounded-lg border text-xs flex items-center gap-3 transition-all flex-shrink-0',
                      selectedPathIndex === idx
                        ? 'bg-accent-500/15 border-accent-500/50 text-white shadow-lg'
                        : 'glass-card text-slate-400 hover:text-white'
                    )}
                  >
                    <span className="font-bold">Path #{p.rank}</span>
                    <span className="badge badge-cyan text-[10px]">{p.hop_count} Hops</span>
                    <span className="badge badge-green text-[10px]">{Math.round(p.score * 100)}% Confidence</span>
                  </button>
                ))}
              </div>

              {/* Active Path Visual Canvas */}
              {currentPath && (
                <div className="glass-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Visual Graph Traversal — Path #{currentPath.rank}</h3>
                      <p className="text-xs text-slate-400">
                        {currentPath.hop_count}-hop association · Composite Confidence: {Math.round(currentPath.score * 100)}%
                      </p>
                    </div>
                    <div className="badge badge-green text-xs">
                      {Math.round(currentPath.score * 100)}% Relevance Score
                    </div>
                  </div>

                  {/* ReactFlow Canvas */}
                  <div className="h-56 rounded-xl border border-white/10 overflow-hidden bg-black/40">
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      nodeTypes={pathNodeTypes}
                      fitView
                    >
                      <Background color="#1e293b" gap={16} variant={BackgroundVariant.Dots} />
                      <Controls className="bg-surface-1 border border-white/10 text-white fill-white" />
                    </ReactFlow>
                  </div>

                  {/* Evidence Chain & Explanations */}
                  <div className="space-y-4 pt-2">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                      <button
                        onClick={() => setActiveEvidenceTab('chain')}
                        className={clsx(
                          'px-3 py-1 rounded text-xs font-semibold transition-colors',
                          activeEvidenceTab === 'chain' ? 'bg-accent-500 text-black' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        Evidence Chain ({currentPath.evidence_chain.length})
                      </button>
                      <button
                        onClick={() => setActiveEvidenceTab('cards')}
                        className={clsx(
                          'px-3 py-1 rounded text-xs font-semibold transition-colors',
                          activeEvidenceTab === 'cards' ? 'bg-accent-500 text-black' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        Hop Breakdown ({currentPath.hops.length})
                      </button>
                      <button
                        onClick={() => setActiveEvidenceTab('why')}
                        className={clsx(
                          'px-3 py-1 rounded text-xs font-semibold transition-colors',
                          activeEvidenceTab === 'why' ? 'bg-accent-500 text-black' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        AI Ranking Explanation
                      </button>
                    </div>

                    {/* Tab 1: Evidence Chain */}
                    {activeEvidenceTab === 'chain' && (
                      <div className="space-y-2">
                        {currentPath.evidence_chain.map((item, i) => (
                          <div key={i} className="p-3 rounded-lg bg-surface-1 border border-white/5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-accent-500/20 text-accent-400 font-bold flex items-center justify-center text-[10px]">
                                {item.hop_index + 1}
                              </span>
                              <div>
                                <span className="font-semibold text-white">{item.from_label}</span>
                                <span className="text-slate-400 mx-1.5 font-mono">→ [{item.rel_type}] →</span>
                                <span className="font-semibold text-white">{item.to_label}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={clsx('badge text-[10px]', SOURCE_TYPE_COLORS[item.source] || 'badge-cyan')}>
                                {item.source}
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">ID: {item.evidence_id}</span>
                              <span className="badge badge-green text-[10px]">{Math.round(item.confidence * 100)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tab 2: Hop Breakdown */}
                    {activeEvidenceTab === 'cards' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentPath.hops.map((hop, i) => (
                          <div key={i} className="p-3.5 rounded-lg bg-surface-1 border border-white/5 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[10px]">Hop {i + 1} of {currentPath.hop_count}</span>
                              <span className="badge badge-green text-[10px]">{Math.round(hop.confidence * 100)}%</span>
                            </div>
                            <div className="font-medium text-white">
                              {hop.from_label} <span className="text-accent-400 font-bold font-mono">[{hop.relationship}]</span> {hop.to_label}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Source: <strong className="text-slate-300">{hop.source}</strong> {hop.timestamp && `· ${hop.timestamp}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tab 3: Why / Ranking Explanation */}
                    {activeEvidenceTab === 'why' && (
                      <div className="p-4 rounded-lg bg-surface-1 border border-white/5 space-y-2 text-xs">
                        <div className="font-semibold text-accent-400">Ranking & Path Scoring Breakdown:</div>
                        <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                          {currentPath.ranking_explanation.map((exp, i) => (
                            <li key={i}>{exp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Human Verification Box */}
                    <div className="pt-3 border-t border-white/10">
                      <VerifyActions
                        findingId={`path-${currentPath.rank}`}
                        findingType="path"
                        onDecision={d => saveDecision(`path-${currentPath.rank}`, 'path', d)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
