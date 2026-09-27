"""
Base Dataset Adapter
Enforces normalized entity and temporal schemas, dataset namespace isolation,
and rigorous evidence provenance tracking.
"""
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
import datetime

class NormalizedTemporal(BaseModel):
    original_timestamp: str
    normalized_datetime: Optional[str] = None
    timestamp_precision: str = "second"  # second, minute, day, frame, relative
    timezone: str = "UTC"
    timestamp_status: str = "valid"  # valid, relative, missing, ambiguous
    timestamp_source: str = "header"
    timestamp_confidence: float = 1.0

class NormalizedEntity(BaseModel):
    id: str
    namespace_id: str
    type: str  # PERSON, PHONE, VEHICLE, LOCATION, ACCOUNT, ORGANIZATION, CRIME, EVENT, CAMERA, FIR, EVIDENCE
    source_dataset: str
    source_record_id: str
    label: str
    confidence: float = 1.0
    attributes: Dict[str, Any] = Field(default_factory=dict)
    is_public_research: bool = True

class NormalizedRelationship(BaseModel):
    source_id: str
    target_id: str
    type: str
    source_dataset: str
    source_record_id: str
    timestamp: Optional[str] = None
    confidence: float = 1.0
    extraction_method: str = "dataset_direct"
    evidence_trail: List[Dict[str, Any]] = Field(default_factory=list)

class ProcessingResult(BaseModel):
    dataset_id: str
    dataset_name: str
    records_loaded: int
    records_valid: int
    records_invalid: int
    missing_timestamps: int
    missing_locations: int
    entities_extracted: int
    relationships_extracted: int
    processing_time_ms: float
    model_metrics: Dict[str, Any] = Field(default_factory=dict)
    sample_entities: List[Dict[str, Any]] = Field(default_factory=list)
    sample_relationships: List[Dict[str, Any]] = Field(default_factory=list)

class BaseAdapter:
    """Base class for all public and synthetic dataset adapters."""
    def __init__(self, dataset_id: str, namespace_prefix: str, dataset_name: str):
        self.dataset_id = dataset_id
        self.namespace_prefix = namespace_prefix
        self.dataset_name = dataset_name

    def format_id(self, local_id: str) -> str:
        """Enforces namespace isolation (e.g. PUBLIC_REALITY:P001)"""
        return f"{self.namespace_prefix}:{local_id}"

    def normalize_temporal(self, raw_time: Any, time_type: str = "datetime") -> NormalizedTemporal:
        """Safely normalizes timestamps without fabricating dates."""
        if raw_time is None or str(raw_time).strip() == "":
            return NormalizedTemporal(
                original_timestamp="MISSING",
                normalized_datetime=None,
                timestamp_status="missing",
                timestamp_precision="unknown",
                timestamp_confidence=0.0
            )

        if time_type == "relative_seconds":
            return NormalizedTemporal(
                original_timestamp=f"+{raw_time}s relative offset",
                normalized_datetime=None,
                timestamp_precision="relative",
                timestamp_status="relative",
                timestamp_source="relative_offset",
                timestamp_confidence=0.9
            )

        if time_type == "frame":
            return NormalizedTemporal(
                original_timestamp=f"Frame #{raw_time}",
                normalized_datetime=None,
                timestamp_precision="frame",
                timestamp_status="frame_index",
                timestamp_source="video_stream",
                timestamp_confidence=1.0
            )

        try:
            # Handle ISO string, epoch float/int, etc.
            if isinstance(raw_time, (int, float)):
                dt = datetime.datetime.fromtimestamp(raw_time, tz=datetime.timezone.utc)
                return NormalizedTemporal(
                    original_timestamp=str(raw_time),
                    normalized_datetime=dt.isoformat(),
                    timestamp_precision="second",
                    timestamp_status="valid",
                    timezone="UTC"
                )
            else:
                s = str(raw_time).strip()
                return NormalizedTemporal(
                    original_timestamp=s,
                    normalized_datetime=s,
                    timestamp_precision="second",
                    timestamp_status="valid",
                    timezone="IST" if "IST" in s or "+05:30" in s else "UTC"
                )
        except Exception:
            return NormalizedTemporal(
                original_timestamp=str(raw_time),
                normalized_datetime=None,
                timestamp_status="ambiguous",
                timestamp_precision="unknown",
                timestamp_confidence=0.5
            )

    def process(self) -> ProcessingResult:
        raise NotImplementedError("Subclasses must implement process()")
