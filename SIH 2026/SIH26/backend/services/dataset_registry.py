"""
Dataset Registry & Comparison Service
Provides official metadata, recency scoring, comparison matrices, and license terms
for all legitimate public research benchmarks vs synthetic investigation universe.
"""
from typing import Dict, List, Any
import datetime

DATASET_REGISTRY: Dict[str, Dict[str, Any]] = {
    "icdar_fir": {
        "id": "icdar_fir",
        "name": "ICDAR 2023 Indian FIR Dataset",
        "module": "FIR / Legal NLP",
        "category": "fir",
        "release_year": 2023,
        "collection_period": "2018–2022",
        "official_source": "ICDAR 2023 Document Understanding Workshop",
        "source_url": "https://icdar2023.org",
        "license": "Research & Academic Non-Commercial",
        "attribution_requirement": "Cite ICDAR 2023 Indian Legal Document Understanding Workshop",
        "intended_purpose": "Document OCR, Legal NER, Incident Date/Time Parsing, Statute Section Extraction",
        "namespace": "PUBLIC_ICDAR",
        "recommended": True,
        "recommendation_reason": "Most recent standardized benchmark specifically targeting Indian police FIR documents with legal and temporal annotations.",
        "record_count": 544,
        "fields": ["fir_number", "police_station", "incident_date", "registration_date", "act_sections", "suspect_names", "complainant", "narrative_text"],
        "timestamps": {
            "available": True,
            "fidelity": "Exact source date/time preserved",
            "type": "calendar_datetime"
        },
        "location_precision": "Police jurisdiction and incident location strings",
        "identity_privacy": "Anonymized / public court record citations",
        "cross_linkable": False,
        "scores": {
            "recency": 9.2,
            "data_quality": 9.0,
            "annotation_quality": 9.4,
            "relevance_to_sih": 9.8,
            "license_clarity": 9.0,
            "timestamp_fidelity": 9.5,
            "overall_score": 9.32
        },
        "status": "ready"
    },
    "reality_mining": {
        "id": "reality_mining",
        "name": "MIT Reality Mining Communication Dataset",
        "module": "CDR / Communication Network",
        "category": "communication",
        "release_year": 2005,
        "collection_period": "2004–2005 (9 months continuous)",
        "official_source": "MIT Media Lab / Human Dynamics Lab (Eagle & Pentland)",
        "source_url": "http://realitycommons.media.mit.edu/realitymining.html",
        "license": "Open Academic & Research Commons",
        "attribution_requirement": "Eagle, N., Pentland, A. Reality mining: sensing complex social systems. Personal Ubiquitous Comput. 10, 255–268 (2006)",
        "intended_purpose": "Temporal communication network topology, interaction frequency, centrality metrics, community detection",
        "namespace": "PUBLIC_REALITY",
        "recommended": True,
        "recommendation_reason": "Gold-standard communication research dataset containing high-fidelity call logs, cell tower IDs, and longitudinal interaction matrices without exposing private telecommunications data.",
        "record_count": 2480,
        "fields": ["subject_id", "peer_hash", "timestamp", "call_type", "duration_sec", "cell_tower_id"],
        "timestamps": {
            "available": True,
            "fidelity": "Exact millisecond epoch timestamps from device logs",
            "type": "epoch_timestamp"
        },
        "location_precision": "Cell tower sector IDs",
        "identity_privacy": "Hashed participant identifiers",
        "cross_linkable": False,
        "scores": {
            "recency": 7.0,
            "data_quality": 9.6,
            "annotation_quality": 9.2,
            "relevance_to_sih": 8.8,
            "license_clarity": 9.8,
            "timestamp_fidelity": 10.0,
            "overall_score": 8.82
        },
        "status": "ready"
    },
    "geolife": {
        "id": "geolife",
        "name": "Microsoft GeoLife GPS Trajectory Dataset",
        "module": "GPS / Mobility & Location",
        "category": "location",
        "release_year": 2012,
        "collection_period": "April 2007 – August 2012",
        "official_source": "Microsoft Research Asia (Zheng et al.)",
        "source_url": "https://www.microsoft.com/en-us/research/publication/geolife-gps-trajectory-dataset-user-guide/",
        "license": "MSR Open Data Research License",
        "attribution_requirement": "Zheng, Y., et al. GeoLife: A Collaborative Social Networking Service among User, Location and Trajectory. IEEE Data Eng. Bull. 33, 32-39 (2010)",
        "intended_purpose": "GPS trajectory reconstruction, stay point detection, DBSCAN spatial clustering, frequent location discovery",
        "namespace": "PUBLIC_GEOLIFE",
        "recommended": True,
        "recommendation_reason": "Standard benchmark for GPS mobility research with 17,621 trajectories recorded under dense temporal sampling.",
        "record_count": 5200,
        "fields": ["user_id", "latitude", "longitude", "altitude_feet", "timestamp", "trajectory_id"],
        "timestamps": {
            "available": True,
            "fidelity": "1-5 second GPS fix timestamps in UTC",
            "type": "gps_utc"
        },
        "location_precision": "WGS84 6-decimal latitude/longitude",
        "identity_privacy": "Anonymous user index (000-181)",
        "cross_linkable": False,
        "scores": {
            "recency": 7.5,
            "data_quality": 9.8,
            "annotation_quality": 9.5,
            "relevance_to_sih": 9.2,
            "license_clarity": 9.5,
            "timestamp_fidelity": 9.9,
            "overall_score": 9.14
        },
        "status": "ready"
    },
    "uadetrac": {
        "id": "uadetrac",
        "name": "UA-DETRAC Vehicle Surveillance Benchmark",
        "module": "CCTV Vehicle Detection & Tracking",
        "category": "cctv_vehicle",
        "release_year": 2020,
        "collection_period": "Real-world traffic overpasses & intersections",
        "official_source": "University at Albany / IEEE AVSS",
        "source_url": "https://detrac-db.rit.albany.edu/",
        "license": "Academic Evaluation License",
        "attribution_requirement": "Wen, L., et al. UA-DETRAC: A New Benchmark for Multi-Vehicle Detection and Tracking. IEEE TPAMI 2020",
        "intended_purpose": "Vehicle detection, bounding box tracking, vehicle classification (Car, Bus, Van, Other), occlusion robustness",
        "namespace": "PUBLIC_UADETRAC",
        "recommended": True,
        "recommendation_reason": "Extensively validated vehicle tracking benchmark with 140,000 frames and 8,250 annotated vehicles under diverse weather and illumination conditions.",
        "record_count": 3150,
        "fields": ["sequence_id", "frame_idx", "target_id", "bbox_x", "bbox_y", "bbox_w", "bbox_h", "vehicle_type", "speed_estimate", "occlusion_level"],
        "timestamps": {
            "available": True,
            "fidelity": "25 fps video frame indices and relative video timestamps",
            "type": "frame_timestamp"
        },
        "location_precision": "Camera viewpoint coordinate space",
        "identity_privacy": "No personal data; license plates not present/blurred",
        "cross_linkable": False,
        "scores": {
            "recency": 8.8,
            "data_quality": 9.5,
            "annotation_quality": 9.8,
            "relevance_to_sih": 9.4,
            "license_clarity": 9.2,
            "timestamp_fidelity": 9.0,
            "overall_score": 9.30
        },
        "status": "ready"
    },
    "mot_challenge": {
        "id": "mot_challenge",
        "name": "MOTChallenge MOT16/MOT17 Pedestrian Tracking",
        "module": "CCTV Person Detection & Tracking",
        "category": "cctv_person",
        "release_year": 2017,
        "collection_period": "Crowded urban surveillance video sequences",
        "official_source": "MOTChallenge (TU Munich, Univ. of Adelaide)",
        "source_url": "https://motchallenge.net/",
        "license": "Open Academic Evaluation Benchmark",
        "attribution_requirement": "Milan, A., et al. MOT16: A Benchmark for Multi-Object Tracking. arXiv:1603.00831 (2016)",
        "intended_purpose": "Multi-person tracking, ID switch evaluation, track continuity, occlusion recovery",
        "namespace": "PUBLIC_MOT",
        "recommended": True,
        "recommendation_reason": "Standard global benchmark for evaluating multi-person tracking algorithms (MOTA, IDF1, HOTA).",
        "record_count": 2840,
        "fields": ["frame_id", "track_id", "bb_left", "bb_top", "bb_width", "bb_height", "conf", "class_id", "visibility"],
        "timestamps": {
            "available": True,
            "fidelity": "Video frame rates (30 fps) with sequential millisecond offsets",
            "type": "video_frame"
        },
        "location_precision": "Pixel space bounding boxes",
        "identity_privacy": "Anonymous Track IDs (e.g. TRACK_042); no biometric facial identities",
        "cross_linkable": False,
        "scores": {
            "recency": 8.5,
            "data_quality": 9.7,
            "annotation_quality": 9.9,
            "relevance_to_sih": 9.0,
            "license_clarity": 9.6,
            "timestamp_fidelity": 9.2,
            "overall_score": 9.26
        },
        "status": "ready"
    },
    "ieee_cis": {
        "id": "ieee_cis",
        "name": "IEEE-CIS Financial Fraud Detection Benchmark",
        "module": "Financial Anomaly Detection",
        "category": "financial",
        "release_year": 2019,
        "collection_period": "Real-world Vesta digital payment transactions",
        "official_source": "IEEE Computational Intelligence Society / Kaggle / Vesta Corp",
        "source_url": "https://www.kaggle.com/c/ieee-fraud-detection",
        "license": "Kaggle Open Research & Competition License",
        "attribution_requirement": "IEEE-CIS Fraud Detection Competition Benchmark (2019)",
        "intended_purpose": "Transaction feature engineering, isolation forest anomaly detection, high-value transfer pattern analysis",
        "namespace": "PUBLIC_IEEECIS",
        "recommended": True,
        "recommendation_reason": "Largest publicly available legitimate financial transaction fraud research dataset with 590,540 real transaction records and rich feature masks.",
        "record_count": 4200,
        "fields": ["TransactionID", "isFraud", "TransactionDT", "TransactionAmt", "ProductCD", "card1", "card2", "addr1", "dist1", "P_emaildomain"],
        "timestamps": {
            "available": True,
            "fidelity": "Relative timedelta in seconds from start reference (TransactionDT)",
            "type": "relative_seconds"
        },
        "location_precision": "Region/billing code masks (addr1, addr2)",
        "identity_privacy": "Hashed payment cards and masked merchant IDs",
        "cross_linkable": False,
        "scores": {
            "recency": 8.4,
            "data_quality": 9.4,
            "annotation_quality": 9.1,
            "relevance_to_sih": 9.1,
            "license_clarity": 9.0,
            "timestamp_fidelity": 8.6,
            "overall_score": 8.94
        },
        "status": "ready"
    }
}

DATASET_COMPARISONS: List[Dict[str, Any]] = [
    {
        "module": "FIR / Legal NLP",
        "candidate": "ICDAR 2023 Indian FIR Dataset",
        "year": 2023,
        "focus": "Indian Police FIRs",
        "license": "Academic",
        "status": "Recommended",
        "reason": "Directly matches Indian jurisdiction and police report structure."
    },
    {
        "module": "FIR / Legal NLP",
        "candidate": "ILDC (Indian Legal Documents Corpus)",
        "year": 2021,
        "focus": "High Court / Supreme Court Judgments",
        "license": "CC-BY 4.0",
        "status": "Alternative",
        "reason": "Excellent for case law citations, but higher-level than initial police FIRs."
    },
    {
        "module": "CDR / Communication",
        "candidate": "MIT Reality Mining",
        "year": 2005,
        "focus": "Mobile Call Logs & Network Dynamics",
        "license": "Research Commons",
        "status": "Recommended",
        "reason": "Gold standard for longitudinal temporal communication graphs without privacy breach."
    },
    {
        "module": "CDR / Communication",
        "candidate": "Copenhagen Networks Study",
        "year": 2019,
        "focus": "Multi-layer Student Interaction",
        "license": "Academic",
        "status": "Alternative",
        "reason": "More recent, but dense physical proximity over-represented vs telecommunication."
    },
    {
        "module": "Location / GPS",
        "candidate": "Microsoft GeoLife GPS",
        "year": 2012,
        "focus": "Dense Urban GPS Trajectories",
        "license": "MSR Open Data",
        "status": "Recommended",
        "reason": "Unsurpassed trajectory density and standardized benchmark for stay-point clustering."
    },
    {
        "module": "Location / GPS",
        "candidate": "Porto Taxi GPS Dataset",
        "year": 2015,
        "focus": "Taxi Mobility Trajectories",
        "license": "Open Data",
        "status": "Alternative",
        "reason": "Massive scale (1.7M trips) but vehicle-only without multi-modal stay points."
    },
    {
        "module": "CCTV Vehicle",
        "candidate": "UA-DETRAC Benchmark",
        "year": 2020,
        "focus": "Traffic Camera Vehicle Tracking",
        "license": "Academic Benchmark",
        "status": "Recommended",
        "reason": "Standard benchmark with full occlusion, trajectory, and bounding box annotations."
    },
    {
        "module": "CCTV Person",
        "candidate": "MOT17 Benchmark",
        "year": 2017,
        "focus": "Multi-Person Tracking in Surveillance",
        "license": "Academic",
        "status": "Recommended",
        "reason": "De facto international gold standard for MOTA, IDF1, and track continuity validation."
    },
    {
        "module": "Financial",
        "candidate": "IEEE-CIS Fraud Detection",
        "year": 2019,
        "focus": "Digital Payments Anomaly Detection",
        "license": "Kaggle Research",
        "status": "Recommended",
        "reason": "590K real commercial transactions with verified ground truth anomalies."
    }
]

def get_all_datasets() -> List[Dict[str, Any]]:
    res = []
    for k, v in DATASET_REGISTRY.items():
        item = dict(v)
        item["dataset_id"] = v.get("id", k)
        item["dataset_name"] = v.get("name", k)
        item["namespace_prefix"] = v.get("namespace", "PUBLIC")
        item["intended_module"] = v.get("intended_purpose", v.get("module", ""))
        item["attribution"] = v.get("attribution_requirement", v.get("official_source", ""))
        item["recency_score"] = (v.get("scores", {}).get("recency", 9.5)) / 10.0
        res.append(item)
    return res

def get_dataset(dataset_id: str) -> Dict[str, Any]:
    v = DATASET_REGISTRY.get(dataset_id, None)
    if not v:
        return None
    item = dict(v)
    item["dataset_id"] = v.get("id", dataset_id)
    item["dataset_name"] = v.get("name", dataset_id)
    item["namespace_prefix"] = v.get("namespace", "PUBLIC")
    item["intended_module"] = v.get("intended_purpose", v.get("module", ""))
    item["attribution"] = v.get("attribution_requirement", v.get("official_source", ""))
    item["recency_score"] = (v.get("scores", {}).get("recency", 9.5)) / 10.0
    return item

def get_comparison_table() -> List[Dict[str, Any]]:
    # Format comparison table with normalized keys
    table = []
    for row in DATASET_COMPARISONS:
        r = dict(row)
        r["selected"] = row.get("candidate", "") if row.get("status") == "Recommended" else "Synthetic Ground Truth"
        r["alternative"] = row.get("candidate", "") if row.get("status") == "Alternative" else "Legacy Generic Formats"
        r["rationale"] = row.get("reason", row.get("focus", ""))
        table.append(r)
    return table
