---
name: ironprice-kingsmoot
description: >-
  Comprehensive development runbook, architectural guide, and testing workflow for the IRON PRICE: Kingsmoot 1v1v1 Ironborn board game across all MVP phases (Phase 1 Tactical Engine, Phase 2 Combat & Favor, Phase 3 Tide & Faction Cards, Phase 4 Kingsmoot & AI).
  Use when developing engine logic, creating or editing Web UI components, implementing new game phases, executing automated test suites, or running the local server.
---

# IRON PRICE: Kingsmoot — Agent Development Skill

This skill provides the architecture guide, coding standards, UI conventions, and execution runbooks for developing, testing, and expanding the **IRON PRICE: Kingsmoot** 1v1v1 tactical board game.

---

## 1. Core Architectural Constraints (Non-Negotiable)

1. **Zero External Python Dependencies**:
   * The backend must always run on the standard Python 3.10+ library. Never introduce third-party packages like `flask`, `fastapi`, `pygame`, or `requests`.
   * The web server uses Python's built-in `http.server.SimpleHTTPRequestHandler`.
2. **Pure Vanilla Web Stack**:
   * No node_modules, npm builds, bundlers, React, or Vue.
   * Frontend consists of standard HTML5, CSS3, and Vanilla JavaScript with SVG 1.1 graphics.
3. **Browser Cache Busting**:
   * Whenever editing `.js` or `.css` files in `web/`, always bump the query version string (e.g. `?v=1.7`) in `web/index.html`.
   * `server.py` sends `Cache-Control: no-cache, no-store, must-revalidate`.
4. **Interaction Separation (Prevent Misclicks)**:
   * **Left-Click**: Inspect node, select ship, open detail cards.
   * **Right-Click**: Direct tactical action execution (Right-click sea/isle to **Sail**, right-click keep to **Reave**).
5. **Deterministic State Management**:
   * All game rules must reside in `engine/` and be callable headlessly via `GameStateManager`.
   * The server is a thin JSON RPC wrapper around `GameStateManager`.

---

## 2. Quick Command Runbook

### A. Run Automated Unit & Integration Tests
Execute the custom test runner:
```powershell
python .agents/skills/ironprice-kingsmoot/scripts/run_tests.py
```
Or via standard unittest:
```powershell
python -m unittest discover -s tests
```

### B. Run Headless Balance & Invariant Simulations
Run simulated AI games to verify rules, invariants, and win rate balance:
```powershell
# Simulate 5 full games with 5 seasons each
python .agents/skills/ironprice-kingsmoot/scripts/simulate_turns.py --games 5 --seasons 5
```

### C. Launch Local Game Server
Start the HTTP server on port 8000:
```powershell
python run_game.py
```
Or run directly:
```powershell
python server.py
```
Web UI will be live at: `http://localhost:8000`

---

## 3. Project Structure & References

```text
.agents/skills/ironprice-kingsmoot/
├── SKILL.md                          # This instruction manual
├── scripts/
│   ├── run_tests.py                  # Test suite runner with formatted diagnostics
│   └── simulate_turns.py             # Headless AI game simulator & invariant checker
└── references/
    ├── rules_quickref.md             # Complete game rules & faction data
    └── architecture.md               # Technical architecture, models, and UI layout
```

* For in-depth rules, claimants, and dice math, see [Rules Quick Reference](./references/rules_quickref.md).
* For dataclasses, REST endpoints, and SVG docking geometry, see [Technical Architecture](./references/architecture.md).
* For high-level roadmap and design documents, see [MVP Overview](../../../MVP.md).

---

## 4. Web UI & Map Guidelines

1. **SVG Transforms on Hover**:
   * **Never** use `transform: scale(...)` on SVG node groups on hover. In SVG, coordinate origin issues cause nodes to jump/jitter across the screen.
   * Use CSS filters (`filter: brightness(1.25) drop-shadow(...)`) for hover effects instead.
2. **Ship Docking Positioning**:
   * Do not place unit badges directly on the center of node labels.
   * Always offset ship groups into clear harbor waters using the dock capsule standard (`66x36px` pills with `rx=18`).
3. **Selection Highlighting**:
   * Selected ships receive `.ship-selected` class, an animated rotating dashed halo (`.ship-halo`), and a bouncing arrow pointer (`.ship-pointer`, `▼`).
   * All decorative highlight SVG elements must have `pointer-events: none` so they don't block clicks.
4. **State Synchronization**:
   * `MapRenderer.update(gameState, selection)` must reapply `this.highlightSelection()` on every render cycle so highlights are never wiped by DOM rebuilds.
5. **Dice Tray & Combat Modal Guidelines**:
   * Bottom dice tray (`.dice-tray-panel`) must use `min-height: 154px; height: auto; flex-shrink: 0;` and `.map-viewport` must have `min-height: 0;` to prevent layout clipping and ensure comfortable padding for result summary text.
   * Reave combat modal (`#modal-reave`) must provide high-suspense animated 3D dice tumbling (`.dice-tumbling`), lock-in settles (`.dice-settled`), attacker vs defender formula bars, and pause AI auto-step pacing while the modal is open.
6. **Thematic Board Map Illustration**:
   * The map SVG embeds `web/assets/board_map.jpg` as the background art with an atmospheric multiply overlay.
   * Sea routes and edges include dark underlay contrast strokes so navigation paths and nodes remain distinct and legible over the nautical illustration.

---

## 5. MVP Implementation Roadmap

When implementing subsequent game phases, follow the phase specifications:

* **Phase 1: Tactical Engine** (Completed)
  * Implemented: Movement, Reave combat dice, Muster with overflow, Pray, End Turn, 3 AI claimants, Web UI.
  * Spec: [MVP-Phase-1-Tactical-Engine.md](../../../MVP-Phase-1-Tactical-Engine.md).
* **Phase 2: Combat & Favor** (Next)
  * Add: Direct naval battle when entering enemy ship sea zone.
  * Add: Favor spending for battle rerolls and special Drowned God blessings.
  * Spec: [MVP-Phase-2-Combat-Favor.md](../../../MVP-Phase-2-Combat-Favor.md).
* **Phase 3: Tide & Faction Cards**
  * Add: 30 Tide event deck (Winter storms, Merchant convoys, Kraken sightings).
  * Add: Faction tactical action cards for Asha, Euron, and Victarion.
  * Spec: [MVP-Phase-3-Tide-Faction-Cards.md](../../../MVP-Phase-3-Tide-Faction-Cards.md).
* **Phase 4: Kingsmoot & Advanced AI**
  * Add: Final Moot voting phase with Lord speeches and support tokens.
  * Add: Strategic AI profiles (Asha: coastal raider, Euron: mystical blood sacrifices, Victarion: brutal fleet clash).
  * Spec: [MVP-Phase-4-Kingsmoot-AI.md](../../../MVP-Phase-4-Kingsmoot-AI.md).
