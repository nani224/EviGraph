import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, User, Phone, CreditCard, Car, MapPin, Camera, FileText, 
  CheckCircle, Sparkles, Database, ExternalLink, ShieldCheck, ArrowRight
} from 'lucide-react';
import { createDatasetEntry } from '../../api/client';
import { useNavigate } from 'react-router-dom';

interface DatasetEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
  defaultCategory?: string;
}

const CATEGORIES = [
  { id: 'person', label: 'Person Profile', icon: User, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
  { id: 'cdr', label: 'CDR Call Record', icon: Phone, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  { id: 'transaction', label: 'Financial Txn', icon: CreditCard, color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
  { id: 'vehicle', label: 'Vehicle & Plate', icon: Car, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  { id: 'location', label: 'Location Log', icon: MapPin, color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10' },
  { id: 'cctv', label: 'CCTV Sighting', icon: Camera, color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10' },
  { id: 'fir', label: 'FIR Police Report', icon: FileText, color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10' },
];

export default function DatasetEntryModal({ isOpen, onClose, onSuccess, defaultCategory = 'person' }: DatasetEntryModalProps) {
  const navigate = useNavigate();
  const [category, setCategory] = useState(defaultCategory);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [personData, setPersonData] = useState({ name: '', phone: '', role: 'suspect', aliases: '', notes: '' });
  const [cdrData, setCdrData] = useState({ from_phone: '', to_phone: '', duration_seconds: '180', call_type: 'voice', tower_id: 'TOW-001', timestamp: '' });
  const [txnData, setTxnData] = useState({ from_account: '', to_account: '', amount: '50000', bank: 'HDFC Bank', category: 'Fund Transfer', timestamp: '' });
  const [vehicleData, setVehicleData] = useState({ plate: '', make: 'Toyota', model: 'Innova', color: 'White', reg_owner_id: '' });
  const [locationData, setLocationData] = useState({ entity_id: 'p-001', location_name: 'Begumpet Airport Road', lat: 17.4432, lon: 78.4693, stay_minutes: '45', timestamp: '' });
  const [cctvData, setCctvData] = useState({ camera_id: 'CAM-04', location_name: 'Begumpet Corridor', plate_detected: 'TS09AB1234', vehicle_type_observed: 'SUV', vehicle_color_observed: 'Dark Charcoal', detection_confidence: '92', timestamp: '' });
  const [firData, setFirData] = useState({ case_number: 'FIR-2026-HYD-089', police_station: 'Cyber Crime PS', date: new Date().toISOString().split('T')[0], sections: 'IPC 420, 120B, IT Act 66D', description: '', entities_mentioned: '' });

  const autofillSample = () => {
    const ts = new Date().toISOString().slice(0, 16);
    if (category === 'person') {
      setPersonData({
        name: 'Karan Malhotra',
        phone: '+91-9876500112',
        role: 'associate',
        aliases: 'Karan M., Goldie',
        notes: 'Identified as financial liaison for logistics coordination.'
      });
    } else if (category === 'cdr') {
      setCdrData({
        from_phone: '+91-9876543210',
        to_phone: '+91-9876500112',
        duration_seconds: '345',
        call_type: 'voice',
        tower_id: 'TOW-009-SEC',
        timestamp: ts
      });
    } else if (category === 'transaction') {
      setTxnData({
        from_account: 'acc-001',
        to_account: 'acc-X99',
        amount: '250000',
        bank: 'ICICI Bank',
        category: 'Consulting Fee Layering',
        timestamp: ts
      });
    } else if (category === 'vehicle') {
      setVehicleData({
        plate: 'TS07XY4321',
        make: 'Hyundai',
        model: 'Creta',
        color: 'Silver Metallic',
        reg_owner_id: 'p-001'
      });
    } else if (category === 'location') {
      setLocationData({
        entity_id: 'p-001',
        location_name: 'Hitec City Cyber Towers Junction',
        lat: 17.4504,
        lon: 78.3808,
        stay_minutes: '60',
        timestamp: ts
      });
    } else if (category === 'cctv') {
      setCctvData({
        camera_id: 'CAM-09',
        location_name: 'Jubilee Hills Road No. 36',
        plate_detected: 'TS07XY4321',
        vehicle_type_observed: 'SUV',
        vehicle_color_observed: 'Silver',
        detection_confidence: '95',
        timestamp: ts
      });
    } else if (category === 'fir') {
      setFirData({
        case_number: 'FIR-2026-HYD-104',
        police_station: 'Cyberabad Police Station',
        date: new Date().toISOString().split('T')[0],
        sections: 'BNS 318(4), 61(2), IT Act 66C',
        description: 'Complaint regarding multi-hop digital fund transfer and unauthorized SIM proxy activations.',
        entities_mentioned: 'Ravi Kumar, Karan Malhotra'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    let payload: Record<string, any> = {};
    if (category === 'person') payload = personData;
    else if (category === 'cdr') payload = { ...cdrData, duration_seconds: Number(cdrData.duration_seconds) };
    else if (category === 'transaction') payload = { ...txnData, amount: Number(txnData.amount) };
    else if (category === 'vehicle') payload = vehicleData;
    else if (category === 'location') payload = { ...locationData, lat: Number(locationData.lat), lon: Number(locationData.lon) };
    else if (category === 'cctv') payload = { ...cctvData, detection_confidence: Number(cctvData.detection_confidence) / 100 };
    else if (category === 'fir') payload = firData;

    try {
      const res = await createDatasetEntry(category, payload);
      setResult(res);
      if (onSuccess) onSuccess(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to add dataset record');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card max-w-2xl w-full border border-white/20 shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-accent-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Add New Dataset Entry & Knowledge Node
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Insert new verified records directly into the investigation universe and knowledge graph
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success View */}
        {result ? (
          <div className="space-y-4 animate-fade-in py-2">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle className="w-5 h-5" />
                <span>Dataset Entry Successfully Added & Synced!</span>
              </div>
              <div className="text-xs text-slate-300">
                Record <code className="text-cyan-300 font-mono font-bold">{result.entry?.id}</code> has been registered under category <span className="text-white font-semibold uppercase">{result.category}</span>.
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Graph Nodes Created:</span>
                  <span className="text-slate-200 font-mono">{result.nodes_created?.join(', ') || 'Updated'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Relationships Created:</span>
                  <span className="text-slate-200 font-mono">{result.edges_created?.length || 1} dynamic edges</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  autofillSample();
                }}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                + Add Another Record
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/network');
                  }}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 hover:border-cyan-400"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-accent-400" />
                  <span>View in Network Graph</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/');
                  }}
                  className="btn-primary text-xs px-4 py-1.5 font-bold flex items-center gap-1"
                >
                  <span>Go to E-Crime Graph</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Selector Tabs */}
            <div>
              <label className="text-slate-400 text-xs font-semibold block mb-2">Select Dataset Category:</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2 ${
                        active
                          ? `${cat.border} ${cat.bg} ${cat.color} font-semibold ring-1 ring-cyan-400/40`
                          : 'border-white/10 bg-black/20 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? cat.color : 'text-slate-500'}`} />
                      <span className="text-xs truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Autofill Helper */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">Fill in the fields below or load demo template:</span>
              <button
                type="button"
                onClick={autofillSample}
                className="text-accent-400 hover:text-cyan-300 font-medium flex items-center gap-1 px-2 py-1 rounded bg-accent-500/10 border border-accent-500/20"
              >
                <Sparkles className="w-3 h-3" />
                <span>✨ Autofill Sample Record</span>
              </button>
            </div>

            {/* Dynamic Category Forms */}
            <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
              {/* PERSON */}
              {category === 'person' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-slate-400 block mb-1">Full Name</label>
                    <input
                      value={personData.name}
                      onChange={e => setPersonData({ ...personData, name: e.target.value })}
                      placeholder="e.g. Vikram Sethi"
                      className="field-input text-xs w-full"
                      required
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-slate-400 block mb-1">Primary Phone Number</label>
                    <input
                      value={personData.phone}
                      onChange={e => setPersonData({ ...personData, phone: e.target.value })}
                      placeholder="e.g. +91-9876500112"
                      className="field-input text-xs font-mono w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Investigation Role</label>
                    <select
                      value={personData.role}
                      onChange={e => setPersonData({ ...personData, role: e.target.value })}
                      className="field-input text-xs w-full"
                    >
                      <option value="suspect">Suspect / Target</option>
                      <option value="associate">Associate / Facilitator</option>
                      <option value="victim">Victim / Complainant</option>
                      <option value="witness">Witness</option>
                      <option value="unverified">Unverified Entity</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Known Aliases / Handles</label>
                    <input
                      value={personData.aliases}
                      onChange={e => setPersonData({ ...personData, aliases: e.target.value })}
                      placeholder="e.g. Goldie, V. Sethi"
                      className="field-input text-xs w-full"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-400 block mb-1">Investigator Notes</label>
                    <textarea
                      value={personData.notes}
                      onChange={e => setPersonData({ ...personData, notes: e.target.value })}
                      placeholder="Contextual notes on why this person is being added..."
                      rows={2}
                      className="field-input text-xs w-full"
                    />
                  </div>
                </div>
              )}

              {/* CDR */}
              {category === 'cdr' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Caller Phone (From)</label>
                    <input
                      value={cdrData.from_phone}
                      onChange={e => setCdrData({ ...cdrData, from_phone: e.target.value })}
                      placeholder="e.g. +91-9876543210"
                      className="field-input text-xs font-mono w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Callee Phone (To)</label>
                    <input
                      value={cdrData.to_phone}
                      onChange={e => setCdrData({ ...cdrData, to_phone: e.target.value })}
                      placeholder="e.g. +91-9876500112"
                      className="field-input text-xs font-mono w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Duration (seconds)</label>
                    <input
                      type="number"
                      value={cdrData.duration_seconds}
                      onChange={e => setCdrData({ ...cdrData, duration_seconds: e.target.value })}
                      className="field-input text-xs font-mono w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Cell Tower ID</label>
                    <input
                      value={cdrData.tower_id}
                      onChange={e => setCdrData({ ...cdrData, tower_id: e.target.value })}
                      placeholder="e.g. TOW-009-SEC"
                      className="field-input text-xs font-mono w-full"
                    />
                  </div>
                </div>
              )}

              {/* FINANCIAL TRANSACTION */}
              {category === 'transaction' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">From Account</label>
                    <input
                      value={txnData.from_account}
                      onChange={e => setTxnData({ ...txnData, from_account: e.target.value })}
                      placeholder="e.g. acc-001 or SBIN000123"
                      className="field-input text-xs font-mono w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">To Account (Beneficiary)</label>
                    <input
                      value={txnData.to_account}
                      onChange={e => setTxnData({ ...txnData, to_account: e.target.value })}
                      placeholder="e.g. acc-X99 or HDFC000456"
                      className="field-input text-xs font-mono w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Transfer Amount (₹)</label>
                    <input
                      type="number"
                      value={txnData.amount}
                      onChange={e => setTxnData({ ...txnData, amount: e.target.value })}
                      className="field-input text-xs font-mono w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Bank Name / Ledger</label>
                    <input
                      value={txnData.bank}
                      onChange={e => setTxnData({ ...txnData, bank: e.target.value })}
                      placeholder="e.g. ICICI Bank"
                      className="field-input text-xs w-full"
                    />
                  </div>
                </div>
              )}

              {/* VEHICLE */}
              {category === 'vehicle' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">License Plate (ANPR)</label>
                    <input
                      value={vehicleData.plate}
                      onChange={e => setVehicleData({ ...vehicleData, plate: e.target.value })}
                      placeholder="e.g. TS07XY4321"
                      className="field-input text-xs font-mono w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Registered Owner Entity ID</label>
                    <input
                      value={vehicleData.reg_owner_id}
                      onChange={e => setVehicleData({ ...vehicleData, reg_owner_id: e.target.value })}
                      placeholder="e.g. p-001 (Ravi Kumar)"
                      className="field-input text-xs font-mono w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Make & Model</label>
                    <input
                      value={`${vehicleData.make} ${vehicleData.model}`}
                      onChange={e => {
                        const parts = e.target.value.split(' ');
                        setVehicleData({ ...vehicleData, make: parts[0] || 'Vehicle', model: parts.slice(1).join(' ') || '' });
                      }}
                      placeholder="e.g. Toyota Innova"
                      className="field-input text-xs w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Color</label>
                    <input
                      value={vehicleData.color}
                      onChange={e => setVehicleData({ ...vehicleData, color: e.target.value })}
                      placeholder="e.g. White, Silver Metallic"
                      className="field-input text-xs w-full"
                    />
                  </div>
                </div>
              )}

              {/* LOCATION */}
              {category === 'location' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Target Entity ID</label>
                    <input
                      value={locationData.entity_id}
                      onChange={e => setLocationData({ ...locationData, entity_id: e.target.value })}
                      placeholder="e.g. p-001"
                      className="field-input text-xs font-mono w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Location Name / Corridor</label>
                    <input
                      value={locationData.location_name}
                      onChange={e => setLocationData({ ...locationData, location_name: e.target.value })}
                      placeholder="e.g. Hitec City Cyber Towers"
                      className="field-input text-xs w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={locationData.lat}
                      onChange={e => setLocationData({ ...locationData, lat: Number(e.target.value) })}
                      className="field-input text-xs font-mono w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={locationData.lon}
                      onChange={e => setLocationData({ ...locationData, lon: Number(e.target.value) })}
                      className="field-input text-xs font-mono w-full"
                    />
                  </div>
                </div>
              )}

              {/* CCTV */}
              {category === 'cctv' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Camera ID / Source</label>
                    <input
                      value={cctvData.camera_id}
                      onChange={e => setCctvData({ ...cctvData, camera_id: e.target.value })}
                      placeholder="e.g. CAM-09"
                      className="field-input text-xs font-mono w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Camera Location</label>
                    <input
                      value={cctvData.location_name}
                      onChange={e => setCctvData({ ...cctvData, location_name: e.target.value })}
                      placeholder="e.g. Jubilee Hills Road No. 36"
                      className="field-input text-xs w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Plate Detected</label>
                    <input
                      value={cctvData.plate_detected}
                      onChange={e => setCctvData({ ...cctvData, plate_detected: e.target.value })}
                      placeholder="e.g. TS07XY4321"
                      className="field-input text-xs font-mono w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Detection Confidence (%)</label>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      value={cctvData.detection_confidence}
                      onChange={e => setCctvData({ ...cctvData, detection_confidence: e.target.value })}
                      className="field-input text-xs font-mono w-full"
                    />
                  </div>
                </div>
              )}

              {/* FIR */}
              {category === 'fir' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">FIR / Case Number</label>
                    <input
                      value={firData.case_number}
                      onChange={e => setFirData({ ...firData, case_number: e.target.value })}
                      placeholder="e.g. FIR-2026-HYD-104"
                      className="field-input text-xs font-mono w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Police Station</label>
                    <input
                      value={firData.police_station}
                      onChange={e => setFirData({ ...firData, police_station: e.target.value })}
                      placeholder="e.g. Cyber Crime PS"
                      className="field-input text-xs w-full"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-400 block mb-1">Applicable Legal Sections</label>
                    <input
                      value={firData.sections}
                      onChange={e => setFirData({ ...firData, sections: e.target.value })}
                      placeholder="e.g. IPC 420, 120B, IT Act 66D"
                      className="field-input text-xs w-full"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-400 block mb-1">Narrative Summary</label>
                    <textarea
                      value={firData.description}
                      onChange={e => setFirData({ ...firData, description: e.target.value })}
                      placeholder="Enter the FIR narrative or statement..."
                      rows={2}
                      className="field-input text-xs w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-accent-400" />
                <span>Automatic Knowledge Graph Integration</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs px-4 py-1.5 font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{submitting ? 'Inserting...' : 'Insert Dataset Record'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
