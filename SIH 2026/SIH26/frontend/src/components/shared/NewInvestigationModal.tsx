import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, X, Shield, Calendar, AlertCircle, FileText, CheckCircle, Database } from 'lucide-react';
import { createCase } from '../../api/client';
import { useAppStore } from '../../store/appStore';
import EntitySearchSelector from './EntitySearchSelector';
import { clsx } from 'clsx';

interface NewInvestigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (newCase: any) => void;
}

export default function NewInvestigationModal({
  isOpen,
  onClose,
  onCreated,
}: NewInvestigationModalProps) {
  const { setActiveCase } = useAppStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [investigationType, setInvestigationType] = useState('Cyber Financial Fraud');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [leadInvestigator, setLeadInvestigator] = useState('Insp. K. Prasad');
  const [notes, setNotes] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([
    'FIR Dataset', 'Communication CDR', 'CCTV Video Vision', 'GPS Mobility', 'Financial Ledger'
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const datasetOptions = [
    'FIR Dataset', 'Communication CDR', 'CCTV Video Vision', 'GPS Mobility', 'Financial Ledger', 'Vehicle RTO Registry'
  ];

  const toggleDataset = (ds: string) => {
    setSelectedDatasets(prev =>
      prev.includes(ds) ? prev.filter(d => d !== ds) : [...prev, ds]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a valid case name/title.');
      return;
    }
    if (endDate && new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be prior to start date.');
      return;
    }
    if (selectedDatasets.length === 0) {
      setError('Please select at least one participating dataset.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        investigation_type: investigationType,
        priority,
        start_date: startDate,
        end_date: endDate || undefined,
        lead_investigator: leadInvestigator.trim(),
        notes: notes.trim(),
        datasets_enabled: selectedDatasets,
        related_entities: selectedEntity ? [selectedEntity.id] : [],
      };

      const res = await createCase(payload);
      if (res?.case) {
        setActiveCase(res.case);
        if (onCreated) onCreated(res.case);
        onClose();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create investigation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-card max-w-2xl w-full border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-surface-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-gradient flex items-center justify-center text-white">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Start New Investigation</h2>
              <p className="text-xs text-slate-400">Initialize a case with custom parameters and data sources</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Case Name */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-300 flex items-center justify-between">
              <span>Case Name / Title <span className="text-red-400">*</span></span>
              <span className="text-slate-500 text-[10px]">Auto-generated Case ID will be assigned</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Operation Golden Shadow · Shell Company Syndicate"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="field-input text-xs w-full"
            />
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-medium text-slate-300">Investigation Type</label>
              <select
                value={investigationType}
                onChange={e => setInvestigationType(e.target.value)}
                className="field-input text-xs w-full"
              >
                <option value="Cyber Financial Fraud">Cyber Financial Fraud</option>
                <option value="Organized Crime Syndicate">Organized Crime Syndicate</option>
                <option value="Money Laundering & Shell Accounts">Money Laundering & Shell Accounts</option>
                <option value="Cross-Border Smuggling">Cross-Border Smuggling</option>
                <option value="Identity Theft & SIM Swap">Identity Theft & SIM Swap</option>
                <option value="Narcotics Distribution Network">Narcotics Distribution Network</option>
                <option value="General Investigation">General Investigation</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-slate-300">Priority Level</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="field-input text-xs w-full"
              >
                <option value="critical">🔴 Critical (Immediate Action)</option>
                <option value="high">🟠 High Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="low">🔵 Low Priority</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-medium text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-accent-400" /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="field-input text-xs w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-medium text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="field-input text-xs w-full"
              />
            </div>
          </div>

          {/* Lead Investigator */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-accent-400" /> Lead Investigator / Officer
            </label>
            <input
              type="text"
              value={leadInvestigator}
              onChange={e => setLeadInvestigator(e.target.value)}
              className="field-input text-xs w-full"
            />
          </div>

          {/* Primary Subject / Entity Search */}
          <EntitySearchSelector
            label="Initial Target Entity (Optional)"
            placeholder="Search primary suspect or subject..."
            onSelect={ent => setSelectedEntity(ent)}
          />

          {/* Participating Datasets */}
          <div className="space-y-2">
            <label className="font-medium text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" /> Participating Datasets & Sources
            </label>
            <div className="grid grid-cols-2 gap-2">
              {datasetOptions.map(ds => {
                const isSelected = selectedDatasets.includes(ds);
                return (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => toggleDataset(ds)}
                    className={clsx(
                      'p-2 rounded-lg border text-left flex items-center justify-between transition-colors',
                      isSelected
                        ? 'bg-accent-500/10 border-accent-500/40 text-white font-medium'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    )}
                  >
                    <span>{ds}</span>
                    <span className={clsx('w-4 h-4 rounded flex items-center justify-center text-[10px]', isSelected ? 'bg-accent-500 text-black' : 'border border-slate-600')}>
                      {isSelected && '✓'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Initial Case Notes & Intelligence Brief
            </label>
            <textarea
              rows={2}
              placeholder="Add investigator observations, warrant references, or preliminary findings..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="field-input text-xs w-full resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs px-4 py-2"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs px-5 py-2 flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <span>Creating Case...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Create Investigation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
