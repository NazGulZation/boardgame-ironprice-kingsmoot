"""IRON PRICE: Kingsmoot — Map Graph & Routing Engine"""
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from .models import MapNode, Ship, NodeKind


class MapEngine:
    def __init__(self, map_file: Optional[Path] = None):
        if map_file is None:
            map_file = Path(__file__).parent.parent / "map.json"
        
        with open(map_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.nodes_data = data.get("nodes", [])
        self.edges_data = data.get("edges", [])
        
        # Build adjacency list
        self.adjacency: Dict[str, List[str]] = {}
        for node in self.nodes_data:
            self.adjacency[node["id"]] = []

        for edge in self.edges_data:
            u, v = edge[0], edge[1]
            if u in self.adjacency and v not in self.adjacency[u]:
                self.adjacency[u].append(v)
            if v in self.adjacency and u not in self.adjacency[v]:
                self.adjacency[v].append(u)

    def create_fresh_nodes(self) -> Dict[str, MapNode]:
        """Create fresh MapNode instances for a new game."""
        nodes: Dict[str, MapNode] = {}
        for n in self.nodes_data:
            def_val = n.get("defense", 0)
            node = MapNode(
                id=n["id"],
                name=n["name"],
                kind=n["kind"],
                x=n["x"],
                y=n["y"],
                defense=def_val,
                max_defense=def_val,
                hoard=n.get("hoard", 0),
                legend=n.get("legend", 0),
                special=n.get("special", ""),
                is_burned=False,
                control=n.get("control", None),
                occupants=[],
                neutral_crew=2 if n["id"] in ["oldwyk", "orkmont"] else 0,
                image=n.get("image", None)
            )
            nodes[node.id] = node
        return nodes

    def get_neighbors(self, node_id: str) -> List[str]:
        return self.adjacency.get(node_id, [])

    def get_reachable_nodes(self, from_node: str, max_speed: int = 2) -> List[str]:
        """
        BFS to find all reachable nodes within max_speed steps.
        Land nodes can only be targeted if adjacent (can't traverse through land).
        """
        if from_node not in self.adjacency:
            return []

        visited: Set[str] = {from_node}
        queue: List[Tuple[str, int]] = [(from_node, 0)]
        reachable: List[str] = []

        while queue:
            curr, dist = queue.pop(0)
            if dist > 0 and curr != from_node:
                reachable.append(curr)

            if dist < max_speed:
                for neighbor in self.adjacency.get(curr, []):
                    # In Iron Price, ships can only move through sea and isles (ports)
                    # Land targets are raided, not docked in freely
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append((neighbor, dist + 1))

        return reachable

    def is_adjacent(self, u: str, v: str) -> bool:
        return v in self.adjacency.get(u, [])

    def get_reavable_targets(self, fleet_node_id: str, nodes: Dict[str, MapNode]) -> List[str]:
        """
        Returns adjacent Green Land targets (or neutral isles / rivals in Phase 2).
        For Phase 1, returns adjacent Green Lands (kind == 'land').
        """
        targets = []
        for neighbor_id in self.get_neighbors(fleet_node_id):
            if neighbor_id in nodes:
                n = nodes[neighbor_id]
                if n.kind == NodeKind.LAND.value:
                    targets.append(neighbor_id)
        return targets
