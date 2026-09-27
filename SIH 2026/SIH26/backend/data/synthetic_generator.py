"""
Synthetic Data Generator for SIH 2026 Demo
Generates realistic but entirely fictional investigation data.
No real persons, records, or police data.
"""
import random
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any

random.seed(42)

BASE_DATE = datetime(2026, 1, 1)

def rnd_date(start_offset_days=0, end_offset_days=240):
    return BASE_DATE + timedelta(
        days=random.randint(start_offset_days, end_offset_days),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59)
    )

def fmt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S")

# ─────────────────────────────────────────────────────────
# LOCATIONS (synthetic city map with coordinates)
# ─────────────────────────────────────────────────────────
LOCATIONS = [
    {"id": "loc-01", "name": "Jubilee Hills",       "lat": 17.4326, "lon": 78.4071, "type": "area"},
    {"id": "loc-02", "name": "Banjara Hills",       "lat": 17.4156, "lon": 78.4483, "type": "area"},
    {"id": "loc-03", "name": "Hitech City",         "lat": 17.4478, "lon": 78.3760, "type": "commercial"},
    {"id": "loc-04", "name": "Secunderabad Stn",    "lat": 17.4401, "lon": 78.4991, "type": "transit"},
    {"id": "loc-05", "name": "Kukatpally",          "lat": 17.4849, "lon": 78.3988, "type": "area"},
    {"id": "loc-06", "name": "Madhapur",            "lat": 17.4486, "lon": 78.3908, "type": "commercial"},
    {"id": "loc-07", "name": "Gachibowli",          "lat": 17.4401, "lon": 78.3489, "type": "commercial"},
    {"id": "loc-08", "name": "Ameerpet",            "lat": 17.4374, "lon": 78.4487, "type": "transit"},
    {"id": "loc-09", "name": "Begumpet",            "lat": 17.4432, "lon": 78.4693, "type": "area"},
    {"id": "loc-10", "name": "LB Nagar",            "lat": 17.3481, "lon": 78.5529, "type": "area"},
    {"id": "loc-11", "name": "Charminar",           "lat": 17.3616, "lon": 78.4747, "type": "landmark"},
    {"id": "loc-12", "name": "Mehdipatnam",         "lat": 17.3961, "lon": 78.4394, "type": "area"},
    {"id": "loc-13", "name": "Kondapur",            "lat": 17.4604, "lon": 78.3614, "type": "area"},
    {"id": "loc-14", "name": "Shamshabad Airport",  "lat": 17.2403, "lon": 78.4294, "type": "transit"},
    {"id": "loc-15", "name": "Nampally",            "lat": 17.3801, "lon": 78.4731, "type": "area"},
    {"id": "loc-16", "name": "Warehouse District",  "lat": 17.3701, "lon": 78.4100, "type": "industrial"},
    {"id": "loc-17", "name": "Old City Zone",       "lat": 17.3554, "lon": 78.4811, "type": "area"},
    {"id": "loc-18", "name": "Uppal",               "lat": 17.4051, "lon": 78.5592, "type": "area"},
    {"id": "loc-19", "name": "Dilsukhnagar",        "lat": 17.3686, "lon": 78.5262, "type": "area"},
    {"id": "loc-20", "name": "Tolichowki",          "lat": 17.4019, "lon": 78.4231, "type": "area"},
]

# ─────────────────────────────────────────────────────────
# PERSONS (demo scale - 50 persons for performance)
# ─────────────────────────────────────────────────────────
PERSONS = [
    # === CORE INVESTIGATION CHAIN ===
    {"id": "p-001", "name": "Ravi Kumar",       "aliases": ["Ravi K.", "R. Kumar", "Ravi"],     "dob": "1988-04-12", "gender": "M", "role": "primary"},
    {"id": "p-002", "name": "Suresh Babu",      "aliases": ["Suresh B.", "S. Babu"],             "dob": "1985-11-03", "gender": "M", "role": "connector"},
    {"id": "p-003", "name": "Arun Sharma",      "aliases": ["Arun S.", "A. Sharma"],             "dob": "1990-07-22", "gender": "M", "role": "target"},
    {"id": "p-004", "name": "Priya Nair",       "aliases": ["Priya N."],                         "dob": "1992-02-18", "gender": "F", "role": "associate"},
    {"id": "p-005", "name": "Mohammed Khalid",  "aliases": ["M. Khalid", "Khalid"],              "dob": "1983-09-05", "gender": "M", "role": "associate"},
    {"id": "p-006", "name": "Lakshmi Devi",     "aliases": ["L. Devi"],                          "dob": "1975-12-30", "gender": "F", "role": "peripheral"},
    {"id": "p-007", "name": "Sanjay Mehta",     "aliases": ["Sanjay M.", "S. Mehta"],            "dob": "1979-06-14", "gender": "M", "role": "associate"},
    {"id": "p-008", "name": "Kavitha Reddy",    "aliases": ["K. Reddy"],                         "dob": "1995-03-27", "gender": "F", "role": "peripheral"},
    # === SECONDARY NETWORK ===
    {"id": "p-009", "name": "Vikram Singh",     "aliases": ["V. Singh"],                         "dob": "1987-01-09", "gender": "M", "role": "peripheral"},
    {"id": "p-010", "name": "Deepak Rao",       "aliases": ["D. Rao"],                           "dob": "1991-08-16", "gender": "M", "role": "peripheral"},
    {"id": "p-011", "name": "Anitha Kumari",    "aliases": ["A. Kumari"],                        "dob": "1988-05-21", "gender": "F", "role": "peripheral"},
    {"id": "p-012", "name": "Ramesh Goud",      "aliases": ["R. Goud"],                          "dob": "1972-10-08", "gender": "M", "role": "peripheral"},
    {"id": "p-013", "name": "Sunita Patel",     "aliases": ["S. Patel"],                         "dob": "1994-07-30", "gender": "F", "role": "peripheral"},
    {"id": "p-014", "name": "Arjun Tiwari",     "aliases": ["A. Tiwari"],                        "dob": "1986-02-14", "gender": "M", "role": "peripheral"},
    {"id": "p-015", "name": "Meena Krishnan",   "aliases": ["M. Krishnan"],                      "dob": "1980-11-25", "gender": "F", "role": "peripheral"},
    {"id": "p-016", "name": "Raju Varma",       "aliases": ["R. Varma"],                         "dob": "1976-09-03", "gender": "M", "role": "peripheral"},
    {"id": "p-017", "name": "Divya Nair",       "aliases": ["D. Nair"],                          "dob": "1998-04-17", "gender": "F", "role": "peripheral"},
    {"id": "p-018", "name": "Gopal Shetty",     "aliases": ["G. Shetty"],                        "dob": "1984-06-29", "gender": "M", "role": "peripheral"},
    {"id": "p-019", "name": "Fatima Begum",     "aliases": ["F. Begum"],                         "dob": "1989-12-11", "gender": "F", "role": "peripheral"},
    {"id": "p-020", "name": "Harish Nair",      "aliases": ["H. Nair"],                          "dob": "1993-03-04", "gender": "M", "role": "peripheral"},
]

# ─────────────────────────────────────────────────────────
# PHONES
# ─────────────────────────────────────────────────────────
PHONES = [
    {"id": "ph-001", "number": "+91-9876543210", "owner_id": "p-001", "imei": "354823091234567", "current_device": "dev-A"},
    {"id": "ph-002", "number": "+91-9876543211", "owner_id": "p-001", "imei": "354823091234568", "current_device": "dev-B"},  # Ravi's second phone - anomaly
    {"id": "ph-003", "number": "+91-9876543220", "owner_id": "p-002", "imei": "354823091234569", "current_device": "dev-C"},
    {"id": "ph-004", "number": "+91-9876543230", "owner_id": "p-003", "imei": "354823091234570", "current_device": "dev-D"},
    {"id": "ph-005", "number": "+91-9876543240", "owner_id": "p-004", "imei": "354823091234571", "current_device": "dev-E"},
    {"id": "ph-006", "number": "+91-9876543250", "owner_id": "p-005", "imei": "354823091234572", "current_device": "dev-F"},
    {"id": "ph-007", "number": "+91-9876543260", "owner_id": "p-006", "imei": "354823091234573", "current_device": "dev-G"},
    {"id": "ph-008", "number": "+91-9876543270", "owner_id": "p-007", "imei": "354823091234574", "current_device": "dev-H"},
    {"id": "ph-009", "number": "+91-9876543280", "owner_id": "p-008", "imei": "354823091234575", "current_device": "dev-I"},
    {"id": "ph-010", "number": "+91-9876543290", "owner_id": "p-009", "imei": "354823091234576", "current_device": "dev-J"},
]

# ─────────────────────────────────────────────────────────
# VEHICLES
# ─────────────────────────────────────────────────────────
VEHICLES = [
    {"id": "veh-001", "plate": "TS09AB1234", "reg_owner_id": "p-001", "make": "Honda", "model": "City", "color": "White",  "type": "Sedan",   "year": 2020},
    {"id": "veh-002", "plate": "TS07CD5678", "reg_owner_id": "p-002", "make": "Toyota","model": "Innova","color": "Silver","type": "SUV",     "year": 2019},
    {"id": "veh-003", "plate": "TS05EF9012", "reg_owner_id": "p-003", "make": "Hyundai","model": "Creta","color": "Blue",  "type": "SUV",     "year": 2021},
    {"id": "veh-004", "plate": "TS03GH3456", "reg_owner_id": "p-004", "make": "Maruti", "model": "Swift","color": "Red",  "type": "Hatchback","year": 2022},
    {"id": "veh-005", "plate": "TS01IJ7890", "reg_owner_id": "p-005", "make": "Tata",   "model": "Nexon","color": "Black","type": "SUV",     "year": 2023},
    {"id": "veh-101", "plate": None,          "reg_owner_id": None,    "make": "Unknown","model": "Unknown","color": "Black","type": "SUV",   "year": None},  # Unknown vehicle seen in CCTV
]

# ─────────────────────────────────────────────────────────
# FINANCIAL ACCOUNTS
# ─────────────────────────────────────────────────────────
ACCOUNTS = [
    {"id": "acc-001", "number": "HDFC-****1234", "owner_id": "p-001", "bank": "HDFC",  "type": "Savings"},
    {"id": "acc-002", "number": "SBI-****5678",  "owner_id": "p-002", "bank": "SBI",   "type": "Current"},
    {"id": "acc-003", "number": "ICICI-****9012","owner_id": "p-003", "bank": "ICICI", "type": "Savings"},
    {"id": "acc-004", "number": "AXIS-****3456", "owner_id": "p-004", "bank": "AXIS",  "type": "Savings"},
    {"id": "acc-005", "number": "YES-****7890",  "owner_id": "p-005", "bank": "YES",   "type": "Savings"},
    {"id": "acc-X01", "number": "COOP-****0001", "owner_id": None,    "bank": "COOP",  "type": "Unknown"},  # Shell account - links chain
]

# ─────────────────────────────────────────────────────────
# PRE-BUILT HIDDEN CHAIN (The Hero Demo):
# Ravi → ph-001 → Suresh → acc-X01 → veh-001 → loc-01 → Arun
# ─────────────────────────────────────────────────────────
DEMO_CHAIN = {
    "entity_a": "p-001",  # Ravi Kumar
    "entity_b": "p-003",  # Arun Sharma
    "hops": [
        {"from": "p-001", "to": "p-002", "rel": "CALLED",       "evidence_ids": ["cdr-0001", "cdr-0002"]},
        {"from": "p-002", "to": "acc-X01","rel": "TRANSFERRED", "evidence_ids": ["fin-0101"]},
        {"from": "acc-X01","to": "veh-001","rel": "LINKED_TO",  "evidence_ids": ["veh-rec-01"]},
        {"from": "veh-001","to": "p-003", "rel": "SEEN_WITH",   "evidence_ids": ["cctv-0001"]},
    ],
    "confidence": 0.86,
    "path_label": "Communication → Financial → Vehicle → Target"
}

# ─────────────────────────────────────────────────────────
# GENERATE CDR RECORDS
# ─────────────────────────────────────────────────────────
def generate_cdr():
    records = []
    cdr_id = 1

    # Ravi ↔ Suresh calls (high frequency in Aug — anomaly)
    for _ in range(25):
        dt = rnd_date(180, 220)  # Aug period
        records.append({
            "id": f"cdr-{cdr_id:04d}",
            "from_phone": "ph-001",
            "to_phone":   "ph-003",
            "duration_sec": random.randint(30, 600),
            "timestamp": fmt(dt),
            "tower_from": random.choice(["loc-01","loc-06","loc-08"]),
            "tower_to":   random.choice(["loc-02","loc-03"]),
            "call_type": "voice",
            "source": "CDR",
        })
        cdr_id += 1

    # Suresh ↔ Arun (indirect, via shared location)
    for _ in range(8):
        dt = rnd_date(200, 230)
        records.append({
            "id": f"cdr-{cdr_id:04d}",
            "from_phone": "ph-003",
            "to_phone":   "ph-004",
            "duration_sec": random.randint(20, 300),
            "timestamp": fmt(dt),
            "tower_from": random.choice(["loc-02","loc-03"]),
            "tower_to":   random.choice(["loc-01","loc-11"]),
            "call_type": "voice",
            "source": "CDR",
        })
        cdr_id += 1

    # Ravi normal calls (low frequency Jan–Jul)
    for _ in range(40):
        dt = rnd_date(0, 179)
        other = random.choice(["ph-005","ph-006","ph-007","ph-008"])
        records.append({
            "id": f"cdr-{cdr_id:04d}",
            "from_phone": "ph-001",
            "to_phone": other,
            "duration_sec": random.randint(10, 180),
            "timestamp": fmt(dt),
            "tower_from": random.choice(["loc-01","loc-02"]),
            "tower_to": random.choice(["loc-03","loc-04"]),
            "call_type": "voice",
            "source": "CDR",
        })
        cdr_id += 1

    # Random network calls
    phones = [p["id"] for p in PHONES]
    for _ in range(100):
        fr, to = random.sample(phones, 2)
        dt = rnd_date()
        records.append({
            "id": f"cdr-{cdr_id:04d}",
            "from_phone": fr,
            "to_phone": to,
            "duration_sec": random.randint(10, 900),
            "timestamp": fmt(dt),
            "tower_from": random.choice(LOCATIONS)["id"],
            "tower_to": random.choice(LOCATIONS)["id"],
            "call_type": "voice",
            "source": "CDR",
        })
        cdr_id += 1

    return records

# ─────────────────────────────────────────────────────────
# GENERATE FINANCIAL TRANSACTIONS
# ─────────────────────────────────────────────────────────
def generate_transactions():
    txns = []
    txn_id = 1

    # KEY CHAIN: Suresh → acc-X01 → Arun's vehicle chain
    for i in range(3):
        dt = rnd_date(185, 210)
        txns.append({
            "id": f"fin-{txn_id:04d}",
            "from_account": "acc-002",
            "to_account":   "acc-X01",
            "amount":       random.randint(50000, 200000),
            "timestamp":    fmt(dt),
            "description":  "Transfer",
            "source":       "Financial Records",
        })
        txn_id += 1

    # acc-X01 → Arun's account
    for i in range(2):
        dt = rnd_date(210, 225)
        txns.append({
            "id": f"fin-{txn_id:04d}",
            "from_account": "acc-X01",
            "to_account":   "acc-003",
            "amount":       random.randint(30000, 120000),
            "timestamp":    fmt(dt),
            "description":  "Transfer",
            "source":       "Financial Records",
        })
        txn_id += 1

    # Ravi's suspicious spike (anomaly - Aug)
    for _ in range(12):
        dt = rnd_date(180, 230)
        txns.append({
            "id": f"fin-{txn_id:04d}",
            "from_account": "acc-001",
            "to_account":   random.choice(["acc-002","acc-X01","acc-004"]),
            "amount":       random.randint(10000, 500000),
            "timestamp":    fmt(dt),
            "description":  "Transfer",
            "source":       "Financial Records",
        })
        txn_id += 1

    # Normal transactions
    accs = [a["id"] for a in ACCOUNTS]
    for _ in range(80):
        fr, to = random.sample(accs, 2)
        dt = rnd_date()
        txns.append({
            "id": f"fin-{txn_id:04d}",
            "from_account": fr,
            "to_account": to,
            "amount": random.randint(500, 50000),
            "timestamp": fmt(dt),
            "description": random.choice(["Transfer","Payment","Bill","Purchase"]),
            "source": "Financial Records",
        })
        txn_id += 1

    return txns

# ─────────────────────────────────────────────────────────
# GENERATE LOCATION RECORDS
# ─────────────────────────────────────────────────────────
def generate_location_records():
    records = []
    lr_id = 1

    # Ravi frequent visits to loc-01 (Jubilee Hills)
    for _ in range(24):
        dt = rnd_date(0, 240)
        records.append({
            "id": f"loc-rec-{lr_id:04d}",
            "entity_id": "p-001",
            "entity_type": "person",
            "location_id": "loc-01",
            "timestamp": fmt(dt),
            "duration_min": random.randint(15, 120),
            "source": "Location Records",
        })
        lr_id += 1

    # Ravi + Suresh at same location close in time (spatial temporal)
    for i in range(5):
        dt = rnd_date(185, 220)
        records.append({
            "id": f"loc-rec-{lr_id:04d}",
            "entity_id": "p-001",
            "entity_type": "person",
            "location_id": "loc-01",
            "timestamp": fmt(dt),
            "duration_min": 45,
            "source": "Location Records",
        })
        lr_id += 1
        # Suresh arrives ~7 min later
        dt2 = dt + timedelta(minutes=7)
        records.append({
            "id": f"loc-rec-{lr_id:04d}",
            "entity_id": "p-002",
            "entity_type": "person",
            "location_id": "loc-01",
            "timestamp": fmt(dt2),
            "duration_min": 38,
            "source": "Location Records",
        })
        lr_id += 1

    # Other persons
    for p in PERSONS[3:]:
        for _ in range(random.randint(2, 10)):
            dt = rnd_date()
            records.append({
                "id": f"loc-rec-{lr_id:04d}",
                "entity_id": p["id"],
                "entity_type": "person",
                "location_id": random.choice(LOCATIONS)["id"],
                "timestamp": fmt(dt),
                "duration_min": random.randint(5, 180),
                "source": "Location Records",
            })
            lr_id += 1

    return records

# ─────────────────────────────────────────────────────────
# GENERATE CCTV OBSERVATIONS
# ─────────────────────────────────────────────────────────
CAMERAS = [
    {"id": "cam-01", "location_id": "loc-01", "name": "CAM-01 Jubilee Hills Entry"},
    {"id": "cam-02", "location_id": "loc-01", "name": "CAM-02 Jubilee Hills Plaza"},
    {"id": "cam-03", "location_id": "loc-03", "name": "CAM-03 Hitech City Gate"},
    {"id": "cam-04", "location_id": "loc-11", "name": "CAM-04 Charminar Junction"},
    {"id": "cam-17", "location_id": "loc-06", "name": "CAM-17 Madhapur Road"},
    {"id": "cam-22", "location_id": "loc-16", "name": "CAM-22 Warehouse Gate"},
]

def generate_cctv():
    obs = []
    cctv_id = 1

    # KEY EVIDENCE: veh-001 seen near Arun (loc-01/06) with conflicting description
    obs.append({
        "id": "cctv-0001",
        "camera_id": "cam-17",
        "timestamp": fmt(rnd_date(205, 210)),
        "object_type": "vehicle",
        "vehicle_id": "veh-001",        # Ravi's car
        "plate_detected": "TS09AB1234",
        "plate_confidence": 0.91,
        "vehicle_color_observed": "Black",  # CONFLICT: registered White
        "vehicle_type_observed": "SUV",     # CONFLICT: registered Sedan
        "tracking_id": "TRK-001",
        "detection_confidence": 0.88,
        "notes": "Vehicle characteristics inconsistent with registration record",
        "source": "CCTV",
    })
    cctv_id += 1

    # Ravi observed at loc-01 near Suresh
    for i in range(3):
        dt = rnd_date(185, 220)
        obs.append({
            "id": f"cctv-{cctv_id:04d}",
            "camera_id": "cam-01",
            "timestamp": fmt(dt),
            "object_type": "vehicle",
            "vehicle_id": "veh-001",
            "plate_detected": "TS09AB1234",
            "plate_confidence": 0.85 + random.uniform(0, 0.1),
            "vehicle_color_observed": "White",
            "vehicle_type_observed": "Sedan",
            "tracking_id": f"TRK-{100+i}",
            "detection_confidence": 0.82 + random.uniform(0, 0.1),
            "notes": "",
            "source": "CCTV",
        })
        cctv_id += 1

    # Unknown vehicle at warehouse (no plate)
    obs.append({
        "id": "cctv-0010",
        "camera_id": "cam-22",
        "timestamp": fmt(rnd_date(200, 215)),
        "object_type": "vehicle",
        "vehicle_id": "veh-101",
        "plate_detected": None,
        "plate_confidence": 0.0,
        "vehicle_color_observed": "Black",
        "vehicle_type_observed": "SUV",
        "tracking_id": "TRK-002",
        "detection_confidence": 0.78,
        "notes": "Plate not legible. Vehicle characteristics: Black SUV. Possible match with registered vehicles pending review.",
        "source": "CCTV",
    })

    return obs

# ─────────────────────────────────────────────────────────
# GENERATE FIRs
# ─────────────────────────────────────────────────────────
FIRS = [
    {
        "id": "fir-001",
        "case_number": "FIR/2026/HCY/0734",
        "filing_date": "2026-08-15",
        "station": "Hitech City PS",
        "complainant": "Anonymous",
        "description": (
            "Ravi Kumar was observed meeting Suresh Babu at Jubilee Hills on 12 Aug 2026 at approximately 20:30 hours. "
            "Ravi Kumar was seen using vehicle TS09AB1234. "
            "Both individuals were observed near Account COOP-****0001 transaction records. "
            "Suresh Babu was later seen near Madhapur area using phone +91-9876543220. "
            "Subsequent observation placed both at Location: Jubilee Hills within a 10 minute window."
        ),
        "entities_mentioned": ["p-001","p-002","loc-01","veh-001","acc-X01","ph-001","ph-003"],
        "source": "FIR / Police Reports",
    },
    {
        "id": "fir-002",
        "case_number": "FIR/2026/LBN/0891",
        "filing_date": "2026-08-20",
        "station": "LB Nagar PS",
        "complainant": "Confidential",
        "description": (
            "Arun Sharma was reported to have received financial transfers from an unknown cooperative account. "
            "Vehicle TS09AB1234 was observed near Arun Sharma's known location at Madhapur. "
            "The vehicle was described as a Black SUV by witnesses at location, "
            "however registration records indicate a White Honda Sedan. "
            "Mohammed Khalid was seen at the same location on 14 Aug 2026."
        ),
        "entities_mentioned": ["p-003","p-005","acc-X01","veh-001","loc-06"],
        "source": "FIR / Police Reports",
    },
]

# ─────────────────────────────────────────────────────────
# GENERATE ANOMALIES
# ─────────────────────────────────────────────────────────
ANOMALIES = [
    {
        "id": "anom-001",
        "entity_id": "p-001",
        "entity_name": "Ravi Kumar",
        "type": "communication_spike",
        "severity": "high",
        "detected_at": "2026-08-16T09:00:00",
        "description": "Significant increase in communication activity observed relative to historical baseline.",
        "before_value": 5.2,
        "after_value": 52.0,
        "metric": "calls_per_day",
        "unit": "calls/day",
        "change_pct": 900,
        "period": "Aug 2026",
        "baseline_period": "Jan–Jul 2026",
        "contributing_factors": [
            "12x increase in daily call volume",
            "9 new unique contact associations",
            "3 new geographic areas visited",
            "340% increase in transaction activity"
        ],
        "status": "pending",
        "algorithm": "Isolation Forest",
        "source": "CDR + Financial Records",
    },
    {
        "id": "anom-002",
        "entity_id": "p-001",
        "entity_name": "Ravi Kumar",
        "type": "financial_spike",
        "severity": "high",
        "detected_at": "2026-08-18T11:00:00",
        "description": "Unusual transaction frequency and volume relative to historical pattern.",
        "before_value": 2.1,
        "after_value": 9.3,
        "metric": "transactions_per_week",
        "unit": "txn/week",
        "change_pct": 343,
        "period": "Aug 2026",
        "baseline_period": "Jan–Jul 2026",
        "contributing_factors": [
            "New financial account associations",
            "Transfers to unknown cooperative account",
            "Transactions near unusual geographic locations"
        ],
        "status": "pending",
        "algorithm": "Isolation Forest",
        "source": "Financial Records",
    },
    {
        "id": "anom-003",
        "entity_id": "p-002",
        "entity_name": "Suresh Babu",
        "type": "new_location",
        "severity": "medium",
        "detected_at": "2026-08-12T14:00:00",
        "description": "Entity observed in locations outside historical geographic range.",
        "before_value": 2.0,
        "after_value": 5.0,
        "metric": "distinct_areas",
        "unit": "areas",
        "change_pct": 150,
        "period": "Aug 2026",
        "baseline_period": "Jan–Jul 2026",
        "contributing_factors": [
            "First observed at Warehouse District on 12 Aug",
            "8 visits to previously unassociated location",
            "Location overlaps with primary entity of interest"
        ],
        "status": "pending",
        "algorithm": "DBSCAN + Statistical baseline",
        "source": "Location Records + CCTV",
    },
]

# ─────────────────────────────────────────────────────────
# GENERATE CONTRADICTIONS
# ─────────────────────────────────────────────────────────
CONTRADICTIONS = [
    {
        "id": "contra-001",
        "type": "vehicle_description",
        "entity_id": "veh-001",
        "entity_label": "Vehicle TS09AB1234",
        "severity": "high",
        "detected_at": "2026-08-16T10:00:00",
        "description": "Vehicle characteristics observed in CCTV footage do not match registration records.",
        "records": [
            {
                "source_type": "Vehicle Registration",
                "record_id": "veh-rec-001",
                "timestamp": "2020-06-15T00:00:00",
                "field": "Vehicle Description",
                "value": "White Honda City Sedan (2020)",
            },
            {
                "source_type": "CCTV Observation",
                "record_id": "cctv-0001",
                "timestamp": "2026-08-12T20:35:00",
                "field": "Vehicle Description",
                "value": "Black SUV — CAM-17, Madhapur Road",
            },
            {
                "source_type": "FIR Statement",
                "record_id": "fir-002",
                "timestamp": "2026-08-20T00:00:00",
                "field": "Witness Account",
                "value": "Black SUV observed at location",
            },
        ],
        "status": "unresolved",
    },
    {
        "id": "contra-002",
        "type": "location_discrepancy",
        "entity_id": "p-001",
        "entity_label": "Ravi Kumar",
        "severity": "medium",
        "detected_at": "2026-08-13T08:00:00",
        "description": "Entity location records show conflicting locations from multiple sources at approximately the same time.",
        "records": [
            {
                "source_type": "FIR Statement",
                "record_id": "fir-001",
                "timestamp": "2026-08-12T20:30:00",
                "field": "Location",
                "value": "Jubilee Hills",
            },
            {
                "source_type": "CDR Tower",
                "record_id": "cdr-0001",
                "timestamp": "2026-08-12T20:32:00",
                "field": "Location (CDR Tower)",
                "value": "Madhapur (tower loc-06)",
            },
            {
                "source_type": "CCTV",
                "record_id": "cctv-0001",
                "timestamp": "2026-08-12T20:35:00",
                "field": "Location",
                "value": "Madhapur Road (CAM-17)",
            },
        ],
        "status": "unresolved",
    },
    {
        "id": "contra-003",
        "type": "device_inconsistency",
        "entity_id": "ph-001",
        "entity_label": "Phone +91-9876543210",
        "severity": "medium",
        "detected_at": "2026-08-10T00:00:00",
        "description": "Phone number associated with different IMEI/device across time periods.",
        "records": [
            {
                "source_type": "Historical CDR",
                "record_id": "cdr-hist-001",
                "timestamp": "2026-01-01T00:00:00",
                "field": "Device (IMEI)",
                "value": "Device A — IMEI: 354823091234001",
            },
            {
                "source_type": "Current CDR",
                "record_id": "cdr-0001",
                "timestamp": "2026-08-12T20:32:00",
                "field": "Device (IMEI)",
                "value": "Device B — IMEI: 354823091234567",
            },
        ],
        "status": "unresolved",
    },
]

# ─────────────────────────────────────────────────────────
# GENERATE ENTITY RESOLUTION CANDIDATES
# ─────────────────────────────────────────────────────────
RESOLUTION_CANDIDATES = [
    {
        "id": "res-001",
        "entity_a": {"id": "p-001", "name": "Ravi Kumar",  "source": "FIR-001"},
        "entity_b": {"id": "ent-unknown-01", "name": "Ravi K.", "source": "CDR-Record"},
        "confidence": 0.91,
        "status": "pending",
        "evidence": [
            {"type": "name_similarity",      "description": "Name similarity score 0.91", "weight": 0.35},
            {"type": "phone_association",    "description": "Same phone number +91-9876543210", "weight": 0.30},
            {"type": "location_history",     "description": "Same historical locations (Jubilee Hills, Hitech City)", "weight": 0.20},
            {"type": "vehicle_association",  "description": "Same vehicle TS09AB1234", "weight": 0.15},
        ],
    },
    {
        "id": "res-002",
        "entity_a": {"id": "p-001", "name": "Ravi Kumar", "source": "FIR-001"},
        "entity_b": {"id": "ent-unknown-02", "name": "R. Kumar", "source": "Surveillance Report"},
        "confidence": 0.78,
        "status": "pending",
        "evidence": [
            {"type": "name_similarity",   "description": "Partial name match (abbreviated)", "weight": 0.40},
            {"type": "location_history",  "description": "Overlapping location observations", "weight": 0.35},
            {"type": "temporal_overlap",  "description": "Observations in same time window", "weight": 0.25},
        ],
    },
    {
        "id": "res-003",
        "entity_a": {"id": "p-003", "name": "Arun Sharma", "source": "FIR-002"},
        "entity_b": {"id": "ent-unknown-03", "name": "A. Sharma", "source": "Financial Records"},
        "confidence": 0.85,
        "status": "pending",
        "evidence": [
            {"type": "name_similarity",   "description": "Name similarity 0.85", "weight": 0.40},
            {"type": "account_link",      "description": "Account ICICI-****9012 in both records", "weight": 0.40},
            {"type": "location_history",  "description": "Address match in both records", "weight": 0.20},
        ],
    },
]

# ─────────────────────────────────────────────────────────
# CASES
# ─────────────────────────────────────────────────────────
CASES = [
    {
        "id": "case-001",
        "case_number": "INV-2026-1023",
        "title": "Network Investigation: Ravi Kumar",
        "primary_entity": "p-001",
        "status": "active",
        "created_at": "2026-08-16T09:00:00",
        "updated_at": "2026-08-28T14:30:00",
        "investigator": "Insp. K. Prasad",
        "related_entities": ["p-001","p-002","p-003","p-004","p-005","veh-001","acc-X01"],
        "findings_count": 5,
        "anomalies_count": 3,
        "evidence_count": 17,
        "notes": "Investigation initiated based on FIR/2026/HCY/0734. Potential multi-hop association between primary subject and target entity under review.",
        "priority": "high",
    },
    {
        "id": "case-002",
        "case_number": "INV-2026-0918",
        "title": "Financial Network Analysis",
        "primary_entity": "acc-X01",
        "status": "active",
        "created_at": "2026-08-18T11:00:00",
        "updated_at": "2026-08-25T16:00:00",
        "investigator": "Insp. K. Prasad",
        "related_entities": ["p-002","p-003","acc-001","acc-002","acc-X01"],
        "findings_count": 3,
        "anomalies_count": 2,
        "evidence_count": 11,
        "notes": "Suspicious cooperative account linked to multiple entities.",
        "priority": "medium",
    },
]

# ─────────────────────────────────────────────────────────
# DATA SOURCE METADATA
# ─────────────────────────────────────────────────────────
DATA_SOURCES = [
    {"id": "ds-001","name": "FIR / Police Reports",      "type": "fir",         "records": 2,      "entities_extracted": 12, "relationships_extracted": 8,  "quality_score": 0.88, "last_processed": "2026-08-28T09:00:00", "status": "processed", "errors": 0},
    {"id": "ds-002","name": "CDR Records",               "type": "cdr",         "records": 173,    "entities_extracted": 25, "relationships_extracted": 173,"quality_score": 0.95, "last_processed": "2026-08-28T09:10:00", "status": "processed", "errors": 2},
    {"id": "ds-003","name": "Financial Transactions",    "type": "financial",   "records": 99,     "entities_extracted": 8,  "relationships_extracted": 99, "quality_score": 0.92, "last_processed": "2026-08-28T09:20:00", "status": "processed", "errors": 0},
    {"id": "ds-004","name": "Surveillance Reports",      "type": "surveillance","records": 12,     "entities_extracted": 7,  "relationships_extracted": 15, "quality_score": 0.75, "last_processed": "2026-08-28T09:30:00", "status": "processed", "errors": 3},
    {"id": "ds-005","name": "Vehicle Records",           "type": "vehicle",     "records": 6,      "entities_extracted": 6,  "relationships_extracted": 6,  "quality_score": 0.98, "last_processed": "2026-08-28T09:35:00", "status": "processed", "errors": 0},
    {"id": "ds-006","name": "Location Records",          "type": "location",    "records": 280,    "entities_extracted": 20, "relationships_extracted": 280,"quality_score": 0.91, "last_processed": "2026-08-28T09:40:00", "status": "processed", "errors": 1},
    {"id": "ds-007","name": "CCTV / Video Intelligence", "type": "cctv",        "records": 7,      "entities_extracted": 5,  "relationships_extracted": 7,  "quality_score": 0.82, "last_processed": "2026-08-28T09:45:00", "status": "processed", "errors": 1},
    {"id": "ds-008","name": "Criminal History",          "type": "criminal_history","records": 3,  "entities_extracted": 3,  "relationships_extracted": 3,  "quality_score": 0.96, "last_processed": "2026-08-28T09:50:00", "status": "processed", "errors": 0},
    {"id": "ds-009","name": "Intelligence Reports",      "type": "intelligence","records": 5,      "entities_extracted": 9,  "relationships_extracted": 12, "quality_score": 0.70, "last_processed": "2026-08-28T09:55:00", "status": "processed", "errors": 2},
]

# ─────────────────────────────────────────────────────────
# ASSEMBLE FULL DATASET
# ─────────────────────────────────────────────────────────
def generate_all():
    cdrs = generate_cdr()
    transactions = generate_transactions()
    location_records = generate_location_records()
    cctv = generate_cctv()

    return {
        "persons": PERSONS,
        "phones": PHONES,
        "vehicles": VEHICLES,
        "accounts": ACCOUNTS,
        "locations": LOCATIONS,
        "cameras": CAMERAS,
        "cdrs": cdrs,
        "transactions": transactions,
        "location_records": location_records,
        "cctv_observations": cctv,
        "firs": FIRS,
        "anomalies": ANOMALIES,
        "contradictions": CONTRADICTIONS,
        "resolution_candidates": RESOLUTION_CANDIDATES,
        "cases": CASES,
        "data_sources": DATA_SOURCES,
        "demo_chain": DEMO_CHAIN,
    }

if __name__ == "__main__":
    data = generate_all()
    print(f"Generated: {len(data['persons'])} persons, {len(data['cdrs'])} CDRs, "
          f"{len(data['transactions'])} transactions, {len(data['location_records'])} location records")
