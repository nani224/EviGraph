"""
RBAC & Permission Architecture — NIRVANA / EviGraph
Centralized Role-Based Access Control and Permission Resolution.

Designed to easily support future roles (e.g. ANALYST, AUDITOR, JUDICIAL)
without rewriting endpoint authorization or hardcoding checks throughout the codebase.
"""
from typing import Set, Dict, Any, Optional

# Supported System Roles
ROLE_ADMIN = "ADMIN"
ROLE_INVESTIGATOR = "INVESTIGATOR"
ROLE_ANALYST = "ANALYST"

VALID_ROLES = {ROLE_ADMIN, ROLE_INVESTIGATOR, ROLE_ANALYST}

# Fine-grained Permissions
PERMISSIONS: Dict[str, Set[str]] = {
    ROLE_ADMIN: {
        # User & Account Management
        "user:create",
        "user:read",
        "user:update_status",
        "user:reset_password",
        "user:manage_roles",
        # Case Assignment (Admin manages assignments, but does NOT silently edit findings)
        "case:assign",
        "case:unassign",
        "case:read_all",
        # System Audit & Security Monitoring
        "audit:read_all",
        "security:read_overview",
        "fabric:health_read",
        "integrity:read_all",
        "blockchain:status_read",
    },
    ROLE_INVESTIGATOR: {
        # Case Operations
        "case:read_assigned",
        "case:create",
        # Evidence Operations
        "evidence:read",
        "evidence:upload",
        "evidence:verify",
        "evidence:tamper_test",
        # Graph & Intelligence Analysis
        "graph:read",
        "graph:analyze",
        "entity:read",
        "entity:search",
        "anomalies:read",
        # Investigation Findings & Decisions
        "decision:create",
        "decision:read",
        "history:create",
        "history:read",
        "report:generate",
    },
    ROLE_ANALYST: {
        # Read-only Intelligence Analysis
        "case:read_assigned",
        "evidence:read",
        "graph:read",
        "graph:analyze",
        "entity:read",
        "entity:search",
        "anomalies:read",
        "history:read",
        "report:generate",
    }
}

def get_permissions_for_role(role: str) -> Set[str]:
    """Returns the set of permissions assigned to a given role."""
    return PERMISSIONS.get(role.upper(), set())

def has_permission(role: str, permission: str) -> bool:
    """
    Checks if a role possesses a specific permission.
    Extensible for future roles without rewriting protected endpoints.
    """
    role_perms = get_permissions_for_role(role)
    return permission in role_perms

def can_access_case(user: Dict[str, Any], case_id: str, assigned_case_ids: Optional[Set[str]] = None) -> bool:
    """
    Evaluates whether the user has permission to access a specific case:
      - ADMIN: Has system-wide oversight access to all cases.
      - INVESTIGATOR / ANALYST: Strictly limited to cases assigned to them.
    """
    role = (user.get("role") or "").upper()
    if role == ROLE_ADMIN:
        return True
    
    if not case_id:
        return True
        
    if assigned_case_ids is not None:
        return case_id in assigned_case_ids
        
    # Lazy lookup if assigned_case_ids not passed
    from data.database import get_assigned_case_ids_for_user
    user_id = user.get("id")
    if not user_id:
        return False
    user_assigned = set(get_assigned_case_ids_for_user(user_id))
    return case_id in user_assigned
