# EviGraph / NIRVANA - Start Hyperledger Fabric Development Network (PowerShell)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Hyperledger Fabric Test Network for EviGraph" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
    Write-Warning "Docker is not installed or not in PATH."
    Write-Host "[*] Standalone Development: Set BLOCKCHAIN_MODE=local in backend environment." -ForegroundColor Yellow
    exit 1
}

Push-Location (Split-Path -Parent $PSScriptRoot)
docker compose up -d
Pop-Location

Write-Host "[✓] Hyperledger Fabric containers active." -ForegroundColor Green
Write-Host "    - Orderer: localhost:7050" -ForegroundColor Gray
Write-Host "    - Org1 Peer: localhost:7051" -ForegroundColor Gray
Write-Host "    - CLI Container: evigraph_cli" -ForegroundColor Gray
