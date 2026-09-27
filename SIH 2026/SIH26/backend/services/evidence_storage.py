"""
Off-Chain Evidence Storage Service — EviGraph / NIRVANA
Manages off-chain storage for sensitive raw evidence (CCTV videos, high-res images,
CDR logs, bank statements, FIR documents).

Raw evidence is stored off-chain (local vault or MinIO/S3 compatible storage).
Only cryptographic SHA-256 hashes and storage references are committed to SQLite and Hyperledger Fabric.
"""
import os
import shutil
from typing import Optional, Dict, Any

VAULT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "offchain_vault"))
os.makedirs(VAULT_DIR, exist_ok=True)

class EvidenceStorageService:
    def __init__(self, base_dir: str = VAULT_DIR):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def get_storage_path(self, evidence_id: str, filename: str) -> str:
        safe_evidence_id = evidence_id.replace("/", "_").replace("\\", "_")
        safe_filename = os.path.basename(filename)
        evidence_folder = os.path.join(self.base_dir, safe_evidence_id)
        os.makedirs(evidence_folder, exist_ok=True)
        return os.path.join(evidence_folder, safe_filename)

    def get_storage_reference(self, evidence_id: str, filename: str) -> str:
        safe_evidence_id = evidence_id.replace("/", "_").replace("\\", "_")
        safe_filename = os.path.basename(filename)
        return f"vault://{safe_evidence_id}/{safe_filename}"

    def store_evidence(self, evidence_id: str, filename: str, content: bytes) -> Dict[str, Any]:
        """
        Stores binary or text evidence off-chain.
        Returns storage metadata including off-chain URI.
        """
        file_path = self.get_storage_path(evidence_id, filename)
        with open(file_path, "wb") as f:
            f.write(content)

        return {
            "evidence_id": evidence_id,
            "filename": filename,
            "storage_path": file_path,
            "storage_reference": self.get_storage_reference(evidence_id, filename),
            "size_bytes": len(content),
            "is_offchain": True
        }

    def store_file_from_path(self, evidence_id: str, source_path: str) -> Dict[str, Any]:
        """
        Copies an existing file into the off-chain vault.
        """
        filename = os.path.basename(source_path)
        dest_path = self.get_storage_path(evidence_id, filename)
        shutil.copy2(source_path, dest_path)
        size = os.path.getsize(dest_path)
        return {
            "evidence_id": evidence_id,
            "filename": filename,
            "storage_path": dest_path,
            "storage_reference": self.get_storage_reference(evidence_id, filename),
            "size_bytes": size,
            "is_offchain": True
        }

    def get_evidence(self, storage_reference: str) -> Optional[bytes]:
        """
        Retrieves off-chain evidence bytes using its storage reference.
        """
        if not storage_reference.startswith("vault://"):
            return None
        rel_path = storage_reference[len("vault://"):]
        full_path = os.path.join(self.base_dir, rel_path.replace("/", os.sep))
        if os.path.exists(full_path) and os.path.isfile(full_path):
            with open(full_path, "rb") as f:
                return f.read()
        return None

    def get_file_path(self, storage_reference: str) -> Optional[str]:
        if not storage_reference.startswith("vault://"):
            return None
        rel_path = storage_reference[len("vault://"):]
        full_path = os.path.join(self.base_dir, rel_path.replace("/", os.sep))
        if os.path.exists(full_path):
            return full_path
        return None

storage_service = EvidenceStorageService()
