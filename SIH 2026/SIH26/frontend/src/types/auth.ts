export type UserRole = 'ADMIN' | 'INVESTIGATOR' | 'ANALYST';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  full_name?: string;
  badge_number?: string;
  is_active?: boolean;
  created_at?: string;
  last_login?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
  permissions: string[];
  assigned_cases: string[];
}

export interface CaseAssignment {
  id: string;
  case_id: string;
  user_id: string;
  username: string;
  full_name: string;
  assigned_at: string;
  assigned_by: string;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  user_id?: string;
  username: string;
  role: string;
  action: string;
  case_id?: string;
  evidence_id?: string;
  result: string;
  metadata: Record<string, any>;
}

export interface SecurityOverview {
  users: {
    total: number;
    active: number;
    inactive: number;
    investigators: number;
    admins: number;
  };
  blockchain: {
    status: string;
    mode: string;
    connected: boolean;
    channel: string;
    chaincode: string;
    peer_endpoint: string;
    total_anchored_records: number;
    current_block_height: number;
    notice: string;
  };
  evidence_integrity: {
    total_evidence_records: number;
    sha256_registered: number;
    fabric_anchored: number;
    verified: number;
    tampered: number;
    pending: number;
    blockchain_mode: string;
    blockchain_healthy: boolean;
  };
  recent_audit_events: SystemAuditLog[];
}
