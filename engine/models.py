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

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "faction": self.faction,
            "is_flagship": self.is_flagship,
            "crew": self.crew,
            "max_crew": self.max_crew
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
            "successful_raids": self.successful_raids
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
            "crew_lost": self.crew_lost
        }
