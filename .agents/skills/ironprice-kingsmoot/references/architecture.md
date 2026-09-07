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
│   ├── models.py        # Core dataclasses: Ship, Node, PlayerState, GameConfig
│   ├── dice.py          # D6 roller, Drowned God dice, Storm hazard checks
│   ├── map_engine.py    # Graph topology, edges, path distance, adjacency
│   ├── combat.py        # Reave battle resolution, damage & plunder math
│   ├── game_state.py    # GameStateManager: action handlers, season tracker, logging
│   ├── logger.py        # Persistent file & error logger (logs/game.log, logs/error.log)
│   └── ai.py            # SimpleAI heuristic agent for bot opponents
├── web/
│   ├── index.html       # Single-page application markup & modals
│   ├── css/
│   │   ├── style.css    # Dark maritime ironborn theme, typography, layout
│   │   └── animations.css # SVG animations (pulsing halos, dice roll, ship pointers)
│   └── js/
│       ├── api.js       # HTTP client for REST API endpoints
│       ├── map_renderer.js # Interactive SVG map, zoom/pan, ship capsule rendering
│       ├── ui.js        # HUD controller, claimant trackers, dice modal, action buttons
│       └── app.js       # Main controller, event routing, AI turn pacing
├── tests/
│   ├── test_engine.py   # Unit tests for state transitions, actions, AI simulation
│   ├── test_phase2.py   # Unit tests for Phase 2 combat, favor, flagships, hazards
│   └── test_server.py   # HTTP integration tests against server endpoints
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
    max_crew: int = 4 # Maximum capacity
```

### `Node`
```python
@dataclass
class Node:
    id: str           # Node identifier (e.g. "pyke", "bay", "casterly")
    name: str         # Display title
    kind: str         # "isle" | "sea" | "land"
    x: int            # SVG X coordinate
    y: int            # SVG Y coordinate
    defense: int = 0  # Green Land keep defense (dice required to sack)
    hoard: int = 0    # Plunder value upon reave
    legend: int = 0   # Victory points awarded upon sacking
    special: str = "" # Strategic description
    is_burned: bool = False # Burned keeps give -1 hoard on repeated raids
    control: Optional[str] = None # Controlling faction name
    occupants: List[Ship] = field(default_factory=list) # Stationed longships
    neutral_crew: int = 0 # Isle garrison defense
    image: str = ""   # Relative path to circular node illustration
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
    favor: int = 0      # Drowned God favor tokens
    reserve_crew: int = 4 # Unassigned crew pool
    successful_raids: int = 0
```

---

## 4. REST API Contract (`server.py`)

All requests and responses use `application/json`.

| Endpoint | Method | Payload / Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/map_data` | `GET` | None | Returns static map node coordinates, names, kinds, and graph edges. |
| `/api/state` | `GET` | None | Returns full active game state snapshot. |
| `/api/logs` | `GET` | `?lines=100` | Returns recent log entries from persistent `logs/game.log`. |
| `/api/action` | `POST` | `{"action_type": str, ...}` | Executes action (`sail`, `reave`, `muster`, `pray`, `battle_round`, `favor_miracle`, `end_turn`). |
| `/api/new_game` | `POST` | `{"max_seasons": int, "ai_factions": list}` | Resets and initializes a fresh game session. |
| `/api/ai_step` | `POST` | None | Advances the active AI bot by exactly one action. |

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
