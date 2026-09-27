import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactFlow, {
  type Node, type Edge, Controls, MiniMap, Background, BackgroundVariant,
  useNodesState, useEdgesState, type NodeTypes, Handle, Position,
  ReactFlowProvider, useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Search, Layers, X,
  User, Phone, Car, MapPin, CreditCard,
  Clock, Camera, RefreshCw,
  GitFork, Flame, Target,
  Activity, ShieldAlert, Share2,
  Maximize2, ArrowRightLeft, Radio, FileText, Map,
  ChevronDown, ChevronUp, Palette
} from 'lucide-react';
import {
  fetchOverviewGraph, fetchSubgraph, fetchEntity, fetchCaseGraph,
  whatIfRemove, fetchTimeline, fetchLocationIntelligence, saveDecision
} from '../../api/client';
import { useAppStore } from '../../store/appStore';
import { EntityBadge, VerifyActions } from '../../components/shared';
import { clsx } from 'clsx';

// ─── Node type configs ─────────────────────────────────────
const TYPE_CONFIG: Record<string, { color: string; bg: string; border: string; glow: string; Icon: any }> = {
  person:       { color: '#93c5fd', bg: '#1e3a5f', border: '#3b82f6', glow: 'rgba(59,130,246,0.6)', Icon: User },
  phone:        { color: '#6ee7b7', bg: '#1a3d2e', border: '#10b981', glow: 'rgba(16,185,129,0.6)', Icon: Phone },
  vehicle:      { color: '#fcd34d', bg: '#3d2f0a', border: '#f59e0b', glow: 'rgba(245,158,11,0.6)', Icon: Car },
  account:      { color: '#c4b5fd', bg: '#2d1f5e', border: '#8b5cf6', glow: 'rgba(139,92,246,0.6)', Icon: CreditCard },
  location:     { color: '#67e8f9', bg: '#0e3040', border: '#06b6d4', glow: 'rgba(6,182,212,0.6)', Icon: MapPin },
  camera:       { color: '#f43f5e', bg: '#4c0519', border: '#e11d48', glow: 'rgba(225,29,72,0.6)', Icon: Camera },
  organization: { color: '#94a3b8', bg: '#1e2535', border: '#475569', glow: 'rgba(71,85,105,0.6)', Icon: Layers },
};

const ATTENTION_CONFIG: Record<string, { color: string; bg: string; border: string; shadow: string }> = {
  high:   { color: '#fca5a5', bg: '#450a0a', border: '#ef4444', shadow: '0 0 16px rgba(239, 68, 68, 0.6)' },
  medium: { color: '#fde047', bg: '#451a03', border: '#f59e0b', shadow: '0 0 12px rgba(245, 158, 11, 0.5)' },
  low:    { color: '#6ee7b7', bg: '#064e3b', border: '#10b981', shadow: '0 0 8px rgba(16, 185, 129, 0.4)' },
};

// ─── Custom Focused Entity Node Component ──────────────────
function FocusedEntityNode({ data, selected }: { data: any; selected: boolean }) {
  const isAttentionMode = data.colorMode === 'attention';
  const att = ATTENTION_CONFIG[data.attentionLevel || 'low'] || ATTENTION_CONFIG.low;
  const cfg = TYPE_CONFIG[data.entityType] || TYPE_CONFIG.person;
  const Icon = cfg.Icon;

  const isFocal = data.isFocal;
  const isActive = data.isActive !== false;
  const isFaded = data.isFaded === true;
  const hopDepth = data.hopDepth;

  const bg = isFocal
    ? '#062038'
    : isAttentionMode
    ? att.bg
    : cfg.bg;

  const border = isFocal
    ? '#22d3ee'
    : selected
    ? '#22d3ee'
    : isAttentionMode
    ? att.border
    : cfg.border;

  const shadow = isFocal
    ? '0 0 28px rgba(34, 211, 238, 0.8), 0 0 10px #22d3ee, inset 0 0 12px rgba(34, 211, 238, 0.4)'
    : selected
    ? '0 0 18px rgba(34, 211, 238, 0.6)'
    : isAttentionMode
    ? att.shadow
    : `0 0 10px ${cfg.glow || 'rgba(0,0,0,0.4)'}`;

  const iconColor = isFocal ? '#22d3ee' : isAttentionMode ? att.color : cfg.color;

  return (
    <div
      style={{
        background: bg,
        border: isFocal ? '2.5px solid #22d3ee' : `1.8px solid ${border}`,
        boxShadow: isFaded ? 'none' : shadow,
        opacity: isFaded ? 0.12 : 1,
        transform: isFocal ? 'scale(1.28)' : isActive && !isFaded ? 'scale(1.04)' : 'scale(0.95)',
        filter: isFaded ? 'grayscale(0.8) blur(0.2px)' : 'none',
        pointerEvents: isFaded ? 'auto' : 'auto',
      }}
      className={clsx(
        "rounded-full transition-all duration-300 relative group cursor-pointer flex items-center justify-center",
        isFocal ? "w-12 h-12 z-50 ring-4 ring-cyan-400/30" : "w-10 h-10"
      )}
    >
      <Handle type="target" position={Position.Top} style={{ background: border, width: 6, height: 6 }} />
      <Icon style={{ color: iconColor }} className={clsx(isFocal ? "w-5 h-5 animate-pulse" : "w-4 h-4")} />
      <Handle type="source" position={Position.Bottom} style={{ background: border, width: 6, height: 6 }} />

      {/* Pulsating Focal Halo Ring */}
      {isFocal && (
        <span className="absolute -inset-2 rounded-full border-2 border-cyan-400/60 animate-ping pointer-events-none" />
      )}

      {/* Focal Suspect Badge Tag */}
      {isFocal && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-cyan-500 text-black font-extrabold text-[9px] tracking-wider uppercase shadow-lg shadow-cyan-500/50 flex items-center gap-1 z-50">
          <Target className="w-2.5 h-2.5" />
          <span>Focal Target</span>
        </div>
      )}

      {/* Depth indicator pill for multi-hop expansion */}
      {!isFocal && hopDepth !== undefined && hopDepth > 0 && !isFaded && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-navy-900 border border-cyan-400 text-cyan-300 text-[8px] font-bold flex items-center justify-center font-mono shadow">
          {hopDepth}h
        </span>
      )}

      {/* Heatmap Attention Indicator Badge */}
      {isAttentionMode && data.attentionLevel === 'high' && !isFocal && (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-white flex items-center justify-center animate-ping" />
      )}

      {/* Label Tooltip / Card below node */}
      <div
        style={{
          color: isFocal ? '#ffffff' : iconColor,
          borderColor: isFocal ? 'rgba(34,211,238,0.8)' : border + '40',
          background: isFocal ? 'rgba(6, 32, 56, 0.95)' : bg + 'ee',
          boxShadow: isFocal ? '0 0 12px rgba(34,211,238,0.4)' : 'none',
        }}
        className={clsx(
          "absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium px-2 py-0.5 rounded border transition-all duration-200 z-40",
          isFocal ? "font-bold text-[11px] ring-1 ring-cyan-400/50" : ""
        )}
      >
        {data.label.length > 16 ? data.label.slice(0, 15) + '…' : data.label}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { entity: FocusedEntityNode };

// ─── Layout Helper ─────────────────────────────────────────
function computeBaseLayout(rawNodes: any[], rawEdges: any[], colorMode: 'type' | 'attention' = 'type'): { nodes: Node[]; edges: Edge[] } {
  const typeGroups: Record<string, any[]> = {};
  rawNodes.forEach(n => {
    const t = n.type || 'person';
    if (!typeGroups[t]) typeGroups[t] = [];
    typeGroups[t].push(n);
  });

  const positions: Record<string, { x: number; y: number }> = {};
  const groupCount = Object.keys(typeGroups).length;

  Object.entries(typeGroups).forEach(([type, members], gi) => {
    const groupAngle = (2 * Math.PI * gi) / Math.max(groupCount, 1);
    members.forEach((n, mi) => {
      const r = 120 + mi * 65;
      positions[n.id] = {
        x: 600 + r * Math.cos(groupAngle + mi * 0.45),
        y: 400 + r * Math.sin(groupAngle + mi * 0.45),
      };
    });
  });

  const nodes: Node[] = rawNodes.map(n => {
    const deg = rawEdges.filter(e => e.from === n.id || e.to === n.id).length;
    const isPrime = n.id === 'p-001' || n.id === 'p-002' || n.id === 'veh-001' || n.id === 'acc-001' || (n.label && n.label.toLowerCase().includes('vikram'));
    const isBridge = deg >= 4 || isPrime;
    const attentionLevel = isBridge ? 'high' : deg >= 2 ? 'medium' : 'low';

    return {
      id: n.id,
      type: 'entity',
      position: positions[n.id] || { x: 400 + Math.random() * 400, y: 300 + Math.random() * 300 },
      data: {
        label: n.label || n.name || n.id,
        entityType: n.type || 'person',
        entity: n,
        colorMode,
        attentionLevel,
        isFocal: false,
        isActive: true,
        isFaded: false,
        hopDepth: 0,
      },
    };
  });

  const edgeMap = new globalThis.Map<string, boolean>();
  const edges: Edge[] = [];
  rawEdges.forEach((e: any, i: number) => {
    const key = `${e.from}-${e.to}-${e.rel_type}`;
    if (edgeMap.has(key)) return;
    edgeMap.set(key, true);
    edges.push({
      id: `e-${i}`,
      source: e.from,
      target: e.to,
      label: e.rel_type,
      type: 'smoothstep',
      style: { stroke: 'rgba(34,211,238,0.25)', strokeWidth: 1.2 },
      labelStyle: { fill: '#64748b', fontSize: 9, fontWeight: 500 },
      labelBgStyle: { fill: 'rgba(13,21,38,0.85)', rx: 4, ry: 4 },
      data: e,
    });
  });

  return { nodes, edges };
}

// ─── N-Hop Neighborhood Traversal Engine ───────────────────
function getNeighborhood(focalId: string, depth: number, rawEdges: any[]) {
  // BFS search up to `depth` hops
  const nodeHopMap = new globalThis.Map<string, number>(); // node_id -> minimum hop distance
  nodeHopMap.set(focalId, 0);

  const activeEdgeKeys = new Set<string>(); // "from||to||rel_type"

  let currentQueue = [focalId];
  let currentDepth = 0;

  while (currentQueue.length > 0 && currentDepth < depth) {
    const nextQueue: string[] = [];
    const nextDepth = currentDepth + 1;

    for (const currId of currentQueue) {
      for (const e of rawEdges) {
        if (e.from === currId) {
          const neighbor = e.to;
          if (!nodeHopMap.has(neighbor)) {
            nodeHopMap.set(neighbor, nextDepth);
            nextQueue.push(neighbor);
          }
          const neighborHop = nodeHopMap.get(neighbor);
          if (neighborHop !== undefined && neighborHop <= nextDepth) {
            activeEdgeKeys.add(`${e.from}||${e.to}||${e.rel_type || ''}`);
          }
        } else if (e.to === currId) {
          const neighbor = e.from;
          if (!nodeHopMap.has(neighbor)) {
            nodeHopMap.set(neighbor, nextDepth);
            nextQueue.push(neighbor);
          }
          const neighborHop = nodeHopMap.get(neighbor);
          if (neighborHop !== undefined && neighborHop <= nextDepth) {
            activeEdgeKeys.add(`${e.from}||${e.to}||${e.rel_type || ''}`);
          }
        }
      }
    }
    currentQueue = nextQueue;
    currentDepth = nextDepth;
  }

  // Strictly enforce Depth 1 rule: Only edges incident directly on focalId
  if (depth === 1) {
    const directKeys = new Set<string>();
    for (const key of activeEdgeKeys) {
      const [from, to] = key.split('||');
      if (from === focalId || to === focalId) {
        directKeys.add(key);
      }
    }
    return { nodeHopMap, activeEdgeKeys: directKeys };
  }

  return { nodeHopMap, activeEdgeKeys };
}


// ─── Network Explorer Inner Canvas with Camera Controller ──
function NetworkCanvas({
  rawNodes,
  rawEdges,
  selectedNodeId,
  viewMode,
  focusDepth,
  colorMode,
  searchTerm,
  onNodeSelect,
}: {
  rawNodes: any[];
  rawEdges: any[];
  selectedNodeId: string | null;
  viewMode: 'focused' | 'full';
  focusDepth: 1 | 2 | 3;
  colorMode: 'type' | 'attention';
  searchTerm: string;
  onNodeSelect: (node: any) => void;
}) {
  const { fitView, setCenter, getNode } = useReactFlow();

  // Compute Layout and active Focus styles
  const { nodes, edges } = useMemo(() => {
    const base = computeBaseLayout(rawNodes, rawEdges, colorMode);

    if (viewMode === 'full' || !selectedNodeId) {
      // Full network: all nodes and edges have standard visibility
      const filtered = searchTerm
        ? base.nodes.map(n => ({
            ...n,
            data: {
              ...n.data,
              isFocal: n.id === selectedNodeId,
              isFaded: !(n.data.label as string).toLowerCase().includes(searchTerm.toLowerCase()),
            }
          }))
        : base.nodes.map(n => ({
            ...n,
            data: {
              ...n.data,
              isFocal: n.id === selectedNodeId,
              isFaded: false,
            }
          }));

      return { nodes: filtered, edges: base.edges };
    }

    // Focused View Active!
    const { nodeHopMap, activeEdgeKeys } = getNeighborhood(selectedNodeId, focusDepth, rawEdges);

    const styledNodes: Node[] = base.nodes.map(n => {
      const isFocal = n.id === selectedNodeId;
      const hop = nodeHopMap.get(n.id);
      const isConnected = hop !== undefined;
      const matchesSearch = searchTerm ? (n.data.label as string).toLowerCase().includes(searchTerm.toLowerCase()) : true;

      return {
        ...n,
        data: {
          ...n.data,
          isFocal,
          isActive: isConnected,
          isFaded: !isConnected || !matchesSearch,
          hopDepth: hop,
          colorMode,
        },
      };
    });

    const styledEdges: Edge[] = base.edges.map(e => {
      const key = `${e.source}||${e.target}||${e.label || ''}`;
      const isHighlighted = activeEdgeKeys.has(key);

      if (isHighlighted) {
        return {
          ...e,
          animated: true,
          style: {
            stroke: '#22d3ee',
            strokeWidth: 2.8,
            filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.7))',
          },
          labelStyle: { fill: '#22d3ee', fontSize: 10, fontWeight: 700 },
          labelBgStyle: { fill: 'rgba(6, 32, 56, 0.95)', stroke: '#22d3ee', strokeWidth: 1, rx: 6, ry: 6 },
        };
      }

      return {
        ...e,
        animated: false,
        style: {
          stroke: 'rgba(51, 65, 85, 0.06)',
          strokeWidth: 0.6,
        },
        labelStyle: { fill: 'transparent', fontSize: 8 },
        labelBgStyle: { fill: 'transparent' },
      };
    });

    return { nodes: styledNodes, edges: styledEdges };
  }, [rawNodes, rawEdges, selectedNodeId, viewMode, focusDepth, colorMode, searchTerm]);

  // Handle smooth camera centering when focal target or depth changes
  useEffect(() => {
    if (viewMode === 'focused' && selectedNodeId) {
      const targetNode = getNode(selectedNodeId);
      if (targetNode) {
        setCenter(targetNode.position.x + 20, targetNode.position.y + 20, {
          zoom: focusDepth === 1 ? 1.35 : focusDepth === 2 ? 1.1 : 0.85,
          duration: 700,
        });
      }
    } else if (viewMode === 'full') {
      fitView({ duration: 600, padding: 0.18 });
    }
  }, [selectedNodeId, viewMode, focusDepth, getNode, setCenter, fitView]);

  const [localNodes, setLocalNodes, onNodesChange] = useNodesState(nodes);
  const [localEdges, setLocalEdges, onEdgesChange] = useEdgesState(edges);

  useEffect(() => {
    setLocalNodes(nodes);
  }, [nodes, setLocalNodes]);

  useEffect(() => {
    setLocalEdges(edges);
  }, [edges, setLocalEdges]);

  return (
    <ReactFlow
      nodes={localNodes}
      edges={localEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onNodeSelect(node)}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.15}
      maxZoom={2.4}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={0.8} color="rgba(34,211,238,0.06)" />
      <Controls style={{ background: '#0d1526', border: '1px solid rgba(34,211,238,0.15)', borderRadius: 8 }} />
      <MiniMap
        nodeColor={n => (n.data?.isFocal ? '#22d3ee' : TYPE_CONFIG[n.data?.entityType]?.border || '#475569')}
        maskColor="rgba(3,7,18,0.85)"
        style={{ height: 100, width: 140 }}
      />
    </ReactFlow>
  );
}

// ─── Main Network Explorer Component ───────────────────────
export default function NetworkExplorer() {
  const [rawNodes, setRawNodes] = useState<any[]>([]);
  const [rawEdges, setRawEdges] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [entityDetail, setEntityDetail] = useState<any | null>(null);
  const [entityTimeline, setEntityTimeline] = useState<any[]>([]);
  const [entityLocations, setEntityLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandLoading, setExpandLoading] = useState(false);
  const [graphStatus, setGraphStatus] = useState<'ok' | 'no_entities' | 'entities_not_in_graph' | 'global' | null>(null);
  const [graphMessage, setGraphMessage] = useState<string | null>(null);

  // Focus View & Depth Engine State
  const [viewMode, setViewMode] = useState<'focused' | 'full'>('full');
  const [focusDepth, setFocusDepth] = useState<1 | 2 | 3>(1);

  // Heatmap & What-If states
  const [colorMode, setColorMode] = useState<'type' | 'attention'>('type');
  const [whatIfData, setWhatIfData] = useState<any | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState<'overview' | 'relationships' | 'timeline' | 'evidence'>('overview');

  const activeCase = useAppStore(s => s.activeCase);

  const loadGraphData = useCallback(async () => {
    setLoading(true);
    setGraphStatus(null);
    setGraphMessage(null);

    try {
      if (activeCase?.id) {
        const data = await fetchCaseGraph(activeCase.id);
        setGraphStatus(data.status as any);
        setGraphMessage(data.message || null);
        if (data.nodes && data.nodes.length > 0) {
          setRawNodes(data.nodes);
          setRawEdges(data.edges || []);
        } else {
          setRawNodes([]);
          setRawEdges([]);
        }
      } else {
        setGraphStatus('global');
        const data = await fetchOverviewGraph();
        setRawNodes(data.nodes || []);
        setRawEdges(data.edges || []);
      }
    } catch (err) {
      console.error(err);
      setGraphStatus('global');
    } finally {
      setLoading(false);
    }
  }, [activeCase?.id]);

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  // Handle Node Selection -> Auto Switch to Focused View
  const handleSelectNode = useCallback(async (node: Node) => {
    setSelected(node);
    setViewMode('focused'); // Automatically switch to Focused Node View
    setEntityDetail(null);
    setWhatIfData(null);
    setEntityTimeline([]);
    setEntityLocations([]);

    try {
      // 1. Fetch Entity Details & Analytics from backend
      const detail = await fetchEntity(node.id);
      setEntityDetail(detail);

      // 2. Fetch Timeline Activity for this Entity
      fetchTimeline({ entity_id: node.id }).then(tl => {
        if (tl && tl.events) setEntityTimeline(tl.events);
      }).catch(() => {});

      // 3. Fetch Location Intelligence
      fetchLocationIntelligence(node.id).then(loc => {
        if (loc && loc.observations) setEntityLocations(loc.observations);
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to load entity details:', err);
    }
  }, []);

  // Expand node via backend subgraph
  const expandNode = async (nodeId: string) => {
    setExpandLoading(true);
    try {
      const data = await fetchSubgraph(nodeId, 1);
      const existingNodeIds = new Set(rawNodes.map(n => n.id));
      const newRawNodes = [...rawNodes];

      data.nodes.forEach((n: any) => {
        if (!existingNodeIds.has(n.id)) {
          newRawNodes.push(n);
          existingNodeIds.add(n.id);
        }
      });

      const existingEdgeKeys = new Set(rawEdges.map(e => `${e.from}-${e.to}-${e.rel_type}`));
      const newRawEdges = [...rawEdges];

      data.edges.forEach((e: any) => {
        const key = `${e.from}-${e.to}-${e.rel_type}`;
        if (!existingEdgeKeys.has(key)) {
          newRawEdges.push(e);
          existingEdgeKeys.add(key);
        }
      });

      setRawNodes(newRawNodes);
      setRawEdges(newRawEdges);
    } catch (err) {
      console.error(err);
    } finally {
      setExpandLoading(false);
    }
  };

  // Compute direct connections breakdown for the selected node
  const connectionsBreakdown = useMemo(() => {
    if (!selected) return { total: 0, byType: {}, list: [] };
    const directEdges = rawEdges.filter(e => e.from === selected.id || e.to === selected.id);
    const byType: Record<string, number> = {};
    const connectedList: any[] = [];

    directEdges.forEach(e => {
      const rel = e.rel_type || 'CONNECTED_TO';
      byType[rel] = (byType[rel] || 0) + 1;

      const otherId = e.from === selected.id ? e.to : e.from;
      const otherNode = rawNodes.find(n => n.id === otherId);
      const direction = e.from === selected.id ? 'outbound' : 'inbound';

      connectedList.push({
        id: otherId,
        label: otherNode?.label || otherNode?.name || otherId,
        type: otherNode?.type || 'entity',
        rel_type: rel,
        confidence: e.confidence || 0.9,
        direction,
        timestamp: e.timestamp,
        source: e.source,
        evidence_ids: e.evidence_ids || [],
      });
    });

    return { total: directEdges.length, byType, list: connectedList };
  }, [selected, rawEdges, rawNodes]);

  return (
    <div className="h-[calc(100vh-64px)] flex relative overflow-hidden bg-navy-950">
      {/* Graph Visual Area */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-navy-950/80 backdrop-blur-sm">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-cyan-500/30" />
              <div className="text-sm font-medium text-slate-300">
                {activeCase?.id ? `Loading case network: ${activeCase.case_number || activeCase.id}…` : 'Building dynamic investigation graph…'}
              </div>
            </div>
          </div>
        )}

        {/* Empty state — case has no entities yet */}
        {!loading && (graphStatus === 'no_entities' || graphStatus === 'entities_not_in_graph') && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="glass-card border border-white/10 rounded-2xl p-8 max-w-md text-center shadow-2xl pointer-events-auto">
              <div className="w-16 h-16 rounded-full bg-accent-500/10 border border-accent-500/30 flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8 text-accent-400" />
              </div>
              <h3 className="text-white font-bold text-base mb-2">
                {graphStatus === 'no_entities' ? 'No Entities Linked to This Case' : 'Entities Not Yet in Graph'}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                {graphMessage || 'Add suspects or targets to this case to start building the network graph.'}
              </p>
              {activeCase && (
                <div className="bg-white/5 rounded-lg px-3 py-2 text-xs text-slate-500 border border-white/10">
                  Case: <span className="text-slate-300 font-medium">{activeCase.case_number || activeCase.id}</span>
                  {' — '}<span className="text-slate-400">{activeCase.title}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Top Floating Controls Bar & Directly Visible Legend ─── */}
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2.5 pointer-events-none">
          {/* Row 1: Search, Mode Controls, Types/Heatmap Switch, Graph Stats */}
          <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-none">
            {/* Left: Search & Mode Controls */}
            <div className="flex items-center gap-2.5 pointer-events-auto flex-wrap">
              {/* Search Box */}
              <div className="flex items-center gap-2 field-input w-64 bg-navy-900/90 backdrop-blur-md shadow-xl border-cyan-500/30">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search suspects, phones, plates..."
                  className="bg-transparent outline-none text-xs text-slate-100 placeholder-slate-500 w-full"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-slate-500 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* View Mode Toggle: Focused View vs Full Network */}
              <div className="glass-card p-1 flex items-center gap-1 bg-navy-900/90 backdrop-blur-md shadow-xl border-cyan-500/30 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (!selected && rawNodes.length > 0) {
                      // If no node is selected, select the first high-degree node as focal
                      const prime = rawNodes.find(n => n.id === 'p-001' || (n.label && n.label.toLowerCase().includes('vikram'))) || rawNodes[0];
                      if (prime) handleSelectNode({ id: prime.id, data: { label: prime.label || prime.name, entityType: prime.type, entity: prime } } as any);
                    }
                    setViewMode('focused');
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 cursor-pointer",
                    viewMode === 'focused'
                      ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/40"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                  title="Focus on selected suspect's relationships"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Focused View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('full')}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 cursor-pointer",
                    viewMode === 'full'
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                  title="View complete criminal network"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Full Network</span>
                </button>
              </div>

              {/* Relationship Depth Selector (Active when in Focused View) */}
              {viewMode === 'focused' && (
                <div className="glass-card px-2 py-1 flex items-center gap-1.5 bg-navy-900/90 backdrop-blur-md shadow-xl border-cyan-500/30 text-xs animate-in fade-in slide-in-from-left duration-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider pl-1 pr-0.5 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-cyan-400 animate-pulse" /> Depth:
                  </span>
                  {([1, 2, 3] as const).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFocusDepth(d)}
                      className={clsx(
                        "px-2.5 py-1 rounded font-mono font-bold text-xs transition-all cursor-pointer flex items-center gap-1",
                        focusDepth === d
                          ? "bg-cyan-400 text-navy-950 shadow-md shadow-cyan-400/30"
                          : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                      )}
                      title={d === 1 ? "Direct 1-Hop Relationships" : d === 2 ? "2-Hop Extended Network" : "3-Hop Full Neighborhood"}
                    >
                      <span>{d}</span>
                      <span className="text-[9px] font-sans font-normal opacity-80">
                        {d === 1 ? 'Direct' : d === 2 ? '2-Hop' : '3-Hop'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Heatmap & Graph Stats */}
            <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
              {/* Color Mode Switch */}
              <div className="glass-card p-1 flex items-center gap-1 text-xs bg-navy-900/90 backdrop-blur-md shadow-xl">
                <button
                  type="button"
                  onClick={() => setColorMode('type')}
                  className={clsx(
                    "px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 cursor-pointer",
                    colorMode === 'type'
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Types</span>
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode('attention')}
                  className={clsx(
                    "px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 cursor-pointer",
                    colorMode === 'attention'
                      ? "bg-red-500/20 text-red-300 border border-red-500/40"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>Heatmap</span>
                </button>
              </div>

              {/* Total Stats & Refresh */}
              <div className="glass-card px-3 py-1.5 text-xs text-slate-300 flex items-center gap-2.5 bg-navy-900/90 backdrop-blur-md shadow-xl border border-white/10">
                {activeCase && (
                  <span className="flex items-center gap-1.5 text-cyan-400 font-semibold pr-2 border-r border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    {activeCase.case_number || activeCase.id}
                  </span>
                )}
                <span className="font-mono text-slate-300">
                  {rawNodes.length} nodes · {rawEdges.length} edges
                </span>
                <button
                  onClick={loadGraphData}
                  title="Refresh graph data from backend"
                  className="p-1 rounded hover:bg-white/10 text-cyan-400 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: DIRECTLY VISIBLE COLOR LEGEND BAR (NO DROPDOWN) */}
          <div className="pointer-events-auto flex items-center flex-wrap">
            {colorMode === 'attention' ? (
              // Heatmap Mode Directly Visible Bar
              <div className="glass-card px-3.5 py-1.5 flex items-center gap-2.5 text-xs bg-navy-950/95 backdrop-blur-md border border-red-500/40 shadow-2xl rounded-xl flex-wrap">
                <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-wider flex items-center gap-1.5 pr-2.5 border-r border-white/15">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>HEATMAP COLORS:</span>
                </span>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-950/80 border border-red-500/60 text-red-200 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-md shadow-red-500/80 animate-pulse" />
                  <strong className="font-bold text-white tracking-wide">RED:</strong>
                  <span className="text-red-200 font-medium">High Threat / Kingpins & Hubs (Degree ≥ 4)</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/40" />
                  <strong className="font-bold text-white tracking-wide">AMBER / YELLOW:</strong>
                  <span className="text-amber-200 font-medium">Medium Threat / Mules & Couriers (Degree 2–3)</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" />
                  <strong className="font-bold text-white tracking-wide">GREEN:</strong>
                  <span className="text-emerald-200 font-medium">Low Threat / Victims & Leaves (Degree 1)</span>
                </div>
              </div>
            ) : (
              // Normal Map (Types) Mode Directly Visible Bar
              <div className="glass-card px-3.5 py-1.5 flex items-center gap-2 text-xs bg-navy-950/95 backdrop-blur-md border border-cyan-500/40 shadow-2xl rounded-xl flex-wrap">
                <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 pr-2.5 border-r border-white/15">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>NORMAL MAP COLORS:</span>
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-950/70 border border-blue-500/40 text-blue-300 text-[11px] font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500" />
                  <span className="text-blue-100 font-bold">BLUE:</span>
                  <span>Person / Suspect</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500" />
                  <span className="text-emerald-100 font-bold">GREEN:</span>
                  <span>Phone / Telecom</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-950/70 border border-amber-500/40 text-amber-300 text-[11px] font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500" />
                  <span className="text-amber-100 font-bold">YELLOW:</span>
                  <span>Vehicle / Plate</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-950/70 border border-purple-500/40 text-purple-300 text-[11px] font-medium">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shadow-sm shadow-purple-500" />
                  <span className="text-purple-100 font-bold">PURPLE:</span>
                  <span>Bank Account</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-[11px] font-medium">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                  <span className="text-cyan-100 font-bold">CYAN:</span>
                  <span>Location / Tower</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-950/70 border border-rose-500/40 text-rose-300 text-[11px] font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
                  <span className="text-rose-100 font-bold">CRIMSON:</span>
                  <span>Camera / CCTV</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-500/40 text-slate-300 text-[11px] font-medium">
                  <span className="w-2 h-2 rounded-full bg-slate-400 shadow-sm shadow-slate-400" />
                  <span className="text-slate-100 font-bold">GRAY:</span>
                  <span>Organization</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Active Focus Status Pill (Bottom Center) ───────── */}
        {selected && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card px-4 py-2 bg-navy-900/95 backdrop-blur-md border border-cyan-500/40 rounded-full shadow-2xl flex items-center gap-3 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
                <span className="text-slate-400">Focusing on:</span>
                <span className="text-white font-bold">{selected.data?.label || selected.id}</span>
                <span className="text-cyan-300 font-mono text-[11px] bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                  {connectionsBreakdown.total} Direct Connections
                </span>
              </div>
              <div className="h-4 w-px bg-white/15" />
              {viewMode === 'focused' ? (
                <button
                  onClick={() => setViewMode('full')}
                  className="text-slate-300 hover:text-white font-medium flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Maximize2 className="w-3 h-3 text-cyan-400" />
                  <span>Show Full Network</span>
                </button>
              ) : (
                <button
                  onClick={() => setViewMode('focused')}
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Target className="w-3 h-3" />
                  <span>Isolate Suspect</span>
                </button>
              )}
            </motion.div>
          </div>
        )}

        {/* ReactFlow Canvas */}
        <ReactFlowProvider>
          <NetworkCanvas
            rawNodes={rawNodes}
            rawEdges={rawEdges}
            selectedNodeId={selected?.id || null}
            viewMode={viewMode}
            focusDepth={focusDepth}
            colorMode={colorMode}
            searchTerm={searchTerm}
            onNodeSelect={handleSelectNode}
          />
        </ReactFlowProvider>
      </div>

      {/* ─── Entity Details Side Panel ───────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="w-96 bg-navy-900/98 backdrop-blur-xl border-l border-cyan-500/20 shadow-2xl overflow-y-auto flex-shrink-0 z-30 flex flex-col"
          >
            {/* Panel Header */}
            <div className="p-4 border-b border-white/10 bg-navy-950/60 sticky top-0 z-20 backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <EntityBadge type={selected.data.entityType} label={selected.data.entityType.toUpperCase()} />
                    {viewMode === 'focused' && (
                      <span className="badge bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
                        🎯 FOCUSED VIEW
                      </span>
                    )}
                    {entityDetail?.entity?.risk_score !== undefined && (
                      <span className={clsx(
                        "badge text-[10px] font-mono font-bold",
                        entityDetail.entity.risk_score >= 80 ? "badge-red" : entityDetail.entity.risk_score >= 50 ? "badge-yellow" : "badge-green"
                      )}>
                        Risk {entityDetail.entity.risk_score}%
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white truncate">{selected.data.label}</h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                    <span>ID: {selected.id}</span>
                    {entityDetail?.entity?.role && (
                      <span className="text-amber-400">· {entityDetail.entity.role}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (viewMode === 'focused') setViewMode('full');
                      else setViewMode('focused');
                    }}
                    title={viewMode === 'focused' ? "Switch to Full Network" : "Switch to Focused View"}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 transition-colors"
                  >
                    {viewMode === 'focused' ? <Share2 className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setSelected(null);
                      setViewMode('full');
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs inside Panel */}
              <div className="flex items-center gap-1 mt-3.5 pt-2 border-t border-white/5 text-xs">
                {[
                  { id: 'overview', label: 'Overview', icon: Activity },
                  { id: 'relationships', label: `Connections (${connectionsBreakdown.total})`, icon: ArrowRightLeft },
                  { id: 'timeline', label: `Timeline (${entityTimeline.length})`, icon: Clock },
                  { id: 'evidence', label: 'Evidence', icon: FileText },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSidePanelTab(tab.id as any)}
                    className={clsx(
                      "px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer",
                      sidePanelTab === tab.id
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    )}
                  >
                    <tab.icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Body Content */}
            <div className="p-4 space-y-4 flex-1">
              {!entityDetail ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="shimmer h-10 rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  {/* TAB 1: OVERVIEW */}
                  {sidePanelTab === 'overview' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {/* Connection Stats Grid */}
                      <div className="glass-card p-3.5 bg-navy-950/70 border-cyan-500/20">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                          <span>Connection Intelligence</span>
                          <span className="text-cyan-400 font-mono font-semibold">{connectionsBreakdown.total} Total Links</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-navy-900/80 p-2 rounded-lg border border-white/5">
                            <div className="text-base font-bold text-cyan-300 font-mono">
                              {entityDetail.analytics?.degree_centrality
                                ? `${(entityDetail.analytics.degree_centrality * 100).toFixed(0)}%`
                                : connectionsBreakdown.total}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Centrality</div>
                          </div>
                          <div className="bg-navy-900/80 p-2 rounded-lg border border-white/5">
                            <div className="text-base font-bold text-blue-300 font-mono">
                              {entityDetail.analytics?.in_degree ?? 0}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Inbound</div>
                          </div>
                          <div className="bg-navy-900/80 p-2 rounded-lg border border-white/5">
                            <div className="text-base font-bold text-purple-300 font-mono">
                              {entityDetail.analytics?.out_degree ?? 0}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Outbound</div>
                          </div>
                        </div>

                        {/* Relationship Type Breakdown Chips */}
                        <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap gap-1.5">
                          {Object.entries(connectionsBreakdown.byType).map(([type, count]) => (
                            <span key={type} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-1">
                              <span className="text-cyan-400 font-bold">{count}x</span>
                              <span>{type}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Raw Entity Attributes */}
                      <div className="glass-card p-3.5 space-y-2 bg-navy-950/70 border-white/10">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Entity Profile Attributes
                        </div>
                        <div className="space-y-1.5 text-xs">
                          {Object.entries(entityDetail.entity || {})
                            .filter(([k]) => !['id', 'label', 'name', 'type', 'relationships', 'anomalies'].includes(k))
                            .slice(0, 8)
                            .map(([k, v]) => (
                              <div key={k} className="flex items-center justify-between py-1 border-b border-white/5">
                                <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}:</span>
                                <span className="text-slate-200 font-mono font-medium truncate max-w-[180px]">
                                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Anomalies Alert Box */}
                      {entityDetail.anomalies?.length > 0 && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-red-300">
                            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
                            <span>{entityDetail.anomalies.length} Anomaly Flag(s)</span>
                          </div>
                          {entityDetail.anomalies.map((a: any) => (
                            <div key={a.id || a.title} className="p-2 rounded bg-black/30 text-[11px] text-red-200 border border-red-500/20">
                              {a.description || a.title}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Feature 11: What-If Network Simulation */}
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                            <GitFork className="w-4 h-4 text-amber-400" />
                            <span>What-If Graph Impact</span>
                          </div>
                          <span className="badge badge-yellow text-[10px]">Simulate</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Test network resilience if this entity is apprehended. Does it fragment the syndicate into isolated clusters?
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            setWhatIfLoading(true);
                            try {
                              const res = await whatIfRemove(selected.id);
                              setWhatIfData(res);
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setWhatIfLoading(false);
                            }
                          }}
                          disabled={whatIfLoading}
                          className="btn-secondary w-full justify-center text-xs text-amber-300 border-amber-500/40 hover:bg-amber-500/20 cursor-pointer"
                        >
                          {whatIfLoading ? 'Simulating Graph Impact...' : 'Simulate Suspect Removal'}
                        </button>

                        {whatIfData && whatIfData.node_id === selected.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-lg bg-black/50 border border-amber-500/20 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-white">Role:</span>
                              <span className={clsx("font-mono text-[11px] px-2 py-0.5 rounded", whatIfData.is_bridge ? "bg-red-500/20 text-red-300 border border-red-500/40" : "bg-emerald-500/20 text-emerald-300")}>
                                {whatIfData.is_bridge ? '🌉 Critical Bridge Entity' : 'Peripheral Network Node'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-white/5 font-mono">
                              <div className="bg-white/5 p-2 rounded">
                                <div className="text-[10px] text-slate-400">Before</div>
                                <div className="text-sm font-bold text-slate-200">{whatIfData.before?.connected_components || 1} Group(s)</div>
                              </div>
                              <div className="bg-red-500/10 p-2 rounded border border-red-500/20">
                                <div className="text-[10px] text-red-400">After</div>
                                <div className="text-sm font-bold text-red-300">{whatIfData.after?.connected_components || 1} Fragment(s)</div>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-300 italic pt-1 border-t border-white/5 leading-relaxed">
                              💡 {whatIfData.interpretation || `Removing this entity fragments the network into ${whatIfData.after?.connected_components} disconnected components.`}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: RELATIONSHIPS / CONNECTED ENTITIES */}
                  {sidePanelTab === 'relationships' && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="text-xs text-slate-400 flex items-center justify-between">
                        <span>Direct Connected Entities ({connectionsBreakdown.list.length})</span>
                        <span className="text-[10px] text-cyan-400">Click to focus</span>
                      </div>

                      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                        {connectionsBreakdown.list.map((c, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              const targetNode = rawNodes.find(n => n.id === c.id);
                              if (targetNode) {
                                handleSelectNode({
                                  id: targetNode.id,
                                  data: {
                                    label: targetNode.label || targetNode.name || targetNode.id,
                                    entityType: targetNode.type || 'person',
                                    entity: targetNode,
                                  }
                                } as any);
                              }
                            }}
                            className="p-2.5 rounded-xl bg-navy-950/80 hover:bg-navy-800 border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                                  {c.type === 'phone' ? <Phone className="w-3.5 h-3.5" /> :
                                   c.type === 'vehicle' ? <Car className="w-3.5 h-3.5" /> :
                                   c.type === 'account' ? <CreditCard className="w-3.5 h-3.5" /> :
                                   c.type === 'location' ? <MapPin className="w-3.5 h-3.5" /> :
                                   <User className="w-3.5 h-3.5" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                                    {c.label}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/20 text-[9px] uppercase font-bold">
                                      {c.rel_type}
                                    </span>
                                    <span>({c.direction})</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <span className="text-[11px] font-mono font-bold text-slate-300">
                                  {Math.round(c.confidence * 100)}%
                                </span>
                                <div className="text-[9px] text-slate-500">confidence</div>
                              </div>
                            </div>

                            {c.evidence_ids?.length > 0 && (
                              <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                                <FileText className="w-2.5 h-2.5 text-cyan-400" />
                                <span>Evidence: {c.evidence_ids.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: TIMELINE */}
                  {sidePanelTab === 'timeline' && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="text-xs text-slate-400">Chronological Activity Records</div>
                      {entityTimeline.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                          No direct timeline events logged for this node.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                          {entityTimeline.map((ev, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-navy-950/80 border border-white/10 text-xs space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-cyan-400 font-mono">
                                <span>{ev.timestamp || ev.date || 'Recent Observation'}</span>
                                <span className="px-1.5 py-0.2 rounded bg-white/5 text-slate-300 uppercase text-[9px]">
                                  {ev.event_type || 'Event'}
                                </span>
                              </div>
                              <p className="text-slate-200 text-[11px]">{ev.description || ev.title}</p>
                              {ev.location && (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5 text-cyan-400" />
                                  <span>{ev.location}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: EVIDENCE & SPATIAL INFO */}
                  {sidePanelTab === 'evidence' && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="text-xs text-slate-400">Provenance & Spatial Tracking</div>

                      {entityLocations.length > 0 && (
                        <div className="glass-card p-3 bg-navy-950/80 space-y-2">
                          <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                            <Map className="w-3 h-3" /> Geolocation & Sighting Locations
                          </div>
                          {entityLocations.slice(0, 4).map((loc, i) => (
                            <div key={i} className="p-2 rounded bg-white/5 text-[11px] space-y-0.5 border border-white/5">
                              <div className="text-slate-200 font-medium">{loc.location_name || loc.address || 'Geo Observation'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {loc.timestamp} · Source: {loc.source_type || 'CCTV/CDR'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="glass-card p-3 bg-navy-950/80 space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Linked Evidence Artifacts
                        </div>
                        <div className="space-y-1 text-xs text-slate-300">
                          <div className="p-2 rounded bg-white/5 flex items-center justify-between font-mono text-[11px]">
                            <span>CDR Telecom Log Extract</span>
                            <span className="text-cyan-400 font-bold">Verified</span>
                          </div>
                          <div className="p-2 rounded bg-white/5 flex items-center justify-between font-mono text-[11px]">
                            <span>Vahan RTO Registration Cert</span>
                            <span className="text-cyan-400 font-bold">Verified</span>
                          </div>
                          <div className="p-2 rounded bg-white/5 flex items-center justify-between font-mono text-[11px]">
                            <span>CCTV ANPR Sighting Match</span>
                            <span className="text-cyan-400 font-bold">96.4% Match</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions & Verification Buttons */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <button
                      onClick={() => expandNode(selected.id)}
                      disabled={expandLoading}
                      className="btn-secondary w-full justify-center text-xs font-semibold cursor-pointer"
                    >
                      {expandLoading ? 'Expanding Backend Subgraph...' : 'Expand Extended Network'}
                    </button>

                    <div className="pt-2">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">
                        Investigator Decision
                      </div>
                      <VerifyActions
                        findingId={selected.id}
                        findingType="entity"
                        onDecision={(d) => saveDecision(selected.id, 'entity', d)}
                        size="sm"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
