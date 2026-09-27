"""
Hyperledger Fabric Blockchain Integration Package — EviGraph / NIRVANA
Provides permissioned distributed ledger integration for evidence integrity & provenance anchoring.
"""
from .fabric_client import fabric_client, FabricClient

__all__ = ["fabric_client", "FabricClient"]
