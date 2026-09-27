import { useState, useEffect } from 'react';
import { Shield, Database, Network, CheckCircle } from 'lucide-react';
import { SectionHeader } from '../../components/shared';
import { fetchSettings, updateSettings } from '../../api/client';

export default function Settings() {
  const [settings, setSettings] = useState<any>({
    investigator_name: '',
    badge_id: '',
    department: '',
    storage_mode: 'SQLite (Demo Engine)',
    graph_backend: 'NetworkX In-Memory',
    retention_policy: '90 days',
    max_hop_depth: 6,
    min_confidence: 0.3,
    community_algorithm: 'Louvain'
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings().then(res => {
      if (res) setSettings(res);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    await updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-2xl">
      <SectionHeader title="Settings" subtitle="System configuration and investigator preferences (Backend Synchronized)" />

      {/* Investigator Profile */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-accent-400" />
          <h3 className="text-sm font-semibold text-white">Investigator Profile</h3>
        </div>
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <label className="text-slate-400">Name</label>
            <input
              type="text"
              value={settings.investigator_name}
              onChange={e => setSettings({ ...settings, investigator_name: e.target.value })}
              className="field-input w-56 text-right text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-slate-400">Badge ID</label>
            <input
              type="text"
              value={settings.badge_id}
              onChange={e => setSettings({ ...settings, badge_id: e.target.value })}
              className="field-input w-56 text-right text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-slate-400">Department</label>
            <input
              type="text"
              value={settings.department}
              onChange={e => setSettings({ ...settings, department: e.target.value })}
              className="field-input w-56 text-right text-xs"
            />
          </div>
        </div>
      </div>

      {/* Data Storage */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-accent-400" />
          <h3 className="text-sm font-semibold text-white">Data Storage & Graph Engine</h3>
        </div>
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <label className="text-slate-400">Storage Mode</label>
            <input
              type="text"
              value={settings.storage_mode}
              onChange={e => setSettings({ ...settings, storage_mode: e.target.value })}
              className="field-input w-56 text-right text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-slate-400">Graph Backend</label>
            <input
              type="text"
              value={settings.graph_backend}
              onChange={e => setSettings({ ...settings, graph_backend: e.target.value })}
              className="field-input w-56 text-right text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-slate-400">Retention Policy</label>
            <input
              type="text"
              value={settings.retention_policy}
              onChange={e => setSettings({ ...settings, retention_policy: e.target.value })}
              className="field-input w-56 text-right text-xs"
            />
          </div>
        </div>
      </div>

      {/* Graph Algorithms */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Network className="w-4 h-4 text-accent-400" />
          <h3 className="text-sm font-semibold text-white">Graph Discovery Parameters</h3>
        </div>
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <label className="text-slate-400">Max Hop Depth</label>
            <input
              type="number"
              value={settings.max_hop_depth}
              onChange={e => setSettings({ ...settings, max_hop_depth: Number(e.target.value) })}
              className="field-input w-28 text-right text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-slate-400">Min Confidence Threshold</label>
            <input
              type="number"
              step="0.05"
              value={settings.min_confidence}
              onChange={e => setSettings({ ...settings, min_confidence: Number(e.target.value) })}
              className="field-input w-28 text-right text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-slate-400">Community Algorithm</label>
            <input
              type="text"
              value={settings.community_algorithm}
              onChange={e => setSettings({ ...settings, community_algorithm: e.target.value })}
              className="field-input w-28 text-right text-xs"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary">
          Save Settings
        </button>
        {saved && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Settings saved to database
          </span>
        )}
      </div>
    </div>
  );
}
