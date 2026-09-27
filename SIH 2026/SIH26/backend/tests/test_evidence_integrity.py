"""
Evidence Integrity & Hyperledger Fabric Automated Test Suite
SIH 2026 — EviGraph / NIRVANA

Validates:
  TEST 1: Deterministic SHA-256 calculation (hash same evidence twice -> identical hash)
  TEST 2: Avalanche / tamper effect (modify evidence -> different SHA-256)
  TEST 3: Evidence registration pipeline (creates off-chain storage + SQLite integrity record)
  TEST 4: Verification of unchanged evidence -> VERIFIED
  TEST 5: Tamper detection flow (corrupt evidence off-chain -> TAMPERED)
  TEST 6: Blockchain transaction submission (anchors hash to Hyperledger Fabric layer)
  TEST 7: Blockchain query & state retrieval (retrieves record matching evidence ID + SHA-256)
  TEST 8: End-to-end integration and provenance traceability
"""
import os
import sys
import tempfile
import pytest

# Ensure backend root is on Python sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.evidence_integrity import (
    calculate_sha256,
    calculate_sha256_bytes,
    calculate_record_hash,
    verify_sha256,
    integrity_service
)
from services.blockchain.fabric_client import fabric_client
from services.evidence_storage import storage_service
from data.database import get_evidence_integrity, get_evidence_audit_history

# ─────────────────────────────────────────────────────────
# TEST 1: Hash the same evidence twice -> Identical SHA-256
# ─────────────────────────────────────────────────────────
def test_1_hash_same_evidence_twice():
    sample_content = b"CRIMINAL_NETWORK_INVESTIGATION_CASE_INV_2026_001_CDR_CALL_LOGS_ROW_COUNT_500"
    
    # In-memory hashing
    hash_1 = calculate_sha256_bytes(sample_content)
    hash_2 = calculate_sha256_bytes(sample_content)
    assert hash_1 == hash_2, "Hashes of identical byte streams must be identical"
    assert len(hash_1) == 64, "SHA-256 digest must be exactly 64 hexadecimal characters"

    # Streaming file hashing
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(sample_content)
        tmp_path = tmp.name

    try:
        file_hash_1 = calculate_sha256(tmp_path)
        file_hash_2 = calculate_sha256(tmp_path)
        assert file_hash_1 == file_hash_2
        assert file_hash_1 == hash_1
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    # Canonical record hashing
    sample_record = {"case_id": "INV-2026-001", "caller": "+919876543210", "amount": 250000}
    rec_hash_1 = calculate_record_hash(sample_record)
    rec_hash_2 = calculate_record_hash(sample_record)
    assert rec_hash_1 == rec_hash_2


# ─────────────────────────────────────────────────────────
# TEST 2: Modify evidence -> Different SHA-256
# ─────────────────────────────────────────────────────────
def test_2_modify_evidence_changes_sha256():
    original_data = b"VEHICLE_SIGHTING: White Scorpio TS09-EA-1234 at 18:45"
    tampered_data = b"VEHICLE_SIGHTING: Black Innova TS09-EA-1234 at 18:45"

    original_hash = calculate_sha256_bytes(original_data)
    tampered_hash = calculate_sha256_bytes(tampered_data)

    assert original_hash != tampered_hash, "Modified evidence must produce a completely different SHA-256 digest"

    # Canonical dictionary modification
    rec_original = {"entity": "Suresh Babu", "role": "Kingpin", "threat_score": 0.94}
    rec_modified = {"entity": "Suresh Babu", "role": "Witness", "threat_score": 0.10}

    assert calculate_record_hash(rec_original) != calculate_record_hash(rec_modified)


# ─────────────────────────────────────────────────────────
# TEST 3: Register evidence -> Integrity record created
# ─────────────────────────────────────────────────────────
def test_3_register_evidence_creates_integrity_record():
    ev_id = "test-ev-reg-001"
    raw_content = b"FIR #412/2026 IPC 420/120B Hawala Syndicate Evidence File"
    
    result = integrity_service.register_evidence(
        evidence_id=ev_id,
        case_id="INV-2026-001",
        evidence_type="FIR",
        content=raw_content,
        filename="fir_412_2026.txt",
        investigator="Insp. K. Prasad",
        metadata={"jurisdiction": "Hyderabad Central"}
    )

    assert result["evidence_id"] == ev_id
    assert result["integrity_status"] == "VERIFIED"
    assert result["hash_algorithm"] == "SHA-256"
    assert len(result["sha256"]) == 64
    assert result["fabric_tx_id"] != ""
    assert result["storage_uri"].startswith("vault://")

    # Verify SQLite persistence
    stored = get_evidence_integrity(ev_id)
    assert stored is not None
    assert stored["sha256"] == result["sha256"]
    assert stored["fabric_tx_id"] == result["fabric_tx_id"]


# ─────────────────────────────────────────────────────────
# TEST 4: Verify unchanged evidence -> VERIFIED
# ─────────────────────────────────────────────────────────
def test_4_verify_unchanged_evidence():
    ev_id = "test-ev-verify-002"
    raw_content = b"CDR Logs from Cell Tower #89 Jubilee Hills"
    
    reg_result = integrity_service.register_evidence(
        evidence_id=ev_id,
        case_id="INV-2026-001",
        evidence_type="CDR",
        content=raw_content,
        filename="cdr_tower_89.csv"
    )

    # Verification against vault storage
    verify_result = integrity_service.verify_evidence(ev_id)
    assert verify_result["integrity_status"] == "VERIFIED"
    assert verify_result["is_tampered"] is False
    assert verify_result["expected_sha256"] == verify_result["actual_sha256"]
    assert verify_result["expected_sha256"] == reg_result["sha256"]


# ─────────────────────────────────────────────────────────
# TEST 5: Verify modified evidence -> TAMPERED
# ─────────────────────────────────────────────────────────
def test_5_verify_modified_evidence_reports_tampered():
    ev_id = "test-ev-tamper-003"
    raw_content = b"Banking Ledger Transaction TxID: 884920489 Suresh -> Vikram 1.5Cr"
    
    integrity_service.register_evidence(
        evidence_id=ev_id,
        case_id="INV-2026-002",
        evidence_type="FINANCIAL",
        content=raw_content,
        filename="bank_statement_suresh.csv"
    )

    # Tamper with challenge bytes
    tampered_bytes = b"Banking Ledger Transaction TxID: 884920489 Suresh -> Vikram 1000Rs"
    verify_result = integrity_service.verify_evidence(ev_id, challenge_content=tampered_bytes)

    assert verify_result["integrity_status"] == "TAMPERED"
    assert verify_result["is_tampered"] is True
    assert verify_result["expected_sha256"] != verify_result["actual_sha256"]

    # Verify audit log caught the tamper event
    audit_history = get_evidence_audit_history(ev_id)
    assert len(audit_history) > 0
    tamper_audit = next((a for a in audit_history if a["result"] == "TAMPERED"), None)
    assert tamper_audit is not None
    assert tamper_audit["action"] == "TAMPER_DETECTED_ALERT"


# ─────────────────────────────────────────────────────────
# TEST 6: Blockchain registration -> Fabric transaction
# ─────────────────────────────────────────────────────────
def test_6_blockchain_registration_tx():
    ev_id = "test-ev-blockchain-004"
    test_hash = calculate_sha256_bytes(b"CCTV_CAM_12_FOOTAGE_METADATA")

    tx_record = fabric_client.record_evidence_hash(
        evidence_id=ev_id,
        case_id="INV-2026-001",
        sha256=test_hash,
        algorithm="SHA-256",
        evidence_type="CCTV",
        storage_reference="vault://test-ev-blockchain-004/footage.mp4",
        recorded_by="Insp. K. Prasad",
        action="ANCHOR_CCTV"
    )

    assert "txId" in tx_record
    assert len(tx_record["txId"]) == 64
    assert tx_record["blockNumber"] >= 1000
    assert tx_record["sha256"] == test_hash
    assert tx_record["evidenceId"] == ev_id


# ─────────────────────────────────────────────────────────
# TEST 7: Retrieve blockchain evidence record
# ─────────────────────────────────────────────────────────
def test_7_retrieve_blockchain_evidence_record():
    ev_id = "test-ev-blockchain-004"
    record = fabric_client.get_evidence_hash(ev_id)

    assert record is not None
    assert record["evidenceId"] == ev_id
    assert "sha256" in record
    assert len(record["sha256"]) == 64
    assert record["storageReference"] == "vault://test-ev-blockchain-004/footage.mp4"

    # Verify via fabric client
    verify_on_chain = fabric_client.verify_evidence_hash(ev_id, record["sha256"])
    assert verify_on_chain["status"] == "VERIFIED"
    assert verify_on_chain["is_tampered"] is False

    # Tampered challenge on-chain
    corrupted_challenge = "0" * 64
    tamper_on_chain = fabric_client.verify_evidence_hash(ev_id, corrupted_challenge)
    assert tamper_on_chain["status"] == "TAMPERED"
    assert tamper_on_chain["is_tampered"] is True


# ─────────────────────────────────────────────────────────
# TEST 8: Full Lifecycle & Tamper Simulation Utility
# ─────────────────────────────────────────────────────────
def test_8_tamper_simulation_and_recovery():
    ev_id = "test-ev-sim-005"
    content = b"Confidential Intercept Transcript: Operation Nightfall"

    integrity_service.register_evidence(
        evidence_id=ev_id,
        case_id="INV-2026-001",
        evidence_type="INTERCEPT",
        content=content,
        filename="intercept_005.txt"
    )

    # Initially verified
    assert integrity_service.verify_evidence(ev_id)["integrity_status"] == "VERIFIED"

    # Simulate physical file corruption in off-chain vault
    tamper_sim = integrity_service.tamper_test(ev_id, simulate_tamper=True)
    assert tamper_sim["status"] == "tampered_simulated"

    # Re-verifying must detect tamper
    check_tamper = integrity_service.verify_evidence(ev_id)
    assert check_tamper["integrity_status"] == "TAMPERED"

    # Restore to original
    restore_sim = integrity_service.tamper_test(ev_id, simulate_tamper=False)
    assert restore_sim["status"] == "restored"

    # Verification passes again
    check_restored = integrity_service.verify_evidence(ev_id)
    assert check_restored["integrity_status"] == "VERIFIED"
