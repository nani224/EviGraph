import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, User, Phone, Car, CreditCard, MapPin, ChevronRight, FolderPlus } from 'lucide-react';
import { searchEntities, fetchEntities } from '../../api/client';
import { EntityBadge, ConfidenceBar, SectionHeader } from '../../components/shared';
import { useAppStore } from '../../store/appStore';
import { clsx } from 'clsx';
import { useSearchParams, useNavigate } from 'react-router-dom';

const TYPE_ICONS: Record<string, any> = {
  person: User, phone: Phone, vehicle: Car, account: CreditCard, location: MapPin,
};

const ENTITY_TYPES = ['all', 'person', 'phone', 'vehicle', 'account', 'location'];

export default function EntitySearch() {
  const { activeCase } = useAppStore();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState('all');
  const [results, setResults] = useState<any[]>([]);
  const [allEntities, setAllEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetchEntities(undefined, undefined, activeCase?.id)
      .then(d => setAllEntities(d.entities || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeCase?.id]);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      searchEntities(query, undefined, activeCase?.id)
        .then(d => setResults(d.results || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeCase?.id]);

  const displayList = query.length >= 2 ? results : allEntities;
  const filtered = typeFilter === 'all' ? displayList : displayList.filter((e: any) => e.type === typeFilter);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <SectionHeader
        title="Entity Search"
        subtitle="Search and filter all entities in the knowledge graph"
      />

      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 flex items-center gap-2 field-input">
            <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, alias, ID, phone number..."
              className="bg-transparent outline-none text-sm text-slate-200 placeholder-slate-500 w-full"
              autoFocus
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {ENTITY_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                typeFilter === t
                  ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-[rgba(34,211,238,0.1)]'
              )}
            >
              {t}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500 self-center">{filtered.length} result(s)</span>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-500 text-center py-4">Searching...</div>}

      {!loading && filtered.length === 0 && (
        <div className="glass-card p-12 text-center space-y-4 max-w-lg mx-auto border border-white/10 my-6">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <FolderPlus className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">
              No Entities Indexed {activeCase ? `for ${activeCase.case_number}` : ''}
            </h3>
            <p className="text-xs text-slate-400">
              No suspect persons, vehicles, bank accounts, or CDR endpoints have been linked to this case yet.
            </p>
          </div>
          <a
            href="/datasources"
            className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-2"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Upload Evidence for this Case</span>
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((entity: any, i: number) => {
          const Icon = TYPE_ICONS[entity.type] || User;
          return (
            <motion.div
              key={entity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              onClick={() => navigate(`/network?focus=${entity.id}`)}
              className="glass-card p-4 cursor-pointer hover:border-[rgba(34,211,238,0.2)] transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <EntityBadge type={entity.type} label={entity.type} />
                  </div>
                  <div className="text-sm font-bold text-white mt-1 truncate">{entity.label || entity.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{entity.id}</div>
                  {entity.aliases && entity.aliases.length > 0 && (
                    <div className="text-xs text-slate-600 mt-1">
                      aka: {entity.aliases.slice(0, 2).join(', ')}
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-accent-400 transition-colors flex-shrink-0" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
