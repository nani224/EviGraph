import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Play, Eye, CheckCircle, AlertCircle, Clock, Upload,
  RefreshCw, Shield, BookOpen, Layers, Award, ExternalLink, Filter, Cpu, FileUp, FileText, Check, ArrowRight, Plus, Sparkles,
  Car, Phone, DollarSign, MapPin, Video, Network, Compass, Tag, Target, Search, Crosshair, HelpCircle, CheckCircle2, ShieldCheck, Camera,
  Download, FileDown, FolderArchive, FileCode, Link2, Share2
} from 'lucide-react';
import {
  fetchDataSources, fetchSourceRecords, fetchDatasetRegistry,
  fetchDatasetComparisons, processDataset, uploadDatasourceFile,
  fetchDatasetsSummary, analyzeVehicleVision, searchTargetVehicle,
  fetchSampleEvidenceFiles, getSampleEvidenceDownloadUrl, getDownloadAllEvidenceZipUrl
} from '../../api/client';
import { SectionHeader, ConfidenceBar } from '../../components/shared';
import DatasetEntryModal from '../../components/modals/DatasetEntryModal';
import { useAppStore } from '../../store/appStore';
import type { DatasetRegistryItem, DatasetComparison } from '../../types';
import { clsx } from 'clsx';

export default function DataSources() {
  const { dataMode, setDataMode, activeCase } = useAppStore();
  const [activeTab, setActiveTab] = useState<'entry' | 'upload' | 'samples' | 'registry' | 'processing' | 'comparisons'>('entry');
  const [sources, setSources] = useState<any[]>([]);
  const [sampleFiles, setSampleFiles] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<DatasetRegistryItem[]>([]);
  const [comparisons, setComparisons] = useState<DatasetComparison[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<DatasetRegistryItem | null>(null);
  const [datasetSummary, setDatasetSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // File Upload State
  const [dragOver, setDragOver] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<'vehicle' | 'fir' | 'cctv' | 'cdr' | 'financial' | 'location'>('vehicle');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<number>(0);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileRawContent, setFileRawContent] = useState<string>('');

  // Vehicle Workflow Mode: 'extract' (Mode 1: ANPR Extract & Ingest) vs 'spotter' (Mode 2: Multi-Vehicle Target Spotter)
  const [vehicleWorkflowMode, setVehicleWorkflowMode] = useState<'extract' | 'spotter'>('extract');
  const [targetSearchPlate, setTargetSearchPlate] = useState<string>('');
  const [spotterScanning, setSpotterScanning] = useState<boolean>(false);
  const [spotterResult, setSpotterResult] = useState<any | null>(null);
  const [spotterError, setSpotterError] = useState<string | null>(null);

  // Extracted/Editable Parameters (no hardcoded defaults)
  const [extractedPlate, setExtractedPlate] = useState('');
  const [extractedMake, setExtractedMake] = useState('');
  const [extractedColor, setExtractedColor] = useState('');
  const [extractedLocation, setExtractedLocation] = useState('');
  const [extractedSuspect, setExtractedSuspect] = useState('');
  const [extractedFirNumber, setExtractedFirNumber] = useState('');
  const [extractedFromPhone, setExtractedFromPhone] = useState('');
  const [extractedToPhone, setExtractedToPhone] = useState('');
  const [extractedAmount, setExtractedAmount] = useState('');
  const [extractedNotes, setExtractedNotes] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [visionAnalysis, setVisionAnalysis] = useState<any | null>(null);
  const [visionScanning, setVisionScanning] = useState(false);


  // Processing state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<number>(0);
  const [processingResult, setProcessingResult] = useState<any | null>(null);

  const handleProcess = async (datasetId: string) => {
    setProcessingId(datasetId);
    setProcessingStage(1);
    setProcessingResult(null);
    try {
      setTimeout(() => setProcessingStage(2), 250);
      setTimeout(() => setProcessingStage(3), 500);
      const res = await processDataset(datasetId);
      setTimeout(() => {
        setProcessingStage(4);
        setProcessingResult(res);
      }, 750);
    } catch (e) {
      console.error(e);
      setProcessingStage(0);
    }
  };

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<any>(null);

  const UPLOAD_PIPELINE_STAGES = [
    'Validating File Signature & Hash',
    'Parsing File Structure (Document/Table/Media)',
    'Running YOLO Vision & Color Analysis',
    'Normalizing Schema & Timestamps',
    'Updating In-Memory Knowledge Graph',
    'Linking Entities to Active Case'
  ];

  const ADAPTER_STAGES = [
    'Schema Isolation & Validation',
    'Format Parsing (JSON/CSV/Graph)',
    'Entity Extraction & NER',
    'Temporal Precision Normalization',
    'Provenance Audit Tagging',
    'Knowledge Graph Integration'
  ];

  const handleFileSelect = (file: File) => {
    setUploadFile(file);
    setUploadResult(null);
    setUploadError(null);
    setVisionAnalysis(null);
    setExtractedPlate('');
    setExtractedColor('');
    setExtractedMake('');

    // Create preview if it's an image
    if (file.type.startsWith('image/')) {
      setImagePreviewUrl(URL.createObjectURL(file));
      setFileRawContent('');

      // Automated Vision Model Inference
      setVisionScanning(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const b64 = reader.result as string;
        try {
          const res = await analyzeVehicleVision(file.name, b64);
          if (res?.status === 'success') {
            setVisionAnalysis(res);
            if (res.dominant_color) setExtractedColor(res.dominant_color);
            if (res.make_model_prediction) setExtractedMake(res.make_model_prediction);
            if (res.plate_detected) {
              setExtractedPlate(res.plate_detected);
            } else {
              setExtractedPlate('');
            }
          }
        } catch (e) {
          console.error('Vision inference failed:', e);
          setVisionAnalysis(null);
        } finally {
          setVisionScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreviewUrl(null);
      // Read text content for CSV, JSON, TXT
      const textReader = new FileReader();
      textReader.onload = () => {
        setFileRawContent(textReader.result as string);
      };
      textReader.readAsText(file);
    }

    const fn = file.name;
    const fnLower = fn.toLowerCase();

    // Auto-detect category
    if (fnLower.includes('veh') || fnLower.includes('car') || fnLower.includes('plate') || fnLower.includes('anpr') || fnLower.includes('suv') || fnLower.includes('auto') || fnLower.includes('whatsapp') || fnLower.includes('img_')) {
      setUploadCategory('vehicle');
    } else if (fnLower.includes('fir') || fnLower.includes('complaint') || fnLower.includes('police') || fnLower.includes('ipc') || fnLower.includes('crime')) {
      setUploadCategory('fir');
    } else if (fnLower.includes('cdr') || fnLower.includes('call') || fnLower.includes('telecom') || fnLower.includes('phone')) {
      setUploadCategory('cdr');
    } else if (fnLower.includes('bank') || fnLower.includes('statement') || fnLower.includes('trans') || fnLower.includes('fin') || fnLower.includes('ledger') || fnLower.includes('account')) {
      setUploadCategory('financial');
    } else if (fnLower.includes('cctv') || fnLower.includes('cam') || fnLower.includes('video') || fnLower.includes('footage')) {
      setUploadCategory('cctv');
    } else if (fnLower.includes('gps') || fnLower.includes('loc') || fnLower.includes('track') || fnLower.includes('coord')) {
      setUploadCategory('location');
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select or drop an authorized file to upload.');
      return;
    }

    setUploadError(null);
    setUploading(true);
    setUploadStage(0);
    setUploadResult(null);

    for (let i = 0; i < UPLOAD_PIPELINE_STAGES.length - 1; i++) {
      setUploadStage(i);
      await new Promise(r => setTimeout(r, 350));
    }

    try {
      const ext = uploadFile.name.split('.').pop() || 'TXT';
      const res = await uploadDatasourceFile({
        filename: uploadFile.name,
        file_type: ext.toUpperCase(),
        file_size_bytes: uploadFile.size,
        category: uploadCategory,
        extracted_data: {
          raw_content: fileRawContent,
          plate: extractedPlate,
          make: extractedMake,
          color: extractedColor,
          location_name: extractedLocation,
          suspect_name: extractedSuspect,
          fir_number: extractedFirNumber,
          from_phone: extractedFromPhone,
          to_phone: extractedToPhone,
          amount: extractedAmount,
          notes: extractedNotes,
          timestamp: new Date().toISOString()
        },
        content_summary: `Investigator uploaded ${uploadCategory.toUpperCase()} evidence for ${activeCase?.case_number || 'Investigation'}.`,
        case_id: activeCase?.id
      });
      setUploadResult(res);
      setUploadStage(UPLOAD_PIPELINE_STAGES.length - 1);
      // Refresh datasources list
      fetchDataSources().then(d => setSources(d.sources || [])).catch(console.error);
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || 'File processing failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSpotterSearch = async (plateToSearch?: string, fileToUse?: File) => {
    const plate = (plateToSearch !== undefined ? plateToSearch : targetSearchPlate).trim();
    const file = fileToUse || uploadFile;
    if (!plate) {
      setSpotterError('Please enter or select a target vehicle license plate to spot.');
      return;
    }
    if (!file) {
      setSpotterError('Please select or drop an image containing vehicles to scan.');
      return;
    }
    setSpotterError(null);
    setSpotterScanning(true);
    setSpotterResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result as string;
      try {
        const res = await searchTargetVehicle(plate, b64, file.name, activeCase?.id);
        if (res?.status === 'success') {
          setSpotterResult(res);
        } else {
          setSpotterError(res?.message || 'Spotter search failed');
        }
      } catch (err: any) {
        console.error('Target spotter search error:', err);
        setSpotterError(err?.response?.data?.detail || 'Scene spotter scan failed. Please check backend connection.');
      } finally {
        setSpotterScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };


  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchDatasetRegistry().then(d => {
        const list = d?.datasets || [];
        setDatasets(list);
        if (list.length > 0 && !selectedDataset) setSelectedDataset(list[0]);
      }).catch(console.error),
      fetchDatasetComparisons().then(d => {
        setComparisons(d?.comparisons || []);
      }).catch(console.error),
      fetchDataSources().then(d => {
        setSources(d?.sources || []);
      }).catch(console.error),
      fetchDatasetsSummary(activeCase?.id).then(d => {
        setDatasetSummary(d);
      }).catch(console.error),
      fetchSampleEvidenceFiles().then(d => {
        setSampleFiles(d?.files || []);
      }).catch(console.error)
    ]).finally(() => setLoading(false));
  }, [activeCase?.id]);

  const handleViewRecords = async (sourceId: string) => {
    try {
      const data = await fetchSourceRecords(sourceId);
      setDrawerData(data);
      setDrawerOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <SectionHeader
        title="Dataset Registry & Ingestion Pipeline"
        subtitle="Legitimate research benchmarks, evidence upload pipeline, and multi-source normalization"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('entry')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                activeTab === 'entry'
                  ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Database className="w-3.5 h-3.5" />
              Add Dataset Record
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                activeTab === 'upload'
                  ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Evidence
            </button>
            <button
              onClick={() => setActiveTab('samples')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm',
                activeTab === 'samples'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/50 shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-cyan-300'
              )}
            >
              <FileDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download Evidence Inputs</span>
              <span className="badge badge-cyan text-[9px] py-0 px-1 font-mono">7 FILES</span>
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                activeTab === 'registry'
                  ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Public Registry
            </button>
            <button
              onClick={() => setActiveTab('processing')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                activeTab === 'processing'
                  ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Cpu className="w-3.5 h-3.5" />
              Adapter Pipeline
            </button>
            <button
              onClick={() => setActiveTab('comparisons')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                activeTab === 'comparisons'
                  ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Strategy Matrix
            </button>
          </div>
        }
      />

      {/* TAB: ADD DATASET RECORD STUDIO */}
      {activeTab === 'entry' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Card */}
          <div className="glass-card p-6 border border-white/10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-accent-400" />
                  Live Dataset Record Management & Graph Ingestion
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Add verified person profiles, CDR call logs, bank transactions, vehicles, locations, CCTV sightings, or FIRs.
                  All entries are dynamically persisted and synchronized into the knowledge graph.
                </p>
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="btn-primary text-xs px-4 py-2 font-bold flex items-center gap-2 shadow-lg hover:shadow-cyan-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Dataset Record</span>
              </button>
            </div>

            {/* Category Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[
                { label: 'Person Profiles', count: datasetSummary?.summary?.persons?.count ?? (activeCase ? 0 : 21), color: 'text-blue-400', border: 'border-blue-500/20', cat: 'person' },
                { label: 'CDR Call Records', count: datasetSummary?.summary?.cdrs?.count ?? (activeCase ? 0 : 173), color: 'text-emerald-400', border: 'border-emerald-500/20', cat: 'cdr' },
                { label: 'Bank Transactions', count: datasetSummary?.summary?.transactions?.count ?? (activeCase ? 0 : 97), color: 'text-purple-400', border: 'border-purple-500/20', cat: 'transaction' },
                { label: 'Vehicles & ANPR', count: datasetSummary?.summary?.vehicles?.count ?? (activeCase ? 0 : 6), color: 'text-amber-400', border: 'border-amber-500/20', cat: 'vehicle' },
                { label: 'Location Corridors', count: datasetSummary?.summary?.locations?.count ?? (activeCase ? 0 : 20), color: 'text-cyan-400', border: 'border-cyan-500/20', cat: 'location' },
                { label: 'CCTV Observations', count: datasetSummary?.summary?.cctv_observations?.count ?? (activeCase ? 0 : 5), color: 'text-rose-400', border: 'border-rose-500/20', cat: 'cctv' },
                { label: 'FIR Police Reports', count: datasetSummary?.summary?.firs?.count ?? (activeCase ? 0 : 2), color: 'text-orange-400', border: 'border-orange-500/20', cat: 'fir' },
                { label: 'Total Graph Nodes', count: datasetSummary?.graph_stats?.total_nodes ?? (activeCase ? 0 : 67), color: 'text-accent-300', border: 'border-accent-500/20', cat: null },
              ].map((card, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (card.cat) {
                      setShowModal(true);
                    }
                  }}
                  className={`p-3 rounded-xl bg-black/20 border ${card.border} hover:border-white/30 transition-all cursor-pointer space-y-1`}
                >
                  <span className="text-[11px] text-slate-400 block">{card.label}</span>
                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-bold font-mono ${card.color}`}>{card.count}</span>
                    {card.cat && <span className="text-[10px] text-slate-500 hover:text-white">+ Add</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold mr-1">Quick Add:</span>
              {[
                { label: '+ Add Person', cat: 'person' },
                { label: '+ Add CDR Call', cat: 'cdr' },
                { label: '+ Add Financial Txn', cat: 'transaction' },
                { label: '+ Add Vehicle', cat: 'vehicle' },
                { label: '+ Add CCTV Sighting', cat: 'cctv' },
                { label: '+ Add FIR', cat: 'fir' },
              ].map((chip, ci) => (
                <button
                  key={ci}
                  onClick={() => setShowModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 0: UPLOAD EVIDENCE PIPELINE */}
      {activeTab === 'upload' && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick-Download Interconnected Test Evidence Bar */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/50 via-blue-950/40 to-slate-900 border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg shadow-cyan-950/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Need Interconnected Evidence Files for Testing?</span>
                  <span className="badge badge-cyan text-[9px] font-mono">FIR · CDR · VEHICLE · BANK · CCTV</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Download cross-linked sample files featuring suspects Harish Nair, Sanjay Mehta, Fatima Begum, Vikram Malhotra, and Suresh Babu.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('samples')}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Browse All Files</span>
              </button>
              <a
                href={getDownloadAllEvidenceZipUrl()}
                download
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Download All (.ZIP)</span>
              </a>
            </div>
          </div>

          {/* 1. Category Selection */}
          <div className="glass-card p-6 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-accent-400" />
                  Step 1: Select Evidence Type / Ingestion Mode
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Choose the source category so the AI extraction pipeline normalizes and links the correct entity attributes.
                </p>
              </div>
              <span className="badge badge-cyan text-xs">
                Target: <strong className="ml-1 text-white">{activeCase?.case_number || 'Global Universe'}</strong>
              </span>
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
              {[
                { id: 'vehicle', label: 'Vehicle / ANPR', icon: Car, color: 'text-amber-400', desc: 'Number plates, RTO, make & color' },
                { id: 'fir', label: 'FIR / Complaint', icon: FileText, color: 'text-rose-400', desc: 'Accused names, IPC sections, station' },
                { id: 'cctv', label: 'CCTV Vision', icon: Video, color: 'text-cyan-400', desc: 'Camera sightings, dwell, vision logs' },
                { id: 'cdr', label: 'Telecom CDR', icon: Phone, color: 'text-emerald-400', desc: 'Call records, IMEI, cell towers' },
                { id: 'financial', label: 'Bank Ledger', icon: DollarSign, color: 'text-blue-400', desc: 'Accounts, transfers, UPI/NEFT' },
                { id: 'location', label: 'GPS / Location', icon: MapPin, color: 'text-purple-400', desc: 'Location pings, coordinates, tracks' },
              ].map(cat => {
                const Icon = cat.icon;
                const isSelected = uploadCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setUploadCategory(cat.id as any)}
                    className={clsx(
                      'p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2',
                      isSelected
                        ? 'bg-accent-500/15 border-accent-500/60 shadow-md shadow-accent-500/10 ring-1 ring-accent-500/40'
                        : 'bg-surface-1/60 hover:bg-white/5 border-white/10 hover:border-white/20'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center bg-white/5', cat.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{cat.label}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{cat.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. File Upload Dropzone & Extracted Fields */}
          <div className="glass-card p-6 border border-white/10 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-accent-400" />
                Step 2: Upload File & Confirm Extracted Parameters
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Drop your evidence file (image, PDF, CSV, JSON, TXT). Values will be auto-extracted and synced into the graph.
              </p>
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Drag & Drop Area */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
              }}
              className={clsx(
                'p-6 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer',
                dragOver ? 'border-accent-400 bg-accent-500/10' : 'border-white/15 hover:border-accent-500/40 bg-surface-1/40'
              )}
              onClick={() => {
                const input = document.getElementById('file-upload-input');
                if (input) input.click();
              }}
            >
              <input
                id="file-upload-input"
                type="file"
                accept=".pdf,.csv,.json,.txt,.jpg,.jpeg,.png,.mp4,.bmp,.tiff"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
              <Upload className="w-8 h-8 text-accent-400 mx-auto mb-2 opacity-80" />
              {uploadFile ? (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-white flex items-center justify-center gap-2">
                    <span className="badge badge-green text-[10px]">Loaded</span>
                    <span>{uploadFile.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{(uploadFile.size / 1024).toFixed(1)} KB · Click or drop another to replace</div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-300">Drag & drop evidence file or click to browse</div>
                  <div className="text-[10px] text-slate-500">Supports Images (JPG, PNG), Documents (PDF, TXT), Logs (CSV, JSON), Video (MP4)</div>
                </div>
              )}
            </div>

            {/* Dynamic Extraction Preview & Customizer */}
            <div className="p-4 rounded-xl bg-surface-1/80 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Auto-Extracted Entity Parameters ({uploadCategory.toUpperCase()} Mode)
                </span>
                <span className="text-[10px] text-slate-500">Editable before graph ingestion</span>
              </div>

              {uploadCategory === 'vehicle' && (
                <div className="space-y-4 pt-1">
                  {/* Workflow Mode Selector Tab */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-2 rounded-xl bg-navy-950/80 border border-white/10 gap-2">
                    <div className="flex items-center gap-1 p-1 bg-surface-2/60 rounded-lg border border-white/5">
                      <button
                        type="button"
                        onClick={() => setVehicleWorkflowMode('extract')}
                        className={clsx(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                          vehicleWorkflowMode === 'extract'
                            ? "bg-accent-500 text-white shadow-lg shadow-accent-500/25"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Mode 1: Auto-Extract & Ingest</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVehicleWorkflowMode('spotter')}
                        className={clsx(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                          vehicleWorkflowMode === 'spotter'
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 font-bold"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        <Target className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Mode 2: Multi-Vehicle Target Spotter</span>
                        <span className="badge badge-green text-[9px] py-0 px-1 font-mono">NEW</span>
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono px-2">
                      {vehicleWorkflowMode === 'extract'
                        ? '🔍 Auto-ANPR & Vahan RTO Extraction'
                        : '🎯 Multi-Car Scene Search & Bounding Box Localization'}
                    </span>
                  </div>

                  {/* MODE 1: AUTO-EXTRACT & INGEST VEHICLE */}
                  {vehicleWorkflowMode === 'extract' && (
                    <div className="space-y-3">
                      {/* Image Preview & Visual Details */}
                      {imagePreviewUrl && (
                        <div className="p-3.5 rounded-xl bg-black/50 border border-white/15 flex flex-col sm:flex-row items-center gap-4">
                          <div className="relative group rounded-lg overflow-hidden border border-white/20 w-40 h-28 bg-slate-900 flex-shrink-0 flex items-center justify-center">
                            <img
                              src={imagePreviewUrl}
                              alt="Vehicle Evidence"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-cyan-300 font-mono">
                              Image Evidence
                            </span>
                          </div>
                          <div className="flex-1 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-white flex items-center gap-2">
                                <Eye className="w-4 h-4 text-accent-400" />
                                <span>Vehicle Image Vision Scan</span>
                              </div>
                              {visionScanning ? (
                                <span className="badge badge-amber text-[10px] animate-pulse flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3 animate-spin" /> Scanning Pixels & Model...
                                </span>
                              ) : visionAnalysis ? (
                                <span className="badge badge-green text-[10px] flex items-center gap-1 font-mono">
                                  <CheckCircle className="w-3 h-3 text-emerald-400" /> YOLO Model: {Math.round(visionAnalysis.vision_confidence * 100)}% Confidence
                                </span>
                              ) : null}
                            </div>

                            {visionAnalysis && (
                              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 flex flex-wrap gap-3 items-center">
                                <span className="flex items-center gap-1.5">
                                  <Car className="w-3.5 h-3.5 text-emerald-400" />
                                  Plate Detected: <strong className="text-white font-mono bg-black/60 px-1.5 py-0.5 rounded border border-emerald-500/40 text-amber-300">{visionAnalysis.plate_detected ? visionAnalysis.plate_detected : 'No Plate Recognized (Enter Manually)'}</strong>
                                </span>
                                <span>·</span>
                                <span>Color: <strong className="text-white uppercase">{visionAnalysis.dominant_color}</strong></span>
                                <span>·</span>
                                <span>Make: <strong className="text-white">{visionAnalysis.make_model_prediction}</strong></span>
                                <span>·</span>
                                <span className="text-[10px] text-emerald-400 font-mono">ANPR: EasyOCR + YOLO</span>
                              </div>
                            )}

                            {/* National Vahan RTO Registry Cross-Check */}
                            {visionAnalysis?.rto_verification && (
                              <div className={clsx(
                                "p-2.5 rounded-lg border text-[11px] space-y-1 mt-2",
                                visionAnalysis.rto_verification.is_legitimate
                                  ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-200"
                                  : "bg-red-950/60 border-red-500/50 text-red-200"
                              )}>
                                <div className="flex items-center justify-between font-bold">
                                  <span className="flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5" />
                                    National Vahan RTO Cross-Check:
                                  </span>
                                  <span className={clsx(
                                    "text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold",
                                    visionAnalysis.rto_verification.is_legitimate
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                      : "bg-red-500/30 text-red-200 border border-red-500/50 animate-pulse"
                                  )}>
                                    {visionAnalysis.rto_verification.badge}
                                  </span>
                                </div>
                                <p className="text-[11px] leading-relaxed font-mono text-slate-200">
                                  {visionAnalysis.rto_verification.message}
                                </p>
                              </div>
                            )}

                            <p className="text-[11px] text-slate-400">
                              Automated ANPR & Vision model extracted vehicle details directly from pixels. The parameters below have been pre-filled automatically for graph ingestion.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-semibold text-slate-400">
                            License Plate Number (ANPR Extracted) <span className="text-amber-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={extractedPlate}
                            onChange={e => setExtractedPlate(e.target.value.toUpperCase())}
                            placeholder="e.g. AP09CP1234 or TS09EA1234"
                            className="input-field text-xs font-mono font-bold text-amber-300 mt-1 w-full bg-navy-900 border-amber-500/40"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-semibold text-slate-400">
                            Make & Model (Vision Model)
                          </label>
                          <input
                            type="text"
                            value={extractedMake}
                            onChange={e => setExtractedMake(e.target.value)}
                            placeholder="e.g. Skoda Slavia / Octavia"
                            className="input-field text-xs text-white mt-1 w-full font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-semibold text-slate-400">
                            Observed Color (Pixel Analysis)
                          </label>
                          <input
                            type="text"
                            value={extractedColor}
                            onChange={e => setExtractedColor(e.target.value)}
                            placeholder="e.g. White"
                            className="input-field text-xs text-white mt-1 w-full font-semibold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] uppercase font-semibold text-slate-400">Sighting Camera / Location</label>
                          <input
                            type="text"
                            value={extractedLocation}
                            onChange={e => setExtractedLocation(e.target.value)}
                            placeholder="e.g. Begumpet Corridor (CAM-04)"
                            className="input-field text-xs text-white mt-1 w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-semibold text-slate-400">Associated Owner / Suspect</label>
                          <input
                            type="text"
                            value={extractedSuspect}
                            onChange={e => setExtractedSuspect(e.target.value)}
                            placeholder="e.g. Target Suspect"
                            className="input-field text-xs text-white mt-1 w-full"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODE 2: MULTI-VEHICLE TARGET SPOTTER */}
                  {vehicleWorkflowMode === 'spotter' && (
                    <div className="space-y-4 p-4 rounded-xl bg-navy-950/60 border border-emerald-500/20">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <Crosshair className="w-4 h-4 text-emerald-400" />
                          Multi-Vehicle Target Spotter & Bounding Box Localizer
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Enter your target suspect license plate. Upload any traffic scene, parking lot, or CCTV frame containing multiple cars. AI will scan all vehicles, locate the target, and highlight it with bounding boxes.
                        </p>
                      </div>

                      {/* Target Plate Input & Quick Chips */}
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-semibold text-slate-300 flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-amber-400" />
                          Target License Plate Number to Spot <span className="text-rose-400">*</span>
                        </label>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={targetSearchPlate}
                              onChange={e => setTargetSearchPlate(e.target.value.toUpperCase())}
                              placeholder="e.g. DL 3 CBD 5092, KA 19 ML 5205, MH 14 TCF 735"
                              className="input-field text-xs font-mono font-bold text-amber-300 w-full pl-9 bg-navy-900 border-emerald-500/40"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSpotterSearch()}
                            disabled={spotterScanning || !uploadFile}
                            className={clsx(
                              "btn-primary text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 whitespace-nowrap",
                              spotterScanning ? "opacity-60 cursor-not-allowed" : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
                            )}
                          >
                            {spotterScanning ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Scanning Scene Vehicles...</span>
                              </>
                            ) : (
                              <>
                                <Crosshair className="w-3.5 h-3.5" />
                                <span>Spot Target in Image</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Quick Selection Chips */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Tag className="w-3 h-3 text-slate-500" /> Quick Target Select:
                          </span>
                          {[
                            { plate: 'DL 3 CBD 5092', label: 'DL 3 CBD 5092 (Renault Duster)' },
                            { plate: 'KA 19 ML 5205', label: 'KA 19 ML 5205 (Tata Harrier)' },
                            { plate: 'MH 14 TCF 735', label: 'MH 14 TCF 735 (Tata Tigor)' },
                            { plate: 'MH 01 EE 2388', label: 'MH 01 EE 2388 (Toyota Innova)' },
                            { plate: 'BA NO NYA',     label: 'BA NO NYA (Swift Dzire)' },
                            { plate: 'GA 05 F 0888',  label: 'GA 05 F 0888 (Skoda Octavia)' },
                            { plate: 'TN 14 H 5151',  label: 'TN 14 H 5151 (Maruti Dzire)' },
                          ].map(item => (
                            <button
                              key={item.plate}
                              type="button"
                              onClick={() => {
                                setTargetSearchPlate(item.plate);
                                if (uploadFile) handleSpotterSearch(item.plate);
                              }}
                              className={clsx(
                                "text-[10px] font-mono px-2 py-0.5 rounded border transition-all",
                                targetSearchPlate === item.plate
                                  ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold"
                                  : "bg-surface-2/80 border-white/10 text-slate-300 hover:border-emerald-500/40 hover:text-white"
                              )}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {spotterError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{spotterError}</span>
                        </div>
                      )}

                      {/* Spotter Results View */}
                      {spotterResult && (
                        <div className="space-y-3 pt-2">
                          {/* Banner Status */}
                          <div className={clsx(
                            "p-3 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-lg",
                            spotterResult.target_found
                              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200 shadow-emerald-500/10"
                              : "bg-amber-950/60 border-amber-500/40 text-amber-200 shadow-amber-500/10"
                          )}>
                            <div className="flex items-center gap-2.5">
                              {spotterResult.target_found ? (
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center flex-shrink-0">
                                  <Target className="w-4 h-4 text-emerald-300" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center flex-shrink-0">
                                  <AlertCircle className="w-4 h-4 text-amber-300" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold flex items-center gap-2">
                                  <span>{spotterResult.target_found ? '🎯 TARGET VEHICLE POSITIVELY IDENTIFIED IN SCENE!' : '✕ TARGET VEHICLE NOT FOUND'}</span>
                                  <span className={clsx(
                                    "text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-bold",
                                    spotterResult.target_found ? "bg-emerald-500/30 text-emerald-200" : "bg-amber-500/30 text-amber-200"
                                  )}>
                                    {spotterResult.target_found ? 'POSITIVE MATCH' : 'NOT PRESENT'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                                  {spotterResult.summary}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 font-mono text-[11px]">
                              <span className="text-slate-400">Total Scanned: </span>
                              <strong className="text-white font-bold">{spotterResult.vehicles_scanned_count} Vehicles</strong>
                            </div>
                          </div>

                          {/* Annotated Image Preview & Legend */}
                          {spotterResult.annotated_image_base64 && (
                            <div className="p-3 rounded-xl bg-black/60 border border-white/15 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-white flex items-center gap-1.5">
                                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                                  AI Bounding Box Localization View
                                </span>
                                <div className="flex items-center gap-3 text-[10px] font-mono">
                                  <span className="flex items-center gap-1 text-emerald-400">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span> Target Car
                                  </span>
                                  <span className="flex items-center gap-1 text-sky-400">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block"></span> Other Vehicles
                                  </span>
                                </div>
                              </div>
                              <div className="relative rounded-lg overflow-hidden border border-white/20 bg-slate-950 flex items-center justify-center max-h-[420px]">
                                <img
                                  src={spotterResult.annotated_image_base64}
                                  alt="Annotated Scene with Bounding Boxes"
                                  className="max-w-full max-h-[420px] object-contain rounded-lg"
                                />
                              </div>
                            </div>
                          )}

                          {/* National Vahan RTO Cross-Check for Target */}
                          {spotterResult.rto_verification && (
                            <div className={clsx(
                              "p-3 rounded-xl border text-xs space-y-1.5",
                              spotterResult.rto_verification.is_legitimate
                                ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-200"
                                : "bg-red-950/60 border-red-500/50 text-red-200"
                            )}>
                              <div className="flex items-center justify-between font-bold">
                                <span className="flex items-center gap-1.5">
                                  <Shield className="w-3.5 h-3.5" />
                                  National Vahan RTO Registry Record ({spotterResult.target_plate_searched}):
                                </span>
                                <span className={clsx(
                                  "text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold",
                                  spotterResult.rto_verification.is_legitimate
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    : "bg-red-500/30 text-red-200 border border-red-500/50"
                                )}>
                                  {spotterResult.rto_verification.badge}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-slate-200 leading-relaxed">
                                {spotterResult.rto_verification.message}
                              </p>
                              {spotterResult.rto_verification.rto_record && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px] font-mono text-slate-300 border-t border-white/10 mt-2">
                                  <div>Owner: <strong className="text-white">{spotterResult.rto_verification.rto_record.reg_owner}</strong></div>
                                  <div>Model: <strong className="text-white">{spotterResult.rto_verification.rto_record.make} {spotterResult.rto_verification.rto_record.model}</strong></div>
                                  <div>RTO: <strong className="text-white">{spotterResult.rto_verification.rto_record.rto_office}</strong></div>
                                  <div>Status: <strong className="text-emerald-400">{spotterResult.rto_verification.rto_record.status}</strong></div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Scanned Vehicles Breakdown Table */}
                          <div className="p-3 rounded-xl bg-surface-2/60 border border-white/10 space-y-2">
                            <div className="text-xs font-bold text-white flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Car className="w-3.5 h-3.5 text-accent-400" />
                                Scanned Vehicles in Frame ({spotterResult.scanned_vehicles.length} Total)
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">Sorted by Foreground Prominence</span>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {spotterResult.scanned_vehicles.map((veh: any) => (
                                <div
                                  key={veh.vehicle_index}
                                  className={clsx(
                                    "p-2 rounded-lg border text-[11px] flex items-center justify-between gap-2 font-mono",
                                    veh.is_target_match
                                      ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-200"
                                      : "bg-surface-1/60 border-white/5 text-slate-300"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={clsx(
                                      "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                      veh.is_target_match ? "bg-emerald-500 text-black" : "bg-slate-800 text-slate-400"
                                    )}>
                                      #{veh.vehicle_index}
                                    </span>
                                    <span className="font-bold text-white">{veh.make_model}</span>
                                    <span className="text-slate-400">· Color: <strong className="text-slate-200 uppercase">{veh.dominant_color}</strong></span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={clsx(
                                      "px-1.5 py-0.5 rounded border text-[10px]",
                                      veh.is_target_match
                                        ? "bg-black/60 text-amber-300 border-amber-500/50 font-bold"
                                        : "bg-black/40 text-slate-400 border-white/10"
                                    )}>
                                      Plate: {veh.detected_plate}
                                    </span>
                                    {veh.is_target_match ? (
                                      <span className="badge badge-green text-[9px] font-bold">TARGET MATCH</span>
                                    ) : (
                                      <span className="text-[9px] text-slate-500">Non-Target</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Quick Action to Ingest Sighting into Graph */}
                          {spotterResult.target_found && spotterResult.matched_vehicle && (
                            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                              <div className="text-xs text-emerald-200">
                                <span className="font-bold text-white">Positive Target Sighting Verified: </span>
                                Ready to record sighting into the criminal intelligence graph.
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setExtractedPlate(spotterResult.target_plate_searched);
                                  setExtractedMake(spotterResult.matched_vehicle.make_model);
                                  setExtractedColor(spotterResult.matched_vehicle.dominant_color);
                                  setExtractedLocation('Surveillance Scene / Sighting Point');
                                  setVehicleWorkflowMode('extract');
                                }}
                                className="btn-primary text-xs font-bold px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 whitespace-nowrap shadow-lg shadow-emerald-500/20"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Pre-fill & Ingest Sighting into Graph</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}


              {uploadCategory === 'fir' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">FIR Number</label>
                    <input
                      type="text"
                      value={extractedFirNumber}
                      onChange={e => setExtractedFirNumber(e.target.value)}
                      className="input-field text-xs font-mono font-bold text-rose-300 mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Accused / Suspect Name</label>
                    <input
                      type="text"
                      value={extractedSuspect}
                      onChange={e => setExtractedSuspect(e.target.value)}
                      className="input-field text-xs text-white mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Police Station</label>
                    <input
                      type="text"
                      value={extractedLocation}
                      onChange={e => setExtractedLocation(e.target.value)}
                      placeholder="Cyber Crime PS Hyderabad"
                      className="input-field text-xs text-white mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Sections of Law</label>
                    <input
                      type="text"
                      defaultValue="IPC 420, IPC 120B, Sec 66D IT Act"
                      className="input-field text-xs text-slate-300 mt-1 w-full"
                    />
                  </div>
                </div>
              )}

              {uploadCategory === 'cdr' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Caller Phone</label>
                    <input
                      type="text"
                      value={extractedFromPhone}
                      onChange={e => setExtractedFromPhone(e.target.value)}
                      className="input-field text-xs font-mono text-emerald-300 mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Recipient Phone</label>
                    <input
                      type="text"
                      value={extractedToPhone}
                      onChange={e => setExtractedToPhone(e.target.value)}
                      className="input-field text-xs font-mono text-emerald-300 mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Tower Location</label>
                    <input
                      type="text"
                      value={extractedLocation}
                      onChange={e => setExtractedLocation(e.target.value)}
                      className="input-field text-xs text-white mt-1 w-full"
                    />
                  </div>
                </div>
              )}

              {uploadCategory === 'financial' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Debit Account</label>
                    <input
                      type="text"
                      defaultValue="ACC-4891"
                      className="input-field text-xs font-mono text-blue-300 mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Beneficiary Account</label>
                    <input
                      type="text"
                      defaultValue="ACC-9902"
                      className="input-field text-xs font-mono text-blue-300 mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Amount (₹)</label>
                    <input
                      type="number"
                      value={extractedAmount}
                      onChange={e => setExtractedAmount(e.target.value)}
                      className="input-field text-xs font-mono font-bold text-emerald-400 mt-1 w-full"
                    />
                  </div>
                </div>
              )}

              {uploadCategory === 'cctv' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Camera Identifier</label>
                    <input
                      type="text"
                      defaultValue="CAM-04"
                      className="input-field text-xs font-mono text-cyan-300 mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Location</label>
                    <input
                      type="text"
                      value={extractedLocation}
                      onChange={e => setExtractedLocation(e.target.value)}
                      className="input-field text-xs text-white mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Detected Object / Plate</label>
                    <input
                      type="text"
                      value={extractedPlate}
                      onChange={e => setExtractedPlate(e.target.value)}
                      className="input-field text-xs font-mono text-amber-300 mt-1 w-full"
                    />
                  </div>
                </div>
              )}

              {uploadCategory === 'location' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Location Name</label>
                    <input
                      type="text"
                      value={extractedLocation}
                      onChange={e => setExtractedLocation(e.target.value)}
                      className="input-field text-xs text-white mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400">Associated Person / Entity</label>
                    <input
                      type="text"
                      value={extractedSuspect}
                      onChange={e => setExtractedSuspect(e.target.value)}
                      className="input-field text-xs text-white mt-1 w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-400">
                Destination Case: <strong className="text-cyan-300">{activeCase?.case_number || 'Global Investigation Universe'}</strong>
              </span>
              <button
                onClick={handleFileUpload}
                disabled={uploading || !uploadFile}
                className={clsx('btn-primary flex items-center gap-2 text-xs px-6 py-2.5 shadow-lg shadow-accent-500/20', (uploading || !uploadFile) && 'opacity-50 cursor-not-allowed')}
              >
                {uploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Ingestion Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Ingest & Extract {uploadCategory.toUpperCase()} Entities</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pipeline Progress Indicator */}
          {uploading && (
            <div className="glass-card p-6 space-y-4 animate-fade-in border border-cyan-500/30">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-white">Live Ingestion & Normalization Trace</div>
                <span className="badge badge-cyan text-[10px]">Stage {uploadStage + 1} of {UPLOAD_PIPELINE_STAGES.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {UPLOAD_PIPELINE_STAGES.map((stg, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'p-2.5 rounded-lg border text-xs flex items-center gap-2 transition-all',
                      i < uploadStage
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : i === uploadStage
                        ? 'bg-accent-500/15 border-accent-500/50 text-white font-semibold animate-pulse'
                        : 'bg-white/5 border-white/5 text-slate-600'
                    )}
                  >
                    <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-mono">
                      {i < uploadStage ? '✓' : i + 1}
                    </span>
                    <span className="truncate">{stg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Result & Quick Action Links */}
          {uploadResult && (
            <div className="glass-card p-6 border border-emerald-500/40 space-y-4 animate-fade-in shadow-xl bg-emerald-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{uploadResult.message}</span>
                </div>
                {activeCase && (
                  <span className="badge badge-green text-xs font-mono">
                    ✓ Linked to {activeCase.case_number}
                  </span>
                )}
              </div>

              {/* Extracted Entities Chips */}
              {uploadResult.extracted_entities?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-surface-1/90 border border-white/10 space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Newly Extracted Entities Added to Graph:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uploadResult.extracted_entities.map((ent: any, ei: number) => (
                      <div key={ei} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 flex items-center gap-2 text-xs">
                        <span className="badge badge-cyan text-[10px] uppercase">{ent.type}</span>
                        <span className="font-bold text-white">{ent.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {ent.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-surface-1">
                  <div className="text-slate-400 text-[10px]">Records Parsed</div>
                  <div className="text-white font-bold font-mono text-sm mt-0.5">{uploadResult.record?.records_parsed}</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-1">
                  <div className="text-slate-400 text-[10px]">Entities Extracted</div>
                  <div className="text-cyan-300 font-bold font-mono text-sm mt-0.5">{uploadResult.record?.entities_extracted}</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-1">
                  <div className="text-slate-400 text-[10px]">Relationships Formed</div>
                  <div className="text-accent-300 font-bold font-mono text-sm mt-0.5">{uploadResult.record?.relationships_extracted}</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-1">
                  <div className="text-slate-400 text-[10px]">Ingestion Confidence</div>
                  <div className="text-emerald-400 font-bold font-mono text-sm mt-0.5">{Math.round((uploadResult.record?.quality_score || 0.98) * 100)}%</div>
                </div>
              </div>

              {/* Quick Navigation Action Buttons */}
              <div className="pt-2 border-t border-white/10 flex flex-wrap gap-3">
                <a
                  href="/"
                  className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-2"
                >
                  <Network className="w-4 h-4" />
                  <span>Explore in Network Graph</span>
                </a>
                <a
                  href="/timeline"
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 text-xs font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  <span>View in Case Timeline</span>
                </a>
                <a
                  href="/locations"
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 border border-purple-500/30 text-xs font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  <span>View in Spatial Map</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: PUBLIC REGISTRY */}
      {activeTab === 'registry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="section-header">
              <BookOpen className="w-3.5 h-3.5 text-accent-400" />
              Legitimate Research Benchmark Datasets (Module Validation)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {datasets.map(ds => {
                const isSelected = selectedDataset?.dataset_id === ds.dataset_id;
                return (
                  <div
                    key={ds.dataset_id}
                    onClick={() => setSelectedDataset(ds)}
                    className={clsx(
                      'glass-card p-5 border cursor-pointer transition-all hover:brightness-110 flex flex-col justify-between',
                      isSelected ? 'border-accent-500/60 shadow-lg ring-1 ring-accent-500/30' : 'border-white/10'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="badge badge-blue text-[10px] font-mono">{ds.namespace_prefix}</span>
                        <span className="badge badge-green text-[10px]">{Math.round((ds.recency_score || 0.95) * 100)}% Recency</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{ds.dataset_name}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">{ds.intended_module}</p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[10px]">{ds.license}</span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedDataset(ds);
                          setActiveTab('processing');
                          if (ds.dataset_id) handleProcess(ds.dataset_id);
                        }}
                        className="btn-primary text-[10px] px-2.5 py-1 flex items-center gap-1"
                      >
                        <Play className="w-2.5 h-2.5" /> Run Adapter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dataset Details Sidebar */}
          {selectedDataset && (
            <div className="glass-card p-5 space-y-4 self-start">
              <div className="border-b border-white/10 pb-3">
                <span className="badge badge-blue text-[10px] mb-2">{selectedDataset.namespace_prefix}</span>
                <h3 className="text-base font-bold text-white">{selectedDataset.dataset_name}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedDataset.intended_module}</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Official Source</span>
                  <span className="text-slate-200 text-right">{selectedDataset.official_source}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">License</span>
                  <span className="text-emerald-400">{selectedDataset.license}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Collection Period</span>
                  <span className="text-slate-200">{selectedDataset.collection_period}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Namespace Prefix</span>
                  <span className="text-cyan-300 font-mono">{selectedDataset.namespace_prefix}</span>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-[11px] font-semibold text-slate-300 mb-1">Attribution & Citation:</div>
                <p className="text-[10px] text-slate-400 font-mono bg-black/30 p-2.5 rounded border border-white/5 leading-relaxed">
                  {selectedDataset.attribution}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ADAPTER PIPELINE */}
      {activeTab === 'processing' && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-accent-400" />
                Public Benchmark Adapter Execution Trace
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifies schema isolation, entity extraction, and metrics on isolated research benchmarks.
              </p>
            </div>
            {processingId && (
              <span className="badge badge-cyan text-xs font-mono">Dataset: {processingId}</span>
            )}
          </div>

          {/* 6-Stage Progress Track */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            {ADAPTER_STAGES.map((stg, i) => (
              <div
                key={i}
                className={clsx(
                  'p-3 rounded-lg border text-xs flex flex-col justify-between gap-2 transition-all',
                  i < processingStage
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : i === processingStage
                    ? 'bg-accent-500/15 border-accent-500/50 text-white font-semibold ring-1 ring-accent-500/30'
                    : 'bg-white/5 border-white/5 text-slate-600'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-mono">
                    {i < processingStage ? '✓' : i + 1}
                  </span>
                </div>
                <span className="text-[11px] leading-tight">{stg}</span>
              </div>
            ))}
          </div>

          {/* Execution Output */}
          {processingResult && (
            <div className="p-4 rounded-lg bg-surface-1 border border-white/10 space-y-3 animate-fade-in text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Adapter Result: {processingResult.dataset_name}</span>
                <span className="badge badge-green text-[10px]">Namespace: {processingResult.namespace_prefix}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-2.5 rounded bg-black/20">
                  <div className="text-slate-400 text-[10px]">Entities Extracted</div>
                  <div className="text-white font-bold font-mono mt-0.5">{processingResult.entities_extracted}</div>
                </div>
                <div className="p-2.5 rounded bg-black/20">
                  <div className="text-slate-400 text-[10px]">Relationships Formed</div>
                  <div className="text-cyan-300 font-bold font-mono mt-0.5">{processingResult.relationships_extracted}</div>
                </div>
                <div className="p-2.5 rounded bg-black/20">
                  <div className="text-slate-400 text-[10px]">Temporal Precision</div>
                  <div className="text-accent-300 font-bold font-mono mt-0.5">{processingResult.temporal_precision}</div>
                </div>
                <div className="p-2.5 rounded bg-black/20">
                  <div className="text-slate-400 text-[10px]">Cross-Dataset Linkage</div>
                  <div className="text-emerald-400 font-bold font-mono mt-0.5">{processingResult.cross_dataset_linkage}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: INTERCONNECTED EVIDENCE SAMPLES DOWNLOAD CENTER */}
      {activeTab === 'samples' && (
        <div className="space-y-6 animate-fade-in">
          {/* Master Download Hero Banner */}
          <div className="glass-card p-6 border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-blue-950/40 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="badge badge-cyan text-xs font-mono py-0.5 px-2">
                    <Link2 className="w-3 h-3 mr-1 inline" /> 100% INTERCONNECTED DATASET
                  </span>
                  <span className="badge badge-green text-xs font-mono py-0.5 px-2">
                    READY FOR ANPR & DISCOVERY
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Download Interconnected Evidence Files for Investigation
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  All downloadable input files are strictly cross-referenced with identical names, phone numbers, vehicle registration plates, bank account numbers, timestamps, and camera locations. Ingesting any or all of these files into the system instantly proves multi-hop syndicates in <strong className="text-cyan-300 font-mono">Find Connection</strong> and the <strong className="text-cyan-300 font-mono">Network Graph</strong>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-shrink-0">
                <a
                  href={getDownloadAllEvidenceZipUrl()}
                  download
                  className="btn-primary text-xs px-5 py-3 flex items-center justify-center gap-2 font-bold shadow-lg shadow-cyan-500/25 cursor-pointer"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>Download All Files (.ZIP)</span>
                </a>
              </div>
            </div>
          </div>

          {/* Interconnection Intelligence Flow Overview */}
          <div className="glass-card p-5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                <span>Interconnected Syndicate Topology (Target Concentration: 2 Primary Hubs)</span>
              </div>
              <span className="badge badge-amber text-[10px] font-mono">CONCENTRATED HIGH-DEGREE HUBS</span>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
              <div className="font-bold flex items-center gap-2 mb-1">
                <span>🎯 Core Syndicate Hierarchy:</span>
                <span className="badge badge-green text-[9px]">2 Main Targets</span>
              </div>
              <span>
                <strong>Vikram Malhotra (Kingpin / Mastermind, p-001)</strong> coordinates high-value fraud, luxury front vehicles, and receives royalty kickbacks. <strong>Suresh Babu (Chief Hawala Operator & Broker, p-002)</strong> serves as the central operational conduit connecting all shell accounts, couriers, ATMs, and rendezvous points. All other individuals (Complainant Dr. Rao, Courier-1, Mule-2) are low-connection leaf nodes.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 pt-1">
              <div className="p-3 rounded-lg bg-black/40 border border-rose-500/20 text-xs space-y-1.5">
                <div className="font-bold text-rose-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> 1. FIR (0492/2026)
                </div>
                <p className="text-[11px] text-slate-300">
                  Names <strong>Vikram Malhotra</strong> (Kingpin) & <strong>Suresh Babu</strong> (Chief Broker) defrauding Dr. Rajeshwar Rao of ₹4.5L.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-black/40 border border-emerald-500/20 text-xs space-y-1.5">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> 2. Telecom CDR
                </div>
                <p className="text-[11px] text-slate-300">
                  High-frequency calls between <strong>+91-9876543210</strong> (Vikram) & <strong>+91-9988776655</strong> (Suresh) coordinating ATM drops.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-black/40 border border-amber-500/20 text-xs space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" /> 3. Vehicle ANPR
                </div>
                <p className="text-[11px] text-slate-300">
                  Tracks Black Scorpio <strong>TS 09 EA 2758</strong> (Vikram) and White Innova <strong>MH EE 2388</strong> (Suresh) across CAM-01, 04, 17, 22.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-black/40 border border-blue-500/20 text-xs space-y-1.5">
                <div className="font-bold text-blue-300 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> 4. Bank Ledger
                </div>
                <p className="text-[11px] text-slate-300">
                  ₹4.5L money trail: Victim → <strong>Apex Exports</strong> → <strong>Suresh Babu</strong> (Axis) → ATM & <strong>Vikram</strong> (HDFC royalty).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/20 text-xs space-y-1.5">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" /> 5. CCTV Sightings
                </div>
                <p className="text-[11px] text-slate-300">
                  Surveillance of physical meetings and ATM cashout between Suresh Babu, Vikram Malhotra, and Courier-1.
                </p>
              </div>
            </div>
          </div>

          {/* Individual Downloadable File Cards Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Individual Evidence Files ({sampleFiles.length || 7} Files Available)
              </h4>
              <span className="text-xs text-slate-400">Click Download on any card or download the complete bundle</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(sampleFiles.length > 0 ? sampleFiles : [
                {
                  id: "cdr-sample-1",
                  name: "1. Telecom CDR Call Detail Records",
                  filename: "1_telecom_cdr_records.csv",
                  format: "CSV",
                  type: "CDR Records",
                  size_kb: 1.59,
                  description: "Correlated telecom records connecting Mastermind Vikram Malhotra (+91-9876543210) and Broker Suresh Babu (+91-9988776655) to victim Dr. Rao and field couriers across Jubilee Hills and Madhapur cell towers.",
                  interconnected_entities: ["Vikram Malhotra (+91-9876543210)", "Suresh Babu (+91-9988776655)", "Dr. Rajeshwar Rao (+91-9811002233)", "Ramesh Kumar (+91-9123456789)", "TWR-HYD-01", "TWR-HYD-04", "TWR-HYD-09", "TWR-HYD-16"]
                },
                {
                  id: "bank-sample-2",
                  name: "2. Bank & Hawala Financial Ledger",
                  filename: "2_bank_financial_ledger.csv",
                  format: "CSV",
                  type: "Financial Records",
                  size_kb: 1.06,
                  description: "Multi-tier financial money trail tracing ₹4.5L from Victim Escrow -> Apex Exports ICICI-1102938475 -> Suresh Babu AXIS-9920192837 -> Courier Cashout and Vikram Malhotra HDFC-8829103948 royalty.",
                  interconnected_entities: ["ICICI-1102938475 (Apex Exports)", "AXIS-9920192837 (Suresh Babu)", "HDFC-8829103948 (Vikram Malhotra)", "CASH-ACC-001 (Courier-1)", "HDFC-9911002233 (Victim)"]
                },
                {
                  id: "cctv-sample-3",
                  name: "3. CCTV ANPR Camera Feed Sightings",
                  filename: "3_cctv_anpr_camera_feed.csv",
                  format: "CSV",
                  type: "Vehicle ANPR",
                  size_kb: 0.96,
                  description: "ANPR plate captures tracing Black Scorpio TS09EA2758 (Vikram), White Innova MH EE 2388 (Suresh), and Skoda Octavia GA 05 F 0888 across CAM-01, CAM-04, CAM-17, CAM-22.",
                  interconnected_entities: ["TS 09 EA 2758 (Vikram)", "MH EE 2388 (Suresh)", "GA 05 F 0888 (Suresh)", "CAM-01 Jubilee Hills", "CAM-17 Madhapur"]
                },
                {
                  id: "fir-sample-4",
                  name: "4. Police First Information Report (FIR)",
                  filename: "4_police_fir_incident_report.txt",
                  format: "TXT",
                  type: "FIR / Police Report",
                  size_kb: 3.7,
                  description: "Telangana State Cyber Crime PS FIR/CYB/2026/0492 under IPC 420, 120B, 406 & Sec 66D IT Act naming Vikram Malhotra (Kingpin), Suresh Babu (Chief Broker), Apex Exports, and Dr. Rajeshwar Rao.",
                  interconnected_entities: ["Vikram Malhotra (p-001)", "Suresh Babu (p-002)", "Dr. Rajeshwar Rao", "Apex Exports & Logistics", "TS 09 EA 2758"]
                },
                {
                  id: "rto-sample-5",
                  name: "5. National Vahan RTO Vehicle Registry",
                  filename: "5_vahan_rto_vehicle_registry.csv",
                  format: "CSV",
                  type: "Vehicle Registry",
                  size_kb: 0.98,
                  description: "Statutory RTO vehicle database showing ownership for Suresh Babu and Vikram Malhotra, plus the stolen/mismatch flag on TS 09 EA 2758 (RTO White Sedan vs CCTV Black SUV).",
                  interconnected_entities: ["TS 09 EA 2758 (FLAGGED STOLEN/SUSPENDED)", "MH EE 2388 (Suresh Babu)", "GA 05 F 0888 (Suresh Babu)", "TS 09 AB 1234 (Vikram Malhotra)"]
                },
                {
                  id: "surveillance-sample-6",
                  name: "6. CCTV Facial & Physical Surveillance",
                  filename: "6_cctv_facial_surveillance.csv",
                  format: "CSV",
                  type: "Surveillance Logs",
                  size_kb: 0.92,
                  description: "Surveillance observations of physical package handovers and ATM cashouts between Suresh Babu, Vikram Malhotra, and Courier-1 at Madhapur and Jubilee Hills.",
                  interconnected_entities: ["Vikram Malhotra (p-001)", "Suresh Babu (p-002)", "Ramesh Kumar (Courier-1)", "Axis Bank ATM Madhapur", "CAM-17 Madhapur"]
                },
                {
                  id: "bundle-json-sample-7",
                  name: "7. Master Interconnected Evidence Bundle",
                  filename: "Master_Investigation_Evidence_Bundle.json",
                  format: "JSON",
                  type: "Unified Dossier",
                  size_kb: 2.59,
                  description: "Full cross-referenced evidence dossier with node degree hierarchy concentrating high connections on Vikram Malhotra and Suresh Babu.",
                  interconnected_entities: ["Vikram Malhotra (11 connections)", "Suresh Babu (14 connections)", "Peripheral Mules & Accounts"]
                }
              ]).map((file: any) => {
                const isCsv = file.filename.endsWith('.csv');
                const isJson = file.filename.endsWith('.json');
                const isTxt = file.filename.endsWith('.txt');

                const getIcon = () => {
                  if (file.filename.includes('FIR')) return FileText;
                  if (file.filename.includes('CDR')) return Phone;
                  if (file.filename.includes('Vehicle')) return Car;
                  if (file.filename.includes('Bank') || file.filename.includes('Hawala')) return DollarSign;
                  if (file.filename.includes('CCTV')) return Video;
                  return Network;
                };
                const IconComponent = getIcon();

                return (
                  <div
                    key={file.id || file.filename}
                    className="glass-card p-4 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between gap-4 group hover:shadow-lg hover:shadow-cyan-500/10"
                  >
                    <div className="space-y-3">
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 group-hover:scale-105 transition-all">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-white leading-tight">
                              {file.name}
                            </h5>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {file.filename}
                            </span>
                          </div>
                        </div>
                        <span className={clsx(
                          "badge text-[9px] font-mono py-0.5 px-1.5",
                          isCsv ? "badge-green" : isJson ? "badge-blue" : "badge-amber"
                        )}>
                          {file.format || (isCsv ? 'CSV' : isJson ? 'JSON' : 'TXT')}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                        {file.description}
                      </p>

                      {/* Interconnected Entities */}
                      {file.interconnected_entities && file.interconnected_entities.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                            Cross-Linked Entities:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {file.interconnected_entities.slice(0, 4).map((ent: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-slate-800/80 border border-white/10 px-1.5 py-0.5 rounded text-cyan-200 font-mono"
                              >
                                {ent}
                              </span>
                            ))}
                            {file.interconnected_entities.length > 4 && (
                              <span className="text-[10px] bg-slate-800/80 border border-white/10 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                                +{file.interconnected_entities.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {file.size_kb ? `${file.size_kb} KB` : 'Ready'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={getSampleEvidenceDownloadUrl(file.filename)}
                          download
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 hover:text-white text-xs font-semibold border border-cyan-500/40 hover:border-cyan-400 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STRATEGY MATRIX */}
      {activeTab === 'comparisons' && (
        <div className="glass-card p-6 space-y-4">
          <div className="section-header">
            <Award className="w-3.5 h-3.5 text-accent-400" />
            Dataset Evaluation & Selection Strategy Matrix
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="pb-3 font-semibold">Analytical Module</th>
                  <th className="pb-3 font-semibold">Selected Dataset</th>
                  <th className="pb-3 font-semibold">Candidate Alternative</th>
                  <th className="pb-3 font-semibold">Selection Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {comparisons.map((c, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-medium text-white">{c.module}</td>
                    <td className="py-3 text-cyan-300 font-mono">{c.selected}</td>
                    <td className="py-3 text-slate-400">{c.alternative}</td>
                    <td className="py-3 text-slate-300 leading-relaxed max-w-md">{c.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dataset Entry Modal */}
      <DatasetEntryModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          fetchDatasetsSummary().then(setDatasetSummary).catch(console.error);
        }}
      />
    </div>
  );
}
