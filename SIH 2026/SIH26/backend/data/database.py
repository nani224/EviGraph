"""
Database layer — in-memory store + SQLite persistence for case/feedback data.
Loads synthetic data on startup and populates the graph engine.
"""
import sqlite3
import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime

from data.synthetic_generator import generate_all
from services.graph_engine import graph_engine

DB_PATH = os.path.join(os.path.dirname(__file__), "sih_demo.db")

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=30000")
    except Exception:
        pass
    return conn

# ─────────────────────────────────────────────────────────
# In-memory data store
# ─────────────────────────────────────────────────────────
_data: Dict[str, Any] = {}

def get_data() -> Dict[str, Any]:
    return _data

def get_collection(name: str) -> List[Any]:
    return _data.get(name, [])

def find_by_id(collection: str, id_: str) -> Optional[Dict]:
    for item in _data.get(collection, []):
        if item.get("id") == id_:
            return item
    return None

def find_by_field(collection: str, field: str, value: Any) -> List[Dict]:
    return [i for i in _data.get(collection, []) if i.get(field) == value]

# ─────────────────────────────────────────────────────────
# SQLite for mutable state (feedback, cases, decisions)
# ─────────────────────────────────────────────────────────
def init_sqlite():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS investigator_decisions (
        id TEXT PRIMARY KEY,
        finding_id TEXT,
        finding_type TEXT,
        decision TEXT,
        notes TEXT,
        investigator TEXT,
        timestamp TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        data TEXT,
        updated_at TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS resolution_decisions (
        id TEXT PRIMARY KEY,
        candidate_id TEXT,
        decision TEXT,
        timestamp TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS evidence_integrity (
        id TEXT PRIMARY KEY,
        evidence_id TEXT UNIQUE,
        case_id TEXT,
        sha256 TEXT,
        hash_algorithm TEXT DEFAULT 'SHA-256',
        storage_uri TEXT,
        fabric_tx_id TEXT,
        fabric_block_number INTEGER,
        recorded_at TEXT,
        verified_at TEXT,
        integrity_status TEXT,
        blockchain_status TEXT,
        evidence_type TEXT,
        metadata_json TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS evidence_audit_trail (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        investigator TEXT,
        action TEXT,
        case_id TEXT,
        evidence_id TEXT,
        result TEXT,
        metadata_json TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'INVESTIGATOR',
        is_active INTEGER NOT NULL DEFAULT 1,
        full_name TEXT,
        badge_number TEXT,
        created_at TEXT NOT NULL,
        last_login TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS case_assignments (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        assigned_at TEXT NOT NULL,
        assigned_by TEXT NOT NULL,
        UNIQUE(case_id, user_id)
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS system_audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        user_id TEXT,
        username TEXT,
        role TEXT,
        action TEXT NOT NULL,
        case_id TEXT,
        evidence_id TEXT,
        result TEXT,
        metadata_json TEXT
    )""")
    conn.commit()
    try:
        _seed_default_users_and_assignments(conn)
        conn.commit()
    except Exception as e:
        print(f"[DB] Error seeding users: {e}")
    conn.close()

def save_decision(finding_id: str, finding_type: str, decision: str,
                  notes: str = "", investigator: str = "Investigator"):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""INSERT OR REPLACE INTO investigator_decisions
                 VALUES (?, ?, ?, ?, ?, ?, ?)""",
              (f"dec-{finding_id}", finding_id, finding_type, decision,
               notes, investigator, datetime.now().isoformat()))
    conn.commit()
    conn.close()

def get_decisions() -> List[Dict]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM investigator_decisions ORDER BY timestamp DESC")
    rows = c.fetchall()
    conn.close()
    return [{"id": r[0],"finding_id":r[1],"finding_type":r[2],
             "decision":r[3],"notes":r[4],"investigator":r[5],"timestamp":r[6]}
            for r in rows]

def save_resolution_decision(candidate_id: str, decision: str):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO resolution_decisions VALUES (?,?,?,?)",
              (f"res-dec-{candidate_id}", candidate_id, decision, datetime.now().isoformat()))
    conn.commit()
    conn.close()

# ─────────────────────────────────────────────────────────
# Evidence Integrity & Audit Trail Persistence
# ─────────────────────────────────────────────────────────
def save_evidence_integrity(integrity_dict: Dict[str, Any]):
    init_sqlite()
    conn = get_db_connection()
    c = conn.cursor()
    record_id = integrity_dict.get("id") or f"integ-{integrity_dict['evidence_id']}"
    c.execute("""
        INSERT OR REPLACE INTO evidence_integrity (
            id, evidence_id, case_id, sha256, hash_algorithm,
            storage_uri, fabric_tx_id, fabric_block_number,
            recorded_at, verified_at, integrity_status,
            blockchain_status, evidence_type, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record_id,
        integrity_dict.get("evidence_id"),
        integrity_dict.get("case_id"),
        integrity_dict.get("sha256"),
        integrity_dict.get("hash_algorithm", "SHA-256"),
        integrity_dict.get("storage_uri", ""),
        integrity_dict.get("fabric_tx_id", ""),
        integrity_dict.get("fabric_block_number", 0),
        integrity_dict.get("recorded_at") or datetime.now().isoformat(),
        integrity_dict.get("verified_at"),
        integrity_dict.get("integrity_status", "VERIFIED"),
        integrity_dict.get("blockchain_status", "RECORDED"),
        integrity_dict.get("evidence_type", "general"),
        json.dumps(integrity_dict.get("metadata", {}))
    ))
    conn.commit()
    conn.close()

def get_evidence_integrity(evidence_id: str) -> Optional[Dict[str, Any]]:
    init_sqlite()
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM evidence_integrity WHERE evidence_id = ?", (evidence_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row[0],
        "evidence_id": row[1],
        "case_id": row[2],
        "sha256": row[3],
        "hash_algorithm": row[4],
        "storage_uri": row[5],
        "fabric_tx_id": row[6],
        "fabric_block_number": row[7],
        "recorded_at": row[8],
        "verified_at": row[9],
        "integrity_status": row[10],
        "blockchain_status": row[11],
        "evidence_type": row[12],
        "metadata": json.loads(row[13]) if row[13] else {}
    }

def get_all_evidence_integrity(case_id: Optional[str] = None) -> List[Dict[str, Any]]:
    init_sqlite()
    conn = get_db_connection()
    c = conn.cursor()
    if case_id:
        c.execute("SELECT * FROM evidence_integrity WHERE case_id = ? ORDER BY recorded_at DESC", (case_id,))
    else:
        c.execute("SELECT * FROM evidence_integrity ORDER BY recorded_at DESC")
    rows = c.fetchall()
    conn.close()
    return [{
        "id": r[0],
        "evidence_id": r[1],
        "case_id": r[2],
        "sha256": r[3],
        "hash_algorithm": r[4],
        "storage_uri": r[5],
        "fabric_tx_id": r[6],
        "fabric_block_number": r[7],
        "recorded_at": r[8],
        "verified_at": r[9],
        "integrity_status": r[10],
        "blockchain_status": r[11],
        "evidence_type": r[12],
        "metadata": json.loads(r[13]) if r[13] else {}
    } for r in rows]

def update_evidence_integrity_status(evidence_id: str, status: str, verified_at: Optional[str] = None):
    init_sqlite()
    conn = get_db_connection()
    c = conn.cursor()
    v_at = verified_at or datetime.now().isoformat()
    c.execute("""
        UPDATE evidence_integrity
        SET integrity_status = ?, verified_at = ?
        WHERE evidence_id = ?
    """, (status, v_at, evidence_id))
    conn.commit()
    conn.close()

def record_integrity_audit(entry: Dict[str, Any]):
    init_sqlite()
    conn = get_db_connection()
    c = conn.cursor()
    audit_id = entry.get("id") or f"audit-{int(datetime.now().timestamp()*1000)}"
    c.execute("""
        INSERT INTO evidence_audit_trail (
            id, timestamp, investigator, action, case_id, evidence_id, result, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        audit_id,
        entry.get("timestamp") or datetime.now().isoformat(),
        entry.get("investigator", "Investigator"),
        entry.get("action", "AUDIT_EVENT"),
        entry.get("case_id"),
        entry.get("evidence_id"),
        entry.get("result", "SUCCESS"),
        json.dumps(entry.get("metadata", {}))
    ))
    conn.commit()
    conn.close()

def get_evidence_audit_history(evidence_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    if evidence_id:
        c.execute("""
            SELECT * FROM evidence_audit_trail
            WHERE evidence_id = ?
            ORDER BY timestamp DESC LIMIT ?
        """, (evidence_id, limit))
    else:
        c.execute("""
            SELECT * FROM evidence_audit_trail
            ORDER BY timestamp DESC LIMIT ?
        """, (limit,))
    rows = c.fetchall()
    conn.close()
    return [{
        "id": r[0],
        "timestamp": r[1],
        "investigator": r[2],
        "action": r[3],
        "case_id": r[4],
        "evidence_id": r[5],
        "result": r[6],
        "metadata": json.loads(r[7]) if r[7] else {}
    } for r in rows]

# ─────────────────────────────────────────────────────────
# User Accounts & Authentication Persistence
# ─────────────────────────────────────────────────────────
def _seed_default_users_and_assignments(conn: sqlite3.Connection):
    c = conn.cursor()
    # Check if admin already exists
    c.execute("SELECT id FROM users WHERE username = 'admin'")
    if not c.fetchone():
        from services.auth_service import hash_password
        admin_pw = os.environ.get("SEED_ADMIN_PASSWORD", "Admin@123")
        inv_pw = os.environ.get("SEED_INVESTIGATOR_PASSWORD", "Investigator@123")
        prasad_pw = os.environ.get("SEED_PRASAD_PASSWORD", "Prasad@123")
        now = datetime.now().isoformat()
        
        users_to_seed = [
            ("usr-admin-01", "admin", "admin@evigraph.gov.in", hash_password(admin_pw), "ADMIN", 1, "System Administrator", "ADM-001", now),
            ("usr-inv-01", "investigator", "investigator@evigraph.gov.in", hash_password(inv_pw), "INVESTIGATOR", 1, "Primary Investigator", "INV-2026", now),
            ("usr-inv-02", "prasad", "k.prasad@evigraph.gov.in", hash_password(prasad_pw), "INVESTIGATOR", 1, "Insp. K. Prasad", "L3-7749", now),
        ]
        c.executemany("""
            INSERT OR IGNORE INTO users (id, username, email, password_hash, role, is_active, full_name, badge_number, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, users_to_seed)
        
        # Pre-assign standard demo cases to both investigators so demo workflow works seamlessly
        demo_cases = ["case-001", "case-002", "case-1969", "case-6489", "INV-2026-001", "INV-2026-002", "INV-2026-1023", "INV-2026-0918", "INV-2026-1969", "INV-2026-6489"]
        for cid in demo_cases:
            for uid in ["usr-inv-01", "usr-inv-02"]:
                c.execute("""
                    INSERT OR IGNORE INTO case_assignments (id, case_id, user_id, assigned_at, assigned_by)
                    VALUES (?, ?, ?, ?, ?)
                """, (f"asgn-{cid}-{uid}", cid, uid, now, "System Initialization"))

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute("SELECT id, username, email, password_hash, role, is_active, full_name, badge_number, created_at, last_login FROM users WHERE id = ?", (user_id,))
        row = c.fetchone()
        if not row:
            return None
        return {
            "id": row[0], "username": row[1], "email": row[2], "password_hash": row[3],
            "role": row[4], "is_active": bool(row[5]), "full_name": row[6],
            "badge_number": row[7], "created_at": row[8], "last_login": row[9]
        }
    finally:
        conn.close()

def get_user_by_username_or_email(identifier: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute("""
            SELECT id, username, email, password_hash, role, is_active, full_name, badge_number, created_at, last_login
            FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
        """, (identifier, identifier))
        row = c.fetchone()
        if not row:
            return None
        return {
            "id": row[0], "username": row[1], "email": row[2], "password_hash": row[3],
            "role": row[4], "is_active": bool(row[5]), "full_name": row[6],
            "badge_number": row[7], "created_at": row[8], "last_login": row[9]
        }
    finally:
        conn.close()

def get_all_users() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute("""
            SELECT id, username, email, role, is_active, full_name, badge_number, created_at, last_login
            FROM users ORDER BY created_at ASC
        """)
        rows = c.fetchall()
        return [{
            "id": r[0], "username": r[1], "email": r[2], "role": r[3],
            "is_active": bool(r[4]), "full_name": r[5], "badge_number": r[6],
            "created_at": r[7], "last_login": r[8]
        } for r in rows]
    finally:
        conn.close()

def create_user(user_dict: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        c = conn.cursor()
        uid = user_dict.get("id") or f"usr-{int(datetime.now().timestamp()*1000)}"
        now = datetime.now().isoformat()
        c.execute("""
            INSERT OR REPLACE INTO users (id, username, email, password_hash, role, is_active, full_name, badge_number, created_at, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            uid,
            user_dict["username"],
            user_dict["email"],
            user_dict["password_hash"],
            user_dict.get("role", "INVESTIGATOR").upper(),
            1 if user_dict.get("is_active", True) else 0,
            user_dict.get("full_name", user_dict["username"]),
            user_dict.get("badge_number", ""),
            user_dict.get("created_at") or now,
            None
        ))
        conn.commit()
        user_dict["id"] = uid
        return user_dict
    finally:
        conn.close()

def update_user_status(user_id: str, is_active: bool) -> bool:
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute("UPDATE users SET is_active = ? WHERE id = ?", (1 if is_active else 0, user_id))
        updated = c.rowcount > 0
        conn.commit()
        return updated
    finally:
        conn.close()

def update_user_password(user_id: str, password_hash: str) -> bool:
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id))
        updated = c.rowcount > 0
        conn.commit()
        return updated
    finally:
        conn.close()

def update_user_last_login(user_id: str):
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute("UPDATE users SET last_login = ? WHERE id = ?", (datetime.now().isoformat(), user_id))
        conn.commit()
    finally:
        conn.close()

# ─────────────────────────────────────────────────────────
# Case Assignments Persistence
# ─────────────────────────────────────────────────────────
def assign_case_to_user(case_id: str, user_id: str, assigned_by: str = "Admin") -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        c = conn.cursor()
        asgn_id = f"asgn-{case_id}-{user_id}"
        now = datetime.now().isoformat()
        c.execute("""
            INSERT OR REPLACE INTO case_assignments (id, case_id, user_id, assigned_at, assigned_by)
            VALUES (?, ?, ?, ?, ?)
        """, (asgn_id, case_id, user_id, now, assigned_by))
        conn.commit()
        return {"id": asgn_id, "case_id": case_id, "user_id": user_id, "assigned_at": now, "assigned_by": assigned_by}
    finally:
        conn.close()

def unassign_case_from_user(case_id: str, user_id: str) -> bool:
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute("DELETE FROM case_assignments WHERE case_id = ? AND user_id = ?", (case_id, user_id))
        deleted = c.rowcount > 0
        conn.commit()
        return deleted
    finally:
        conn.close()

def get_assigned_case_ids_for_user(user_id: str) -> List[str]:
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute("SELECT case_id FROM case_assignments WHERE user_id = ?", (user_id,))
        rows = c.fetchall()
        return [r[0] for r in rows]
    finally:
        conn.close()

def get_assigned_investigators_for_case(case_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute("""
            SELECT u.id, u.username, u.email, u.full_name, u.badge_number, ca.assigned_at, ca.assigned_by
            FROM case_assignments ca
            JOIN users u ON ca.user_id = u.id
            WHERE ca.case_id = ?
        """, (case_id,))
        rows = c.fetchall()
        return [{
            "user_id": r[0], "username": r[1], "email": r[2], "full_name": r[3],
            "badge_number": r[4], "assigned_at": r[5], "assigned_by": r[6]
        } for r in rows]
    finally:
        conn.close()

def get_all_case_assignments() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute("""
            SELECT ca.id, ca.case_id, ca.user_id, u.username, u.full_name, ca.assigned_at, ca.assigned_by
            FROM case_assignments ca
            LEFT JOIN users u ON ca.user_id = u.id
        """)
        rows = c.fetchall()
        return [{
            "id": r[0], "case_id": r[1], "user_id": r[2], "username": r[3],
            "full_name": r[4], "assigned_at": r[5], "assigned_by": r[6]
        } for r in rows]
    finally:
        conn.close()

# ─────────────────────────────────────────────────────────
# System Audit Trail Persistence
# ─────────────────────────────────────────────────────────
def record_system_audit(entry: Dict[str, Any]):
    conn = get_db_connection()
    try:
        c = conn.cursor()
        audit_id = entry.get("id") or f"audit-sys-{int(datetime.now().timestamp()*1000)}"
        c.execute("""
            INSERT INTO system_audit_logs (
                id, timestamp, user_id, username, role, action, case_id, evidence_id, result, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            audit_id,
            entry.get("timestamp") or datetime.now().isoformat(),
            entry.get("user_id"),
            entry.get("username", "anonymous"),
            entry.get("role", "UNAUTHENTICATED"),
            entry.get("action", "EVENT"),
            entry.get("case_id"),
            entry.get("evidence_id"),
            entry.get("result", "SUCCESS"),
            json.dumps(entry.get("metadata", {}))
        ))
        conn.commit()
    finally:
        conn.close()

def get_system_audit_logs(
    limit: int = 100,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    case_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        c = conn.cursor()
        query = "SELECT id, timestamp, user_id, username, role, action, case_id, evidence_id, result, metadata_json FROM system_audit_logs WHERE 1=1"
        params = []
        if action:
            query += " AND action = ?"
            params.append(action)
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        if case_id:
            query += " AND case_id = ?"
            params.append(case_id)
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        c.execute(query, params)
        rows = c.fetchall()
        return [{
            "id": r[0], "timestamp": r[1], "user_id": r[2], "username": r[3],
            "role": r[4], "action": r[5], "case_id": r[6], "evidence_id": r[7],
            "result": r[8], "metadata": json.loads(r[9]) if r[9] else {}
        } for r in rows]
    finally:
        conn.close()
# ─────────────────────────────────────────────────────────
def _build_graph():
    data = _data

    # Add person nodes
    for p in data["persons"]:
        graph_engine.add_node(p["id"],
            type="person", label=p["name"], name=p["name"],
            aliases=p.get("aliases",[]), dob=p.get("dob",""),
            gender=p.get("gender",""), role=p.get("role","peripheral"))

    # Add phone nodes
    for ph in data["phones"]:
        graph_engine.add_node(ph["id"],
            type="phone", label=ph["number"], number=ph["number"],
            imei=ph.get("imei",""), current_device=ph.get("current_device",""))
        if ph.get("owner_id"):
            graph_engine.add_edge(ph["owner_id"], ph["id"],
                rel_type="OWNS", confidence=0.98,
                evidence_ids=[f"phone-reg-{ph['id']}"], source="Phone Records")

    # Add vehicle nodes
    for v in data["vehicles"]:
        label = v["plate"] or f"Unknown Vehicle {v['id']}"
        graph_engine.add_node(v["id"],
            type="vehicle", label=label, plate=v.get("plate"),
            make=v["make"], model=v["model"], color=v["color"], vehicle_type=v["type"])
        if v.get("reg_owner_id"):
            graph_engine.add_edge(v["reg_owner_id"], v["id"],
                rel_type="REGISTERED_TO", confidence=0.99,
                evidence_ids=[f"veh-rec-{v['id']}"], source="Vehicle Records")

    # Add account nodes
    for a in data["accounts"]:
        graph_engine.add_node(a["id"],
            type="account", label=a["number"], bank=a["bank"], acc_type=a["type"])
        if a.get("owner_id"):
            graph_engine.add_edge(a["owner_id"], a["id"],
                rel_type="OWNS", confidence=0.97,
                evidence_ids=[f"acc-rec-{a['id']}"], source="Financial Records")

    # Add location nodes
    for loc in data["locations"]:
        graph_engine.add_node(loc["id"],
            type="location", label=loc["name"], name=loc["name"],
            lat=loc["lat"], lon=loc["lon"], loc_type=loc["type"])

    # Add CDR relationships
    for cdr in data["cdrs"]:
        caller_ph = cdr["from_phone"]
        callee_ph = cdr["to_phone"]
        # Find person via phone
        caller_p = next((p["owner_id"] for p in data["phones"] if p["id"] == caller_ph), None)
        callee_p = next((p["owner_id"] for p in data["phones"] if p["id"] == callee_ph), None)
        graph_engine.add_edge(caller_ph, callee_ph,
            rel_type="CALLED", confidence=0.95,
            evidence_ids=[cdr["id"]], source="CDR",
            timestamp=cdr["timestamp"])
        if caller_p and callee_p and caller_p != callee_p:
            graph_engine.add_edge(caller_p, callee_p,
                rel_type="COMMUNICATED_WITH", confidence=0.88,
                evidence_ids=[cdr["id"]], source="CDR",
                timestamp=cdr["timestamp"])

    # Add financial relationships
    for txn in data["transactions"]:
        graph_engine.add_edge(txn["from_account"], txn["to_account"],
            rel_type="TRANSFERRED", confidence=0.92,
            evidence_ids=[txn["id"]], source="Financial Records",
            timestamp=txn["timestamp"], amount=txn["amount"])

    # Add location observation relationships
    loc_counts: Dict[str, int] = {}
    for lr in data["location_records"]:
        eid = lr["entity_id"]
        lid = lr["location_id"]
        key = f"{eid}-{lid}"
        loc_counts[key] = loc_counts.get(key, 0) + 1
        graph_engine.add_edge(eid, lid,
            rel_type="VISITED", confidence=0.90,
            evidence_ids=[lr["id"]], source="Location Records",
            timestamp=lr["timestamp"])

    # Add CCTV relationships
    for obs in data["cctv_observations"]:
        vid = obs.get("vehicle_id")
        cam = obs.get("camera_id")
        loc = next((c["location_id"] for c in data["cameras"] if c["id"] == cam), None)
        if vid:
            graph_engine.add_edge(vid, cam if cam else "unknown",
                rel_type="SEEN_AT", confidence=obs["detection_confidence"],
                evidence_ids=[obs["id"]], source="CCTV",
                timestamp=obs["timestamp"])
            if loc:
                graph_engine.add_edge(vid, loc,
                    rel_type="SEEN_AT", confidence=obs["detection_confidence"],
                    evidence_ids=[obs["id"]], source="CCTV",
                    timestamp=obs["timestamp"])

    # Add the DEMO CHAIN link: veh-001 → Arun (seen together via CCTV)
    graph_engine.add_edge("veh-001", "p-003",
        rel_type="SEEN_WITH", confidence=0.82,
        evidence_ids=["cctv-0001"], source="CCTV",
        timestamp="2026-08-12T20:35:00",
        notes="Vehicle registered to associated party seen near target entity")

    # shell account link: Suresh account → shell
    graph_engine.add_edge("acc-002", "acc-X01",
        rel_type="TRANSFERRED", confidence=0.94,
        evidence_ids=["fin-0101","fin-0102","fin-0103"], source="Financial Records",
        timestamp="2026-08-13T11:00:00")

    # shell account → veh-001 linked via payment
    graph_engine.add_edge("acc-X01", "veh-001",
        rel_type="LINKED_TO", confidence=0.78,
        evidence_ids=["fin-0101","veh-rec-veh-001"], source="Financial Records + Vehicle Records",
        timestamp="2026-08-14T09:00:00")

    print(f"[Graph] Built: {len(graph_engine.G.nodes())} nodes, {len(graph_engine.G.edges())} edges")

def add_case(case_dict: Dict[str, Any]) -> Dict[str, Any]:
    global _data
    if "cases" not in _data:
        _data["cases"] = []
    _data["cases"].insert(0, case_dict)
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO cases VALUES (?, ?, ?)",
              (case_dict["id"], json.dumps(case_dict), datetime.now().isoformat()))
    conn.commit()
    conn.close()
    return case_dict

def link_entity_to_case(case_id: str, entity_id: str) -> Optional[Dict[str, Any]]:
    global _data
    cases = _data.get("cases", [])
    for c in cases:
        if c.get("id") == case_id or c.get("case_number") == case_id:
            if "related_entities" not in c:
                c["related_entities"] = []
            if entity_id not in c["related_entities"]:
                c["related_entities"].append(entity_id)
            if not c.get("primary_entity") or c.get("primary_entity") in ["Target Entity", ""]:
                c["primary_entity"] = entity_id
            
            # Persist to SQLite
            try:
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute("INSERT OR REPLACE INTO cases VALUES (?, ?, ?)",
                            (c["id"], json.dumps(c), datetime.now().isoformat()))
                conn.commit()
                conn.close()
            except Exception as e:
                print(f"[DB] Error saving case update: {e}")
            return c
    return None


def add_observation(obs_dict: Dict[str, Any]) -> Dict[str, Any]:
    global _data
    if "cctv_observations" not in _data:
        _data["cctv_observations"] = []
    _data["cctv_observations"].insert(0, obs_dict)
    return obs_dict

def add_dataset_entry(category: str, entry: Dict[str, Any]) -> Dict[str, Any]:
    global _data
    cat_plural = {
        "person": "persons",
        "phone": "phones",
        "vehicle": "vehicles",
        "location": "locations",
        "cdr": "cdrs",
        "transaction": "transactions",
        "cctv": "cctv_observations",
        "fir": "firs",
        "location_record": "location_records"
    }.get(category, f"{category}s")

    if cat_plural not in _data:
        _data[cat_plural] = []
    
    _data[cat_plural].insert(0, entry)

    # ─── Graph Engine Synchronization ────────────────────────
    nodes_created = []
    edges_created = []

    if category == "person":
        pid = entry["id"]
        graph_engine.add_node(pid, type="person", label=entry.get("name", pid), name=entry.get("name", pid), role=entry.get("role", "suspect"))
        nodes_created.append(pid)
        if entry.get("phone"):
            ph_id = f"ph-{pid}"
            graph_engine.add_node(ph_id, type="phone", label=entry["phone"], number=entry["phone"])
            graph_engine.add_edge(pid, ph_id, rel_type="OWNS", confidence=0.98, source="Telecom Registration", evidence_ids=[f"tel-{pid}"])
            nodes_created.append(ph_id)
            edges_created.append({"from": pid, "to": ph_id, "rel": "OWNS"})

    elif category == "vehicle":
        vid = entry["id"]
        plate = entry.get("plate") or f"{entry.get('color','')} {entry.get('make','Vehicle')}".strip()
        graph_engine.add_node(vid, type="vehicle", label=plate, plate=plate, color=entry.get("color"), make=entry.get("make"))
        nodes_created.append(vid)
        if entry.get("reg_owner_id") and graph_engine.get_node(entry["reg_owner_id"]):
            graph_engine.add_edge(vid, entry["reg_owner_id"], rel_type="REGISTERED_TO", confidence=0.98, source="RTO Registration Record", evidence_ids=[f"rto-{vid}"])
            edges_created.append({"from": vid, "to": entry["reg_owner_id"], "rel": "REGISTERED_TO"})

    elif category == "cdr":
        caller_ph = entry["from_phone"]
        callee_ph = entry["to_phone"]
        if not graph_engine.get_node(caller_ph):
            graph_engine.add_node(caller_ph, type="phone", label=caller_ph, number=caller_ph)
            nodes_created.append(caller_ph)
        if not graph_engine.get_node(callee_ph):
            graph_engine.add_node(callee_ph, type="phone", label=callee_ph, number=callee_ph)
            nodes_created.append(callee_ph)

        graph_engine.add_edge(caller_ph, callee_ph, rel_type="CALLED", confidence=entry.get("confidence", 0.95),
                              evidence_ids=[entry["id"]], source="CDR Call Record", timestamp=entry.get("timestamp"))
        edges_created.append({"from": caller_ph, "to": callee_ph, "rel": "CALLED"})

        # Link persons if known
        caller_p = next((p["id"] for p in _data.get("persons", []) if p.get("phone") == caller_ph or p.get("id") == caller_ph), None)
        callee_p = next((p["id"] for p in _data.get("persons", []) if p.get("phone") == callee_ph or p.get("id") == callee_ph), None)
        if caller_p and callee_p and caller_p != callee_p:
            graph_engine.add_edge(caller_p, callee_p, rel_type="COMMUNICATED_WITH", confidence=0.88,
                                  evidence_ids=[entry["id"]], source="CDR Analysis", timestamp=entry.get("timestamp"))
            edges_created.append({"from": caller_p, "to": callee_p, "rel": "COMMUNICATED_WITH"})

    elif category == "transaction":
        from_acc = entry["from_account"]
        to_acc = entry["to_account"]
        if not graph_engine.get_node(from_acc):
            graph_engine.add_node(from_acc, type="account", label=from_acc)
            nodes_created.append(from_acc)
        if not graph_engine.get_node(to_acc):
            graph_engine.add_node(to_acc, type="account", label=to_acc)
            nodes_created.append(to_acc)

        graph_engine.add_edge(from_acc, to_acc, rel_type="TRANSFERRED", confidence=0.94,
                              evidence_ids=[entry["id"]], source="Financial Ledger", amount=entry.get("amount"), timestamp=entry.get("timestamp"))
        edges_created.append({"from": from_acc, "to": to_acc, "rel": "TRANSFERRED"})

    elif category == "cctv":
        vid = entry.get("vehicle_id") or f"veh-{entry['id']}"
        cam_id = entry.get("camera_id") or "CAM-01"
        loc_id = entry.get("location_id") or "loc-09"
        plate = entry.get("plate_detected") or f"{entry.get('vehicle_color_observed','')} {entry.get('vehicle_type_observed','Vehicle')}".strip()

        graph_engine.add_node(cam_id, type="camera", label=f"CCTV {cam_id}")
        graph_engine.add_node(vid, type="vehicle", label=plate)
        graph_engine.add_node(loc_id, type="location", label=entry.get("location_name", loc_id))
        nodes_created.extend([cam_id, vid, loc_id])

        graph_engine.add_edge(vid, cam_id, rel_type="SEEN_AT", confidence=entry.get("detection_confidence", 0.90),
                              evidence_ids=[entry["id"]], source="CCTV Video Intelligence", timestamp=entry.get("timestamp"))
        graph_engine.add_edge(cam_id, loc_id, rel_type="LOCATED_AT", confidence=1.0,
                              evidence_ids=[entry["id"]], source="Camera Registry", timestamp=entry.get("timestamp"))
        graph_engine.add_edge(vid, loc_id, rel_type="SEEN_AT", confidence=entry.get("detection_confidence", 0.90),
                              evidence_ids=[entry["id"]], source="CCTV Sighting", timestamp=entry.get("timestamp"))
        edges_created.extend([
            {"from": vid, "to": cam_id, "rel": "SEEN_AT"},
            {"from": cam_id, "to": loc_id, "rel": "LOCATED_AT"},
            {"from": vid, "to": loc_id, "rel": "SEEN_AT"}
        ])

    elif category == "location_record" or category == "location":
        eid = entry.get("entity_id")
        lid = entry.get("location_id") or f"loc-{entry['id']}"
        lname = entry.get("location_name") or lid
        graph_engine.add_node(lid, type="location", label=lname, name=lname)
        nodes_created.append(lid)
        if eid and graph_engine.get_node(eid):
            graph_engine.add_edge(eid, lid, rel_type="VISITED", confidence=0.92,
                                  evidence_ids=[entry["id"]], source="Location GPS Ping", timestamp=entry.get("timestamp"))
            edges_created.append({"from": eid, "to": lid, "rel": "VISITED"})

    integrity_record = None
    try:
        from services.evidence_integrity import integrity_service
        eid = entry.get("id") or f"{category}-{int(datetime.now().timestamp()*1000)}"
        integrity_record = integrity_service.register_evidence(
            evidence_id=eid,
            case_id=entry.get("case_id", "GENERAL_REPOSITORY"),
            evidence_type=category.upper(),
            record_data=entry,
            metadata={"source": "add_dataset_entry", "category": category}
        )
    except Exception as e:
        print(f"[EvidenceIntegrity] Automatic hashing notice: {e}")

    return {
        "status": "success",
        "category": category,
        "entry": entry,
        "integrity": integrity_record,
        "nodes_created": list(set(nodes_created)),
        "edges_created": edges_created,
        "graph_stats": graph_engine.get_stats()
    }

def save_investigation_query(query_dict: Dict[str, Any]):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS investigation_queries (
        id TEXT PRIMARY KEY,
        question TEXT,
        parameters TEXT,
        paths_count INTEGER,
        investigator TEXT,
        timestamp TEXT
    )""")
    c.execute("""INSERT OR REPLACE INTO investigation_queries VALUES (?, ?, ?, ?, ?, ?)""",
              (query_dict["id"], query_dict.get("question",""), json.dumps(query_dict.get("parameters",{})),
               query_dict.get("paths_count", 0), query_dict.get("investigator","Investigator"), datetime.now().isoformat()))
    conn.commit()
    conn.close()

def get_investigation_queries() -> List[Dict]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS investigation_queries (
        id TEXT PRIMARY KEY,
        question TEXT,
        parameters TEXT,
        paths_count INTEGER,
        investigator TEXT,
        timestamp TEXT
    )""")
    c.execute("SELECT * FROM investigation_queries ORDER BY timestamp DESC LIMIT 50")
    rows = c.fetchall()
    conn.close()
    return [{"id": r[0], "question": r[1], "parameters": json.loads(r[2]) if r[2] else {},
             "paths_count": r[3], "investigator": r[4], "timestamp": r[5]} for r in rows]

def add_contradiction(contra_dict: Dict[str, Any]) -> Dict[str, Any]:
    global _data
    if "contradictions" not in _data:
        _data["contradictions"] = []
    existing_ids = {c.get("id") for c in _data["contradictions"]}
    if contra_dict.get("id") not in existing_ids:
        _data["contradictions"].insert(0, contra_dict)
    return contra_dict

# ─────────────────────────────────────────────────────────
# Startup
# ─────────────────────────────────────────────────────────
def initialize():
    global _data
    _data = generate_all()
    init_sqlite()
    _build_graph()
    try:
        from services.evidence_integrity import integrity_service
        integrity_service.initialize_synthetic_evidence_integrity()
    except Exception as e:
        print(f"[DB] Note on initializing evidence integrity: {e}")
    print("[DB] Initialized. Synthetic data loaded.")
    return _data

