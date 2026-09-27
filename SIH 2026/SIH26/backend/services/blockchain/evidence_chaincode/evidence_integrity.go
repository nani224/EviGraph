/*
SPDX-License-Identifier: Apache-2.0
Hyperledger Fabric Smart Contract — EviGraph / NIRVANA
Evidence Integrity & Cryptographic Provenance Chaincode

Ensures immutable tamper-evident anchoring of criminal network evidence fingerprints.
Sensitive raw evidence (CCTV, audio, large logs) remains OFF-CHAIN.
Only cryptographic SHA-256 hashes, storage references, and provenance metadata are committed to the ledger.
*/

package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing evidence integrity
type SmartContract struct {
	contractapi.Contract
}

// EvidenceIntegrityRecord describes the on-chain metadata for an evidence asset
type EvidenceIntegrityRecord struct {
	EvidenceID       string `json:"evidenceId"`
	CaseID           string `json:"caseId"`
	SHA256           string `json:"sha256"`
	Algorithm        string `json:"algorithm"`
	Timestamp        string `json:"timestamp"`
	EvidenceType     string `json:"evidenceType"`
	StorageReference string `json:"storageReference"`
	RecordedBy       string `json:"recordedBy"`
	Action           string `json:"action"`
	TxID             string `json:"txId"`
}

// VerificationResult describes the outcome of an integrity challenge
type VerificationResult struct {
	EvidenceID      string `json:"evidenceId"`
	Status          string `json:"status"` // VERIFIED or TAMPERED
	ExpectedSHA256  string `json:"expectedSha256"`
	ChallengeSHA256 string `json:"challengeSha256"`
	IsTampered      bool   `json:"isTampered"`
	VerifiedAt      string `json:"verifiedAt"`
	TxID            string `json:"txId"`
}

// HistoryQueryResult structure used for returning result of history query
type HistoryQueryResult struct {
	TxID      string                  `json:"txId"`
	Timestamp string                  `json:"timestamp"`
	IsDelete  bool                    `json:"isDelete"`
	Record    EvidenceIntegrityRecord `json:"record"`
}

// InitLedger initializes the chaincode
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("EviGraph Evidence Integrity Smart Contract initialized.")
	return nil
}

// RecordEvidenceHash registers a cryptographic fingerprint and off-chain storage pointer
func (s *SmartContract) RecordEvidenceHash(
	ctx contractapi.TransactionContextInterface,
	evidenceID string,
	caseID string,
	sha256 string,
	algorithm string,
	evidenceType string,
	storageReference string,
	recordedBy string,
	action string,
) error {
	if len(evidenceID) == 0 {
		return fmt.Errorf("evidenceID must not be empty")
	}
	if len(sha256) != 64 {
		return fmt.Errorf("invalid SHA-256 length: expected 64 hex characters, got %d", len(sha256))
	}

	exists, err := s.EvidenceExists(ctx, evidenceID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("evidence with ID %s already anchored on-chain; evidence hashes are append-only and immutable", evidenceID)
	}

	txID := ctx.GetStub().GetTxID()
	timestamp, err := ctx.GetStub().GetTxTimestamp()
	tsStr := time.Now().UTC().Format(time.RFC3339)
	if err == nil && timestamp != nil {
		tsStr = time.Unix(timestamp.Seconds, int64(timestamp.Nanos)).UTC().Format(time.RFC3339)
	}

	record := EvidenceIntegrityRecord{
		EvidenceID:       evidenceID,
		CaseID:           caseID,
		SHA256:           sha256,
		Algorithm:        algorithm,
		Timestamp:        tsStr,
		EvidenceType:     evidenceType,
		StorageReference: storageReference,
		RecordedBy:       recordedBy,
		Action:           action,
		TxID:             txID,
	}

	recordJSON, err := json.Marshal(record)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(evidenceID, recordJSON)
	if err != nil {
		return err
	}

	// Emit event for off-chain listeners
	return ctx.GetStub().SetEvent("EvidenceHashRecorded", recordJSON)
}

// GetEvidenceHash retrieves the anchored evidence record by ID
func (s *SmartContract) GetEvidenceHash(ctx contractapi.TransactionContextInterface, evidenceID string) (*EvidenceIntegrityRecord, error) {
	recordJSON, err := ctx.GetStub().GetState(evidenceID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if recordJSON == nil {
		return nil, fmt.Errorf("evidence record %s does not exist on-chain", evidenceID)
	}

	var record EvidenceIntegrityRecord
	err = json.Unmarshal(recordJSON, &record)
	if err != nil {
		return nil, err
	}

	return &record, nil
}

// VerifyEvidenceHash validates an off-chain challenge hash against the immutable ledger
func (s *SmartContract) VerifyEvidenceHash(
	ctx contractapi.TransactionContextInterface,
	evidenceID string,
	challengeSHA256 string,
) (*VerificationResult, error) {
	record, err := s.GetEvidenceHash(ctx, evidenceID)
	if err != nil {
		return nil, err
	}

	isMatch := (record.SHA256 == challengeSHA256)
	status := "VERIFIED"
	if !isMatch {
		status = "TAMPERED"
	}

	result := &VerificationResult{
		EvidenceID:      evidenceID,
		Status:          status,
		ExpectedSHA256:  record.SHA256,
		ChallengeSHA256: challengeSHA256,
		IsTampered:      !isMatch,
		VerifiedAt:      time.Now().UTC().Format(time.RFC3339),
		TxID:            ctx.GetStub().GetTxID(),
	}

	return result, nil
}

// GetEvidenceHistory returns the complete audit trail and state changes for an evidence key
func (s *SmartContract) GetEvidenceHistory(ctx contractapi.TransactionContextInterface, evidenceID string) ([]HistoryQueryResult, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(evidenceID)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []HistoryQueryResult
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var evidenceRecord EvidenceIntegrityRecord
		if len(response.Value) > 0 {
			err = json.Unmarshal(response.Value, &evidenceRecord)
			if err != nil {
				return nil, err
			}
		}

		timestamp := time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)).UTC().Format(time.RFC3339)
		record := HistoryQueryResult{
			TxID:      response.TxId,
			Timestamp: timestamp,
			IsDelete:  response.IsDelete,
			Record:    evidenceRecord,
		}
		records = append(records, record)
	}

	return records, nil
}

// EvidenceExists returns true if record with given ID exists in world state
func (s *SmartContract) EvidenceExists(ctx contractapi.TransactionContextInterface, evidenceID string) (bool, error) {
	recordJSON, err := ctx.GetStub().GetState(evidenceID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return recordJSON != nil, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating evidence integrity chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting evidence integrity chaincode: %s", err.Error())
	}
}
