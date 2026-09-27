import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Filter, Search, Calendar, Phone, DollarSign, MapPin, Video, FileText,
  Play, Pause, SkipBack, SkipForward, User, ShieldAlert, Sparkles,
  ChevronDown, ChevronUp, Layers, CheckCircle2, AlertCircle
} from 'lucide-react';
import { fetchTimeline, fetchEntities, fetchLocationIntelligence } from '../../api/client';
import { SectionHeader } from '../../components/shared';
import { useAppStore } from '../../store/appStore';
import { clsx } from 'clsx';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const TYPE_CONFIG: Record<string, { label: string; badge: string; dot: string; icon: any; color: string }> = {
  CDR:       { label: 'CDR Calls',      badge: 'badge-green',  dot: 'bg-emerald-500', icon: Phone,      color: '#10b981' },
  Financial: { label: 'Bank Transfers', badge: 'badge-blue',   dot: 'bg-blue-500',    icon: DollarSign, color: '#3b82f6' },
  Location:  { label: 'Location Pings', badge: 'badge-cyan',   dot: 'bg-cyan-500',    icon: MapPin,     color: '#06b6d4' },
  CCTV:      { label: 'CCTV Sightings', badge: 'badge-yellow', dot: 'bg-amber-500',   icon: Video,      color: '#f59e0b' },
  FIR:       { label: 'FIR Cases',      badge: 'badge-red',    dot: 'bg-rose-500',    icon: FileText,   color: '#f43f5e' },
};

const MONTH_NAMES = ["All", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Timeline() {
  const { activeCase } = useAppStore();

  const [events, setEvents] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [temporalInsights, setTemporalInsights] = useState<any>(null);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [overlaps, setOverlaps] = useState<any[]>([]);

  // Entity selection & options
  const [entityOptions, setEntityOptions] = useState<any[]>([{ id: '', label: 'All Entities (Global Timeline)', type: 'all' }]);
  const [selectedEntity, setSelectedEntity] = useState('');

  // Filtering states
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Playback / Step-through
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Load entities on mount
  useEffect(() => {
    fetchEntities()
      .then(data => {
        const list = [
          { id: '', label: 'All Entities (Global Timeline)', type: 'all' },
          ...(data.entities || []).map((e: any) => ({
            id: e.id,
            label: `${e.label || e.name} (${(e.type || 'Entity').toUpperCase()})`,
            type: e.type,
            raw: e
          }))
        ];
        setEntityOptions(list);
      })
      .catch(console.error);
  }, []);

  // Pre-set selectedEntity when activeCase is active and has valid entity
  useEffect(() => {
    if (activeCase?.primary_entity && activeCase.primary_entity !== 'Target Entity' && !selectedEntity) {
      setSelectedEntity(activeCase.primary_entity);
    }
  }, [activeCase]);

  // Mode for timeline: 'case' (scoped to active case) or 'global' (all global evidence)
  const [timelineScope, setTimelineScope] = useState<'case' | 'global'>('case');

  // Fetch timeline events dynamically based on selected entity, active case & filters
  useEffect(() => {
    setLoading(true);
    // If Global Timeline is selected or entity is empty in global mode, do not restrict by case_id
    const effectiveCaseId = timelineScope === 'global' || selectedEntity === 'all_global'
      ? undefined
      : (activeCase?.id || undefined);

    fetchTimeline({
      case_id: effectiveCaseId,
      entity_id: (selectedEntity && selectedEntity !== 'all_global') ? selectedEntity : undefined,
      event_type: selectedType === 'ALL' ? undefined : selectedType,
      month: selectedMonth > 0 ? selectedMonth : undefined,
      search: searchQuery.trim() || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    })
      .then(d => {
        setEvents(d.events || []);
        setMonthly(d.monthly_summary || []);
        setTypeCounts(d.type_counts || {});
        setTemporalInsights(d.temporal_insights || null);
        setActiveProfile(d.active_profile || null);
        setActiveStep(null);
        setIsPlaying(false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeCase?.id, selectedEntity, timelineScope, selectedType, selectedMonth, searchQuery, startDate, endDate]);

  // Fetch location overlaps for the selected entity / case
  useEffect(() => {
    fetchLocationIntelligence(selectedEntity || undefined, activeCase?.id || undefined)
      .then(d => {
        setOverlaps(d.spatial_temporal_overlaps || []);
      })
      .catch(console.error);
  }, [activeCase?.id, selectedEntity]);


  // Timeline playback simulation
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && events.length > 0) {
      interval = setInterval(() => {
        setActiveStep(prev => {
          if (prev === null || prev <= 0) {
            return events.length - 1; // Start from oldest event
          }
          return prev - 1; // Step towards latest
        });
      }, 1400);
    }
    return () => clearInterval(interval);
  }, [isPlaying, events.length]);

  // Group events by Month for display
  const byMonth = useMemo(() => {
    const groups: Record<string, any[]> = {};
    events.forEach(e => {
      const key = e.month_label || `Month ${e.month}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [events]);

  const totalEventCount = useMemo(() => {
    return Object.values(typeCounts).reduce((a, b) => a + b, 0) || events.length;
  }, [typeCounts, events.length]);

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return {
        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      };
    } catch {
      return { date: ts, time: '' };
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionHeader
          title="Temporal Context & Time Events"
          subtitle="Dynamic chronological reconstruction of multi-source evidence and spatial-temporal activity"
        />

        {/* Playback Controls */}
        {events.length > 0 && (
          <div className="flex items-center gap-2 bg-navy-900/80 border border-cyan-500/20 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Playback:</span>
            <button
              onClick={() => {
                if (activeStep === null) setActiveStep(events.length - 1);
                else if (activeStep < events.length - 1) setActiveStep(activeStep + 1);
              }}
              title="Previous Chronological Event"
              className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Pause Sequence" : "Play Sequence"}
              className="p-1.5 rounded-lg bg-accent-500/20 text-accent-300 hover:bg-accent-500 hover:text-navy-950 font-bold transition-all"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                if (activeStep === null) setActiveStep(0);
                else if (activeStep > 0) setActiveStep(activeStep - 1);
              }}
              title="Next Chronological Event"
              className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            {activeStep !== null && (
              <span className="text-[11px] font-mono text-cyan-400 ml-1">
                Event {events.length - activeStep} of {events.length}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Filter & Selection Bar */}
      <div className="glass-card p-5 space-y-4 border border-cyan-500/20">
        {/* Active Case Context Bar */}
        {activeCase && (
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                Case {activeCase.case_number} Subjects:
              </span>
              <button
                type="button"
                onClick={() => {
                  setTimelineScope('global');
                  setSelectedEntity('');
                }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
                  timelineScope === 'global'
                    ? "bg-cyan-500 text-black font-bold shadow-sm shadow-cyan-500/30"
                    : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5"
                )}
              >
                <span>🌍 Global Timeline (All Records)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimelineScope('case');
                  setSelectedEntity('');
                }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
                  timelineScope === 'case' && !selectedEntity
                    ? "bg-cyan-500 text-black font-bold shadow-sm shadow-cyan-500/30"
                    : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5"
                )}
              >
                <span>📁 Case {activeCase.case_number} Overview</span>
              </button>
              {(activeCase.related_entities || [activeCase.primary_entity]).map((eid: string) => (
                <button
                  key={eid}
                  type="button"
                  onClick={() => {
                    setTimelineScope('case');
                    setSelectedEntity(eid);
                  }}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1 cursor-pointer",
                    selectedEntity === eid
                      ? "bg-cyan-500 text-black font-bold shadow-sm shadow-cyan-500/30"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5"
                  )}
                >
                  <span>{eid}</span>
                  {eid === activeCase.primary_entity && (
                    <span className="text-[9px] uppercase font-bold text-red-400 bg-red-950/80 px-1 py-0.2 rounded">
                      Prime
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Investigation: <span className="text-white font-medium">{activeCase.title}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Entity Selector */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-accent-400" />
              Focus Entity / Target Profile:
            </label>
            <select
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
              className="field-input w-full bg-navy-900/90 font-medium text-xs text-white border-cyan-500/30"
            >
              {entityOptions.map(o => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Query Filter */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-accent-400" />
              Keyword Search in Event Log:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search description, plate, phone, location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="field-input w-full pl-8 text-xs bg-navy-900/90"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Quick Clear Button */}
          <div className="md:col-span-3 flex items-end justify-start md:justify-end gap-2 pt-5">
            {(selectedEntity || selectedType !== 'ALL' || selectedMonth > 0 || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedEntity('');
                  setSelectedType('ALL');
                  setSelectedMonth(0);
                  setSearchQuery('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs px-3 py-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors"
              >
                Reset All Filters
              </button>
            )}
            <span className="text-xs text-cyan-300 font-mono px-3 py-2 bg-cyan-950/60 rounded-lg border border-cyan-500/20">
              {events.length} Matching Events
            </span>
          </div>
        </div>

        {/* Event Type Filter Tabs with dynamic counts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-white/10">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" /> Event Modality:
          </span>
          <button
            onClick={() => setSelectedType('ALL')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0',
              selectedType === 'ALL'
                ? 'bg-accent-500 text-navy-950 shadow-md font-bold'
                : 'bg-navy-900/80 text-slate-400 hover:text-white border border-white/5'
            )}
          >
            <span>All Modalities</span>
            <span className={clsx('text-[10px] px-1.5 py-0.2 rounded-full', selectedType === 'ALL' ? 'bg-navy-950/30 text-navy-950 font-mono' : 'bg-white/10 text-slate-300')}>
              {totalEventCount}
            </span>
          </button>

          {Object.entries(TYPE_CONFIG).map(([typeKey, cfg]) => {
            const Icon = cfg.icon;
            const count = typeCounts[typeKey] || 0;
            const isSelected = selectedType === typeKey;
            return (
              <button
                key={typeKey}
                onClick={() => setSelectedType(isSelected ? 'ALL' : typeKey)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0',
                  isSelected
                    ? `${cfg.badge} border-white/30 shadow-md scale-105`
                    : 'bg-navy-900/80 text-slate-400 hover:text-white border border-white/5'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cfg.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-200 font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Month Quick-Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-cyan-400" /> Month:
          </span>
          {MONTH_NAMES.map((name, idx) => {
            const isSelected = selectedMonth === idx;
            return (
              <button
                key={name}
                onClick={() => setSelectedMonth(idx)}
                className={clsx(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex-shrink-0',
                  isSelected
                    ? 'bg-cyan-500 text-navy-950 font-bold shadow'
                    : 'bg-navy-900/60 text-slate-400 hover:text-slate-200 border border-white/5'
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Profile & Temporal Insights Dashboard */}
      {temporalInsights && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Profile Card */}
          <div className="glass-card p-4 border border-cyan-500/30 space-y-2 bg-gradient-to-br from-navy-900 via-navy-900 to-cyan-950/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Target Profile</span>
              <span className="badge badge-cyan text-[10px]">
                {activeProfile ? activeProfile.type : 'Multi-Entity Universe'}
              </span>
            </div>
            <div className="text-sm font-bold text-white truncate">
              {activeProfile ? activeProfile.label : 'All Monitored Targets'}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {activeProfile?.details?.aliases ? `Aliases: ${activeProfile.details.aliases.join(', ')}` : activeProfile?.details?.role ? `Investigation Role: ${activeProfile.details.role}` : 'Cross-source comprehensive investigation universe'}
            </div>
          </div>

          {/* Time Span Card */}
          <div className="glass-card p-4 border border-blue-500/30 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Recorded Time Window</span>
            <div className="text-xs text-slate-200 font-mono">
              <div>From: <strong className="text-white">{temporalInsights.earliest_event ? formatTimestamp(temporalInsights.earliest_event).date : 'N/A'}</strong></div>
              <div>To: <strong className="text-white">{temporalInsights.latest_event ? formatTimestamp(temporalInsights.latest_event).date : 'N/A'}</strong></div>
            </div>
            <div className="text-[10px] text-blue-300 font-semibold pt-0.5">
              Spanning 2026 Chronological Timeline
            </div>
          </div>

          {/* Activity Spike Card */}
          <div className="glass-card p-4 border border-amber-500/30 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Peak Activity Period</span>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>{temporalInsights.peak_month_label} 2026</span>
              <span className="badge badge-yellow text-[10px]">Activity Surge</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Highest communication & transaction density detected
            </div>
          </div>

          {/* Primary Modality Card */}
          <div className="glass-card p-4 border border-emerald-500/30 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Primary Modality</span>
            <div className="text-base font-bold text-white">
              {temporalInsights.primary_type} Events
            </div>
            <div className="text-[10px] text-emerald-300 font-semibold">
              {temporalInsights.type_breakdown?.[temporalInsights.primary_type] || events.length} verified records in scope
            </div>
          </div>
        </div>
      )}

      {/* Monthly Activity Chart (Interactive) */}
      {monthly.length > 0 && (
        <div className="glass-card p-5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="section-header flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-accent-400" />
              <span>Monthly Activity Distribution {selectedEntity ? `(Filtered for ${activeProfile?.label || selectedEntity})` : ''}</span>
            </div>
            <span className="text-xs text-slate-400">
              Click any bar to isolate time events for that month
            </span>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthly}
                margin={{ left: -20, top: 10, right: 10, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const m = e.activePayload[0].payload.month;
                    setSelectedMonth(selectedMonth === m ? 0 : m);
                  }
                }}
              >
                <XAxis dataKey="month_label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0a1020', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8, fontSize: 11 }}
                  formatter={(val: any, name: any) => [val, name === 'total_events' ? 'Total Events' : name]}
                />
                <Bar dataKey="total_events" radius={[4, 4, 0, 0]} className="cursor-pointer">
                  {monthly.map((entry: any, i: number) => {
                    const isPeak = entry.month === 8;
                    const isCurrent = selectedMonth === entry.month;
                    return (
                      <Cell
                        key={i}
                        fill={isCurrent ? '#22d3ee' : isPeak ? '#f59e0b' : '#3b82f6'}
                        fillOpacity={isCurrent ? 1.0 : 0.75}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Spatial-Temporal Overlaps Notification Banner if present */}
      {overlaps.length > 0 && (
        <div className="glass-card p-4 border border-cyan-500/40 bg-cyan-950/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
              <MapPin className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>SPATIAL-TEMPORAL PROXIMITY & CO-PRESENCE DETECTIONS ({overlaps.length})</span>
            </div>
            <span className="text-[10px] text-slate-400">Events occurring at same coordinates within time window</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overlaps.slice(0, 3).map((ov, i) => (
              <div key={i} className="p-3 rounded-lg bg-navy-900 border border-cyan-500/20 space-y-1 text-xs">
                <div className="font-semibold text-white flex items-center justify-between">
                  <span>{ov.entity_a_label} ↔ {ov.entity_b_label}</span>
                  <span className="badge badge-green text-[10px]">{Math.round(ov.confidence * 100)}% Match</span>
                </div>
                <div className="text-slate-300">
                  Location: <strong className="text-cyan-300">{ov.location_name}</strong>
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex justify-between">
                  <span>Δt: {ov.time_diff_min} mins</span>
                  <span>{formatTimestamp(ov.time_a).date}</span>
                </div>
                <div className="text-[10px] text-cyan-200/80 italic pt-0.5">{ov.caveat}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chronological Timeline */}
      <div className="relative pl-6 space-y-6">
        {/* Timeline Axis Line */}
        <div className="absolute left-2 top-0 bottom-0 w-px bg-gradient-to-b from-accent-500/60 via-accent-500/20 to-transparent" />

        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="shimmer h-20 rounded-xl ml-4" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="glass-card p-12 text-center ml-4 space-y-4 border border-white/10 rounded-2xl shadow-xl">
            <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7 text-cyan-400" />
            </div>
            <h4 className="text-base font-bold text-white">
              {activeCase ? `No Timeline Activity Recorded for Case ${activeCase.case_number || activeCase.id}` : 'No Time Events Found'}
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {activeCase 
                ? `This investigation has no linked activity yet. Upload evidence (Vehicle/ANPR photos, CCTV clips, FIR reports, CDR logs, or Bank transfers) via Data Sources to build this case's temporal timeline.`
                : `No recorded time events match the current filter criteria for ${activeProfile?.label || 'the selection'}. Try resetting filters or selecting another entity.`}
            </p>
            {activeCase && (
              <div className="pt-2 flex justify-center gap-3">
                <a
                  href="/datasources"
                  className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Upload Evidence for this Case</span>
                </a>
              </div>
            )}
          </div>
        ) : (
          Object.entries(byMonth).map(([month, monthEvents]) => (
            <div key={month} className="space-y-4">
              {/* Month Header Node */}
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-accent-400 bg-navy-950 flex items-center justify-center -ml-[calc(1.25rem+1px)] shadow-lg shadow-cyan-500/30 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-accent-400" />
                </div>
                <div className="text-sm font-bold text-accent-300">{month} 2026</div>
                <div className="text-xs text-slate-500 font-mono">({monthEvents.length} events recorded)</div>
              </div>

              {/* Event Cards for this Month */}
              <div className="space-y-3 ml-4">
                {monthEvents.map((ev, i) => {
                  const cfg = TYPE_CONFIG[ev.type] || { label: ev.type, badge: 'badge-gray', dot: 'bg-slate-500', icon: Clock, color: '#94a3b8' };
                  const Icon = cfg.icon;
                  const tsFormatted = formatTimestamp(ev.timestamp);
                  const isExpanded = expandedEventId === ev.id;
                  const globalIdx = events.findIndex(e => e.id === ev.id);
                  const isPlaybackActive = activeStep === globalIdx;

                  return (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex gap-3 items-start"
                    >
                      {/* Event Dot */}
                      <div className={clsx(
                        'w-3 h-3 rounded-full flex-shrink-0 mt-3.5 border-2 border-navy-950 transition-all',
                        cfg.dot,
                        isPlaybackActive && 'ring-4 ring-cyan-400 scale-125'
                      )} />

                      {/* Event Card */}
                      <div
                        className={clsx(
                          'glass-card flex-1 p-4 transition-all duration-200 cursor-pointer',
                          isPlaybackActive ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/20' : 'hover:border-cyan-500/30'
                        )}
                        onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          {/* Event Type & Timestamp */}
                          <div className="flex items-center gap-2.5">
                            <span className={clsx('badge text-[11px] font-bold flex items-center gap-1.5', cfg.badge)}>
                              <Icon className="w-3.5 h-3.5" />
                              {cfg.label}
                            </span>
                            <span className="text-xs text-cyan-300 font-mono font-semibold">
                              {tsFormatted.date} · {tsFormatted.time}
                            </span>
                            {ev.confidence && (
                              <span className="badge badge-green text-[10px]">
                                {Math.round(ev.confidence * 100)}% Conf
                              </span>
                            )}
                          </div>

                          {/* Source Label */}
                          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            <span>{ev.source}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                          </div>
                        </div>

                        {/* Description */}
                        <div className="text-xs font-medium text-slate-200 mt-2">
                          {ev.description}
                        </div>

                        {/* Participants / Involved Entities */}
                        {ev.entities_involved?.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap mt-2.5 pt-2 border-t border-white/5">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Involved:</span>
                            {ev.entities_involved.map((ent: any, ei: number) => (
                              <span
                                key={ei}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (ent.id) setSelectedEntity(ent.id);
                                }}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-navy-900 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-navy-950 font-medium transition-colors"
                              >
                                {ent.name} <span className="text-[9px] text-slate-400">({ent.role})</span>
                              </span>
                            ))}
                            {ev.location_name && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-navy-900 border border-amber-500/20 text-amber-300 font-medium ml-auto flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {ev.location_name}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Expanded Details Drawer */}
                        <AnimatePresence>
                          {isExpanded && ev.details && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 pt-3 border-t border-cyan-500/20 text-xs space-y-2 bg-black/30 p-3 rounded-lg font-mono text-slate-300"
                            >
                              <div className="font-bold text-accent-400 font-sans flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" /> Technical Provenance & Data Payload:
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                                {Object.entries(ev.details).map(([k, v]) => (
                                  <div key={k} className="p-1.5 rounded bg-white/5">
                                    <span className="text-slate-400 block text-[10px] uppercase">{k.replace(/_/g, ' ')}</span>
                                    <span className="text-white font-semibold">{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

