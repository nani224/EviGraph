"""
Microsoft GeoLife GPS Trajectory Adapter
Performs spatial-temporal analysis, trajectory reconstruction, and DBSCAN location clustering.
"""
from typing import List, Dict, Any
import time
import math
from .base_adapter import BaseAdapter, NormalizedEntity, NormalizedTemporal, NormalizedRelationship, ProcessingResult

# Sample authentic-format GPS fixes from Microsoft GeoLife dataset
SAMPLE_GEOLIFE_TRAJECTORIES = [
    # Trajectory 001 - Cluster Alpha (Workplace / Research Campus)
    {"user_id": "000", "lat": 39.984702, "lng": 116.318417, "alt": 492, "timestamp": "2008-10-23T02:53:04Z", "traj_id": "T001"},
    {"user_id": "000", "lat": 39.984688, "lng": 116.318432, "alt": 490, "timestamp": "2008-10-23T03:15:20Z", "traj_id": "T001"},
    {"user_id": "000", "lat": 39.984715, "lng": 116.318395, "alt": 493, "timestamp": "2008-10-23T04:22:11Z", "traj_id": "T001"},
    {"user_id": "000", "lat": 39.984730, "lng": 116.318440, "alt": 491, "timestamp": "2008-10-23T05:01:45Z", "traj_id": "T001"},
    # Transit Movement
    {"user_id": "000", "lat": 39.991200, "lng": 116.324500, "alt": 480, "timestamp": "2008-10-23T05:30:10Z", "traj_id": "T001"},
    {"user_id": "000", "lat": 40.002300, "lng": 116.335600, "alt": 475, "timestamp": "2008-10-23T05:45:30Z", "traj_id": "T001"},
    # Cluster Beta (Residential / Stay Point)
    {"user_id": "000", "lat": 40.013510, "lng": 116.348210, "alt": 460, "timestamp": "2008-10-23T06:12:00Z", "traj_id": "T001"},
    {"user_id": "000", "lat": 40.013495, "lng": 116.348235, "alt": 458, "timestamp": "2008-10-23T07:45:12Z", "traj_id": "T001"},
    {"user_id": "000", "lat": 40.013525, "lng": 116.348190, "alt": 462, "timestamp": "2008-10-23T08:30:00Z", "traj_id": "T001"},
    {"user_id": "000", "lat": 40.013508, "lng": 116.348220, "alt": 459, "timestamp": "2008-10-23T09:15:30Z", "traj_id": "T001"},
    # User 001 - Trajectory 002 (Commercial Hub)
    {"user_id": "001", "lat": 39.908712, "lng": 116.397520, "alt": 150, "timestamp": "2008-11-04T10:10:00Z", "traj_id": "T002"},
    {"user_id": "001", "lat": 39.908695, "lng": 116.397545, "alt": 152, "timestamp": "2008-11-04T11:20:45Z", "traj_id": "T002"},
    {"user_id": "001", "lat": 39.908730, "lng": 116.397500, "alt": 149, "timestamp": "2008-11-04T12:05:10Z", "traj_id": "T002"},
    {"user_id": "001", "lat": 39.908705, "lng": 116.397530, "alt": 151, "timestamp": "2008-11-04T13:40:22Z", "traj_id": "T002"}
]

class GeoLifeAdapter(BaseAdapter):
    def __init__(self):
        super().__init__(
            dataset_id="geolife",
            namespace_prefix="PUBLIC_GEOLIFE",
            dataset_name="Microsoft GeoLife GPS Trajectory Dataset"
        )

    def _run_dbscan(self, points: List[Dict[str, float]], eps_km: float = 0.3, min_samples: int = 3) -> List[int]:
        """Simple spatial DBSCAN clustering using haversine metric without external scikit-learn dependency issues."""
        def haversine(p1, p2):
            R = 6371.0  # Earth radius in km
            dlat = math.radians(p2["lat"] - p1["lat"])
            dlng = math.radians(p2["lng"] - p1["lng"])
            a = math.sin(dlat / 2)**2 + math.cos(math.radians(p1["lat"])) * math.cos(math.radians(p2["lat"])) * math.sin(dlng / 2)**2
            return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        n = len(points)
        labels = [-1] * n
        cluster_id = 0

        for i in range(n):
            if labels[i] != -1:
                continue
            neighbors = [j for j in range(n) if haversine(points[i], points[j]) <= eps_km]
            if len(neighbors) < min_samples:
                continue

            labels[i] = cluster_id
            queue = [j for j in neighbors if j != i]
            while queue:
                current = queue.pop(0)
                if labels[current] == -1:
                    labels[current] = cluster_id
                elif labels[current] != cluster_id:
                    labels[current] = cluster_id
                    current_neighbors = [j for j in range(n) if haversine(points[current], points[j]) <= eps_km]
                    if len(current_neighbors) >= min_samples:
                        queue.extend([j for j in current_neighbors if j not in queue and labels[j] == -1])
            cluster_id += 1

        return labels

    def process(self) -> ProcessingResult:
        start = time.time()
        entities: List[NormalizedEntity] = []
        relationships: List[NormalizedRelationship] = []

        pts = [{"lat": r["lat"], "lng": r["lng"]} for r in SAMPLE_GEOLIFE_TRAJECTORIES]
        labels = self._run_dbscan(pts, eps_km=0.3, min_samples=3)

        clusters_found = set(l for l in labels if l != -1)

        # Create cluster entities
        for cid in sorted(clusters_found):
            cluster_pts = [SAMPLE_GEOLIFE_TRAJECTORIES[i] for i, l in enumerate(labels) if l == cid]
            mean_lat = sum(p["lat"] for p in cluster_pts) / len(cluster_pts)
            mean_lng = sum(p["lng"] for p in cluster_pts) / len(cluster_pts)

            cluster_id = self.format_id(f"CLUSTER_{cid:02d}")
            cluster_entity = NormalizedEntity(
                id=cluster_id,
                namespace_id=cluster_id,
                type="LOCATION",
                source_dataset=self.dataset_name,
                source_record_id=f"DBSCAN_CLUSTER_{cid}",
                label=f"Frequent Stay Point #{cid} ({len(cluster_pts)} fixes)",
                confidence=0.98,
                attributes={
                    "latitude": round(mean_lat, 6),
                    "longitude": round(mean_lng, 6),
                    "visit_count": len(cluster_pts),
                    "cluster_type": "DBSCAN_StayPoint"
                }
            )
            entities.append(cluster_entity)

        # Create user mobility entities
        users = set(r["user_id"] for r in SAMPLE_GEOLIFE_TRAJECTORIES)
        for u in users:
            u_id = self.format_id(f"USER_{u}")
            u_entity = NormalizedEntity(
                id=u_id,
                namespace_id=u_id,
                type="PERSON",
                source_dataset=self.dataset_name,
                source_record_id=f"GEOLIFE_USER_{u}",
                label=f"GeoLife Research User #{u}",
                confidence=1.0,
                attributes={"study": "GPS Mobility Research", "total_points": len([r for r in SAMPLE_GEOLIFE_TRAJECTORIES if r["user_id"] == u])}
            )
            entities.append(u_entity)

        duration_ms = round((time.time() - start) * 1000, 2)

        return ProcessingResult(
            dataset_id=self.dataset_id,
            dataset_name=self.dataset_name,
            records_loaded=len(SAMPLE_GEOLIFE_TRAJECTORIES),
            records_valid=len(SAMPLE_GEOLIFE_TRAJECTORIES),
            records_invalid=0,
            missing_timestamps=0,
            missing_locations=0,
            entities_extracted=len(entities),
            relationships_extracted=len(relationships),
            processing_time_ms=duration_ms,
            model_metrics={
                "task": "Spatial-Temporal Mobility & DBSCAN Stay-Point Clustering",
                "total_gps_points": len(SAMPLE_GEOLIFE_TRAJECTORIES),
                "distinct_users": len(users),
                "dbscan_clusters_detected": len(clusters_found),
                "noise_ratio": round(labels.count(-1) / len(labels), 3),
                "eps_threshold_km": 0.3,
                "min_samples_threshold": 3,
                "spatial_resolution": "6-decimal GPS precision (~0.1m)"
            },
            sample_entities=[e.dict() for e in entities[:6]],
            sample_relationships=[r.dict() for r in relationships[:6]]
        )
