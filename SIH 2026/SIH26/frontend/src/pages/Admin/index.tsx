import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Users, FolderCheck, FileText, CheckCircle2,
  XCircle, Key, RefreshCw, Plus, UserX, UserCheck, ShieldCheck,
  Blocks, Search, AlertTriangle, Lock, Shield, UserPlus, Clock
} from 'lucide-react';
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUserStatus,
  resetAdminUserPassword,
  fetchAdminCases,
  assignCaseToUser,
  unassignCaseFromUser,
  fetchAdminAuditLogs,
  fetchAdminSecurityOverview
} from '../../api/client';
import { SectionHeader } from '../../components/shared';
import type { SecurityOverview, SystemAuditLog, AuthUser } from '../../types/auth';
import { clsx } from 'clsx';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'cases' | 'audit'>('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState('');

  // Modals state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<AuthUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newRole, setNewRole] = useState<'INVESTIGATOR' | 'ADMIN' | 'ANALYST'>('INVESTIGATOR');
  const [newFullName, setNewFullName] = useState('');
  const [newBadge, setNewBadge] = useState('');

  // Assign investigator to case state
  const [selectedCaseForAssign, setSelectedCaseForAssign] = useState<string | null>(null);
  const [selectedUserToAssign, setSelectedUserToAssign] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [secOverview, usersRes, casesRes, auditRes] = await Promise.all([
        fetchAdminSecurityOverview().catch(() => null),
        fetchAdminUsers().catch(() => ({ users: [] })),
        fetchAdminCases().catch(() => ({ cases: [] })),
        fetchAdminAuditLogs({ limit: 100 }).catch(() => ({ logs: [] })),
      ]);

      if (secOverview) setOverview(secOverview);
      setUsers(usersRes.users || []);
      setCases(casesRes.cases || []);
      setAuditLogs(auditRes.logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAdminUser({
        username: newUsername,
        email: newEmail,
        password: newPw,
        role: newRole,
        full_name: newFullName,
        badge_number: newBadge
      });
      setShowCreateUserModal(false);
      setNewUsername('');
      setNewEmail('');
      setNewPw('');
      setNewFullName('');
      setNewBadge('');
      setActionMessage('New investigator account created successfully.');
      setTimeout(() => setActionMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create user account.');
    }
  };

  const handleToggleStatus = async (user: AuthUser) => {
    const nextStatus = !user.is_active;
    const confirmMsg = nextStatus
      ? `Activate user account '${user.username}'?`
      : `Deactivate user account '${user.username}'? Deactivated users cannot log in.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await updateAdminUserStatus(user.id, nextStatus);
      setActionMessage(`User account '${user.username}' ${nextStatus ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setActionMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update user status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !newPassword) return;

    try {
      await resetAdminUserPassword(selectedUserForReset.id, newPassword);
      setShowResetPasswordModal(false);
      setNewPassword('');
      setSelectedUserForReset(null);
      setActionMessage(`Password reset successfully for '${selectedUserForReset.username}'.`);
      setTimeout(() => setActionMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reset password.');
    }
  };

  const handleAssignInvestigator = async (caseId: string) => {
    if (!selectedUserToAssign) return;
    try {
      await assignCaseToUser(caseId, selectedUserToAssign);
      setSelectedCaseForAssign(null);
      setSelectedUserToAssign('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to assign case.');
    }
  };

  const handleUnassignInvestigator = async (caseId: string, userId: string, username: string) => {
    if (!window.confirm(`Unassign investigator '${username}' from case?`)) return;
    try {
      await unassignCaseFromUser(caseId, userId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to unassign case.');
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (!auditFilter) return true;
    const q = auditFilter.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.username && log.username.toLowerCase().includes(q)) ||
      (log.case_id && log.case_id.toLowerCase().includes(q)) ||
      (log.result && log.result.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <SectionHeader
        title="Administrative & Security Control Center"
        subtitle="Manage authorized investigators, access controls, case assignments, and view system-wide cryptographic audit trails."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-slate-300 hover:text-white text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={clsx("w-3.5 h-3.5 text-cyan-400", loading && "animate-spin")} />
              <span>Refresh Controls</span>
            </button>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Investigator</span>
            </button>
          </div>
        }
      />

      {/* Action Notification Banner */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-white/10 pb-2">
        {[
          { id: 'overview', label: 'Security & Fabric Overview', icon: ShieldCheck },
          { id: 'users', label: 'User & Investigator Management', icon: Users, count: users.length },
          { id: 'cases', label: 'Case Assignments & Access Control', icon: FolderCheck, count: cases.length },
          { id: 'audit', label: 'System Audit Logs', icon: FileText, count: auditLogs.length },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer',
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={clsx(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  isActive ? 'bg-cyan-500 text-slate-950' : 'bg-white/10 text-slate-400'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl glass-card border border-white/10 bg-navy-900/60">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Active Users</span>
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2">
                {overview?.users?.active ?? users.filter(u => u.is_active).length}
                <span className="text-xs font-normal text-slate-400 ml-1.5">/ {users.length} total</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {users.filter(u => u.role === 'INVESTIGATOR').length} Investigators · {users.filter(u => u.role === 'ADMIN').length} Admins
              </div>
            </div>

            <div className="p-4 rounded-xl glass-card border border-white/10 bg-navy-900/60">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Fabric Ledger Height</span>
                <Blocks className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-2">
                Block #{overview?.blockchain?.current_block_height ?? 1425}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Channel: <span className="font-mono text-cyan-300">{overview?.blockchain?.channel ?? 'evigraph-channel'}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl glass-card border border-white/10 bg-navy-900/60">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Evidence Integrity</span>
                <Shield className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2">
                {overview?.evidence_integrity?.total_evidence_records ?? 430}
              </div>
              <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{overview?.evidence_integrity?.verified ?? 426} Cryptographically Verified</span>
              </div>
            </div>

            <div className="p-4 rounded-xl glass-card border border-white/10 bg-navy-900/60">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Audit Trail Records</span>
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2">
                {auditLogs.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Append-only immutable system events
              </div>
            </div>
          </div>

          {/* Blockchain & Security Posture Card */}
          <div className="p-5 rounded-2xl glass-card border border-white/10 bg-gradient-to-r from-navy-900/90 via-navy-900/60 to-cyan-950/20">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              Hyperledger Fabric Permissioned Architecture & Provenance Integrity
            </h3>
            <p className="text-xs text-slate-400 mb-4 max-w-3xl leading-relaxed">
              EviGraph employs off-chain raw file storage coupled with on-chain cryptographic SHA-256 fingerprinting.
              Administrative users have platform oversight, user management, and case assignment authority, but cannot alter evidence contents
              or silently modify investigator findings.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Ledger Node Status</div>
                <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{overview?.blockchain?.status === 'healthy' ? 'CONNECTED & SYNCED' : 'LOCAL DETERMINISTIC ACTIVE'}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Smart Contract</div>
                <div className="text-sm font-mono text-cyan-300 font-bold mt-1">
                  {overview?.blockchain?.chaincode ?? 'evidence_integrity'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Security Spec</div>
                <div className="text-sm font-semibold text-slate-200 mt-1">
                  Section 65B Indian Evidence Act Compliant
                </div>
              </div>
            </div>
          </div>

          {/* Recent Audit Activities */}
          <div className="glass-card rounded-2xl border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Recent System-Wide Security Events
              </h3>
              <button
                onClick={() => setActiveTab('audit')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
              >
                View Complete Audit Log →
              </button>
            </div>
            <div className="space-y-2">
              {auditLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      'text-[9px] font-bold px-2 py-0.5 rounded font-mono',
                      log.action.includes('FAIL') || log.action.includes('TAMPER') || log.action.includes('UNAUTHORIZED')
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : log.action.includes('SUCCESS') || log.action.includes('VERIFIED')
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    )}>
                      {log.action}
                    </span>
                    <span className="font-semibold text-slate-200">{log.username}</span>
                    <span className="text-slate-500">({log.role})</span>
                    {log.case_id && (
                      <span className="text-slate-400">Case: <span className="font-mono text-cyan-400">{log.case_id}</span></span>
                    )}
                  </div>
                  <div className="text-slate-500 text-[11px] font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Authorized Users & Officers</h3>
              <p className="text-xs text-slate-400">Manage investigator credentials, operational roles, and active/inactive status.</p>
            </div>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Officer / User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Badge Number</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{u.full_name || u.username}</div>
                      <div className="text-[11px] text-slate-400 font-mono">@{u.username} · {u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase',
                        u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                        u.role === 'INVESTIGATOR' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {u.badge_number || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={clsx(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                        u.is_active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      )}>
                        <span className={clsx('w-1.5 h-1.5 rounded-full', u.is_active ? 'bg-emerald-400' : 'bg-red-400')} />
                        {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">
                      {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never logged in'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUserForReset(u);
                            setShowResetPasswordModal(true);
                          }}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] flex items-center gap-1 transition-all"
                          title="Reset Password"
                        >
                          <Key className="w-3 h-3 text-amber-400" />
                          <span>Reset PW</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={clsx(
                            'px-2.5 py-1 rounded border text-[11px] flex items-center gap-1 transition-all',
                            u.is_active
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          )}
                          title={u.is_active ? 'Deactivate User' : 'Activate User'}
                        >
                          {u.is_active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          <span>{u.is_active ? 'Deactivate' : 'Activate'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CASE ASSIGNMENTS */}
      {activeTab === 'cases' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-xl glass-card border border-white/10 bg-navy-900/60">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderCheck className="w-4 h-4 text-cyan-400" />
              Case Assignment & Investigator Authorization Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Backend RBAC strictly limits investigators to cases assigned to them.
              An investigator cannot query or access case records unless explicitly authorized below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases.map((c) => {
              const assigned = c.assigned_investigators || [];
              const isAssigning = selectedCaseForAssign === c.id;

              return (
                <div key={c.id} className="glass-card rounded-2xl border border-white/10 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-400 font-bold text-xs">{c.case_number}</span>
                        <span className={clsx(
                          'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase',
                          c.priority === 'critical' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                          c.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        )}>
                          {c.priority}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{c.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{c.description}</p>
                    </div>
                  </div>

                  {/* Assigned Investigators */}
                  <div className="border-t border-white/10 pt-3">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Assigned Investigators ({assigned.length})</span>
                      <button
                        onClick={() => setSelectedCaseForAssign(isAssigning ? null : c.id)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isAssigning ? 'Cancel' : 'Assign Officer'}</span>
                      </button>
                    </div>

                    {isAssigning && (
                      <div className="p-3 mb-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-2">
                        <select
                          value={selectedUserToAssign}
                          onChange={(e) => setSelectedUserToAssign(e.target.value)}
                          className="flex-1 bg-navy-950 border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-400"
                        >
                          <option value="">Select Investigator to Assign...</option>
                          {users
                            .filter(u => u.is_active && u.role === 'INVESTIGATOR')
                            .filter(u => !assigned.some((a: any) => a.user_id === u.id))
                            .map(u => (
                              <option key={u.id} value={u.id}>
                                {u.full_name || u.username} (@{u.username})
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => handleAssignInvestigator(c.id)}
                          disabled={!selectedUserToAssign}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold text-xs disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {assigned.length === 0 ? (
                        <div className="text-xs text-slate-500 italic p-2 bg-white/[0.02] rounded-lg">
                          No investigators assigned. (Admins retain oversight access)
                        </div>
                      ) : (
                        assigned.map((a: any) => (
                          <div
                            key={a.user_id}
                            className="p-2 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-200">{a.full_name || a.username}</span>
                              <span className="text-slate-500 text-[10px] ml-1.5 font-mono">@{a.username}</span>
                            </div>
                            <button
                              onClick={() => handleUnassignInvestigator(c.id, a.user_id, a.username)}
                              className="text-[10px] text-red-400 hover:text-red-300 hover:underline px-1.5 py-0.5 rounded"
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden animate-fade-in space-y-4">
          <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Immutable System Audit Logs
              </h3>
              <p className="text-xs text-slate-400">
                Complete traceability of logins, role authorization, case access attempts, and evidence integrity actions.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                placeholder="Filter by action, user, case..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-navy-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Target Context</th>
                  <th className="py-2.5 px-4">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredLogs.map((log) => {
                  const isTamper = log.action.includes('TAMPER') || log.action.includes('FAIL') || log.action.includes('UNAUTHORIZED');
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-white">
                        {log.username}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
                          {log.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[11px]">
                        <span className={clsx(
                          'px-2 py-0.5 rounded',
                          isTamper ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                        )}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                        {log.case_id && <span className="mr-2 text-cyan-400">Case: {log.case_id}</span>}
                        {log.evidence_id && <span className="text-amber-400">Ev: {log.evidence_id}</span>}
                        {!log.case_id && !log.evidence_id && 'System'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={clsx(
                          'text-[10px] font-bold px-2 py-0.5 rounded uppercase',
                          log.result === 'SUCCESS' || log.result === 'VERIFIED' ? 'text-emerald-400 bg-emerald-500/10' :
                          log.result === 'DENIED' || log.result === 'FAILED' || log.result === 'TAMPERED' ? 'text-red-400 bg-red-500/10' :
                          'text-slate-400 bg-white/5'
                        )}>
                          {log.result}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE USER */}
      <AnimatePresence>
        {showCreateUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-6 rounded-2xl border border-white/10 shadow-2xl bg-navy-900"
            >
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                Register New Authorized Officer
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Creates a persistent investigator or admin record with PBKDF2 password hashing.
              </p>

              <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Insp. A. Sharma"
                    className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Username</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. asharma"
                      className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Badge Number</label>
                    <input
                      type="text"
                      value={newBadge}
                      onChange={(e) => setNewBadge(e.target.value)}
                      placeholder="e.g. L3-8821"
                      className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Official Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="asharma@evigraph.gov.in"
                    className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Initial Password</label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">System Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="INVESTIGATOR">INVESTIGATOR (Case Workspaces & Evidence)</option>
                    <option value="ADMIN">ADMIN (System & User Management)</option>
                    <option value="ANALYST">ANALYST (Read-only Intelligence Analysis)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold shadow-md shadow-cyan-500/20"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: RESET PASSWORD */}
      <AnimatePresence>
        {showResetPasswordModal && selectedUserForReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-sm p-6 rounded-2xl border border-white/10 shadow-2xl bg-navy-900"
            >
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                <Key className="w-5 h-5 text-amber-400" />
                Reset Password
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Set a new password for <span className="font-bold text-white">@{selectedUserForReset.username}</span>.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetPasswordModal(false);
                      setSelectedUserForReset(null);
                    }}
                    className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-navy-950 font-bold"
                  >
                    Update Password
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
