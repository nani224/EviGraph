import axios from 'axios';
import type { LoginResponse, MeResponse, SecurityOverview } from '../types/auth';

const BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('evigraph_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token expiration / unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('evigraph_auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Authentication & RBAC ─────────────────────────────
export const loginUser = (username: string, password: string): Promise<LoginResponse> =>
  api.post('/api/auth/login', { username, password }).then(r => r.data);

export const fetchCurrentUser = (): Promise<MeResponse> =>
  api.get('/api/auth/me').then(r => r.data);

export const logoutUser = () =>
  api.post('/api/auth/logout').then(r => r.data);

// ─── Admin Management API ──────────────────────────────
export const fetchAdminUsers = () =>
  api.get('/api/admin/users').then(r => r.data);

export const createAdminUser = (data: {
  username: string;
  email: string;
  password: string;
  role?: string;
  full_name?: string;
  badge_number?: string;
}) => api.post('/api/admin/users', data).then(r => r.data);

export const updateAdminUserStatus = (userId: string, isActive: boolean) =>
  api.patch(`/api/admin/users/${userId}/status`, { is_active: isActive }).then(r => r.data);

export const resetAdminUserPassword = (userId: string, newPassword: string) =>
  api.post(`/api/admin/users/${userId}/reset-password`, { new_password: newPassword }).then(r => r.data);

export const fetchAdminCases = () =>
  api.get('/api/admin/cases').then(r => r.data);

export const assignCaseToUser = (caseId: string, userId: string) =>
  api.post(`/api/admin/cases/${caseId}/assign`, { user_id: userId }).then(r => r.data);

export const unassignCaseFromUser = (caseId: string, userId: string) =>
  api.post(`/api/admin/cases/${caseId}/unassign`, { user_id: userId }).then(r => r.data);

export const fetchAdminAuditLogs = (params?: { limit?: number; action?: string; user_id?: string; case_id?: string }) =>
  api.get('/api/admin/audit-logs', { params }).then(r => r.data);

export const fetchAdminSecurityOverview = (): Promise<SecurityOverview> =>
  api.get('/api/admin/security-overview').then(r => r.data);

// ─── Dashboard ─────────────────────────────────────────
export const fetchDashboardStats = () => api.get('/api/dashboard/stats').then(r => r.data);
export const fetchOverviewGraph  = () => api.get('/api/dashboard/overview-graph').then(r => r.data);
export const fetchDashboardLeads = () => api.get('/api/dashboard/leads').then(r => r.data);
export const fetchAISuggestions  = () => api.get('/api/ai/suggestions').then(r => r.data);
export const fetchSettings       = () => api.get('/api/settings').then(r => r.data);
export const updateSettings      = (data: any) => api.post('/api/settings', data).then(r => r.data);

// ─── Entities ──────────────────────────────────────────
export const fetchEntities   = (type?: string, q?: string, caseId?: string) =>
  api.get('/api/entities', { params: { type, q, case_id: caseId } }).then(r => r.data);
export const searchEntities  = (q: string, type?: string, caseId?: string) =>
  api.get('/api/entities/search', { params: { q, type, case_id: caseId } }).then(r => r.data);
export const fetchEntity     = (id: string) =>
  api.get(`/api/entities/${id}`).then(r => r.data);

// ─── Graph ─────────────────────────────────────────────
export const fetchSubgraph   = (entityId: string, radius?: number) =>
  api.get('/api/graph/subgraph', { params: { entity_id: entityId, radius } }).then(r => r.data);
export const fetchAnalytics  = (caseId?: string) =>
  api.get('/api/graph/analytics', { params: { case_id: caseId } }).then(r => r.data);

export interface DiscoverPathParams {
  entity_a?: string;
  entity_b?: string;
  source_entity_id?: string;
  target_entity_id?: string;
  case_id?: string;
  max_paths?: number;
  max_hops?: number;
  min_confidence?: number;
  relationship_types?: string[];
  sources?: string[];
  date_from?: string;
  date_to?: string;
}

export const discoverPath = (entityA: string, entityB: string, maxPaths = 3) =>
  api.post('/api/graph/discover-path', { entity_a: entityA, entity_b: entityB, max_paths: maxPaths }).then(r => r.data);

export const discoverPathAdvanced = (params: DiscoverPathParams) =>
  api.post('/api/graph/discover-path', params).then(r => r.data);

export const whatIfRemove = (nodeId: string) =>
  api.post('/api/graph/what-if', { node_id: nodeId }).then(r => r.data);

// ─── Data Sources & Uploads ────────────────────────────
export const fetchDataSources   = () => api.get('/api/datasources').then(r => r.data);
export const fetchSourceRecords = (id: string) => api.get(`/api/datasources/${id}/records`).then(r => r.data);
export const uploadDatasourceFile = (data: {
  filename: string;
  file_type: string;
  file_size_bytes: number;
  category?: string;
  extracted_data?: Record<string, any>;
  content_summary?: string;
  case_id?: string;
}) => api.post('/api/datasources/upload', data).then(r => r.data);

// ─── Resolution ────────────────────────────────────────
export const fetchCandidates     = (status?: string, caseId?: string) =>
  api.get('/api/resolution/candidates', { params: { status, case_id: caseId } }).then(r => r.data);
export const submitResolution    = (candidateId: string, decision: string) =>
  api.post('/api/resolution/decide', { candidate_id: candidateId, decision }).then(r => r.data);

// ─── Anomalies ─────────────────────────────────────────
export const fetchAnomalies  = (status?: string, caseId?: string) =>
  api.get('/api/anomalies', { params: { status, case_id: caseId } }).then(r => r.data);
export const updateAnomaly   = (id: string, status: string, notes = '') =>
  api.patch(`/api/anomalies/${id}`, { status, notes }).then(r => r.data);

// ─── Contradictions ────────────────────────────────────
export const fetchContradictions  = () => api.get('/api/contradictions').then(r => r.data);
export const updateContradiction  = (id: string, status: string, notes = '') =>
  api.patch(`/api/contradictions/${id}`, { status, notes }).then(r => r.data);

// ─── Location Intelligence ─────────────────────────────
export const fetchLocationIntelligence = (entityId?: string, caseId?: string) =>
  api.get('/api/locations/intelligence', { params: { entity_id: entityId, case_id: caseId } }).then(r => r.data);

// ─── Timeline / Time Events ───────────────────────────
export interface TimelineFilterParams {
  entity_id?: string;
  case_id?: string;
  event_type?: string;
  month?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
}

export const fetchTimeline = (paramsOrEntityId?: string | TimelineFilterParams) => {
  const params = typeof paramsOrEntityId === 'string'
    ? { entity_id: paramsOrEntityId }
    : (paramsOrEntityId || {});
  return api.get('/api/timeline/events', { params }).then(r => r.data);
};


// ─── CCTV & Manual Observations ────────────────────────
export const fetchCCTV          = (caseId?: string) =>
  api.get('/api/video/observations', { params: { case_id: caseId } }).then(r => r.data);
export const addObsToGraph      = (obsId: string) =>
  api.post('/api/video/add-to-graph', { observation_id: obsId }).then(r => r.data);
export const createManualObservation = (data: any) =>
  api.post('/api/observations/manual', data).then(r => r.data);

// ─── FIR ───────────────────────────────────────────────
export const fetchFIRs          = () => api.get('/api/fir/list').then(r => r.data);
export const fetchFIRExtraction = (firId: string) =>
  api.get(`/api/fir/${firId}/extracted`).then(r => r.data);

// ─── Cases ─────────────────────────────────────────────
export const fetchCases = () => api.get('/api/cases').then(r => r.data);
export const fetchCase  = (id: string) => api.get(`/api/cases/${id}`).then(r => r.data);
export const createCase = (data: any) => api.post('/api/cases', data).then(r => r.data);
export const fetchReport = (id: string) => api.get(`/api/cases/${id}/report`).then(r => r.data);
// Returns case-scoped ego subgraph (only entities linked to this case — empty for new blank cases)
export const fetchCaseGraph = (caseId: string, radius = 2) =>
  api.get(`/api/cases/${caseId}/graph`, { params: { radius } }).then(r => r.data);

// ─── Evidence & Decisions ──────────────────────────────
export const fetchEvidence  = (caseId?: string) =>
  api.get('/api/evidence', { params: { case_id: caseId } }).then(r => r.data);
export const saveDecision   = (finding_id: string, finding_type: string, decision: string, notes = '') =>
  api.post('/api/decisions', { finding_id, finding_type, decision, notes }).then(r => r.data);
export const fetchDecisions = () => api.get('/api/decisions').then(r => r.data);

// ─── Evidence Integrity & Hyperledger Fabric ───────────
export const verifyEvidenceIntegrity = (evidenceId: string, challengeContent?: string) =>
  api.post(`/api/evidence/${evidenceId}/integrity/verify`, { challenge_content: challengeContent }).then(r => r.data);

export const fetchEvidenceIntegrity = (evidenceId: string) =>
  api.get(`/api/evidence/${evidenceId}/integrity`).then(r => r.data);

export const fetchEvidenceIntegrityHistory = (evidenceId: string) =>
  api.get(`/api/evidence/${evidenceId}/integrity/history`).then(r => r.data);

export const simulateEvidenceTamper = (evidenceId: string, simulateTamper = true) =>
  api.post(`/api/evidence/${evidenceId}/integrity/tamper-test`, { simulate_tamper: simulateTamper }).then(r => r.data);

export const fetchBlockchainHealth = () =>
  api.get('/api/blockchain/health').then(r => r.data);

export const fetchBlockchainEvidence = (evidenceId: string) =>
  api.get(`/api/blockchain/evidence/${evidenceId}`).then(r => r.data);

// ─── AI Chat ───────────────────────────────────────────
export const sendChat = (message: string, session_id = 'default') =>
  api.post('/api/ai/chat', { message, session_id }).then(r => r.data);

// ─── Investigation History ─────────────────────────────
export const recordInvestigationQuery = (data: { question?: string; parameters?: any; paths_count?: number; investigator?: string }) =>
  api.post('/api/investigations/history', data).then(r => r.data);
export const fetchInvestigationHistory = () => api.get('/api/investigations/history').then(r => r.data);

// ─── Data Mode & Dataset Registry ────────────────────────
export const fetchDataMode = () => api.get('/api/data-mode').then(r => r.data);
export const setDataMode = (mode: 'public_research' | 'synthetic_investigation') =>
  api.post('/api/data-mode', { mode }).then(r => r.data);
export const fetchDatasetRegistry = () => api.get('/api/datasets/registry').then(r => r.data);
export const fetchDatasetComparisons = () => api.get('/api/datasets/comparisons').then(r => r.data);
export const fetchDatasetDetails = (id: string) => api.get(`/api/datasets/${id}`).then(r => r.data);
export const processDataset = (id: string) => api.post(`/api/datasets/process/${id}`).then(r => r.data);

// ─── Model Validation ──────────────────────────────────
export const fetchModuleValidation = () => api.get('/api/validation/modules').then(r => r.data);
export const fetchEndToEndValidation = () => api.get('/api/validation/end-to-end').then(r => r.data);

// ─── Dataset Entries ──────────────────────────────────
export const createDatasetEntry = (category: string, payload: Record<string, any>) =>
  api.post('/api/datasets/entries', { category, payload }).then(r => r.data);
export const fetchDatasetsSummary = (caseId?: string) =>
  api.get('/api/datasets/summary', { params: { case_id: caseId } }).then(r => r.data);

// ─── Automated Vision & ANPR Analysis ─────────────────
export const analyzeVehicleVision = (filename: string, imageBase64?: string) =>
  api.post('/api/vision/analyze-vehicle', { filename, image_base64: imageBase64 }, { timeout: 60000 }).then(r => r.data);

export const searchTargetVehicle = (targetPlate: string, imageBase64: string, filename?: string, caseId?: string) =>
  api.post('/api/vision/search-target-vehicle', { target_plate: targetPlate, image_base64: imageBase64, filename, case_id: caseId }, { timeout: 60000 }).then(r => r.data);

// ─── Health ────────────────────────────────────────────
export const checkHealth = () => api.get('/api/health').then(r => r.data);

// ─── Sample Evidence Datasets ──────────────────────────
export const fetchSampleEvidenceFiles = () => api.get('/api/evidence/sample-files').then(r => r.data);
export const getSampleEvidenceDownloadUrl = (filename: string) => `/api/evidence/sample-files/download/${encodeURIComponent(filename)}`;
export const getDownloadAllEvidenceZipUrl = () => '/api/evidence/sample-files/download-all';

export default api;

