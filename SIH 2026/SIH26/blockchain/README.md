# EviGraph / NIRVANA — Hyperledger Fabric Blockchain Architecture

## Overview
EviGraph integrates with **Hyperledger Fabric**, an enterprise permissioned distributed ledger, to provide **tamper-evident evidence integrity anchoring** for criminal investigations (Section 65B Indian Evidence Act compliant).

### Architecture Principle: Sensitive Evidence Remains OFF-CHAIN
- **OFF-CHAIN Vault**: Large CCTV MP4 videos, high-resolution imagery, full CDR call spreadsheets, and sensitive police files remain off-chain in encrypted local or MinIO/S3 object storage.
- **ON-CHAIN Fabric Ledger**: Only records the 256-bit cryptographic digest (SHA-256), canonical metadata, storage URI reference, investigator identity, and transaction timestamp.
- **SQLite Database**: Serves as the primary operational database for UI responsiveness, graph queries, investigator decisions, and application indices.

```
Evidence File / Record
        ↓
SHA-256 Hashing (Standard Library hashlib)
        ↓
Off-Chain Storage (Vault Reference URI)
        ↓
Application SQLite (Indexes & Audit Trail)
        ↓
Hyperledger Fabric (Immutable Append-Only Block)
        ↓
Verification & Tamper Detection:
Recalculate SHA-256 == Ledger Hash ? VERIFIED : TAMPERED
```

---

## Running Hyperledger Fabric

### 1. Starting the Test Network
```bash
cd blockchain
docker-compose up -d
```
Or on Windows PowerShell:
```powershell
.\blockchain\scripts\start_network.ps1
```

### 2. Deploying the Evidence Integrity Chaincode
```bash
./blockchain/scripts/deploy_chaincode.sh
```

### 3. Configuring the Backend
Set environment variable in your terminal or `.env`:
```bash
# To target the live Fabric network:
BLOCKCHAIN_MODE=fabric
FABRIC_PEER_ENDPOINT=localhost:7051
FABRIC_CHANNEL=evigraph-channel
FABRIC_CHAINCODE=evidence_integrity

# For standalone local development without Docker:
BLOCKCHAIN_MODE=local
```

### 4. Running the Backend & Testing
```bash
cd backend
python main.py
```

### 5. Running Automated Integrity Tests
```bash
pytest tests/test_evidence_integrity.py -v
```

---

## Chaincode Contract Functions (`evidence_chaincode`)

| Function | Parameters | Description |
| :--- | :--- | :--- |
| `RecordEvidenceHash` | `evidenceId, caseId, sha256, algorithm, evidenceType, storageReference, recordedBy, action` | Commits SHA-256 fingerprint to ledger world state and emits event. |
| `GetEvidenceHash` | `evidenceId` | Reads the anchored record from ledger world state. |
| `VerifyEvidenceHash` | `evidenceId, challengeHash` | Evaluates ledger hash against challenge hash; returns `VERIFIED` or `TAMPERED`. |
| `GetEvidenceHistory` | `evidenceId` | Returns the complete chronological block history for an evidence item. |
