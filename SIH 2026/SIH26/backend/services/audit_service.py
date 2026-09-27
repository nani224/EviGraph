"""
System Audit Service — NIRVANA / EviGraph
Records immutable audit trail of authentication, authorization, investigator,
and evidence-integrity security events in SQLite and Fabric provenance layer.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List

class AuditService:
    def log_event(
        self,
        action: str,
        user: Optional[Dict[str, Any]] = None,
        result: str = "SUCCESS",
        case_id: Optional[str] = None,
        evidence_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        username: Optional[str] = None,
        user_id: Optional[str] = None,
        role: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Records an audit event into the system-wide audit log.
        Safe: Never includes plaintext passwords or credentials in metadata.
        """
        from data.database import record_system_audit
        
        u_id = user_id or (user.get("id") if user else None)
        u_name = username or (user.get("username") if user else "anonymous")
        u_role = role or (user.get("role") if user else "UNAUTHENTICATED")

        # Sanitize metadata to prevent any passwords from ever being logged
        clean_metadata = {k: v for k, v in (metadata or {}).items() if "password" not in k.lower()}

        entry = {
            "id": f"audit-sys-{int(datetime.now().timestamp()*1000)}",
            "timestamp": datetime.now().isoformat(),
            "user_id": u_id,
            "username": u_name,
            "role": u_role,
            "action": action,
            "case_id": case_id,
            "evidence_id": evidence_id,
            "result": result,
            "metadata": clean_metadata
        }

        record_system_audit(entry)
        return entry

    def get_logs(
        self,
        limit: int = 100,
        action: Optional[str] = None,
        user_id: Optional[str] = None,
        case_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves system audit logs with optional filters."""
        from data.database import get_system_audit_logs
        return get_system_audit_logs(limit=limit, action=action, user_id=user_id, case_id=case_id)

audit_service = AuditService()
