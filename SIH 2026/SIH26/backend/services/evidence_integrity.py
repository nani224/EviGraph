"""
Evidence Integrity Service — EviGraph / NIRVANA
Implements Section 65B-compliant cryptographic evidence integrity and tamper detection:
  1. Real SHA-256 deterministic fingerprinting (Python standard library hashlib)
  2. Streaming file hashing for large CCTV/CDR evidence
  3. Canonical JSON hashing for structured records
  4. Off-chain raw evidence vault integration
  5. Hyperledger Fabric permissioned blockchain anchoring
  6. Real verification and tamper detection (MATCH -> VERIFIED, MISMATCH -> TAMPERED)
  7. Append-only SQLite audit trail
"""
import os
import json
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional, Union

from services.evidence_storage import storage_service
from services.blockchain.fabric_client import fabric_client
from data.database import (
    save_evidence_integrity,
    get_evidence_integrity,
    get_all_evidence_integrity,
    update_evidence_integrity_status,
    record_integrity_audit,
    get_evidence_audit_history,
    get_collection
)

# ─────────────────────────────────────────────────────────
# CORE SHA-256 HASHING UTILITIES (Python hashlib)
# ─────────────────────────────────────────────────────────

def calculate_sha256(file_path: str) -> str:
    """
    Computes deterministic SHA-256 digest of a file using 64KB streaming chunks.
    Ensures safe, low-memory hashing of large CCTV video files and voluminous CDR archives.
    """
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        raise FileNotFoundError(f"Evidence file not found: {file_path}")

    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest().lower()

def calculate_sha256_bytes(data: bytes) -> str:
    """
    Computes deterministic SHA-256 digest of in-memory bytes.
    """
    return hashlib.sha256(data).hexdigest().lower()

def get_canonical_record_bytes(record: Dict[str, Any]) -> bytes:
    """
    Returns deterministic canonical JSON bytes with sorted keys and compact separators.
    """
    filtered = {
        k: v for k, v in record.items()
        if k not in ["sha256", "integrity_status", "verified_at", "fabric_tx_id", "fabric_block_number", "integrity"]
    }
    canonical_json = json.dumps(filtered, sort_keys=True, separators=(',', ':'), default=str)
    return canonical_json.encode("utf-8")

def calculate_record_hash(record: Dict[str, Any]) -> str:
    """
    Computes deterministic canonical SHA-256 digest for structured evidence records
    (when no physical file is present). Keys are sorted and whitespace is stripped.
    """
    return hashlib.sha256(get_canonical_record_bytes(record)).hexdigest().lower()

def verify_sha256(target: Union[str, bytes, Dict[str, Any]], expected_hash: str) -> bool:
    """
    Verifies that target matches expected SHA-256 hash.
    Target can be file path (str), raw bytes, or a structured dictionary.
    """
    if isinstance(target, bytes):
        actual = calculate_sha256_bytes(target)
    elif isinstance(target, dict):
        actual = calculate_record_hash(target)
    elif isinstance(target, str):
        if os.path.exists(target) and os.path.isfile(target):
            actual = calculate_sha256(target)
        else:
            # String payload
            actual = calculate_sha256_bytes(target.encode("utf-8"))
    else:
        return False

    return actual.lower() == expected_hash.strip().lower()


# ─────────────────────────────────────────────────────────
# EVIDENCE INTEGRITY SERVICE
# ─────────────────────────────────────────────────────────

class EvidenceIntegrityService:
    def __init__(self):
        self.storage = storage_service
        self.blockchain = fabric_client

    def register_evidence(
        self,
        evidence_id: str,
        case_id: str,
        evidence_type: str,
        file_path: Optional[str] = None,
        content: Optional[bytes] = None,
        record_data: Optional[Dict[str, Any]] = None,
        filename: Optional[str] = None,
        investigator: str = "Insp. K. Prasad",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Registers evidence into the integrity pipeline:
          1. Computes deterministic SHA-256
          2. Preserves raw payload in off-chain vault
          3. Anchors cryptographic fingerprint into Hyperledger Fabric
          4. Persists metadata and indexes into SQLite
          5. Records immutable audit event
        """
        storage_ref = ""
        storage_path = ""
        actual_filename = filename or f"{evidence_id}.dat"

        # 1. Calculate SHA-256 and store off-chain
        if content is not None:
            sha256 = calculate_sha256_bytes(content)
            store_res = self.storage.store_evidence(evidence_id, actual_filename, content)
            storage_ref = store_res["storage_reference"]
            storage_path = store_res["storage_path"]
        elif file_path and os.path.exists(file_path):
            sha256 = calculate_sha256(file_path)
            store_res = self.storage.store_file_from_path(evidence_id, file_path)
            storage_ref = store_res["storage_reference"]
            storage_path = store_res["storage_path"]
        elif record_data:
            canonical_bytes = get_canonical_record_bytes(record_data)
            sha256 = calculate_sha256_bytes(canonical_bytes)
            # Store canonical JSON in off-chain vault as well
            store_res = self.storage.store_evidence(evidence_id, f"{evidence_id}.json", canonical_bytes)
            storage_ref = store_res["storage_reference"]
            storage_path = store_res["storage_path"]
        else:
            raise ValueError("Must provide file_path, content, or record_data to register evidence.")

        recorded_at = datetime.now().isoformat()

        # 2. Anchor to Hyperledger Fabric
        tx_record = self.blockchain.record_evidence_hash(
            evidence_id=evidence_id,
            case_id=case_id or "GENERAL_REPOSITORY",
            sha256=sha256,
            algorithm="SHA-256",
            evidence_type=evidence_type,
            storage_reference=storage_ref,
            recorded_by=investigator,
            action="RECORD_EVIDENCE_HASH",
            metadata=metadata
        )

        fabric_tx_id = tx_record.get("txId", "")
        fabric_block_number = tx_record.get("blockNumber", 0)

        # 3. Save to SQLite database
        integrity_record = {
            "id": f"integ-{evidence_id}",
            "evidence_id": evidence_id,
            "case_id": case_id or "GENERAL_REPOSITORY",
            "sha256": sha256,
            "hash_algorithm": "SHA-256",
            "storage_uri": storage_ref,
            "fabric_tx_id": fabric_tx_id,
            "fabric_block_number": fabric_block_number,
            "recorded_at": recorded_at,
            "verified_at": recorded_at,
            "integrity_status": "VERIFIED",
            "blockchain_status": "RECORDED",
            "evidence_type": evidence_type,
            "metadata": {
                **(metadata or {}),
                "filename": actual_filename,
                "storage_path": storage_path,
                "investigator": investigator,
                "blockchain_mode": self.blockchain.mode
            }
        }
        save_evidence_integrity(integrity_record)

        # 4. Record Audit Log
        record_integrity_audit({
            "action": "EVIDENCE_REGISTERED_AND_ANCHORED",
            "case_id": case_id,
            "evidence_id": evidence_id,
            "investigator": investigator,
            "result": "VERIFIED",
            "metadata": {
                "sha256": sha256,
                "fabric_tx_id": fabric_tx_id,
                "fabric_block_number": fabric_block_number,
                "storage_uri": storage_ref
            }
        })

        return integrity_record

    def verify_evidence(
        self,
        evidence_id: str,
        challenge_content: Optional[bytes] = None,
        challenge_file_path: Optional[str] = None,
        investigator: str = "Insp. K. Prasad"
    ) -> Dict[str, Any]:
        """
        Executes real verification against both SQLite metadata and Hyperledger Fabric:
          1. Retrieves stored record and blockchain block
          2. Recalculates current SHA-256 digest from off-chain storage or challenge payload
          3. Compares expected SHA-256 vs actual SHA-256
          4. Returns VERIFIED if identical, TAMPERED if mismatched
          5. Updates status and logs audit event
        """
        stored = get_evidence_integrity(evidence_id)
        if not stored:
            return {
                "evidence_id": evidence_id,
                "integrity_status": "NOT_FOUND",
                "message": f"No integrity record found for evidence {evidence_id}",
                "timestamp": datetime.now().isoformat()
            }

        expected_sha256 = stored["sha256"]

        # Recalculate hash
        actual_sha256 = ""
        if challenge_content is not None:
            actual_sha256 = calculate_sha256_bytes(challenge_content)
        elif challenge_file_path and os.path.exists(challenge_file_path):
            actual_sha256 = calculate_sha256(challenge_file_path)
        else:
            # Retrieve from off-chain vault
            storage_ref = stored.get("storage_uri")
            file_path = self.storage.get_file_path(storage_ref) if storage_ref else None
            if file_path and os.path.exists(file_path):
                if file_path.endswith('.json'):
                    try:
                        with open(file_path, "r", encoding="utf-8") as jf:
                            parsed_json = json.load(jf)
                        raw_hash = calculate_sha256(file_path)
                        if raw_hash.lower() == expected_sha256.lower():
                            actual_sha256 = raw_hash
                        else:
                            # Recompute canonical record hash
                            actual_sha256 = calculate_record_hash(parsed_json)
                    except Exception:
                        # Malformed or corrupted bytes (tampering detected)
                        actual_sha256 = calculate_sha256(file_path)
                else:
                    actual_sha256 = calculate_sha256(file_path)
            else:
                # If file not in vault, verify against canonical record in collection
                rec = self._find_raw_evidence_record(evidence_id)
                if rec:
                    actual_sha256 = calculate_record_hash(rec)
                else:
                    # Never hardcode or assume a match if physical evidence payload is missing
                    actual_sha256 = ""

        is_match = bool(actual_sha256 and (actual_sha256.lower() == expected_sha256.lower()))
        integrity_status = "VERIFIED" if is_match else "TAMPERED"
        verified_at = datetime.now().isoformat()

        # Update status in SQLite
        update_evidence_integrity_status(evidence_id, integrity_status, verified_at)

        # Also verify with Fabric
        fabric_res = self.blockchain.verify_evidence_hash(evidence_id, actual_sha256)

        # Audit event
        audit_action = "INTEGRITY_VERIFIED_SUCCESS" if is_match else "TAMPER_DETECTED_ALERT"
        record_integrity_audit({
            "action": audit_action,
            "case_id": stored.get("case_id"),
            "evidence_id": evidence_id,
            "investigator": investigator,
            "result": integrity_status,
            "metadata": {
                "expected_sha256": expected_sha256,
                "actual_sha256": actual_sha256,
                "fabric_tx_id": stored.get("fabric_tx_id"),
                "is_match": is_match
            }
        })

        return {
            "evidence_id": evidence_id,
            "case_id": stored.get("case_id"),
            "integrity_status": integrity_status,
            "is_tampered": not is_match,
            "sha256": expected_sha256,
            "expected_sha256": expected_sha256,
            "actual_sha256": actual_sha256,
            "algorithm": stored.get("hash_algorithm", "SHA-256"),
            "blockchain_status": stored.get("blockchain_status", "RECORDED"),
            "blockchain_mode": self.blockchain.mode,
            "fabric_tx_id": stored.get("fabric_tx_id"),
            "fabric_block_number": stored.get("fabric_block_number"),
            "recorded_at": stored.get("recorded_at"),
            "verified_at": verified_at,
            "storage_uri": stored.get("storage_uri"),
            "fabric_verification": fabric_res
        }

    def tamper_test(self, evidence_id: str, simulate_tamper: bool = True) -> Dict[str, Any]:
        """
        Test / Demonstration utility:
        Simulates file tampering by corrupting the off-chain vault file or payload,
        or restores it to original. Allows investigators and judges to witness live tamper detection.
        """
        stored = get_evidence_integrity(evidence_id)
        if not stored:
            return {"error": f"Evidence {evidence_id} not found"}

        storage_ref = stored.get("storage_uri", "")
        file_path = self.storage.get_file_path(storage_ref)

        if not file_path or not os.path.exists(file_path):
            # Create a vault file if absent to simulate
            dummy_content = f"Evidence ID: {evidence_id} canonical content.".encode("utf-8")
            res = self.storage.store_evidence(evidence_id, f"{evidence_id}.txt", dummy_content)
            file_path = res["storage_path"]
            storage_ref = res["storage_reference"]

        backup_path = f"{file_path}.original_backup"

        if simulate_tamper:
            if not os.path.exists(backup_path):
                import shutil
                shutil.copy2(file_path, backup_path)
            # Inject tampered byte
            with open(file_path, "ab") as f:
                f.write(b"\n[MALICIOUS_TAMPER_INJECTION_UNAUTHORIZED_MODIFICATION]")
            tampered_hash = calculate_sha256(file_path)
            return {
                "status": "tampered_simulated",
                "evidence_id": evidence_id,
                "message": "Evidence file corrupted off-chain. Run verify to see TAMPERED detection.",
                "original_sha256": stored["sha256"],
                "tampered_file_sha256": tampered_hash
            }
        else:
            # Restore original
            if os.path.exists(backup_path):
                import shutil
                shutil.copy2(backup_path, file_path)
                os.remove(backup_path)
            restored_hash = calculate_sha256(file_path)
            update_evidence_integrity_status(evidence_id, "VERIFIED")
            return {
                "status": "restored",
                "evidence_id": evidence_id,
                "message": "Original evidence file restored. Integrity verification will now pass.",
                "restored_sha256": restored_hash
            }

    def get_integrity_summary(self, case_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns statistical summary for Dashboard and security badges.
        """
        all_records = get_all_evidence_integrity(case_id)
        total = len(all_records)
        verified = sum(1 for r in all_records if r.get("integrity_status") == "VERIFIED")
        tampered = sum(1 for r in all_records if r.get("integrity_status") == "TAMPERED")
        pending = sum(1 for r in all_records if r.get("integrity_status") == "PENDING")
        anchored = sum(1 for r in all_records if r.get("blockchain_status") == "RECORDED")

        return {
            "total_evidence_records": total,
            "sha256_registered": total,
            "fabric_anchored": anchored,
            "verified": verified,
            "tampered": tampered,
            "pending": pending,
            "blockchain_mode": self.blockchain.mode,
            "blockchain_healthy": self.blockchain.health_check().get("connected", True)
        }

    def _find_raw_evidence_record(self, evidence_id: str) -> Optional[Dict[str, Any]]:
        """
        Finds raw record from in-memory collections by ID.
        """
        for coll in ["cdrs", "transactions", "cctv_observations", "firs", "location_records"]:
            items = get_collection(coll)
            for item in items:
                if item.get("id") == evidence_id:
                    return item
        return None

    def initialize_synthetic_evidence_integrity(self):
        """
        Ensures all existing synthetic demo evidence items have real calculated SHA-256 digests
        anchored in SQLite and Fabric. Called during system startup.
        """
        print("[EvidenceIntegrity] Generating deterministic SHA-256 fingerprints & Fabric anchoring for synthetic evidence...")
        count = 0
        
        collections_map = {
            "cdrs": ("CDR", "INV-2026-001"),
            "transactions": ("Financial", "INV-2026-002"),
            "cctv_observations": ("CCTV", "INV-2026-001"),
            "firs": ("FIR", "INV-2026-001"),
            "location_records": ("Location", "INV-2026-001")
        }

        for coll, (ev_type, default_case) in collections_map.items():
            items = get_collection(coll)
            for item in items:
                eid = item.get("id")
                if not eid:
                    continue
                # If already registered, skip
                if get_evidence_integrity(eid):
                    continue

                case_id = item.get("case_id") or default_case
                # Calculate real canonical SHA-256 for the record
                canonical_bytes = get_canonical_record_bytes(item)
                sha256 = calculate_sha256_bytes(canonical_bytes)
                
                # Store representation off-chain
                store_res = self.storage.store_evidence(eid, f"{eid}.json", canonical_bytes)
                
                # Anchor in Fabric
                tx_record = self.blockchain.record_evidence_hash(
                    evidence_id=eid,
                    case_id=case_id,
                    sha256=sha256,
                    algorithm="SHA-256",
                    evidence_type=ev_type,
                    storage_reference=store_res["storage_reference"],
                    recorded_by="System Genesis Provenance",
                    action="INITIAL_SYNTHETIC_ANCHOR"
                )

                # Persist in SQLite
                save_evidence_integrity({
                    "id": f"integ-{eid}",
                    "evidence_id": eid,
                    "case_id": case_id,
                    "sha256": sha256,
                    "hash_algorithm": "SHA-256",
                    "storage_uri": store_res["storage_reference"],
                    "fabric_tx_id": tx_record.get("txId", ""),
                    "fabric_block_number": tx_record.get("blockNumber", 0),
                    "recorded_at": item.get("timestamp") or datetime.now().isoformat(),
                    "verified_at": datetime.now().isoformat(),
                    "integrity_status": "VERIFIED",
                    "blockchain_status": "RECORDED",
                    "evidence_type": ev_type,
                    "metadata": {
                        "source": coll,
                        "description": item.get("description") or f"{ev_type} record {eid}",
                        "blockchain_mode": self.blockchain.mode
                    }
                })
                count += 1

        print(f"[EvidenceIntegrity] Anchored {count} evidence items with real SHA-256 & Fabric transactions.")

integrity_service = EvidenceIntegrityService()
