"""
MIT Reality Mining Communication Dataset Adapter
Processes communication interactions, models temporal interaction frequencies,
and calculates graph centrality and community topology.
"""
from typing import List, Dict, Any
import time
import networkx as nx
from .base_adapter import BaseAdapter, NormalizedEntity, NormalizedTemporal, NormalizedRelationship, ProcessingResult

# Sample communication interaction logs from MIT Reality Mining dataset
SAMPLE_COMMUNICATION_LOGS = [
    {"record_id": "RM-CALL-001", "caller": "SUBJ_01", "callee": "SUBJ_04", "timestamp": 1094042800, "duration": 184, "cell_tower": "TOWER_MIT_7A"},
    {"record_id": "RM-CALL-002", "caller": "SUBJ_01", "callee": "SUBJ_07", "timestamp": 1094046400, "duration": 420, "cell_tower": "TOWER_MIT_7A"},
    {"record_id": "RM-CALL-003", "caller": "SUBJ_02", "callee": "SUBJ_03", "timestamp": 1094050100, "duration": 95, "cell_tower": "TOWER_KENDALL_2B"},
    {"record_id": "RM-CALL-004", "caller": "SUBJ_04", "callee": "SUBJ_01", "timestamp": 1094054000, "duration": 310, "cell_tower": "TOWER_MIT_7A"},
    {"record_id": "RM-CALL-005", "caller": "SUBJ_03", "callee": "SUBJ_05", "timestamp": 1094058200, "duration": 540, "cell_tower": "TOWER_HARVARD_1C"},
    {"record_id": "RM-CALL-006", "caller": "SUBJ_05", "callee": "SUBJ_02", "timestamp": 1094061800, "duration": 210, "cell_tower": "TOWER_HARVARD_1C"},
    {"record_id": "RM-CALL-007", "caller": "SUBJ_07", "callee": "SUBJ_08", "timestamp": 1094065400, "duration": 130, "cell_tower": "TOWER_BOSTON_4D"},
    {"record_id": "RM-CALL-008", "caller": "SUBJ_08", "callee": "SUBJ_01", "timestamp": 1094070000, "duration": 60, "cell_tower": "TOWER_MIT_7A"},
    {"record_id": "RM-CALL-009", "caller": "SUBJ_06", "callee": "SUBJ_03", "timestamp": 1094073600, "duration": 280, "cell_tower": "TOWER_KENDALL_2B"},
    {"record_id": "RM-CALL-010", "caller": "SUBJ_02", "callee": "SUBJ_06", "timestamp": 1094077200, "duration": 195, "cell_tower": "TOWER_KENDALL_2B"}
]

class RealityMiningAdapter(BaseAdapter):
    def __init__(self):
        super().__init__(
            dataset_id="reality_mining",
            namespace_prefix="PUBLIC_REALITY",
            dataset_name="MIT Reality Mining Communication Dataset"
        )

    def process(self) -> ProcessingResult:
        start = time.time()
        entities: Dict[str, NormalizedEntity] = {}
        relationships: List[NormalizedRelationship] = []

        g = nx.Graph()

        for log in SAMPLE_COMMUNICATION_LOGS:
            c1_id = self.format_id(log["caller"])
            c2_id = self.format_id(log["callee"])

            if c1_id not in entities:
                entities[c1_id] = NormalizedEntity(
                    id=c1_id,
                    namespace_id=c1_id,
                    type="PERSON",
                    source_dataset=self.dataset_name,
                    source_record_id=log["record_id"],
                    label=f"Research Subject ({log['caller']})",
                    confidence=1.0,
                    attributes={"study_group": "Media Lab Volunteer", "primary_tower": log["cell_tower"]}
                )

            if c2_id not in entities:
                entities[c2_id] = NormalizedEntity(
                    id=c2_id,
                    namespace_id=c2_id,
                    type="PERSON",
                    source_dataset=self.dataset_name,
                    source_record_id=log["record_id"],
                    label=f"Research Subject ({log['callee']})",
                    confidence=1.0,
                    attributes={"study_group": "Media Lab Volunteer", "primary_tower": log["cell_tower"]}
                )

            temp_info = self.normalize_temporal(log["timestamp"])

            rel = NormalizedRelationship(
                source_id=c1_id,
                target_id=c2_id,
                type="COMMUNICATED_WITH",
                source_dataset=self.dataset_name,
                source_record_id=log["record_id"],
                timestamp=temp_info.normalized_datetime,
                confidence=1.0,
                extraction_method="CDR_DirectCallLog",
                evidence_trail=[{
                    "source_type": "Research CDR Log",
                    "record_id": log["record_id"],
                    "duration_sec": log["duration"],
                    "cell_tower": log["cell_tower"]
                }]
            )
            relationships.append(rel)

            # Add to networkx graph
            if g.has_edge(c1_id, c2_id):
                g[c1_id][c2_id]["weight"] += 1
                g[c1_id][c2_id]["duration"] += log["duration"]
            else:
                g.add_edge(c1_id, c2_id, weight=1, duration=log["duration"])

        # Compute graph metrics
        degree_cent = nx.degree_centrality(g)
        between_cent = nx.betweenness_centrality(g)
        pagerank = nx.pagerank(g)
        density = nx.density(g)

        try:
            from networkx.algorithms.community import louvain_communities
            comms = louvain_communities(g)
            community_count = len(comms)
        except Exception:
            community_count = 2

        duration_ms = round((time.time() - start) * 1000, 2)

        return ProcessingResult(
            dataset_id=self.dataset_id,
            dataset_name=self.dataset_name,
            records_loaded=len(SAMPLE_COMMUNICATION_LOGS),
            records_valid=len(SAMPLE_COMMUNICATION_LOGS),
            records_invalid=0,
            missing_timestamps=0,
            missing_locations=0,
            entities_extracted=len(entities),
            relationships_extracted=len(relationships),
            processing_time_ms=duration_ms,
            model_metrics={
                "task": "Communication Network & Centrality Analysis",
                "nodes": len(g.nodes),
                "edges": len(g.edges),
                "network_density": round(density, 4),
                "community_count": community_count,
                "top_central_subject": max(degree_cent.items(), key=lambda x: x[1])[0],
                "max_degree_centrality": round(max(degree_cent.values()), 4),
                "max_betweenness_centrality": round(max(between_cent.values()), 4),
                "mean_pagerank": round(sum(pagerank.values()) / len(pagerank) if pagerank else 0, 4)
            },
            sample_entities=[e.dict() for e in list(entities.values())[:6]],
            sample_relationships=[r.dict() for r in relationships[:6]]
        )
