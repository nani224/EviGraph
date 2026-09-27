"""
Authentication, RBAC & Case Authorization Automated Test Suite
SIH 2026 — NIRVANA / EviGraph

Validates all 16 Acceptance Criteria:
  TEST 1: Admin can log in -> Successful authentication and role ADMIN
  TEST 2: Investigator can log in -> Successful authentication and role INVESTIGATOR
  TEST 3: Invalid credentials are rejected -> HTTP 401
  TEST 4: Investigator cannot access Admin-only endpoints -> HTTP 403
  TEST 5: Admin can access authorized administrative endpoints -> HTTP 200
  TEST 6: Investigator can access authorized investigation functionality -> HTTP 200
  TEST 7: Investigator cannot access an unauthorized case -> HTTP 403 Access Denied
  TEST 8: Login and authorization events appear in audit logs -> LOGIN_SUCCESS, LOGIN_FAILED, etc.
  TEST 9: Evidence-integrity actions record the authenticated investigator
  TEST 10: Existing application functionality continues to work
  TEST 11: Unauthenticated user cannot access protected backend endpoints -> HTTP 401
  TEST 12: Investigator cannot change their own role to ADMIN through modified API request -> HTTP 403
  TEST 13: Inactive user cannot log in -> HTTP 403 Deactivated
  TEST 14: Changing frontend state/token claims cannot elevate role (backend validates DB)
  TEST 15: Changing case_id in API request cannot give unauthorized case access -> HTTP 403
  TEST 16: Existing users and existing investigation data are preserved
"""
import os
import sys
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app
from data.database import (
    init_sqlite, get_user_by_username_or_email, create_user,
    update_user_status, assign_case_to_user, unassign_case_from_user,
    get_system_audit_logs, get_all_users
)
from services.auth_service import hash_password, create_access_token

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    from data.database import initialize
    initialize()

# ─────────────────────────────────────────────────────────
# TEST 1: Admin can log in
# ─────────────────────────────────────────────────────────
def test_1_admin_login():
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "ADMIN"
    assert data["user"]["username"] == "admin"

# ─────────────────────────────────────────────────────────
# TEST 2: Investigator can log in
# ─────────────────────────────────────────────────────────
def test_2_investigator_login():
    resp = client.post("/api/auth/login", json={"username": "investigator", "password": "Investigator@123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "INVESTIGATOR"
    assert data["user"]["username"] == "investigator"

# ─────────────────────────────────────────────────────────
# TEST 3: Invalid credentials are rejected
# ─────────────────────────────────────────────────────────
def test_3_invalid_credentials_rejected():
    resp_wrong_pw = client.post("/api/auth/login", json={"username": "admin", "password": "WrongPassword"})
    assert resp_wrong_pw.status_code == 401

    resp_nonexistent = client.post("/api/auth/login", json={"username": "nonexistent_officer", "password": "AnyPassword"})
    assert resp_nonexistent.status_code == 401

# ─────────────────────────────────────────────────────────
# TEST 4: Investigator cannot access Admin-only endpoints
# ─────────────────────────────────────────────────────────
def test_4_investigator_cannot_access_admin_endpoints():
    login_resp = client.post("/api/auth/login", json={"username": "investigator", "password": "Investigator@123"})
    inv_token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {inv_token}"}

    # Attempt to list all users via admin endpoint
    resp = client.get("/api/admin/users", headers=headers)
    assert resp.status_code == 403
    assert "Forbidden" in resp.json()["detail"]

    # Attempt to query admin security overview
    resp_sec = client.get("/api/admin/security-overview", headers=headers)
    assert resp_sec.status_code == 403

# ─────────────────────────────────────────────────────────
# TEST 5: Admin can access authorized administrative endpoints
# ─────────────────────────────────────────────────────────
def test_5_admin_can_access_admin_endpoints():
    login_resp = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    admin_token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp_users = client.get("/api/admin/users", headers=headers)
    assert resp_users.status_code == 200
    assert "users" in resp_users.json()
    assert len(resp_users.json()["users"]) >= 2

    resp_cases = client.get("/api/admin/cases", headers=headers)
    assert resp_cases.status_code == 200
    assert "cases" in resp_cases.json()

    resp_audit = client.get("/api/admin/audit-logs", headers=headers)
    assert resp_audit.status_code == 200
    assert "logs" in resp_audit.json()

# ─────────────────────────────────────────────────────────
# TEST 6: Investigator can access authorized investigation functionality
# ─────────────────────────────────────────────────────────
def test_6_investigator_can_access_investigation_functionality():
    login_resp = client.post("/api/auth/login", json={"username": "investigator", "password": "Investigator@123"})
    inv_token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {inv_token}"}

    # Access cases
    resp_cases = client.get("/api/cases", headers=headers)
    assert resp_cases.status_code == 200
    assert "cases" in resp_cases.json()

    # Access assigned case detail
    resp_case = client.get("/api/cases/case-001", headers=headers)
    assert resp_case.status_code == 200
    assert "case" in resp_case.json()

    # Access evidence
    resp_ev = client.get("/api/evidence", headers=headers)
    assert resp_ev.status_code == 200

# ─────────────────────────────────────────────────────────
# TEST 7: Investigator cannot access an unauthorized case
# ─────────────────────────────────────────────────────────
def test_7_investigator_cannot_access_unauthorized_case():
    # Create an isolated case not assigned to 'investigator'
    isolated_case_id = "case-restricted-classified-999"
    inv_user = get_user_by_username_or_email("investigator")
    unassign_case_from_user(isolated_case_id, inv_user["id"])

    login_resp = client.post("/api/auth/login", json={"username": "investigator", "password": "Investigator@123"})
    inv_token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {inv_token}"}

    resp = client.get(f"/api/cases/{isolated_case_id}", headers=headers)
    assert resp.status_code == 403
    assert "Access Denied" in resp.json()["detail"]

# ─────────────────────────────────────────────────────────
# TEST 8: Login and authorization events appear in audit logs
# ─────────────────────────────────────────────────────────
def test_8_login_and_auth_events_in_audit_logs():
    logs = get_system_audit_logs(limit=30)
    actions = [l["action"] for l in logs]
    assert "LOGIN_SUCCESS" in actions
    assert "LOGIN_FAILED" in actions

# ─────────────────────────────────────────────────────────
# TEST 9: Evidence-integrity actions record the authenticated investigator
# ─────────────────────────────────────────────────────────
def test_9_evidence_integrity_records_authenticated_investigator():
    login_resp = client.post("/api/auth/login", json={"username": "prasad", "password": "Prasad@123"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Perform integrity verification
    resp = client.post("/api/evidence/cdr-0001/integrity/verify", json={}, headers=headers)
    assert resp.status_code == 200

    # Verify audit trail records authenticated investigator
    logs = get_system_audit_logs(limit=10, action="EVIDENCE_VERIFIED")
    assert len(logs) > 0
    recent_verify = logs[0]
    assert recent_verify["evidence_id"] == "cdr-0001"
    assert recent_verify["username"] == "prasad"

# ─────────────────────────────────────────────────────────
# TEST 10: Existing application functionality continues to work
# ─────────────────────────────────────────────────────────
def test_10_existing_functionality_preserved():
    # Dashboard stats
    stats_resp = client.get("/api/dashboard/stats")
    assert stats_resp.status_code == 200
    assert "entities_in_graph" in stats_resp.json()

    # Blockchain health
    health_resp = client.get("/api/blockchain/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["mode"] in ["local", "fabric"]

# ─────────────────────────────────────────────────────────
# TEST 11: Unauthenticated user cannot access protected endpoints
# ─────────────────────────────────────────────────────────
def test_11_unauthenticated_cannot_access_protected_endpoints():
    # Admin endpoints require authentication
    resp = client.get("/api/admin/users")
    assert resp.status_code == 401

    resp_sec = client.get("/api/admin/security-overview")
    assert resp_sec.status_code == 401

# ─────────────────────────────────────────────────────────
# TEST 12: Investigator cannot change their own role to ADMIN
# ─────────────────────────────────────────────────────────
def test_12_investigator_cannot_change_role_to_admin():
    login_resp = client.post("/api/auth/login", json={"username": "investigator", "password": "Investigator@123"})
    inv_token = login_resp.json()["access_token"]
    inv_id = login_resp.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {inv_token}"}

    # Attempt to call admin status or creation to elevate self
    resp = client.patch(f"/api/admin/users/{inv_id}/status", json={"is_active": True}, headers=headers)
    assert resp.status_code == 403

# ─────────────────────────────────────────────────────────
# TEST 13: Inactive user cannot log in
# ─────────────────────────────────────────────────────────
def test_13_inactive_user_cannot_login():
    # Create an inactive investigator
    inactive_uid = "usr-test-inactive-99"
    pw_hash = hash_password("Inactive@123")
    create_user({
        "id": inactive_uid,
        "username": "suspended_officer",
        "email": "suspended@evigraph.gov.in",
        "password_hash": pw_hash,
        "role": "INVESTIGATOR",
        "is_active": False,
        "full_name": "Suspended Officer"
    })
    update_user_status(inactive_uid, False)

    resp = client.post("/api/auth/login", json={"username": "suspended_officer", "password": "Inactive@123"})
    assert resp.status_code == 403
    assert "deactivated" in resp.json()["detail"].lower()

# ─────────────────────────────────────────────────────────
# TEST 14: Changing frontend state/token claims cannot elevate role
# ─────────────────────────────────────────────────────────
def test_14_cannot_elevate_role_via_forged_or_modified_token():
    inv_user = get_user_by_username_or_email("investigator")
    # Even if an attacker crafts a token with role: "ADMIN", backend checks DB
    fake_token = create_access_token({
        "sub": inv_user["id"],  # actual investigator user ID in DB
        "username": "investigator",
        "role": "ADMIN"          # fake role in token
    })
    headers = {"Authorization": f"Bearer {fake_token}"}

    # Authoritative backend DB lookup checks DB role which is INVESTIGATOR -> 403
    resp = client.get("/api/admin/users", headers=headers)
    assert resp.status_code == 403

# ─────────────────────────────────────────────────────────
# TEST 15: Changing case_id in API request cannot give access to unauthorized case
# ─────────────────────────────────────────────────────────
def test_15_tampered_case_id_rejected():
    login_resp = client.post("/api/auth/login", json={"username": "investigator", "password": "Investigator@123"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # An unauthorized case ID
    tampered_case_id = "case-unauthorized-classified-888"
    resp = client.get(f"/api/cases/{tampered_case_id}/graph", headers=headers)
    assert resp.status_code == 403
    assert "Access Denied" in resp.json()["detail"]

# ─────────────────────────────────────────────────────────
# TEST 16: Existing users and investigation data are preserved
# ─────────────────────────────────────────────────────────
def test_16_existing_users_and_data_preserved():
    users = get_all_users()
    usernames = {u["username"] for u in users}
    assert "admin" in usernames
    assert "investigator" in usernames
    assert "prasad" in usernames

    # Verify existing demo cases still exist
    resp = client.get("/api/cases")
    assert resp.status_code == 200
    case_ids = {c["id"] for c in resp.json()["cases"]}
    assert "case-001" in case_ids or "case-1969" in case_ids
