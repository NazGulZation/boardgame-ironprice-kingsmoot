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
6. **Strict 700-Line File Quota**:
   * No file in the repository (Python, JS, CSS, JSON, Markdown, etc.) may exceed **700 lines** to prevent code bloat.
   * When any file exceeds this quota, it must be immediately refactored and modularized into focused, single-responsibility submodules.
   * Continuously enforced and validated by `tests/test_file_size.py`.

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
5. **Dice Tray & Combat Modal Readability**:
   * Bottom dice tray (`.dice-tray-panel`) must use `min-height: 168px; height: auto; flex-shrink: 0;` and `.map-viewport` must have `min-height: 0;` to prevent layout clipping and ensure comfortable padding for result summary text.
   * Bottom tray dice (`.dice-face`) are scaled to `64px × 64px` with `1.75rem` icons and `.dice-val` combat effect tags (`+2 Hits`, `+1 Hit`, `⚔️ 1 Hit`, `🛡️ 1 Block`).
   * Reave combat modal (`#modal-reave`, `.modal-reave-card`) has `max-width: 800px; width: 96%;`, dice scaled to `88px × 88px` (`.reave-dice-face`) with `2.85rem` icons and `1.00rem` high-contrast tags.
   * Must provide high-suspense animated 3D dice tumbling (`.dice-tumbling`), lock-in settles (`.dice-settled`), attacker vs defender formula bars, and pause AI auto-step pacing while the modal is open.
   * **Casualty Resolution Transparency**: Always display both Keep Garrison counter-attack hits (`⚔️ 1 Hit`, `⚔️ 2 Hits`) and net casualties:
     `crew_lost = max(0, min(ship.crew, garrison_hits - attacker_blocks))`
     Clearly break down retaliation in outcome banners and summary trays.
6. **Thematic Board Map & Node Artwork Pipeline**:
   * The map SVG embeds `web/assets/board_map.jpg` as the background art with an atmospheric multiply overlay.
   * Sea routes and edges include dark underlay contrast strokes so navigation paths and nodes remain distinct and legible over the nautical illustration.
   * **Node Illustration Tokens**:
     * Nodes in `map.json` can specify `"image": "assets/nodes/<node_id>.jpg"`.
     * `MapNode` in `engine/models.py` supports `image: str = ""`.
     * `MapRenderer` dynamically registers an SVG `<defs>` entry with a circular `<clipPath id="clip-<id>">` and a dark radial gradient vignette (`#node-vignette-<id>`).
     * The node artwork is rendered with `preserveAspectRatio="xMidYMid slice"`, overlaid by the vignette and high-contrast text pill so titles and garrison counts are always legible.
7. **House Greyjoy Thematic UI Styling**:
   * **Visual Language**: Heavy forged iron plates, beveled corner rivets (`.panel-rivet`), tarnished kraken gold highlights (`#f3c348`, `#c5972c`), and abyssal dark slate (`#06090d`, `#0b121b`).
   * **Ancestral Heraldry**: Kraken sigil (`🦑`), House motto *"WE DO NOT SOW" • WHAT IS DEAD MAY NEVER DIE*.
   * **Tactical Actions**: Heavy tactile button states with metallic `krakenSheen` glints and `bloodAura` combat pulsation for Reave actions.

8. **Naval Clash Animation & Popup Synchronization**:
   * When moving into an enemy sea zone, `animateNavalClash` renders pulsing crossed swords (`⚔️`) positioned precisely at the midpoint between the colliding ship dock coordinates (`clashX`, `clashY`) rather than the target node center. Prefer live badge positions (`getRenderedShipPosition`) when both combatants are co-located; fall back to dock-slot midpoints.
   * The battle dice modal popup is guarded by `isClashAnimating` and must **never** open until the naval clash animation resolves.
   * Combat dice tray animations only re-roll on newly generated rolls (`isNewRoll`), preventing unwanted tumbling animations on passive UI selection refreshes.
   * AI claimant raids are map-only: the reave dice popup is suppressed during AI turns (it would cover the axe-flight animation); the bottom dice tray shows the tumbling dice via `renderDiceRoll(..., true)` re-applied after `refresh()`. `stepAi` is guarded by `_steppingAi` against overlapping invocations.
   * Combat-before-respawn staging: the backend records wiped hulls (`BattleState.sunk_ship_ids`, `ReaveOutcome.dead_ship_ids`) *before* WHAT IS DEAD respawns move them home. The frontend renders a battle-time tableau with both hulls at the fight site (`_battleTableau` / `stageNavalClash` / `raidTableau`), plays swords first, and only then renders pushbacks / respawns — so nothing vanishes or teleports mid-animation.
   * Sinking plays AFTER dice popups: naval sinking via `playShipSinking` on battle-modal dismiss (immediately when no popup follows, e.g. AI-vs-AI finished battles); raid sinking via `playRaidDefeat` after the reave modal closes (hard-gated by `awaitReavePopupClosed`) or right after the map animation on AI turns. Human reaves additionally hold wiped hulls at the raid origin behind the popup via `raidTableau`, revealing respawns only after the dying animation.
   * Animation lock: all `MapRenderer` tween delegates run inside `guarded()` (balanced `animLock` counter); board left-clicks (`handleNodeClick` / `handleShipClick` / `clearSelection`) return early while `isAnimating`, otherwise `renderShips()` rebuilds badge elements mid-flight and running tweens break on detached nodes. Orchestrated sequences must route through the guarded delegates, never `this.animator.*` directly.
   * Positioned SVG groups must NEVER carry a CSS-transform animation on the same element: nest an outer `<g transform="translate(...)">` (position) with an inner `<g class="...">` (animation), plus `transform-box: fill-box; transform-origin: center;` — otherwise the CSS transform overrides the SVG translate and the icon jumps to the origin.
   * `getShipCoordinates` must index into the FULL occupant list exactly like `renderShips()` (never filter out 0-crew hulls), or dock slots diverge from rendered badges.
9. **Tactical Fleet Stacking & Respawn Mechanics**:
    * **Dice Stacking**: Co-located friendly longships with $\ge 1$ crew in the same zone contribute $+1$ bonus tactical die to both Keep Reaves (`calculate_reave_dice_count`) and Naval Clashes (`calculate_naval_dice_count`).
    * **What Is Dead May Never Die**: When any ship's crew is reduced to 0 (in naval combat or from Keep counter-attack retaliation during Reave), the ship immediately respawns at its home port with **1 crew** (if Flagship) or **0 crew** (if standard Longship). No faction is ever eliminated.
    * **Thematic Ship Heraldry**: Ships feature authentic Lore names via `Ship.get_name()`: Asha's *Black Wind*, Euron's *Silence*, Victarion's *Iron Victory*, and *{Faction} Longship I / II*.

10. **Settlement Garrison Attrition & Harbor Recovery**:
    * **Garrison Defense Attrition**: When a Green Land keep raid fails, any net attacker hits (`hits - defender_blocks`) permanently reduce the settlement's defense rating (`defense = max(1, defense - net_hits)`), creating tactical opportunities for subsequent raiders.
    * **Seasonal Replenishment**: All depleted settlement defenses replenish back to their original `max_defense` at the end of each Season.
    * **Home Harbor Crew Recovery**: Any faction flagship docked at its home harbor (Pyke, Great Wyk, or Harlaw) at the end of its turn with $\le 3$ crew passively recovers $+1$ free crew (up to 3). Reaver longships do not receive passive harbor recovery.

11. **SoundFX Audio Subsystem**:
    * **Vanilla Web Audio Pipeline**: Standalone `SoundFX` class (`web/js/sound.js`) manages low-latency CC0 WAV audio playback without external libraries.
    * **Clips & Dynamics**: Includes randomized sailing wave surges (`sail.wav`, `sail2.wav`, `sail3.wav`) with subtle pitch/volume jitter and an atmospheric end-turn warhorn sting (`end_turn.wav`).
    * **Audio Mute & Persistence**: UI toggle (`#btn-sound-toggle`) persists mute state in `localStorage` (`ironprice_muted`) and lazily unlocks Web Audio on first user interaction to comply with browser autoplay policies.

12. **Naval Battle Fleet Rows Display**:
    * **Multi-Hull Battle Arena**: `BattleFleets` (`web/js/battle_fleets.js`) renders vertical fleet rows in the battle modal for every participating hull on both attacker and defender sides, preventing reinforcing ships from being hidden behind the flagship.
    * **Real-Time Hull Status**: Live crew counts, flagship pennants, and sunk markers are displayed cleanly and updated dynamically through battle resolution.

---

## 5. MVP Implementation Roadmap

When implementing subsequent game phases, follow the phase specifications:

* **Phase 1: Tactical Engine** (Completed)
  * Implemented: Movement, Reave combat dice, Muster with overflow, Pray, End Turn, 3 AI claimants, Web UI.
  * Spec: [MVP-Phase-1-Tactical-Engine.md](../../../MVP-Phase-1-Tactical-Engine.md).
* **Phase 2: Combat & Favor** (Completed)
  * Implemented: Direct naval battle when entering enemy ship sea zone, tactical dice rolling with net damage, retreat mechanics.
  * Implemented: Drowned Favor track (0–7), tactical reroll (2 Favor), Call Storm (4 Favor) and Auto-Win (6 Favor) miracles.
  * Implemented: Asymmetric flagships (Silence speed 3 & Blood Price, Iron Victory 6 capacity & Iron Captain bonus, Black Wind storm immunity & free retreat).
  * Implemented: Co-located friendly fleet dice stacking for Reaves and Naval battles.
  * Implemented: Storm Belt hazards, no-elimination respawn ("What is dead may never die" with 1 crew flagship / 0 crew reaver, triggered in battle and reave wipeout), southern map re-routing, and persistent logging subsystem (`logs/game.log`, `logs/error.log`).
  * Spec: [MVP-Phase-2-Combat-Favor.md](../../../MVP-Phase-2-Combat-Favor.md).
* **Phase 3: Tide & Faction Cards** (Next)
  * Add: 30 Tide event deck (Winter storms, Merchant convoys, Kraken sightings).
  * Add: Faction tactical action cards for Asha, Euron, and Victarion.
  * Spec: [MVP-Phase-3-Tide-Faction-Cards.md](../../../MVP-Phase-3-Tide-Faction-Cards.md).
* **Phase 4: Kingsmoot & Advanced AI**
  * Add: Final Moot voting phase with Lord speeches and support tokens.
  * Add: Strategic AI profiles (Asha: coastal raider, Euron: mystical blood sacrifices, Victarion: brutal fleet clash).
  * Spec: [MVP-Phase-4-Kingsmoot-AI.md](../../../MVP-Phase-4-Kingsmoot-AI.md).

