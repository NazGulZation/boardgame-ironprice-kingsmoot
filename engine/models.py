"""IRON PRICE: Kingsmoot — Core Game Models (Phase 1)"""
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from enum import Enum


class DiceFace(str, Enum):
    KRAKEN = "Kraken"  # 2 hits
    AXE = "Axe"        # 1 hit
    SHIELD = "Shield"  # 1 block
    EYE = "Eye"        # Drowned trigger (0 hits/blocks in basic combat)


class FactionType(str, Enum):
    EURON = "Euron"
    VICTARION = "Victarion"
    ASHA = "Asha"


class NodeKind(str, Enum):
    ISLE = "isle"
    SEA = "sea"
    LAND = "land"


@dataclass
class Ship:
    id: str
    faction: str
    is_flagship: bool
    crew: int = 0
    max_crew: int = 4  # 6 for Iron Victory in Phase 2

    def get_speed(self) -> int:
        """Calculate movement speed based on flagship identity and crew load."""
        if self.id == "euron_flagship":
            return 3
        if self.id == "victarion_flagship":
            return 1 if self.crew >= 5 else 2
        return 2

    def get_name(self) -> str:
        names = {
            "asha_flagship": "Black Wind",
            "euron_flagship": "Silence",
            "victarion_flagship": "Iron Victory",
            "asha_reaver1": "Iron Longship I",
            "asha_reaver2": "Iron Longship II",
            "euron_reaver1": "Iron Longship I",
            "euron_reaver2": "Iron Longship II",
            "victarion_reaver1": "Iron Longship I",
            "victarion_reaver2": "Iron Longship II",
        }
        return names.get(self.id, self.id.replace("_", " ").title())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.get_name(),
            "faction": self.faction,
            "is_flagship": self.is_flagship,
            "crew": self.crew,
            "max_crew": self.max_crew,
            "speed": self.get_speed()
        }


@dataclass
class MapNode:
    id: str
    name: str
    kind: str
    x: int
    y: int
    defense: int = 0
    hoard: int = 0
    legend: int = 0
    special: str = ""
    is_burned: bool = False
    control: Optional[str] = None
    occupants: List[Ship] = field(default_factory=list)
    neutral_crew: int = 0
    image: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "kind": self.kind,
            "x": self.x,
            "y": self.y,
            "defense": self.defense,
            "hoard": self.hoard,
            "legend": self.legend,
            "special": self.special,
            "is_burned": self.is_burned,
            "control": self.control,
            "occupants": [s.to_dict() for s in self.occupants],
            "neutral_crew": self.neutral_crew,
            "image": self.image
        }


@dataclass
class PlayerState:
    faction: str
    name: str
    title: str
    color: str
    home_node: str
    is_ai: bool = False
    hoard: int = 5
    legend: int = 0
    favor: int = 0
    reserve_crew: int = 2
    successful_raids: int = 0
    first_raid_defense_used: bool = False  # Euron trait: -1 defender die on 1st raid against him per season
    casualties_accumulator: int = 0        # Accrues crew lost; 2 crew lost -> +1 Favor

    def to_dict(self) -> Dict[str, Any]:
        return {
            "faction": self.faction,
            "name": self.name,
            "title": self.title,
            "color": self.color,
            "home_node": self.home_node,
            "is_ai": self.is_ai,
            "hoard": self.hoard,
            "legend": self.legend,
            "favor": self.favor,
            "reserve_crew": self.reserve_crew,
            "successful_raids": self.successful_raids,
            "first_raid_defense_used": self.first_raid_defense_used,
            "casualties_accumulator": self.casualties_accumulator
        }


@dataclass
class RollResult:
    dice: List[str]
    hits: int
    blocks: int
    eyes: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "dice": self.dice,
            "hits": self.hits,
            "blocks": self.blocks,
            "eyes": self.eyes
        }


@dataclass
class ReaveOutcome:
    target_id: str
    target_name: str
    attacker_faction: str
    attacker_roll: RollResult
    defender_roll: RollResult
    net_attacker_hits: int
    defense_required: int
    success: bool
    hoard_gained: int
    legend_gained: int
    crew_lost: int
    favor_gained: int = 0
    origin_node: str = ""
    ship_id: str = ""
    dead_ship_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target_id": self.target_id,
            "target_name": self.target_name,
            "attacker_faction": self.attacker_faction,
            "attacker_roll": self.attacker_roll.to_dict(),
            "defender_roll": self.defender_roll.to_dict(),
            "net_attacker_hits": self.net_attacker_hits,
            "defense_required": self.defense_required,
            "success": self.success,
            "hoard_gained": self.hoard_gained,
            "legend_gained": self.legend_gained,
            "crew_lost": self.crew_lost,
            "favor_gained": self.favor_gained,
            "origin_node": self.origin_node,
            "ship_id": self.ship_id,
            "dead_ship_ids": list(self.dead_ship_ids)
        }


@dataclass
class BattleRoundResult:
    round_num: int
    attacker_roll: RollResult
    defender_roll: RollResult
    net_attacker_hits: int
    net_defender_hits: int
    attacker_crew_lost: int
    defender_crew_lost: int
    blood_price_used: bool = False
    blood_price_favor_gained: int = 0
    blood_price_crew_lost: int = 0
    miracle_used: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "round_num": self.round_num,
            "attacker_roll": self.attacker_roll.to_dict(),
            "defender_roll": self.defender_roll.to_dict(),
            "net_attacker_hits": self.net_attacker_hits,
            "net_defender_hits": self.net_defender_hits,
            "attacker_crew_lost": self.attacker_crew_lost,
            "defender_crew_lost": self.defender_crew_lost,
            "blood_price_used": self.blood_price_used,
            "blood_price_favor_gained": self.blood_price_favor_gained,
            "blood_price_crew_lost": self.blood_price_crew_lost,
            "miracle_used": self.miracle_used
        }


@dataclass
class BattleState:
    battle_id: str
    node_id: str
    origin_node_id: str
    attacker_faction: str
    defender_faction: str
    attacker_ship_id: str
    defender_ship_id: str
    round_num: int = 1
    state: str = "round1_ready"  # "awaiting_choice", "deferred", "round1_ready", "round1_decision", "round2_ready", "finished"
    history: List[BattleRoundResult] = field(default_factory=list)
    winner: Optional[str] = None
    is_stalemate: bool = False
    retreated_faction: Optional[str] = None
    hoard_plundered: int = 0
    legend_awarded: int = 0
    blood_price_available: bool = True  # Once per battle for Euron
    total_attacker_crew_lost: int = 0
    total_defender_crew_lost: int = 0
    sunk_ship_ids: List[str] = field(default_factory=list)
    deferred: bool = False  # True while attacker defers resolution to muster reinforcements

    def to_dict(self) -> Dict[str, Any]:
        return {
            "battle_id": self.battle_id,
            "node_id": self.node_id,
            "origin_node_id": self.origin_node_id,
            "attacker_faction": self.attacker_faction,
            "defender_faction": self.defender_faction,
            "attacker_ship_id": self.attacker_ship_id,
            "defender_ship_id": self.defender_ship_id,
            "round_num": self.round_num,
            "state": self.state,
            "history": [h.to_dict() for h in self.history],
            "winner": self.winner,
            "is_stalemate": self.is_stalemate,
            "retreated_faction": self.retreated_faction,
            "hoard_plundered": self.hoard_plundered,
            "legend_awarded": self.legend_awarded,
            "blood_price_available": self.blood_price_available,
            "total_attacker_crew_lost": self.total_attacker_crew_lost,
            "total_defender_crew_lost": self.total_defender_crew_lost,
            "sunk_ship_ids": list(self.sunk_ship_ids),
            "deferred": self.deferred
        }


@dataclass
class StormHazardResult:
    ship_id: str
    faction: str
    origin_node: str
    storm_node: str
    die_face: str
    outcome: str  # "safe", "pushback", "casualty"
    crew_lost: int
    favor_gained: int
    final_node: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ship_id": self.ship_id,
            "faction": self.faction,
            "origin_node": self.origin_node,
            "storm_node": self.storm_node,
            "die_face": self.die_face,
            "outcome": self.outcome,
            "crew_lost": self.crew_lost,
            "favor_gained": self.favor_gained,
            "final_node": self.final_node
        }
