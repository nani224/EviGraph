// ─────────────────────────────────────────────────────────
// TypeScript types for SIH 2026 Intelligence System
// ─────────────────────────────────────────────────────────

export type EntityType = 'person' | 'phone' | 'vehicle' | 'account' | 'location' | 'organization' | 'event';
export type RelationshipType = 'CALLED' | 'MET' | 'USED' | 'VISITED' | 'TRANSFERRED' | 'SEEN_AT' | 'INVOLVED_IN' | 'MEMBER_OF' | 'OWNS' | 'COMMUNICATED_WITH' | 'SEEN_WITH' | 'REGISTERED_TO' | 'LINKED_TO' | string;
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type VerificationStatus = 'pending' | 'relevant' | 'mark_relevant' | 'reject' | 'uncertain' | 'needs_review';
export type CaseStatus = 'active' | 'closed' | 'pending';

// ─── Entities ────────────────────────────────────────────
export interface Entity {
  id: string;
  type: EntityType;
  label: string;
  name?: string;
  aliases?: string[];
  dob?: string;
  gender?: string;
  role?: string;
  number?: string;  // phone
  plate?: string;   // vehicle
  make?: string;
  model?: string;
  color?: string;
  bank?: string;
  lat?: number;
  lon?: number;
  confidence?: number;
}

// ─── Relationships / Graph edges ──────────────────────────
export interface Relationship {
  from: string;
  to: string;
  rel_type: RelationshipType;
  confidence: number;
  evidence_ids: string[];
  source: string;
  timestamp?: string;
  amount?: number;
  notes?: string;
}

// ─── Graph nodes for React Flow ───────────────────────────
export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    entity: Entity;
    label: string;
    entityType: EntityType;
    community?: number;
    centrality?: number;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
  data?: {
    rel_type: RelationshipType;
    confidence: number;
    evidence_ids: string[];
    source: string;
  };
}

// ─── Path Discovery ───────────────────────────────────────
export interface PathHop {
  from_id: string;
  from_label: string;
  to_id: string;
  to_label: string;
  relationship: RelationshipType;
  confidence: number;
  evidence_ids: string[];
  source: string;
  timestamp?: string;
}

export interface EvidenceChainItem {
  hop_index: number;
  evidence_id: string;
  rel_type: RelationshipType;
  source: string;
  confidence: number;
  from_label: string;
  to_label: string;
}

export interface DiscoveredPath {
  rank: number;
  path: string[];
  score: number;
  relevance_pct: number;
  hops: PathHop[];
  evidence_chain: EvidenceChainItem[];
  hop_count: number;
  ranking_explanation: string[];
}

// ─── Anomaly ──────────────────────────────────────────────
export interface Anomaly {
  id: string;
  entity_id: string;
  entity_name: string;
  entity_label?: string;
  anomaly_score?: number;
  type: string;
  severity: SeverityLevel;
  detected_at: string;
  description: string;
  before_value: number;
  after_value: number;
  metric: string;
  unit: string;
  change_pct: number;
  period: string;
  baseline_period: string;
  contributing_factors: string[];
  status: VerificationStatus | 'pending';
  algorithm: string;
  source: string;
}

// ─── Contradiction ────────────────────────────────────────
export interface ContradictionRecord {
  source_type: string;
  record_id: string;
  timestamp: string;
  field: string;
  value: string;
}

export interface Contradiction {
  id: string;
  type: string;
  entity_id: string;
  entity_label: string;
  severity: SeverityLevel;
  detected_at: string;
  description: string;
  records: ContradictionRecord[];
  status: 'unresolved' | 'resolved' | 'needs_investigation';
}

// ─── Entity Resolution ────────────────────────────────────
export interface ResolutionEvidence {
  type: string;
  description: string;
  weight: number;
}

export interface ResolutionCandidate {
  id: string;
  entity_a: { id: string; name: string; source: string };
  entity_b: { id: string; name: string; source: string };
  confidence: number;
  status: string;
  evidence: ResolutionEvidence[];
}

// ─── CCTV / Video ─────────────────────────────────────────
export interface CCTVObservation {
  id: string;
  camera_id: string;
  camera_name?: string;
  timestamp: string;
  object_type: string;
  vehicle_id?: string;
  plate_detected?: string | null;
  plate_confidence: number;
  vehicle_color_observed: string;
  vehicle_type_observed: string;
  tracking_id: string;
  detection_confidence: number;
  notes: string;
  source: string;
  in_graph?: boolean;
  location_name?: string;
  location_lat?: number;
  location_lon?: number;
}

// ─── Data Sources ─────────────────────────────────────────
export interface DataSource {
  id: string;
  name: string;
  type: string;
  records: number;
  records_count?: number;
  entities_extracted: number;
  relationships_extracted: number;
  quality_score: number;
  last_processed: string;
  status: 'processed' | 'processing' | 'error' | 'pending';
  errors: number;
}

// ─── Evidence Integrity & Blockchain ──────────────────────
export interface EvidenceIntegrity {
  id?: string;
  evidence_id: string;
  case_id?: string;
  sha256: string;
  hash_algorithm: string;
  storage_uri?: string;
  fabric_tx_id?: string;
  fabric_block_number?: number;
  recorded_at?: string;
  verified_at?: string;
  integrity_status: 'VERIFIED' | 'TAMPERED' | 'PENDING';
  blockchain_status: 'RECORDED' | 'PENDING';
  evidence_type?: string;
  metadata?: Record<string, any>;
  expected_sha256?: string;
  actual_sha256?: string;
  is_tampered?: boolean;
}

export interface IntegritySummary {
  total_evidence_records: number;
  sha256_registered: number;
  fabric_anchored: number;
  verified: number;
  tampered: number;
  pending: number;
  blockchain_mode: string;
  blockchain_healthy: boolean;
}

// ─── Evidence ─────────────────────────────────────────────
export interface Evidence {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  description: string;
  confidence: number;
  verification_status?: VerificationStatus;
  integrity?: EvidenceIntegrity;
  sha256?: string;
  integrity_status?: 'VERIFIED' | 'TAMPERED' | 'PENDING';
  blockchain_status?: 'RECORDED' | 'PENDING';
  fabric_tx_id?: string;
  fabric_block_number?: number;
  storage_uri?: string;
}

// ─── Case ─────────────────────────────────────────────────
export interface Case {
  id: string;
  case_number: string;
  title: string;
  description?: string;
  primary_entity: string;
  status: CaseStatus;
  created_at?: string;
  opened_date?: string;
  end_date?: string;
  updated_at?: string;
  investigator?: string;
  lead_investigator?: string;
  related_entities: string[];
  findings_count?: number;
  anomalies_count?: number;
  evidence_count?: number;
  notes?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  datasets_enabled?: string[];
}

// ─── Dashboard ────────────────────────────────────────────
export interface DashboardStats {
  active_cases: number;
  entities_in_graph: number;
  relationships_discovered: number;
  anomalies_detected: number;
  evidence_items: number;
  contradictions: number;
  data_sources_healthy: number;
  node_types: Record<string, number>;
  relationship_types: Record<string, number>;
  data_sources: DataSource[];
  recent_anomalies: Anomaly[];
  cases: Case[];
}

// ─── AI Chat ──────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  confidence?: number;
  evidence_ids?: string[];
  evidence_types?: string[];
  quick_actions?: string[];
  caveat?: string;
  defaultVoice?: boolean;
}

// ─── Analytics ────────────────────────────────────────────
export interface CentralityNode {
  id: string;
  label: string;
  type: string;
  score: number;
}

export interface Community {
  community_id: number;
  label: string;
  member_count: number;
  edge_count: number;
  members: string[];
  entity_types: string[];
}

export interface GraphAnalytics {
  total_nodes: number;
  total_edges: number;
  community_count: number;
  degree_centrality: CentralityNode[];
  betweenness_centrality: CentralityNode[];
  pagerank: CentralityNode[];
  communities: Community[];
}

// ─── Timeline ─────────────────────────────────────────────
export interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  month: number;
  month_label: string;
  description: string;
  source: string;
}

export interface MonthlySummary {
  month: number;
  month_label: string;
  total_events: number;
  cdr_events: number;
  financial_events: number;
  location_events: number;
}

// ─── Investigator Decision ────────────────────────────────
export interface InvestigatorDecision {
  id: string;
  finding_id: string;
  finding_type: string;
  decision: string;
  notes: string;
  investigator: string;
  timestamp: string;
}

// ─── Data Mode & Dataset Registry ────────────────────────
export type DataMode = 'public_research' | 'synthetic_investigation';

export interface DatasetScores {
  recency: number;
  data_quality: number;
  annotation_quality: number;
  relevance_to_sih: number;
  license_clarity: number;
  timestamp_fidelity: number;
  overall_score: number;
}

export interface DatasetRegistryItem {
  id?: string;
  dataset_id?: string;
  name?: string;
  dataset_name?: string;
  intended_module?: string;
  domain?: string;
  official_source?: string;
  source_url?: string;
  license?: string;
  attribution?: string;
  attribution_requirement?: string;
  intended_purpose?: string;
  namespace?: string;
  namespace_prefix?: string;
  collection_period?: string;
  recency_score?: number;
  recommended?: boolean;
  recommendation_reason?: string;
  record_count?: number;
  fields?: string[];
  timestamps?: {
    available: boolean;
    fidelity: string;
    type: string;
  };
  location_precision?: string;
  identity_privacy?: string;
  cross_linkable?: boolean;
  scores?: DatasetScores;
  status?: string;
}

export interface DatasetComparison {
  module: string;
  candidate?: string;
  selected?: string;
  alternative?: string;
  rationale?: string;
  year?: number;
  focus?: string;
  license?: string;
  status?: string;
  reason?: string;
}

export interface ModuleValidationReport {
  timestamp: string;
  mode: string;
  total_modules: number;
  total_processing_time_ms: number;
  module_results: Record<string, {
    dataset_id: string;
    dataset_name: string;
    status: string;
    records_evaluated: number;
    entities_extracted: number;
    relationships_extracted: number;
    processing_time_ms: number;
    metrics: Record<string, any>;
    sample_entities: any[];
    sample_relationships: any[];
  }>;
}

export interface EndToEndValidationReport {
  timestamp: string;
  mode: string;
  overall_status: string;
  stages_passed: number;
  total_stages: number;
  total_duration_ms: number;
  key_finding_recovered: {
    target_path: string[];
    path_hops: number;
    composite_confidence: number;
    verification_status: string;
  };
  stages: Array<{
    stage: number;
    name: string;
    status: string;
    details: string;
    duration_ms: number;
    [key: string]: any;
  }>;
}
