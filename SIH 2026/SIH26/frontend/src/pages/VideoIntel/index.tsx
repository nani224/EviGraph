import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Camera, Clock, CheckCircle, Plus, Sparkles, ExternalLink, MapPin, Car, Shield, AlertCircle, RefreshCw, FolderPlus } from 'lucide-react';
import { fetchCCTV, addObsToGraph, createManualObservation } from '../../api/client';
import { SectionHeader, ConfidenceBar } from '../../components/shared';
import { useAppStore } from '../../store/appStore';
import type { CCTVObservation } from '../../types';
import { clsx } from 'clsx';

export default function VideoIntel() {
  const { activeCase } = useAppStore();
  const navigate = useNavigate();
  const [obs, setObs] = useState<CCTVObservation[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  // New Sighting Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCameraId, setNewCameraId] = useState('CAM-04');
  const [newVehicleType, setNewVehicleType] = useState('SUV');
  const [newColor, setNewColor] = useState('Dark Charcoal');
  const [newPlate, setNewPlate] = useState('TS09AB1234');
  const [newLocation, setNewLocation] = useState('Begumpet Airport Road');
  const [newConfidence, setNewConfidence] = useState('92');
  const [submitting, setSubmitting] = useState(false);

  const loadObservations = () => {
    setLoading(true);
    fetchCCTV(activeCase?.id).then(d => {
      setObs(d.observations || []);
      setCameras(d.cameras || []);
      // Pre-mark items that have been flagged as added
      const inGraph = new Set<string>();
      (d.observations || []).forEach((o: any) => {
        if (o.in_graph) inGraph.add(o.id);
      });
      setAddedIds(inGraph);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadObservations();
  }, [activeCase?.id]);

  const addToGraph = async (id: string) => {
    try {
      const res = await addObsToGraph(id);
      setAddedIds(prev => new Set([...prev, id]));
      const relCount = res?.relationships_created?.length || 3;
      setFeedback(`✓ Observation #${id} added to Knowledge Graph with ${relCount} relationships.`);
      setTimeout(() => setFeedback(null), 5000);
    } catch (e: any) {
      setFeedback('Failed to add observation to graph. Please try again.');
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleCreateSighting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Save manual field observation to backend
      const res = await createManualObservation({
        entity_id: `veh-cctv-${Date.now()}`,
        entity_name: newPlate || `${newColor} ${newVehicleType}`,
        entity_type: 'VEHICLE',
        observation_type: 'CCTV ANPR Sighting',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0].slice(0, 5),
        location: newLocation,
        latitude: 17.4432,
        longitude: 78.4693,
        description: `Automated ANPR CCTV detection at ${newCameraId} (${newLocation}). Observed ${newColor} ${newVehicleType} [Plate: ${newPlate}].`,
        source_label: `Camera ${newCameraId}`,
        confidence: Number(newConfidence) / 100
      });

      setShowAddModal(false);
      loadObservations();
      setFeedback(`✓ New CCTV detection registered and connected to Knowledge Graph.`);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback('Error registering sighting. Please check inputs.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-accent-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Video Intelligence & Surveillance Sightings
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            CCTV observations, automated ANPR plate recognition, and vehicle tracking across authorized cameras
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/network')}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 hover:border-cyan-400"
          >
            <ExternalLink className="w-3.5 h-3.5 text-accent-400" />
            <span>View in Network Graph</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Video Sighting</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{feedback}</span>
          </div>
          <button
            onClick={() => navigate('/network')}
            className="text-xs font-semibold underline hover:text-white"
          >
            Open Graph ➔
          </button>
        </div>
      )}

      {!loading && obs.length === 0 && (
        <div className="glass-card p-12 text-center space-y-4 max-w-lg mx-auto border border-white/10 my-6">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <Camera className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">
              No Surveillance Sightings Logged {activeCase ? `for ${activeCase.case_number}` : ''}
            </h3>
            <p className="text-xs text-slate-400">
              No CCTV camera footage, ANPR timestamps, or vehicle tracking observations have been registered for this case.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Video / CCTV Sighting</span>
          </button>
        </div>
      )}

      {/* Grid of Observations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && [...Array(6)].map((_, i) => <div key={i} className="shimmer h-48 rounded-xl" />)}
        {obs.map((o, i) => {
          const isAdded = addedIds.has(o.id) || o.in_graph;
          return (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card p-5 space-y-4 border border-white/10 hover:border-accent-500/30 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white leading-tight">
                        {o.camera_name || `Camera ${o.camera_id}`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ID: {o.camera_id}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded border border-white/5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(o.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-black/20 p-2.5 rounded-lg border border-white/5">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Vehicle Type</span>
                    <span className="text-slate-200 font-semibold">{o.vehicle_type_observed || 'Sedan'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Color</span>
                    <span className="text-slate-200 font-semibold">{o.vehicle_color_observed || 'White'}</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-white/5">
                    <span className="text-slate-500 text-[10px] uppercase block">ANPR Plate Detected</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-cyan-300 font-mono font-bold text-xs">{o.plate_detected || 'Plate Not Visible'}</span>
                      {o.plate_detected && (
                        <span className="badge badge-green text-[9px]">{Math.round((o.plate_confidence || 0.95) * 100)}% OCR</span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-white/5">
                    <span className="text-slate-500 text-[10px] uppercase block">Camera Location</span>
                    <span className="text-slate-300 truncate block mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {o.location_name || 'Begumpet Corridor'}
                    </span>
                  </div>
                </div>

                <ConfidenceBar value={o.detection_confidence || 0.92} label="Detection Confidence" size="sm" />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-white/5">
                {isAdded ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Active in Knowledge Graph</span>
                  </div>
                ) : (
                  <button
                    onClick={() => addToGraph(o.id)}
                    className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add to Graph
                  </button>
                )}

                <button
                  onClick={() => navigate('/network')}
                  className="text-[11px] text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                >
                  Inspect Graph ➔
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Manual Sighting Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card max-w-lg w-full border border-white/20 shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">Register Video / CCTV Sighting</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateSighting} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 mb-1 block">Camera ID / Source</label>
                    <input
                      value={newCameraId}
                      onChange={e => setNewCameraId(e.target.value)}
                      placeholder="e.g. CAM-04 or Traffic-09"
                      className="field-input text-xs w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 mb-1 block">Camera Location</label>
                    <input
                      value={newLocation}
                      onChange={e => setNewLocation(e.target.value)}
                      placeholder="e.g. Begumpet Airport Road"
                      className="field-input text-xs w-full"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 mb-1 block">ANPR Plate Detected</label>
                    <input
                      value={newPlate}
                      onChange={e => setNewPlate(e.target.value)}
                      placeholder="e.g. TS09AB1234"
                      className="field-input text-xs font-mono w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 mb-1 block">Detection Confidence (%)</label>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      value={newConfidence}
                      onChange={e => setNewConfidence(e.target.value)}
                      className="field-input text-xs font-mono w-full"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 mb-1 block">Vehicle Type</label>
                    <input
                      value={newVehicleType}
                      onChange={e => setNewVehicleType(e.target.value)}
                      placeholder="e.g. SUV, Sedan, Truck"
                      className="field-input text-xs w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 mb-1 block">Vehicle Color</label>
                    <input
                      value={newColor}
                      onChange={e => setNewColor(e.target.value)}
                      placeholder="e.g. Dark Charcoal, White"
                      className="field-input text-xs w-full"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 space-y-1">
                  <span className="font-semibold flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Graph Sync Note:</span>
                  <p>Adding this sighting creates Camera, Vehicle, and Location nodes with explicit <code className="text-cyan-300 font-mono">SEEN_AT</code> and <code className="text-cyan-300 font-mono">LOCATED_AT</code> edges in the knowledge graph.</p>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary text-xs px-4 py-1.5 font-bold flex items-center gap-1"
                  >
                    {submitting ? 'Inserting...' : '✓ Add Sighting to Graph'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
