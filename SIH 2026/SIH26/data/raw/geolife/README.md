# Microsoft GeoLife GPS Trajectory Dataset

## Official Source & Metadata
- **Dataset Name:** Microsoft Research GeoLife GPS Trajectories
- **Version:** v1.3
- **Year:** 2012 (Standard Trajectory Benchmark)
- **Collection Period:** April 2007 – August 2012
- **Domain:** Global GPS Trajectory Tracking (182 Users, 17,621 Trajectories)
- **Official Host:** Microsoft Research Asia (Zheng et al.)
- **License:** Open Research Use (MSR Open Data)
- **Intended Purpose:** Trajectory reconstruction, stay point detection, spatial-temporal clustering (DBSCAN), frequent location discovery.

## Data Processing Rules
- Preserve original timestamps, latitude, longitude, and altitude.
- Calculate frequent location clusters using DBSCAN ($\varepsilon = 200\text{m}$, $\text{min\_samples} = 5$).
- **Dataset Namespace:** `PUBLIC_GEOLIFE:`
- **NEVER** expose PII or connect user IDs to other datasets.
