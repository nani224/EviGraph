import { useState, useEffect, useRef } from 'react';
import { Search, User, Phone, Car, CreditCard, MapPin, Building, AlertCircle, X, ChevronDown, Check } from 'lucide-react';
import { fetchEntities } from '../../api/client';
import { clsx } from 'clsx';

interface EntitySearchSelectorProps {
  label: string;
  placeholder?: string;
  selectedId?: string;
  onSelect: (entity: any | null) => void;
  required?: boolean;
}

const TYPE_ICONS: Record<string, any> = {
  person: User,
  phone: Phone,
  vehicle: Car,
  account: CreditCard,
  location: MapPin,
  organization: Building,
  crime: AlertCircle,
  event: AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  person: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  phone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  vehicle: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  account: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  location: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  organization: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
};

export default function EntitySearchSelector({
  label,
  placeholder = 'Search by name, plate, number, or ID...',
  selectedId,
  onSelect,
  required = false,
}: EntitySearchSelectorProps) {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [entities, setEntities] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetchEntities()
      .then(res => {
        const list = res?.entities || [];
        setEntities(list);
        if (selectedId) {
          const match = list.find((e: any) => e.id === selectedId);
          if (match) setSelectedEntity(match);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEntities = entities.filter(e => {
    const name = (e.name || e.label || e.number || e.plate || e.id || '').toLowerCase();
    const matchesQuery = !query || name.includes(query.toLowerCase()) || e.id.toLowerCase().includes(query.toLowerCase());
    const matchesType = selectedType === 'all' || e.type?.toLowerCase() === selectedType.toLowerCase();
    return matchesQuery && matchesType;
  });

  const handleSelect = (ent: any) => {
    setSelectedEntity(ent);
    onSelect(ent);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEntity(null);
    onSelect(null);
    setQuery('');
  };

  const IconComp = selectedEntity?.type ? (TYPE_ICONS[selectedEntity.type.toLowerCase()] || User) : User;

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
        <span>{label} {required && <span className="text-red-400">*</span>}</span>
        {selectedEntity && (
          <span className="text-[10px] text-slate-400 font-mono">ID: {selectedEntity.id}</span>
        )}
      </label>

      {/* Selected Box or Search Input */}
      {selectedEntity ? (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-1 border border-accent-500/40 text-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={clsx('w-7 h-7 rounded-md flex items-center justify-center border', TYPE_COLORS[selectedEntity.type?.toLowerCase()] || 'text-slate-400')}>
              <IconComp className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-white font-medium text-xs truncate">
                {selectedEntity.name || selectedEntity.label || selectedEntity.number || selectedEntity.plate || selectedEntity.id}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">
                {selectedEntity.type} · Source: {selectedEntity.source || 'Database'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors ml-2"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="field-input pl-9 pr-8 text-xs w-full"
            />
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 pointer-events-none" />
          </div>

          {/* Search Dropdown */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-lg bg-surface-1 border border-white/10 shadow-2xl overflow-hidden max-h-64 flex flex-col">
              {/* Type filter chips */}
              <div className="p-2 border-b border-white/5 flex items-center gap-1 overflow-x-auto bg-black/20">
                {['all', 'person', 'phone', 'vehicle', 'account', 'location'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedType(t)}
                    className={clsx(
                      'px-2 py-0.5 rounded text-[10px] capitalize transition-colors flex-shrink-0',
                      selectedType === t ? 'bg-accent-500 text-black font-semibold' : 'bg-white/5 text-slate-400 hover:text-white'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Entity Results List */}
              <div className="overflow-y-auto max-h-48 p-1 divide-y divide-white/5">
                {loading ? (
                  <div className="p-3 text-center text-xs text-slate-500">Loading entities...</div>
                ) : filteredEntities.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No matching entities found. Try another search query.
                  </div>
                ) : (
                  filteredEntities.slice(0, 15).map(ent => {
                    const EntIcon = TYPE_ICONS[ent.type?.toLowerCase()] || User;
                    const entName = ent.name || ent.label || ent.number || ent.plate || ent.id;
                    return (
                      <button
                        key={ent.id}
                        type="button"
                        onClick={() => handleSelect(ent)}
                        className="w-full text-left p-2 rounded hover:bg-white/5 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={clsx('w-6 h-6 rounded flex items-center justify-center border text-xs', TYPE_COLORS[ent.type?.toLowerCase()] || 'text-slate-400')}>
                            <EntIcon className="w-3 h-3" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-white font-medium truncate group-hover:text-accent-300">
                              {entName}
                            </div>
                            <div className="text-[10px] text-slate-400 capitalize">
                              {ent.type} {ent.role ? `· ${ent.role}` : ''} {ent.source ? `· ${ent.source}` : ''}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono ml-2">{ent.id}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
