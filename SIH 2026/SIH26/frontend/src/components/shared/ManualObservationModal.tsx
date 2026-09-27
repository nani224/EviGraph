import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, X, Calendar, Clock, MapPin, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import { createManualObservation } from '../../api/client';
import EntitySearchSelector from './EntitySearchSelector';

interface ManualObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded?: (newObs: any) => void;
  caseId?: string;
}

export default function ManualObservationModal({
  isOpen,
  onClose,
  onAdded,
  caseId,
}: ManualObservationModalProps) {
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [observationType, setObservationType] = useState('Physical Sighting');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('14:30');
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState<string>('17.3850');
  const [lon, setLon] = useState<string>('78.4867');
  const [description, setDescription] = useState('');
  const [sourceLabel, setSourceLabel] = useState('Field Surveillance Team');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a detailed description of the observation.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        entity_id: selectedEntity?.id,
        entity_name: selectedEntity?.name || selectedEntity?.label,
        entity_type: selectedEntity?.type || 'PERSON',
        observation_type: observationType,
        date,
        time,
        location: locationName.trim() || 'Investigator Sighted Location',
        latitude: parseFloat(lat) || 17.3850,
        longitude: parseFloat(lon) || 78.4867,
        description: description.trim(),
        source_label: sourceLabel.trim(),
        case_id: caseId,
      };

      const res = await createManualObservation(payload);
      if (res?.observation) {
        setSuccess(true);
        if (onAdded) onAdded(res.observation);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to record observation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card max-w-lg w-full border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-surface-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Manual Observation</h2>
              <p className="text-[11px] text-slate-400">Record investigator field sighting / intelligence note</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="px-5 py-2.5 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center gap-2 text-[11px] text-yellow-300">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>Manual entries are strictly tagged as <strong className="font-mono text-yellow-200">source_type="investigator_entered"</strong> with full provenance.</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Subject / Target Entity Search */}
          <EntitySearchSelector
            label="Observed Subject / Entity (Optional)"
            placeholder="Search person, vehicle, phone, or account..."
            onSelect={ent => setSelectedEntity(ent)}
          />

          {/* Observation Type & Source */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-slate-300">Observation Type</label>
              <select
                value={observationType}
                onChange={e => setObservationType(e.target.value)}
                className="field-input text-xs w-full"
              >
                <option value="Physical Sighting">Physical Sighting</option>
                <option value="Physical Meeting / Rendezvous">Physical Meeting / Rendezvous</option>
                <option value="Vehicle Usage">Vehicle Usage</option>
                <option value="Safehouse / Property Visit">Safehouse / Property Visit</option>
                <option value="Cash / Asset Handover">Cash / Asset Handover</option>
                <option value="Informant Lead">Informant Lead</option>
                <option value="Investigator Field Note">Investigator Field Note</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-300">Source / Unit</label>
              <input
                type="text"
                value={sourceLabel}
                onChange={e => setSourceLabel(e.target.value)}
                placeholder="e.g. Field Surveillance Team"
                className="field-input text-xs w-full"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-slate-300 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-accent-400" /> Observation Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="field-input text-xs w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Time (24h)
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="field-input text-xs w-full"
              />
            </div>
          </div>

          {/* Location & Coordinates */}
          <div className="space-y-1">
            <label className="font-medium text-slate-300 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-cyan-400" /> Location Name & Coordinates
            </label>
            <input
              type="text"
              placeholder="e.g. Begumpet Airport Road, Near Gate 4"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              className="field-input text-xs w-full mb-1.5"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.0001"
                placeholder="Latitude (e.g. 17.3850)"
                value={lat}
                onChange={e => setLat(e.target.value)}
                className="field-input text-[11px] w-full"
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Longitude (e.g. 78.4867)"
                value={lon}
                onChange={e => setLon(e.target.value)}
                className="field-input text-[11px] w-full"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-medium text-slate-300">Observation Notes / Description <span className="text-red-400">*</span></label>
            <textarea
              rows={3}
              required
              placeholder="Describe the activity, individuals involved, license plates, packages exchanged, or demeanor..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="field-input text-xs w-full resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs px-3.5 py-1.5"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
              disabled={loading}
            >
              {success ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Recorded!</span>
                </>
              ) : loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Add Observation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
