import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Activity,
  Users,
  Radio,
  Camera,
  Layers,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Clock,
  Compass,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Eye,
  Crosshair,
  Route,
  Zap,
  RefreshCw,
  Building,
  Train,
  Landmark,
  Factory
} from 'lucide-react';
import { fetchLocationIntelligence, fetchEntities } from '../../api/client';
import { SectionHeader, ConfidenceBar, StatCard } from '../../components/shared';
import { useAppStore } from '../../store/appStore';
import { clsx } from 'clsx';

export default function LocationIntel() {
  const { activeCase } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [entitiesList, setEntitiesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'hotspots' | 'movements' | 'overlaps'>('overview');
  
  // Interactive Map State
  const [focusedLocation, setFocusedLocation] = useState<any | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<any | null>(null);
  const [hoveredMovement, setHoveredMovement] = useState<any | null>(null);
  const [showCorridors, setShowCorridors] = useState<boolean>(true);
  const [showCCTV, setShowCCTV] = useState<boolean>(true);
  const [showRadarGrid, setShowRadarGrid] = useState<boolean>(true);
  const [verifiedOverlaps, setVerifiedOverlaps] = useState<Record<string, boolean>>({});
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Load Initial Data & Entities
  useEffect(() => {
    fetchEntities('person')
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.entities || []);
        setEntitiesList(list);
      })
      .catch(console.error);
  }, []);

  // Fetch Location Intelligence when entity or activeCase changes
  useEffect(() => {
    setLoading(true);
    fetchLocationIntelligence(selectedEntity || undefined, activeCase?.id)
      .then(res => {
        setData(res);
        if (res?.hotspots?.length > 0 && !focusedLocation) {
          setFocusedLocation(res.hotspots[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedEntity, activeCase?.id]);

  const hotspots = useMemo(() => data?.hotspots || [], [data]);
  const movements = useMemo(() => data?.movements || [], [data]);
  const overlaps = useMemo(() => data?.spatial_temporal_overlaps || [], [data]);
  const allLocations = useMemo(() => data?.locations || [], [data]);
  const isCaseEmpty = useMemo(() => {
    return activeCase && (data?.stats?.total_visits === 0 || (hotspots.length === 0 && movements.length === 0 && overlaps.length === 0));
  }, [activeCase, data, hotspots.length, movements.length, overlaps.length]);

  const stats = useMemo(() => data?.stats || {
    total_locations: allLocations.length,
    total_visits: isCaseEmpty ? 0 : 0,
    co_presence_count: overlaps.length,
    active_corridors_count: movements.length,
    high_risk_hotspots_count: hotspots.filter((h: any) => (h.risk_score || 0) >= 0.7).length,
    cctv_nodes_count: isCaseEmpty ? 0 : 0
  }, [data, allLocations.length, overlaps.length, movements.length, hotspots, isCaseEmpty]);

  // Filter Hotspots & Locations based on search and type
  const filteredHotspots = useMemo(() => {
    return hotspots.filter((h: any) => {
      const matchSearch = !searchQuery || 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.entities?.some((e: any) => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchType = selectedType === 'all' || h.type === selectedType;
      return matchSearch && matchType;
    });
  }, [hotspots, searchQuery, selectedType]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m: any) => {
      const matchSearch = !searchQuery || 
        m.entity_label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.from_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.to_location?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [movements, searchQuery]);

  // Coordinate Projection Helper for Hyderabad bounds:
  // Lat: 17.20 to 17.52 (span: ~0.32)
  // Lon: 78.30 to 78.60 (span: ~0.30)
  const mapBounds = {
    minLat: 17.22,
    maxLat: 17.50,
    minLon: 78.33,
    maxLon: 78.58,
  };

  const projectCoords = (lat: number, lon: number, width = 800, height = 520) => {
    const padding = 50;
    const effectiveW = width - padding * 2;
    const effectiveH = height - padding * 2;
    
    const xNorm = (lon - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon);
    // Invert latitude for SVG coordinate space
    const yNorm = 1 - (lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat);
    
    const x = padding + Math.max(0, Math.min(1, xNorm)) * effectiveW;
    const y = padding + Math.max(0, Math.min(1, yNorm)) * effectiveH;
    return { x, y };
  };

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case 'commercial': return Building;
      case 'transit': return Train;
      case 'landmark': return Landmark;
      case 'industrial': return Factory;
      default: return MapPin;
    }
  };

  const getLocationTypeColor = (type: string) => {
    switch (type) {
      case 'commercial': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'transit': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'landmark': return 'text-pink-400 bg-pink-500/10 border-pink-500/30';
      case 'industrial': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  const handleVerifyOverlap = (key: string) => {
    setVerifiedOverlaps(prev => ({ ...prev, [key]: true }));
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      {/* ─── Page Title & Action Bar ─── */}
      <SectionHeader
        title="Spatial Context & Geospatial Intelligence"
        subtitle="Geographic corridor tracking, suspicious hotspot discovery, multi-entity co-presence detection, and movement analysis"
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setLoading(true);
                fetchLocationIntelligence(selectedEntity || undefined)
                  .then(setData)
                  .finally(() => setLoading(false));
              }}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin text-accent-400")} />
              <span>Refresh Coordinates</span>
            </button>
          </div>
        }
      />

      {/* ─── Top Level Metrics Summary ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Tracked Locations"
          value={stats.total_locations || allLocations.length || 20}
          icon={<MapPin className="w-5 h-5" />}
          color="cyan"
          delay={0}
        />
        <StatCard
          label="Co-Presence Detections"
          value={stats.co_presence_count || overlaps.length}
          icon={<Users className="w-5 h-5" />}
          color="red"
          trend={`${overlaps.length} active`}
          delay={0.05}
        />
        <StatCard
          label="Transit Corridors"
          value={stats.active_corridors_count || movements.length}
          icon={<Route className="w-5 h-5" />}
          color="blue"
          delay={0.1}
        />
        <StatCard
          label="High-Risk Hotspots"
          value={stats.high_risk_hotspots_count || hotspots.filter((h: any) => (h.risk_score || 0) >= 0.7).length}
          icon={<ShieldAlert className="w-5 h-5" />}
          color="yellow"
          delay={0.15}
        />
        <StatCard
          label="CCTV Monitored Points"
          value={stats.cctv_nodes_count || 5}
          icon={<Camera className="w-5 h-5" />}
          color="green"
          delay={0.2}
        />
      </div>

      {/* ─── Filters & Suspect Focus Bar ─── */}
      <div className="glass-card p-4 border border-[rgba(34,211,238,0.15)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Entity Focus Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-accent-400" /> Focus Subject:
            </span>
            <select
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
              className="bg-navy-900 border border-[rgba(34,211,238,0.20)] text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-400"
            >
              <option value="">All Suspects & Network Entities</option>
              {(Array.isArray(entitiesList) ? entitiesList : []).map(e => (
                <option key={e.id} value={e.id}>
                  {e.label || e.name} ({e.role || 'suspect'})
                </option>
              ))}
            </select>
          </div>

          {/* Location Type Filter */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
            {['all', 'area', 'commercial', 'transit', 'industrial', 'landmark'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={clsx(
                  "px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all",
                  selectedType === type
                    ? "bg-accent-500/20 text-accent-300 border border-accent-500/40 shadow-sm shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar & View Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search locations, zones, or suspects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-navy-900 border border-[rgba(34,211,238,0.20)] text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 w-64 focus:outline-none focus:border-accent-400 placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center bg-navy-900/80 p-1 rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={clsx("px-3 py-1 rounded-md transition-all", activeTab === 'overview' ? "bg-accent-500 text-white font-semibold" : "text-slate-400 hover:text-white")}
            >
              Command Center
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={clsx("px-3 py-1 rounded-md transition-all", activeTab === 'map' ? "bg-accent-500 text-white font-semibold" : "text-slate-400 hover:text-white")}
            >
              Tactical Map
            </button>
            <button
              onClick={() => setActiveTab('hotspots')}
              className={clsx("px-3 py-1 rounded-md transition-all", activeTab === 'hotspots' ? "bg-accent-500 text-white font-semibold" : "text-slate-400 hover:text-white")}
            >
              Hotspots ({filteredHotspots.length})
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={clsx("px-3 py-1 rounded-md transition-all", activeTab === 'movements' ? "bg-accent-500 text-white font-semibold" : "text-slate-400 hover:text-white")}
            >
              Corridors ({filteredMovements.length})
            </button>
            <button
              onClick={() => setActiveTab('overlaps')}
              className={clsx("px-3 py-1 rounded-md transition-all flex items-center gap-1", activeTab === 'overlaps' ? "bg-accent-500 text-white font-semibold" : "text-slate-400 hover:text-white")}
            >
              <span>Co-Presence</span>
              {overlaps.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Co-Presence Proximity Alert Banner (if any detected) ─── */}
      {overlaps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 border border-red-500/40 bg-red-950/20 relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0 animate-pulse">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-red-300 tracking-wider flex items-center gap-2">
                  <span>CRITICAL SPATIAL-TEMPORAL CO-PRESENCE DETECTIONS ({overlaps.length})</span>
                  <span className="badge badge-red text-[10px]">High Investigative Value</span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Automated triangulation detected multiple suspect entities converging at identical coordinates within narrow time windows.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('overlaps')}
                className="btn-danger text-xs px-3 py-1.5"
              >
                Inspect All Overlaps
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 pt-3 border-t border-red-500/20">
            {overlaps.slice(0, 3).map((ov: any, idx: number) => {
              const isVerified = verifiedOverlaps[`${ov.entity_a}-${ov.entity_b}-${ov.location_id}`];
              return (
                <div key={idx} className="p-3 rounded-lg bg-navy-900/90 border border-red-500/20 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-semibold text-white">
                    <span className="text-accent-300">{ov.entity_a_label} ↔ {ov.entity_b_label}</span>
                    <span className="badge badge-green text-[10px]">{Math.round((ov.confidence || 0.9) * 100)}% Match</span>
                  </div>
                  <div className="text-slate-300 flex items-center justify-between">
                    <span>Location: <strong className="text-white">{ov.location_name}</strong></span>
                    <span className="text-[11px] font-mono text-red-400">Δt: {ov.time_diff_min} mins</span>
                  </div>
                  <div className="text-[11px] text-slate-400 italic">
                    {ov.caveat}
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-mono">{new Date(ov.time_a).toLocaleString('en-IN')}</span>
                    {isVerified ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Logged in Dossier
                      </span>
                    ) : (
                      <button
                        onClick={() => handleVerifyOverlap(`${ov.entity_a}-${ov.entity_b}-${ov.location_id}`)}
                        className="text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
                      >
                        + Mark as Evidence
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ─── Main Section: Tactical Radar Map & Hotspot Analysis Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left / Center Column: Interactive Geospatial Tactical Vector Map */}
        <div className={clsx(
          "glass-card p-5 space-y-4 relative transition-all",
          activeTab === 'map' ? "lg:col-span-12" : "lg:col-span-7 xl:col-span-8"
        )}>
          {/* Map Header & Tactical HUD Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <Compass className="w-4 h-4 text-accent-400" />
                TACTICAL GEOSPATIAL RADAR (HYDERABAD METRO ZONE)
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={showCorridors}
                  onChange={e => setShowCorridors(e.target.checked)}
                  className="rounded bg-navy-900 border-white/20 text-accent-500"
                />
                <span>Corridors</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200 pl-2 border-l border-white/10">
                <input
                  type="checkbox"
                  checked={showCCTV}
                  onChange={e => setShowCCTV(e.target.checked)}
                  className="rounded bg-navy-900 border-white/20 text-accent-500"
                />
                <span>CCTV Feeds</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200 pl-2 border-l border-white/10">
                <input
                  type="checkbox"
                  checked={showRadarGrid}
                  onChange={e => setShowRadarGrid(e.target.checked)}
                  className="rounded bg-navy-900 border-white/20 text-accent-500"
                />
                <span>Radar HUD</span>
              </label>

              <div className="flex items-center gap-1 pl-2 border-l border-white/10">
                <button
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 1.8))}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.8))}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300"
                  title="Zoom Out"
                >
                  -
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 text-[10px]"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Tactical SVG Map Canvas */}
          <div
            ref={mapContainerRef}
            className="relative bg-navy-950/90 rounded-xl border border-cyan-500/20 overflow-hidden min-h-[480px] flex items-center justify-center select-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 80%)'
            }}
          >
            {loading ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-accent-400 animate-spin mx-auto" />
                <div className="text-xs text-slate-400">Triangulating geospatial coordinate layers...</div>
              </div>
            ) : (
              <div
                className="w-full h-full flex items-center justify-center p-2 transition-transform duration-300"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <svg
                  viewBox="0 0 800 520"
                  className="w-full h-auto max-h-[520px] drop-shadow-2xl"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.15))' }}
                >
                  <defs>
                    {/* Glow Filter */}
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    
                    {/* Linear Gradient for Movement Corridors */}
                    <linearGradient id="corridorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
                    </linearGradient>

                    {/* Radial Radar Gradient */}
                    <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                      <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Tactical Grid Background */}
                  {showRadarGrid && (
                    <g opacity="0.35">
                      {/* Grid Lines */}
                      {[100, 200, 300, 400, 500, 600, 700].map(x => (
                        <line key={`gx-${x}`} x1={x} y1="30" x2={x} y2="490" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="3 3" />
                      ))}
                      {[80, 160, 240, 320, 400, 480].map(y => (
                        <line key={`gy-${y}`} x1="30" y1={y} x2="770" y2={y} stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="3 3" />
                      ))}

                      {/* Concentric Radar Circles centered at Jubilee Hills / Banjara Hills center */}
                      <circle cx="400" cy="260" r="120" stroke="#06b6d4" strokeWidth="0.6" strokeDasharray="4 4" fill="none" />
                      <circle cx="400" cy="260" r="220" stroke="#06b6d4" strokeWidth="0.6" strokeDasharray="6 6" fill="none" />
                      <circle cx="400" cy="260" r="320" stroke="#06b6d4" strokeWidth="0.4" fill="none" opacity="0.5" />

                      {/* Coordinates Labels */}
                      <text x="45" y="45" fill="#06b6d4" fontSize="9" fontFamily="monospace" opacity="0.7">17.50°N / 78.33°E</text>
                      <text x="680" y="45" fill="#06b6d4" fontSize="9" fontFamily="monospace" opacity="0.7">17.50°N / 78.58°E</text>
                      <text x="45" y="495" fill="#06b6d4" fontSize="9" fontFamily="monospace" opacity="0.7">17.22°N / 78.33°E</text>
                      <text x="680" y="495" fill="#06b6d4" fontSize="9" fontFamily="monospace" opacity="0.7">17.22°N / 78.58°E</text>
                    </g>
                  )}

                  {/* Movement Corridor Vectors */}
                  {showCorridors && filteredMovements.slice(0, 16).map((m: any, idx: number) => {
                    const fromPos = projectCoords(m.from_coords?.[0] || 17.43, m.from_coords?.[1] || 78.40);
                    const toPos = projectCoords(m.to_coords?.[0] || 17.44, m.to_coords?.[1] || 78.38);
                    const isHovered = hoveredMovement?.id === m.id;
                    const isEntityMatch = selectedEntity && m.entity_id === selectedEntity;

                    // Curvature offset for path visualization
                    const dx = toPos.x - fromPos.x;
                    const dy = toPos.y - fromPos.y;
                    const cx = (fromPos.x + toPos.x) / 2 - dy * 0.15;
                    const cy = (fromPos.y + toPos.y) / 2 + dx * 0.15;

                    return (
                      <g key={m.id || idx} className="cursor-pointer" onMouseEnter={() => setHoveredMovement(m)} onMouseLeave={() => setHoveredMovement(null)}>
                        <path
                          d={`M ${fromPos.x} ${fromPos.y} Q ${cx} ${cy} ${toPos.x} ${toPos.y}`}
                          fill="none"
                          stroke={isHovered || isEntityMatch ? "#22d3ee" : "url(#corridorGradient)"}
                          strokeWidth={isHovered || isEntityMatch ? 3 : 1.5}
                          strokeDasharray={isHovered ? "none" : "5 5"}
                          strokeOpacity={isHovered || isEntityMatch ? 0.95 : 0.45}
                          className="transition-all duration-300"
                        />
                        {/* Animated Direction Indicator */}
                        <circle
                          cx={toPos.x}
                          cy={toPos.y}
                          r={2.5}
                          fill="#ec4899"
                          opacity={isHovered ? 1 : 0.7}
                        />
                      </g>
                    );
                  })}

                  {/* Co-Presence Triangulation Markers */}
                  {overlaps.map((ov: any, idx: number) => {
                    if (!ov.lat || !ov.lon) return null;
                    const pos = projectCoords(ov.lat, ov.lon);
                    return (
                      <g key={`overlap-${idx}`} className="animate-pulse">
                        <circle cx={pos.x} cy={pos.y} r="22" fill="#ef4444" fillOpacity="0.15" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
                        <circle cx={pos.x} cy={pos.y} r="14" fill="#ef4444" fillOpacity="0.25" />
                      </g>
                    );
                  })}

                  {/* Location Hotspot Nodes */}
                  {allLocations.map((loc: any) => {
                    const pos = projectCoords(loc.lat, loc.lon);
                    const hotspotMeta = hotspots.find((h: any) => h.id === loc.id) || { visits: 0, risk_score: 0.2, entities: [] };
                    const isFocused = focusedLocation?.id === loc.id;
                    const isHovered = hoveredLocation?.id === loc.id;
                    const isHighRisk = (hotspotMeta.risk_score || 0) >= 0.7;
                    const visits = hotspotMeta.visits || 0;

                    // Node radius based on visit volume
                    const nodeRadius = Math.max(7, Math.min(18, 7 + visits * 0.45));

                    let nodeColor = "#38bdf8"; // Area (cyan/blue)
                    if (loc.type === 'commercial') nodeColor = "#06b6d4";
                    if (loc.type === 'transit') nodeColor = "#f59e0b";
                    if (loc.type === 'landmark') nodeColor = "#ec4899";
                    if (loc.type === 'industrial') nodeColor = "#a855f7";

                    return (
                      <g
                        key={loc.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        className="cursor-pointer group"
                        onClick={() => setFocusedLocation({ ...loc, ...hotspotMeta })}
                        onMouseEnter={() => setHoveredLocation({ ...loc, ...hotspotMeta })}
                        onMouseLeave={() => setHoveredLocation(null)}
                      >
                        {/* High-risk pulsing halo */}
                        {isHighRisk && (
                          <circle r={nodeRadius + 8} fill="#ef4444" fillOpacity="0.2" className="animate-ping" />
                        )}

                        {/* Outer Glow / Selected Ring */}
                        {(isFocused || isHovered) && (
                          <circle
                            r={nodeRadius + 6}
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                            className="animate-spin"
                            style={{ transformOrigin: '0 0' }}
                          />
                        )}

                        {/* Main Location Node Circle */}
                        <circle
                          r={nodeRadius}
                          fill={isHighRisk ? "#ef4444" : nodeColor}
                          fillOpacity={isFocused ? 0.95 : 0.8}
                          stroke="#ffffff"
                          strokeWidth={isFocused ? 2 : 1}
                          filter="url(#glow)"
                          className="transition-transform duration-200 group-hover:scale-125"
                        />

                        {/* Visit Volume Number */}
                        {visits > 0 && (
                          <text
                            y={3.5}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="8"
                            fontWeight="bold"
                            fontFamily="monospace"
                            className="pointer-events-none"
                          >
                            {visits}
                          </text>
                        )}

                        {/* Location Name Label */}
                        <text
                          y={nodeRadius + 12}
                          textAnchor="middle"
                          fill={isFocused ? "#38bdf8" : "#e2e8f0"}
                          fontSize="9.5"
                          fontWeight={isFocused ? "bold" : "500"}
                          className="pointer-events-none transition-all drop-shadow-md"
                        >
                          {loc.name}
                        </text>

                        {/* CCTV Camera Icon if present */}
                        {showCCTV && hotspotMeta.camera_count > 0 && (
                          <circle
                            cx={nodeRadius - 2}
                            cy={-nodeRadius + 2}
                            r="3.5"
                            fill="#10b981"
                            stroke="#0f172a"
                            strokeWidth="1"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* Tactical Map HUD Info Box */}
            <div className="absolute bottom-3 left-3 bg-navy-900/90 backdrop-blur-md border border-white/10 rounded-lg p-2.5 text-[11px] space-y-1 z-10 shadow-lg">
              <div className="text-slate-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Geospatial Radar: Active</span>
              </div>
              <div className="text-slate-300 font-mono">
                Projection: <span className="text-cyan-400">WGS84 Hyderabad Corridors</span>
              </div>
              {hoveredLocation && (
                <div className="pt-1 border-t border-white/10 text-cyan-300 font-semibold">
                  Hover: {hoveredLocation.name} ({hoveredLocation.visits || 0} visits)
                </div>
              )}
              {hoveredMovement && (
                <div className="pt-1 border-t border-white/10 text-pink-300 font-semibold">
                  Transit: {hoveredMovement.from_location} → {hoveredMovement.to_location}
                </div>
              )}
            </div>

            {/* Tactical Map Legend */}
            <div className="absolute top-3 right-3 bg-navy-900/90 backdrop-blur-md border border-white/10 rounded-lg p-2.5 text-[10px] space-y-1.5 z-10 shadow-lg">
              <div className="font-bold text-slate-300 uppercase tracking-wider mb-1">Node Legend</div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Commercial
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Transit Hub
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-pink-400" /> Landmark
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> Industrial
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> High Risk Hotspot
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Location Inspector / Hotspot Details Drawer */}
        <div className={clsx(
          "glass-card p-5 space-y-4 flex flex-col justify-between",
          activeTab === 'map' ? "lg:col-span-12" : "lg:col-span-5 xl:col-span-4"
        )}>
          {focusedLocation ? (
            <div className="space-y-4">
              {/* Location Inspector Header */}
              <div className="border-b border-white/10 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={clsx("badge mb-1.5 capitalize text-[10px]", getLocationTypeColor(focusedLocation.type))}>
                      {focusedLocation.type} Zone
                    </span>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-accent-400" />
                      {focusedLocation.name}
                    </h3>
                  </div>
                  <div className="text-right font-mono text-[11px] text-slate-400">
                    <div>{focusedLocation.lat?.toFixed(4)}°N</div>
                    <div>{focusedLocation.lon?.toFixed(4)}°E</div>
                  </div>
                </div>
              </div>

              {/* Activity & Risk Gauge */}
              <div className="space-y-2 bg-navy-900/80 p-3.5 rounded-lg border border-white/5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">Location Risk Index</span>
                  <span className={clsx(
                    "font-mono font-bold",
                    (focusedLocation.risk_score || 0) >= 0.7 ? "text-red-400" : "text-cyan-400"
                  )}>
                    {Math.round((focusedLocation.risk_score || 0.4) * 100)}%
                  </span>
                </div>
                <ConfidenceBar value={focusedLocation.risk_score || 0.4} size="md" showPercent={false} />
                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span>Total Logged Visits: <strong className="text-white font-mono">{focusedLocation.visits || 0}</strong></span>
                  <span>CCTV Nodes: <strong className="text-emerald-400 font-mono">{focusedLocation.camera_count || 0}</strong></span>
                </div>
              </div>

              {/* Visiting Entities Breakdown */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-accent-400" />
                    Identified Visiting Entities ({focusedLocation.entities?.length || 0})
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Cross-source matches</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {focusedLocation.entities?.map((e: any, i: number) => (
                    <div
                      key={e.id || i}
                      className={clsx(
                        "p-2.5 rounded-lg text-xs flex items-center justify-between border transition-all",
                        e.id === "p-001" || e.id === "p-002"
                          ? "bg-red-950/20 border-red-500/30 text-red-200"
                          : "bg-navy-900 border-white/5 text-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={clsx(
                          "w-2 h-2 rounded-full",
                          e.role === 'primary' ? 'bg-red-400 animate-pulse' : 'bg-cyan-400'
                        )} />
                        <div>
                          <div className="font-medium text-white">{e.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono capitalize">{e.role || 'Associate'} · {e.id}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedEntity(e.id)}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20"
                      >
                        Filter Hops
                      </button>
                    </div>
                  ))}
                  {(!focusedLocation.entities || focusedLocation.entities.length === 0) && (
                    <div className="text-xs text-slate-500 text-center py-4 bg-navy-900/50 rounded-lg">
                      No distinct suspect sightings at this coordinate
                    </div>
                  )}
                </div>
              </div>

              {/* Connected Transit Corridors for this Location */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5 text-accent-400" />
                  Corridor Inbound / Outbound Transit
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {movements
                    .filter((m: any) => m.from_location_id === focusedLocation.id || m.to_location_id === focusedLocation.id)
                    .slice(0, 4)
                    .map((m: any, i: number) => (
                      <div key={i} className="p-2 rounded bg-navy-900 border border-white/5 text-[11px] space-y-0.5">
                        <div className="text-slate-300 font-medium">
                          {m.entity_label}: <span className="text-cyan-400">{m.from_location}</span> → <span className="text-pink-400">{m.to_location}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>{m.source}</span>
                          <span>{new Date(m.timestamp).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                  {movements.filter((m: any) => m.from_location_id === focusedLocation.id || m.to_location_id === focusedLocation.id).length === 0 && (
                    <div className="text-[11px] text-slate-500 text-center py-2 bg-navy-900/40 rounded">
                      No direct corridor hops recorded for this node
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 space-y-3 my-auto">
              <Crosshair className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-medium text-slate-400">Select any location node on the map or list</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Click a location pin to view GPS metadata, visit breakdowns, visiting suspects, and transit corridor connections.
              </p>
            </div>
          )}

          {/* Location Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono text-[10px]">Zone Ref: {focusedLocation?.id || 'N/A'}</span>
            {focusedLocation && (
              <button
                onClick={() => setSelectedEntity('')}
                className="btn-ghost text-xs text-accent-400 hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Bottom Section: Detailed Hotspots & Movement Corridors Tables ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Hotspots Analysis Table */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Hotspot Activity Rankings ({filteredHotspots.length})</h3>
                <p className="text-xs text-slate-400">Locations ranked by visit density, suspect confluence, and anomaly risk</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
            {filteredHotspots.map((h: any, i: number) => {
              const isSelected = focusedLocation?.id === h.id;
              const isHighRisk = (h.risk_score || 0) >= 0.7;
              return (
                <motion.div
                  key={h.id || i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setFocusedLocation(h)}
                  className={clsx(
                    "p-3.5 rounded-xl border transition-all cursor-pointer",
                    isSelected
                      ? "bg-navy-800 border-accent-500/50 shadow-md shadow-cyan-500/10"
                      : "bg-navy-900/90 border-[rgba(34,211,238,0.08)] hover:border-cyan-500/30 hover:bg-navy-800/60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">#{i + 1}</span>
                        <div className="text-sm font-bold text-white">{h.name}</div>
                        <span className={clsx("badge text-[10px] capitalize", getLocationTypeColor(h.type))}>
                          {h.type}
                        </span>
                        {isHighRisk && <span className="badge badge-red text-[10px]">High Risk Hotspot</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span><strong className="text-white font-mono">{h.visits}</strong> logged visits</span>
                        <span>·</span>
                        <span><strong className="text-cyan-300 font-mono">{h.entities?.length || 0}</strong> suspect entities</span>
                        <span>·</span>
                        <span className="font-mono text-[11px] text-slate-500">{h.peak_hours}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-cyan-400">
                        {Math.round((h.risk_score || 0.4) * 100)}%
                      </div>
                      <div className="text-[10px] text-slate-500">Risk Score</div>
                    </div>
                  </div>

                  {/* Visiting Suspects Tags */}
                  {h.entities && h.entities.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Sightings:</span>
                      {h.entities.map((ent: any, idx: number) => (
                        <span
                          key={idx}
                          className={clsx(
                            "px-2 py-0.5 rounded text-[10px] font-medium",
                            ent.id === 'p-001' || ent.id === 'p-002'
                              ? "bg-red-500/15 text-red-300 border border-red-500/30"
                              : "bg-white/5 text-slate-300"
                          )}
                        >
                          {ent.name}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {filteredHotspots.length === 0 && !loading && (
              <div className="text-sm text-slate-500 text-center py-12 bg-navy-900/40 rounded-xl">
                No location hotspots match the current filter criteria
              </div>
            )}
          </div>
        </div>

        {/* Entity Movements & Corridors Feed */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Route className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Entity Movement Corridors ({filteredMovements.length})</h3>
                <p className="text-xs text-slate-400">Chronological transitions computed across location visits and CDR handovers</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
            {filteredMovements.map((m: any, i: number) => (
              <motion.div
                key={m.id || i}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onMouseEnter={() => setHoveredMovement(m)}
                onMouseLeave={() => setHoveredMovement(null)}
                className={clsx(
                  "p-3 rounded-xl border transition-all text-xs space-y-1.5",
                  hoveredMovement?.id === m.id
                    ? "bg-navy-800 border-accent-500/40 shadow-md shadow-cyan-500/10"
                    : "bg-navy-900/90 border-[rgba(34,211,238,0.08)] hover:border-cyan-500/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent-400" />
                    {m.entity_label}
                  </span>
                  <span className="badge badge-gray text-[10px] font-mono">{m.source}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-300 font-medium">
                  <span className="text-cyan-400">{m.from_location}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="text-pink-400">{m.to_location}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-white/5">
                  <span>Transit Window: <strong className="text-slate-300">{m.transit_min} mins</strong></span>
                  <span>{new Date(m.timestamp).toLocaleString('en-IN')}</span>
                </div>
              </motion.div>
            ))}

            {filteredMovements.length === 0 && !loading && (
              <div className="text-sm text-slate-500 text-center py-12 bg-navy-900/40 rounded-xl">
                No entity movement corridors match the current criteria
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
