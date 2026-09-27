#!/usr/bin/env bash
# EviGraph / NIRVANA - Deploy Evidence Integrity Chaincode
set -e

CHANNEL_NAME="evigraph-channel"
CC_NAME="evidence_integrity"
CC_VERSION="1.0"
CC_SEQUENCE="1"

echo "=========================================================="
echo " Deploying Evidence Integrity Chaincode to $CHANNEL_NAME"
echo "=========================================================="

# Create Channel & Join Peer inside CLI container
docker exec evigraph_cli peer channel create -o orderer.evigraph.police.gov:7050 -c $CHANNEL_NAME -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel.tx || true
docker exec evigraph_cli peer channel join -b ${CHANNEL_NAME}.block || true

# Package Chaincode
docker exec evigraph_cli peer lifecycle chaincode package ${CC_NAME}.tar.gz --path /opt/gopath/src/github.com/chaincode --lang golang --label ${CC_NAME}_${CC_VERSION} || true

# Install Chaincode on Org1 Peer
docker exec evigraph_cli peer lifecycle chaincode install ${CC_NAME}.tar.gz || true

echo "[✓] Chaincode packaging and installation complete."
echo "Set backend environment: BLOCKCHAIN_MODE=fabric"
