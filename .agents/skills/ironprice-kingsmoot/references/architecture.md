# IRON PRICE: Kingsmoot — Technical Architecture

This document details the codebase architecture, data models, REST endpoints, and UI coordinate systems.

---

## 1. Architectural Philosophy

1. **Zero External Dependencies**: The backend runs purely on the standard Python 3.10+ library (`http.server`, `json`, `dataclasses`, `random`, `math`, `unittest`).
2. **Deterministic & Testable State**: All game state is encapsulated in `GameStateManager`, serializable to standard Python dictionaries / JSON, allowing 100% automated headless simulations.
3. **Responsive Client-Side Projection**: The Web UI uses standard SVG 1.1, HTML5, and vanilla JavaScript without bundlers, node_modules, or external frameworks.
4. **Resilient Interaction Design**: Left-click selects/inspects; Right-click issues tactical commands (Sail / Reave) to prevent costly misclicks.

---

## 2. Directory Structure

```
ironprice-kingsmoot/
├── engine/
│   ├── models.py        # Core dataclasses: Ship, MapNode, PlayerState, RollResult,
│   │                    #   ReaveOutcome, BattleRoundResult, BattleState, StormHazardResult
│   ├── dice.py          # Custom d6 pool, crew/nava­l dice math, Storm die
│   ├── map_engine.py    # Graph topology, edges, adjacency, reachable-nodes by speed
│   ├── combat.py        # Reave battle resolution, naval rounds, Blood Price, miracles, loot
│   ├── battle_manager.py # Naval clash lifecycle: awaiting_choice → deferred → round1/round2 → finished
│   ├── sail_manager.py  # Sail execution, Storm Belt hazard, deferred-reinforcement window
│   ├── game_state.py    # GameStateManager: action handlers, season tracker, harbor recovery, logging
│   ├── logger.py        # Persistent file & error logger (logs/game.log, logs/error.log)
│   └── ai.py            # SimpleAI heuristic agent for bot opponents
├── web/
│   ├── index.html       # Single-page application markup & modals (?v=2.52 cache buster)
│   ├── css/ (6 files)   # style / panels / dice_tray / modals / battle / animations
│   ├── js/ (10 files)
│   │   ├── api.js       # HTTP client for REST API endpoints
│   │   ├── map_builder.js   # Static SVG defs, edges, nodes
│   │   ├── map_animator.js  # Guarded tween delegates (sail / clash / raid / sink)
│   │   ├── map_renderer.js  # Interactive SVG map, zoom/pan, ship capsule rendering
│   │   ├── battle_fleets.js # Multi-hull vertical fleet rows in battle modal
│   │   ├── dice_gate.js     # Human click-to-roll gates for reave/naval modals
│   │   ├── naval_choice.js  # NOW-vs-WAIT deferred-clash patches + banner
│   │   ├── sound.js     # SoundFX vanilla Web Audio (12 keys, 14 clips — see ironprice-sound)
│   │   ├── ui.js        # HUD controller, claimant trackers, dice modal, action buttons
│   │   └── app.js       # Main controller, event routing, AI turn pacing (~627 lines — quota watch)
│   └── assets/sounds/ (14 clips) # sail/sail2/sail3, end_turn, dice, clash, sink, reave,
│                                 #   storm, favor, card, victory, defeat, click
├── tests/ (51 tests)
│   ├── test_engine.py   # Unit tests for state transitions, actions, AI simulation
│   ├── test_phase2.py   # Unit tests for Phase 2 combat, favor, flagships, hazards
│   ├── test_deferred_battle.py # NOW-vs-WAIT choice + reinforcement tests
│   ├── test_garrison_and_harbor.py # Attrition + harbor recovery tests
│   ├── test_sound.py    # Audio clip integrity + MIME delivery tests
│   ├── test_web_ui.py + js_ui_validator.js # Headless UI/modal validation
│   └── test_server.py   # HTTP integration tests against server endpoints
│   └── test_file_size.py # 700-line quota enforcement (binary audio exempt)
├── server.py            # Custom HTTP server serving static files & JSON REST API
├── run_game.py          # One-click startup script launching server and browser
└── run_game.bat         # Windows batch runner
```

---

## 3. Backend Data Models (`engine/models.py`)

### `Ship`
```python
@dataclass
class Ship:
    id: str           # Unique ID (e.g. "asha_flagship", "asha_reaver1")
    faction: str      # "Asha" | "Euron" | "Victarion"
    is_flagship: bool # True for main dreadnought (starts with 4 crew)
    crew: int         # Current crew (0 to max_crew)
    max_crew: int = 4 # 6 for Iron Victory

    def get_speed(self) -> int:
        # euron_flagship: 3; victarion_flagship: 1 if crew>=5 else 2; others: 2

    def get_name(self) -> str:
        # Returns lore name: Black Wind, Iron Victory, Silence, or Iron Longship I/II
```

### `Node`
```python
@dataclass
class MapNode:
    id: str           # Node identifier (e.g. "pyke", "bay", "casterly")
    name: str         # Display title
    kind: str         # "isle" | "sea" | "land"
    x: int            # SVG X coordinate
    y: int            # SVG Y coordinate
    defense: int = 0  # Green Land keep defense (dice required to sack)
    max_defense: int = 0 # Original defense (auto-set in __post_init__; season replenish target)
    hoard: int = 0    # Plunder value upon reave
    legend: int = 0   # Victory points awarded upon sacking
    special: str = "" # Strategic description
    is_burned: bool = False # Burned keeps pay -1 Hoard (min 1), -1 Legend (min 0)
    control: Optional[str] = None # Controlling faction name (home ports)
    occupants: List[Ship] = field(default_factory=list) # Stationed longships
    neutral_crew: int = 0 # Isle garrison defense
    image: Optional[str] = None # Relative path to circular node illustration
```

### `PlayerState`
```python
@dataclass
class PlayerState:
    faction: str        # "Asha" | "Euron" | "Victarion"
    name: str           # Full character name
    title: str          # Descriptive honorific
    color: str          # Hex color code
    home_node: str      # Home port identifier
    is_ai: bool = False # Bot flag
    hoard: int = 5      # Gold / plunder currency
    legend: int = 0     # Accumulated victory renown
    favor: int = 0      # Drowned God favor tokens (cap 7)
    reserve_crew: int = 2 # Unassigned crew pool (Asha 4 / Euron 2 / Victarion 4 at setup)
    successful_raids: int = 0
    first_raid_defense_used: bool = False # Euron trait consumed flag (resets each season)
    casualties_accumulator: int = 0       # Every 2 crew lost -> +1 Favor
```

### `RollResult` / `ReaveOutcome` / `BattleRoundResult` / `StormHazardResult`
```python
@dataclass
class RollResult:
    dice: List[str]  # Face names: Kraken / Axe / Shield / Eye
    hits: int; blocks: int; eyes: int

@dataclass
class ReaveOutcome:
    target_id: str; target_name: str; attacker_faction: str
    attacker_roll: RollResult; defender_roll: RollResult
    net_attacker_hits: int; defense_required: int; success: bool
    hoard_gained: int; legend_gained: int; crew_lost: int
    favor_gained: int = 0; origin_node: str = ""; ship_id: str = ""
    dead_ship_ids: List[str] = ...  # recorded BEFORE respawn for sink animation
    guard_lost: int = 0             # min(defense, net_hits) on failed raids
    new_defense: int = 0

@dataclass
class BattleRoundResult:
    round_num: int; attacker_roll: RollResult; defender_roll: RollResult
    net_attacker_hits: int; net_defender_hits: int
    attacker_crew_lost: int; defender_crew_lost: int
    blood_price_used: bool = False; blood_price_favor_gained: int = 0
    blood_price_crew_lost: int = 0; miracle_used: Optional[str] = None

@dataclass
class BattleState:
    battle_id: str; node_id: str; origin_node_id: str
    attacker_faction: str; defender_faction: str
    attacker_ship_id: str; defender_ship_id: str
    round_num: int = 1
    state: str = "round1_ready"
    # "awaiting_choice" (human NOW-vs-WAIT) | "deferred" (parked for reinforcements) |
    # "round1_ready" | "round1_decision" | "round2_ready" | "finished"
    history: List[BattleRoundResult] = ...
    winner: Optional[str] = None; is_stalemate: bool = False
    retreated_faction: Optional[str] = None
    hoard_plundered: int = 0; legend_awarded: int = 0
    blood_price_available: bool = True
    total_attacker_crew_lost: int = 0; total_defender_crew_lost: int = 0
    sunk_ship_ids: List[str] = ...  # recorded BEFORE respawn
    deferred: bool = False
    attacker_fleet_ids / defender_fleet_ids: List[str]  # every hull, never shrinks
    attacker_fleet / defender_fleet: List[dict]         # per-hull modal rows

@dataclass
class StormHazardResult:
    ship_id: str; faction: str; origin_node: str; storm_node: str
    die_face: str; outcome: str  # "safe" | "pushback" | "casualty"
    crew_lost: int; favor_gained: int; final_node: str
```

---

## 4. REST API Contract (`server.py`)

All requests and responses use `application/json`.

| Endpoint | Method | Payload / Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/map_data` | `GET` | None | Returns static map node coordinates, names, kinds, and graph edges. |
| `/api/state` | `GET` | None | Returns full active game state snapshot. |
| `/api/logs` | `GET` | `?lines=100` | Returns recent log entries from persistent `logs/game.log`. |
| `/api/action` | `POST` | `{"action_type": str, ...}` | Executes action: `sail {ship_id,target_node}` (speed-gated) \| `muster {node_id,ship_id?}` (2 Hoard at Great Wyk else 3) \| `reave {ship_id,target_land_id}` \| `battle_round {battle_id,retreat,use_blood_price,reroll_dice_indices,miracle_cost:2\|6,continue_round}` \| `battle_choice {battle_id,choice:resolve_now\|defer}` \| `favor_miracle {miracle_type:"call_storm",target_node}` (4 Favor, sea only) \| `pray` (free +1 Favor) \| `end_turn`. Blocked while `awaiting_choice` (except `battle_choice`); sail-while-`deferred` only reinforces. |
| `/api/new_game` | `POST` | `{"max_seasons": int, "ai_factions": list}` | Resets and initializes a fresh game session (e.g. `["Euron","Victarion"]` for solo Asha). |
| `/api/ai_step` | `POST` | None | Advances the active AI bot by exactly one action. |

Battle state machine: `awaiting_choice` (human NOW-vs-WAIT, no dice yet) → `deferred` (parked; reinforcements sail in; auto-erupts at 0 actions / End Turn) → `round1_ready` → `round1_decision` → (`continue_round` → round 2) → `finished`. AI attackers skip choice; AI-vs-AI auto-resolves.

---

## 5. Map Coordinate & Dock Layout System (`web/js/map_renderer.js`)

To prevent visual crowding and overlapping unit badges:
* **SVG ViewBox**: `100 60 1690 890`
* **Node Dimensions**:
  * Isles: Circle `r=58`, with large emoji icons and bold white text (`18px`).
  * Seas: Circle `r=64`, deep sea gradients, dynamic storm styling.
  * Green Lands: Rect `166x104`, rounded `rx=12`, golden stats overlay (`16px`).
* **Unit Dock Capsules**:
  * Size: `66x36px` with pill container (`rx=18`).
  * Left: Ship symbol (`★` Flagship or `⛵` Reaver).
  * Right: Dark crew capsule with bold high-contrast crew count.
  * Dock Offsets:
    * Isles: Anchored horizontally to the left (`offsetX = -108`).
    * Ironman's Bay: Anchored to the North (`offsetY = -95`).
    * Storm Belt: Anchored to the West (`offsetX = -108`) to avoid overlapping Banefort below.
    * Sunset Sea S: Anchored to the East (`offsetX = +108`).
    * Sunset Sea N & C: Anchored to the West (`offsetX = -108`).
    * Green Lands: Anchored above the keep (`offsetY = -78`).
* **Tactical Animation Coordinates**:
  * Naval Clash: Crossed swords (`⚔️`) are computed dynamically at the midpoint between the attacking and defending ship dock positions:
    $$\text{clashX} = \frac{\text{dockAttacker.x} + \text{dockDefender.x}}{2}, \quad \text{clashY} = \frac{\text{dockAttacker.y} + \text{dockDefender.y}}{2}$$
  * Reave Raid: Red pulsing trajectory arc sweeps from the sea dock capsule directly to the target keep center, with animations paused/suppressed during AI auto-step execution.
