#!/usr/bin/env bash
# EviGraph / NIRVANA - Start Hyperledger Fabric Development Network
set -e

echo "=========================================================="
echo " Starting Hyperledger Fabric Test Network for EviGraph"
echo "=========================================================="

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR/.."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "[!] Docker not found. Please install Docker to run live Fabric."
    echo "[*] Fallback: Set BLOCKCHAIN_MODE=local in backend environment."
    exit 1
fi

docker-compose up -d

echo "[✓] Hyperledger Fabric containers started."
echo "    - Orderer: localhost:7050"
echo "    - Org1 Peer: localhost:7051"
echo "    - CLI Container: evigraph_cli"
echo ""
echo "Next step: Run ./scripts/deploy_chaincode.sh to install evidence_integrity chaincode."
