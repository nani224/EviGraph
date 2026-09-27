# MIT Reality Mining Dataset

## Official Source & Metadata
- **Dataset Name:** MIT Reality Mining Communication & Proximity Dataset
- **Version:** v1.0
- **Year:** 2004–2005 (Established Benchmark)
- **Collection Period:** 2004–2005 (9 months continuous tracking)
- **Domain:** Mobile Call Logs, Cell Tower IDs, Bluetooth Proximity
- **Official Host:** MIT Media Lab / Human Dynamics Lab
- **License:** Open Academic / Research Use
- **Intended Purpose:** Communication graph topology analysis, interaction frequency modeling, temporal interaction dynamics, community detection, centrality metrics.

## Important Research Disclaimer
- This is **NOT** a police CDR dataset.
- Subjects are university student and faculty volunteers.
- **Label in UI:** "CDR-style communication research dataset".
- **NEVER** portray dataset participants as criminal suspects.

## Setup Instructions
1. Download `realitymining.mat` or pre-parsed CSV files from the official MIT archive.
2. Place files in `data/raw/reality_mining/calls.csv` and `data/raw/reality_mining/subjects.csv`.
3. Process via adapter `communication_adapter.py`.
- **Dataset Namespace:** `PUBLIC_REALITY:`
