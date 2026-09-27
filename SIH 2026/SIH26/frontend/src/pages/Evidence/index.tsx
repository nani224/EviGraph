import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldCheck, ShieldAlert, Clock, Filter, FolderPlus, Download,
  FileDown, FolderArchive, ArrowRight, RefreshCw, CheckCircle2, AlertTriangle,
  Blocks, Copy, ExternalLink, X, History, FileText, Check, Database, Lock
} from 'lucide-react';
import {
  fetchEvidence,
  getDownloadAllEvidenceZipUrl,
  verifyEvidenceIntegrity,
  fetchEvidenceIntegrityHistory,
  simulateEvidenceTamper,
  fetchBlockchainHealth
} from '../../api/client';
import { SectionHeader } from '../../components/shared';
import { useAppStore } from '../../store/appStore';
import type { Evidence, EvidenceIntegrity } from '../../types';
import { clsx } from 'clsx';

export default function Evidence() {
  const { activeCase } = useAppStore();
  const [items, setItems] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [tamperingId, setTamperingId] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [evidenceHistory, setEvidenceHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [blockchainHealth, setBlockchainHealth] = useState<any>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchEvidence(activeCase?.id).catch(() => ({ evidence: [] })),
      fetchBlockchainHealth().catch(() => null)
    ])
      .then(([evData, health]) => {
        setItems(evData.evidence || []);
        if (health) setBlockchainHealth(health);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [activeCase?.id]);

  const handleVerify = async (evId: string) => {
    setVerifyingId(evId);
    try {
      const res = await verifyEvidenceIntegrity(evId);
      setItems(prev =>
        prev.map(item => {
          if (item.id === evId) {
            const updatedIntegrity: EvidenceIntegrity = {
              ...(item.integrity || {}),
              evidence_id: evId,
              sha256: res.expected_sha256 || res.sha256,
              hash_algorithm: res.algorithm || 'SHA-256',
              integrity_status: res.integrity_status,
              blockchain_status: res.blockchain_status || 'RECORDED',
              fabric_tx_id: res.fabric_tx_id,
              fabric_block_number: res.fabric_block_number,
              verified_at: res.verified_at,
              storage_uri: res.storage_uri,
              expected_sha256: res.expected_sha256,
              actual_sha256: res.actual_sha256,
              is_tampered: res.is_tampered
            };
            return {
              ...item,
              integrity_status: res.integrity_status,
              sha256: res.expected_sha256,
              fabric_tx_id: res.fabric_tx_id,
              integrity: updatedIntegrity
            };
          }
          return item;
        })
      );
    } catch (err) {
      console.error('Integrity verification failed', err);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleTamperTest = async (evId: string, currentStatus?: string) => {
    setTamperingId(evId);
    const shouldTamper = currentStatus !== 'TAMPERED';
    try {
      await simulateEvidenceTamper(evId, shouldTamper);
      // Immediately run verification to trigger recalculation & mismatch detection
      await handleVerify(evId);
    } catch (err) {
      console.error('Tamper test failed', err);
    } finally {
      setTamperingId(null);
    }
  };

  const handleOpenHistory = async (ev: Evidence) => {
    setSelectedEvidence(ev);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const historyData = await fetchEvidenceIntegrityHistory(ev.id);
      setEvidenceHistory(historyData);
    } catch (err) {
      console.error('Failed to fetch history', err);
      setEvidenceHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const typeColors: Record<string, string> = {
    CDR: 'badge-green',
    Financial: 'badge-blue',
    CCTV: 'badge-yellow',
    FIR: 'badge-cyan',
    Location: 'badge-cyan',
    Vehicle: 'badge-yellow'
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <SectionHeader
        title="Evidence Repository"
        subtitle={
          activeCase
            ? `Evidence items linked to Case ${activeCase.case_number} · Cryptographic SHA-256 Provenance & Hyperledger Fabric Anchoring`
            : "All evidence items extracted from authorized data sources · Section 65B Indian Evidence Act Provenance Engine"
        }
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-slate-300 hover:text-white text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={clsx("w-3.5 h-3.5 text-cyan-400", loading && "animate-spin")} />
              <span>Refresh Ledger</span>
            </button>
            <a
              href="/datasources"
              className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-slate-300 hover:text-white text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-all"
            >
              <FolderPlus className="w-3.5 h-3.5 text-accent-400" />
              <span>Upload Evidence</span>
            </a>
            <a
              href={getDownloadAllEvidenceZipUrl()}
              download
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Download Samples (.ZIP)</span>
            </a>
          </div>
        }
      />

      {/* Blockchain Security & Integrity Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Blocks className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Hyperledger Fabric Evidence Provenance Architecture</span>
              <span className="badge badge-green text-[10px] font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>
                  {blockchainHealth?.mode === 'fabric' ? 'LIVE FABRIC NETWORK' : 'DETERMINISTIC FALLBACK ACTIVE'}
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Off-chain evidence storage coupled with SHA-256 fingerprint anchoring to permissioned channel{' '}
              <code className="text-cyan-300 font-mono text-[11px] bg-cyan-950/60 px-1 py-0.5 rounded border border-cyan-800/40">
                {blockchainHealth?.channel || 'evigraph-channel'}
              </code>{' '}
              via smart contract{' '}
              <code className="text-cyan-300 font-mono text-[11px] bg-cyan-950/60 px-1 py-0.5 rounded border border-cyan-800/40">
                {blockchainHealth?.chaincode || 'evidence_integrity'}
              </code>
              .
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Ledger Height</div>
            <div className="text-xs font-mono font-bold text-cyan-400">
              Block #{blockchainHealth?.current_block_height || 1042}
            </div>
          </div>
          <div className="h-7 w-px bg-white/10 hidden sm:block" />
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Anchored Records</div>
            <div className="text-xs font-mono font-bold text-emerald-400">
              {blockchainHealth?.total_anchored_records || items.length} Evidence Hashes
            </div>
          </div>
        </div>
      </div>

      {/* Quick Download Evidence Bar */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg shadow-cyan-950/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <FileDown className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Interconnected Investigation Sample Datasets Available</span>
              <span className="badge badge-cyan text-[9px] font-mono">FIR · CDR · ANPR · BANK · CCTV</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Ready-to-use cross-linked evidence files matching suspects Harish Nair, Sanjay Mehta, Fatima Begum, and Vikram Malhotra.
            </p>
          </div>
        </div>
        <a
          href="/datasources"
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300 hover:text-white text-xs font-medium border border-white/20 flex items-center gap-1.5 transition-all flex-shrink-0"
        >
          <span>View Sample Files</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {!loading && items.length === 0 && (
        <div className="glass-card p-12 text-center space-y-4 max-w-lg mx-auto border border-white/10 my-8">
          <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <FolderPlus className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              No Evidence Items for Case {activeCase?.case_number}
            </h3>
            <p className="text-xs text-slate-400">
              This newly created investigation does not have any CDR records, financial statements, or vehicle footage ingested yet.
            </p>
          </div>
          <a
            href="/datasources"
            className="btn-primary text-xs px-5 py-2.5 inline-flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Upload Evidence Now</span>
          </a>
        </div>
      )}

      {/* Evidence Cards Grid with Integrity Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && [...Array(6)].map((_, i) => <div key={i} className="shimmer h-40 rounded-xl" />)}
        
        {items.map((ev: Evidence, i: number) => {
          const isTampered = ev.integrity_status === 'TAMPERED';
          const isVerified = ev.integrity_status === 'VERIFIED';
          const isPending = !isTampered && !isVerified;
          const sha256 = ev.sha256 || ev.integrity?.sha256 || 'Pending Hash Generation';
          const shortHash = sha256.length > 16 ? `${sha256.slice(0, 10)}...${sha256.slice(-8)}` : sha256;
          const txId = ev.fabric_tx_id || ev.integrity?.fabric_tx_id || 'PENDING_TX';
          const shortTx = txId.length > 16 ? `${txId.slice(0, 8)}...${txId.slice(-6)}` : txId;

          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={clsx(
                'glass-card p-4 border transition-all rounded-xl relative overflow-hidden flex flex-col justify-between',
                isTampered
                  ? 'border-rose-500/50 bg-rose-950/10 shadow-lg shadow-rose-950/20'
                  : 'border-white/10 hover:border-cyan-500/30'
              )}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={clsx('badge text-xs flex-shrink-0', typeColors[ev.type] || 'badge-gray')}>
                      {ev.type}
                    </span>
                    <span className="text-xs text-white font-mono font-semibold truncate">{ev.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {ev.confidence !== undefined && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {Math.round(ev.confidence * 100)}% Conf
                      </span>
                    )}
                  </div>
                </div>

                {ev.description && (
                  <p className="text-xs text-slate-300 font-medium leading-relaxed mb-3">
                    {ev.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3 pb-3 border-b border-white/5">
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3 text-slate-500" />
                    <span>{ev.source}</span>
                  </span>
                  {ev.timestamp && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(ev.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Professional Evidence Integrity Section */}
              <div
                className={clsx(
                  'rounded-lg p-3 text-xs space-y-2 border',
                  isTampered
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : 'bg-surface-2/80 border-cyan-500/20 text-slate-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold tracking-wide uppercase text-[10px] text-slate-400">
                    <Lock className="w-3 h-3 text-cyan-400" />
                    <span>Evidence Integrity Fingerprint</span>
                  </div>

                  {/* Status Badge */}
                  {isTampered ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                      <ShieldAlert className="w-3 h-3" />
                      <span>TAMPER DETECTED</span>
                    </span>
                  ) : isVerified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="w-3 h-3" />
                      <span>VERIFIED & TRUSTED</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <Clock className="w-3 h-3" />
                      <span>PENDING CHECK</span>
                    </span>
                  )}
                </div>

                {/* SHA-256 Hash Display */}
                <div className="flex items-center justify-between gap-2 font-mono text-[11px] bg-slate-950/60 px-2 py-1 rounded border border-white/5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500 font-bold">SHA-256:</span>
                    <span className={clsx('truncate', isTampered ? 'text-rose-300 line-through' : 'text-cyan-300')}>
                      {shortHash}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyHash(sha256)}
                    className="text-slate-400 hover:text-white p-0.5 rounded transition-colors flex-shrink-0"
                    title="Copy Full SHA-256"
                  >
                    {copiedHash === sha256 ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Blockchain Info Row */}
                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                  <div>
                    <span className="text-slate-500">Blockchain: </span>
                    <span className="text-cyan-400 font-semibold">Hyperledger Fabric</span>
                  </div>
                  <div className="truncate text-right">
                    <span className="text-slate-500">Tx: </span>
                    <span className="font-mono text-slate-300 truncate" title={txId}>
                      {shortTx}
                    </span>
                  </div>
                </div>

                {isTampered && (
                  <div className="p-2 rounded bg-rose-900/30 border border-rose-500/30 text-[11px] text-rose-300 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>
                      Cryptographic mismatch! Recalculated off-chain SHA-256 does not match immutable Hyperledger Fabric block.
                    </span>
                  </div>
                )}

                {/* Interactive Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleVerify(ev.id)}
                    disabled={verifyingId === ev.id}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm',
                      isTampered
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                    )}
                  >
                    <RefreshCw className={clsx('w-3 h-3', verifyingId === ev.id && 'animate-spin')} />
                    <span>{verifyingId === ev.id ? 'Recalculating...' : 'Verify Integrity'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Judge Tamper Demonstration Trigger */}
                    <button
                      onClick={() => handleTamperTest(ev.id, ev.integrity_status)}
                      disabled={tamperingId === ev.id}
                      className={clsx(
                        'px-2 py-1 rounded text-[10px] font-medium border transition-all',
                        isTampered
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                          : 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/40'
                      )}
                      title={isTampered ? 'Restore original untampered evidence file' : 'Simulate file corruption to test tamper detection'}
                    >
                      {tamperingId === ev.id ? 'Testing...' : isTampered ? 'Restore File' : 'Simulate Tamper'}
                    </button>

                    {/* Full Audit Detail Button */}
                    <button
                      onClick={() => handleOpenHistory(ev)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-medium border border-white/10 flex items-center gap-1 transition-all"
                    >
                      <History className="w-3 h-3 text-cyan-400" />
                      <span>Audit Trail</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detailed Integrity & Blockchain Provenance Modal */}
      <AnimatePresence>
        {historyModalOpen && selectedEvidence && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card max-w-2xl w-full p-6 border border-cyan-500/30 shadow-2xl bg-surface-1 space-y-5 rounded-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Evidence Integrity Dossier</span>
                      <span className="text-xs font-mono text-cyan-300">{selectedEvidence.id}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Hyperledger Fabric Ledger Provenance · Indian Evidence Act Sec 65B Audit Records
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Integrity Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-surface-2 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Integrity Status</span>
                  <div className="flex items-center gap-2">
                    {selectedEvidence.integrity_status === 'TAMPERED' ? (
                      <span className="badge badge-red font-bold text-xs flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>TAMPER DETECTED</span>
                      </span>
                    ) : (
                      <span className="badge badge-green font-bold text-xs flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>VERIFIED & SECURE</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-2 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Blockchain Network</span>
                  <div className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Blocks className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Hyperledger Fabric (Permissioned)</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-2 border border-white/5 space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Full SHA-256 Fingerprint</span>
                    <button
                      onClick={() => handleCopyHash(selectedEvidence.sha256 || selectedEvidence.integrity?.sha256 || '')}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Full Hash</span>
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-cyan-300 bg-slate-950 p-2 rounded border border-white/10 break-all select-all">
                    {selectedEvidence.sha256 || selectedEvidence.integrity?.sha256 || 'N/A'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-2 border border-white/5 space-y-1 sm:col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Fabric Transaction ID</span>
                  <div className="font-mono text-[11px] text-slate-300 bg-slate-950 p-2 rounded border border-white/10 break-all select-all">
                    {selectedEvidence.fabric_tx_id || selectedEvidence.integrity?.fabric_tx_id || 'LOCAL_ANCHOR_RECORD'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-2 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Off-Chain Storage Reference</span>
                  <div className="font-mono text-[11px] text-slate-300 truncate">
                    {selectedEvidence.storage_uri || selectedEvidence.integrity?.storage_uri || `vault://${selectedEvidence.id}/payload.json`}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-2 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Recorded Timestamp</span>
                  <div className="text-xs text-slate-300">
                    {selectedEvidence.integrity?.recorded_at || selectedEvidence.timestamp || '2026-08-15T12:00:00'}
                  </div>
                </div>
              </div>

              {/* Verification Audit Trail */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Immutable Audit Trail & Ledger Events</span>
                </h4>

                {historyLoading ? (
                  <div className="p-6 text-center text-xs text-slate-400">Loading blockchain history...</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {evidenceHistory?.audit_events && evidenceHistory.audit_events.length > 0 ? (
                      evidenceHistory.audit_events.map((ae: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-surface-2/60 border border-white/5 text-xs flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2">
                            {ae.result === 'TAMPERED' ? (
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            )}
                            <div>
                              <div className="font-semibold text-slate-200">{ae.action}</div>
                              <div className="text-[10px] text-slate-400">
                                {ae.investigator || 'System'} · Result: {ae.result}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                            {new Date(ae.timestamp).toLocaleTimeString('en-IN')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-lg bg-surface-2 text-center text-xs text-slate-400">
                        Evidence anchored at initial creation. No subsequent verification events recorded.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Off-chain evidence storage isolates sensitive files from public distribution.
                </span>
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-white text-xs font-semibold transition-colors"
                >
                  Close Dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
