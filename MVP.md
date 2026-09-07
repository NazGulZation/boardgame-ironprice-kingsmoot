# IRON PRICE: Kingsmoot — Master MVP Specification

## 1. Executive Summary & Vision

**IRON PRICE: Kingsmoot** is a digital adaptation of the 1v1v1 Ironborn board game set in George R. R. Martin's *A Song of Ice and Fire* universe. Three claimants (**Euron Crow's Eye**, **Victarion the Iron Captain**, and **Asha Kraken's Daughter**) compete over **5 Seasons** to reave the green lands, battle for the Iron Isles, invoke miracles of the Drowned God, and amass the most **Legend** to win the Kingsmoot on Old Wyk.

The MVP is engineered in **4 sequential phases**. A fundamental requirement is that **at each phase, the game is fully playable via a Web UI powered by Python**.

---

## 2. Core Architectural Principles

1. **Playable at Every Milestone**: Every phase delivers a complete game loop accessible through a web browser.
2. **Zero External Dependency Backend**: Built with Python 3 standard libraries (`http.server`, `json`, `pathlib`, `dataclasses`) ensuring it runs out-of-the-box on any machine without complex installation steps.
3. **Responsive, Thematic Frontend**: Pure HTML5, CSS3, and modern ES6 JavaScript rendering an interactive board, dice tray, card hands, battle arena, and dashboards.
4. **Authoritative Server Engine**: Game state, validation, dice rolls, combat resolution, card effects, and AI decisions are computed in Python to ensure rule enforcement and deterministic simulation.
5. **Decoupled REST API**: The frontend communicates via clean JSON API endpoints, allowing easy expansion, testing, and AI bot integration.

---

## 3. High-Level Architecture Diagram

```
+-------------------------------------------------------------------------+
|                              WEB CLIENT                                 |
|                                                                         |
|  +--------------------+  +--------------------+  +--------------------+ |
|  |   Map Renderer     |  |   Battle Arena     |  |    Player Hand     | |
|  |  (SVG / Canvas)    |  |    Dice Tray       |  |  Dual-Use Cards    | |
|  +---------+----------+  +---------+----------+  +---------+----------+ |
|            |                       |                       |            |
|            +-----------------------+-----------------------+            |
|                                    |                                    |
|                             [REST API Client]                           |
+------------------------------------+------------------------------------+
                                     |  HTTP / JSON
+------------------------------------+------------------------------------+
|                         PYTHON BACKEND SERVER                           |
|                             (server.py)                                 |
|                                    |                                    |
|                             [Router / API]                              |
|           /api/state  |  /api/action  |  /api/new_game  |  /api/ai_step |
|                                    |                                    |
|  +---------------------------------+----------------------------------+ |
|  |                       GAME ENGINE CORE                             | |
|  |                                                                    | |
|  |  +-------------------+  +--------------------+  +---------------+  | |
|  |  |  game_state.py    |  |   combat.py        |  |   cards.py    |  | |
|  |  | (Seasons / Turns) |  | (Dice & Battles)   |  | (Tide/Faction)|  | |
|  |  +---------+---------+  +---------+----------+  +-------+-------+  | |
|  |            |                      |                     |          | |
|  |  +---------+---------+  +---------+----------+  +-------+-------+  | |
|  |  |   map_engine.py   |  |    models.py       |  |    ai.py      |  | |
|  |  | (Nodes & Paths)   |  |   (Data Types)     |  | (Bot Logic)   |  | |
|  |  +-------------------+  +--------------------+  +---------------+  | |
|  +--------------------------------------------------------------------+ |
+-------------------------------------------------------------------------+
```

---

## 4. Four-Phase Phased Roadmap

| Phase | Milestone Name | Key Features Added | Playable Experience |
|---|---|---|---|
| **Phase 1** | **Core Tactical Engine & Map Reaving** | • 22-node map graph & routes<br>• 3 Claimants with starting stats<br>• Turn/Action loop (2 actions/turn, 3 turns/season)<br>• Actions: *Sail*, *Muster*, *Reave Green Land*, *Pray*<br>• 18 Custom Raid Dice simulation<br>• Sacking & Burned markers<br>• 3-5 Season Legend scoring | Interactive web board where players sail ships, roll custom dice against Green Land keeps, collect gold/legend, and crown the winner after 5 seasons. |
| **Phase 2** | **Fleet Battles, Favor Miracles & Hazards** | • PvP naval combat (fleet vs fleet, 2 rounds)<br>• Flagships (*Silence*, *Iron Victory*, *Black Wind*)<br>• Faction Powers (*Blood Price*, *Iron Captain*, *Kraken's Daughter*)<br>• Drowned Favor track (0-7) & miracles (2/4/6)<br>• Storm Belt entry risk rolls<br>• No-elimination respawn system | Tactical rival battles in a dedicated modal arena with dice clashes, power activations, miraculous favor spells, and deadly storms. |
| **Phase 3** | **Tide Deck, Faction Cards & Hand Management** | • 60 Tide Cards (15 unique x 4)<br>• 30 Faction Cards (10 unique per claimant)<br>• Dual-use card system (Sail/Dice vs Effect)<br>• Card draw mechanics & port bonuses<br>• Card play in battle rounds<br>• *Pillage* & *Repair* actions | Deep card-driven strategy where players balance discarding cards for raw movement/dice against saving powerful tactical effects. |
| **Phase 4** | **Full Kingsmoot Campaign, AI Bots & Polish** | • Complete Season End sequence (Control, Greed, Wrath, Bounty, Old Wyk/Orkmont triggers)<br>• Final Kingsmoot scoring ceremony<br>• Heuristic AI for Euron, Victarion, Asha<br>• Solo vs AI & 3-AI simulation modes<br>• Ironborn audio/visual themes & rulebook viewer | Complete single-player and hotseat experience with intelligent bot opponents, cinematic Kingsmoot coronation, sound effects, and full polish. |

---

## 5. Unified Data Models (`engine/models.py`)

```python
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum

class DiceFace(Enum):
    KRAKEN = "Kraken"  # 2 hits
    AXE = "Axe"        # 1 hit
    SHIELD = "Shield"  # 1 block
    EYE = "Eye"        # Drowned trigger (0 hits/blocks)

class FactionType(Enum):
    EURON = "Euron"
    VICTARION = "Victarion"
    ASHA = "Asha"

class NodeKind(Enum):
    ISLE = "isle"
    SEA = "sea"
    LAND = "land"

@dataclass
class Ship:
    id: str
    faction: FactionType
    is_flagship: bool
    crew: int = 0
    max_crew: int = 4  # 6 for Iron Victory

@dataclass
class MapNode:
    id: str
    name: str
    kind: NodeKind
    x: int
    y: int
    defense: int = 0
    hoard: int = 0
    legend: int = 0
    special: str = ""
    is_burned: bool = False
    occupants: List[Ship] = field(default_factory=list)
    neutral_crew: int = 0  # For Old Wyk / Orkmont

@dataclass
class Card:
    id: str
    name: str
    card_type: str  # "tide" or "faction"
    faction: Optional[FactionType]
    sail: int
    effect: str

@dataclass
class PlayerState:
    faction: FactionType
    name: str
    is_ai: bool = False
    hoard: int = 5
    legend: int = 0
    favor: int = 0
    hand: List[Card] = field(default_factory=list)
    hand_limit: int = 5  # Euron 5, Victarion 4, Asha 6
    reserve_crew: int = 2
    successful_raids: int = 0
    blood_price_used: bool = False

@dataclass
class BattleState:
    attacker_faction: FactionType
    defender_faction: Optional[FactionType]
    node_id: str
    round: int = 1
    max_rounds: int = 2
    attacker_dice: List[DiceFace] = field(default_factory=list)
    defender_dice: List[DiceFace] = field(default_factory=list)
    attacker_hits: int = 0
    defender_hits: int = 0
    attacker_blocks: int = 0
    defender_blocks: int = 0
    attacker_cards_played: List[str] = field(default_factory=list)
    defender_cards_played: List[str] = field(default_factory=list)
    status: str = "in_progress"  # "in_progress", "attacker_won", "defender_won", "retreated"

@dataclass
class GameState:
    season: int = 1
    max_seasons: int = 5
    turn_in_season: int = 1      # 1 to 3
    active_player_idx: int = 0   # 0 to 2
    actions_remaining: int = 2   # 2 actions per turn
    players: List[PlayerState] = field(default_factory=list)
    nodes: Dict[str, MapNode] = field(default_factory=dict)
    tide_deck: List[Card] = field(default_factory=list)
    tide_discard: List[Card] = field(default_factory=list)
    faction_decks: Dict[FactionType, List[Card]] = field(default_factory=dict)
    active_battle: Optional[BattleState] = None
    bounty_holder: Optional[FactionType] = None
    game_over: bool = False
    winner: Optional[FactionType] = None
    logs: List[str] = field(default_factory=list)
```

---

## 6. REST API Specification (`server.py`)

### Endpoints:
- `GET /api/state`
  - **Returns**: Full JSON representation of `GameState` for client rendering.
- `POST /api/new_game`
  - **Body**: `{ "ai_players": ["Victarion", "Asha"], "max_seasons": 5, "variant": "standard" }`
  - **Returns**: Fresh initialized `GameState`.
- `POST /api/action`
  - **Body**:
    ```json
    {
      "action_type": "sail" | "muster" | "reave" | "pray" | "favor" | "play_card" | "discard_card" | "pillage" | "repair" | "end_turn",
      "params": { ... }
    }
    ```
  - **Returns**: Updated `GameState` or error message if illegal.
- `POST /api/ai_step`
  - **Body**: `{}`
  - **Action**: Triggers the active bot to evaluate heuristics, execute an action, and return the new state.

---

## 7. Directory & File Reference

- `MVP.md` — Master Architecture & Specification (this document).
- `MVP-Phase-1-Tactical-Engine.md` — Phase 1: Core Tactical Engine & Map Reaving.
- `MVP-Phase-2-Combat-Favor.md` — Phase 2: Fleet Battles, Favor Miracles & Sea Hazards.
- `MVP-Phase-3-Tide-Faction-Cards.md` — Phase 3: Tide Deck, Faction Cards & Dual-Use Hand Management.
- `MVP-Phase-4-Kingsmoot-AI.md` — Phase 4: Full Kingsmoot Campaign, AI Bots & Visual Polish.
