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
   * Whenever editing `.js` or `.css` files in `web/`, always bump the query version string (e.g. `?v=2.52`) in `web/index.html`.
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

engine/                               # Authoritative rules (headless, zero-dependency)
├── models.py                         # Ship / MapNode / PlayerState / ReaveOutcome / BattleState / StormHazardResult
├── dice.py                           # Custom d6 pool: ceil(crew/2) dice, Kraken=2 hits, Axe=1, Shield=1 block, Eye=drowned
├── map_engine.py                     # Graph topology, adjacency, reachable-nodes by ship speed
├── combat.py                         # Reave + naval round resolution, Blood Price, favor reroll/autowin, loot
├── battle_manager.py                 # Naval clash lifecycle: awaiting_choice → deferred → round1/round2 → finished
├── sail_manager.py                   # Sail + Storm Belt hazard + deferred-reinforcement window
├── game_state.py                     # GameStateManager: actions, seasons, harbor recovery, respawn, scoring
├── logger.py                         # Persistent file & error logger (logs/game.log, logs/error.log)
└── ai.py                             # SimpleAI heuristic agent for bot opponents

web/
├── index.html                        # Single-page markup & modals (battle / reave / victory / rules / new-game)
├── css/ (6 files)                    # style / panels / dice_tray / modals / battle / animations
├── js/ (10 files)                    # api / app / battle_fleets / dice_gate / map_animator /
│                                     #   map_builder / map_renderer / naval_choice / sound / ui
└── assets/sounds/ (14 clips)         # Full SFX library — see ironprice-sound skill

tests/ (51 tests)                     # test_engine / test_phase2 / test_deferred_battle /
                                      #   test_garrison_and_harbor / test_server / test_sound /
                                      #   test_web_ui + js_ui_validator.js
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
    * **Dice Stacking**: Co-located friendly hulls with $\ge 1$ crew in the fight node add their own crew-dice pool (`ceil(crew/2)` each) to both Keep Reaves (`resolve_greenland_reave`) and Naval Clashes (`calculate_naval_dice_count`). Total pool capped at 6 dice. Victarion adds a further $+1$ (Iron Captain); a defender facing Euron's flagship on its first raid of the season suffers $-1$ (min 1).
    * **What Is Dead May Never Die**: When any ship's crew is reduced to 0 (in naval combat or from Keep counter-attack retaliation during Reave), the ship immediately respawns at its home port with **1 crew** (if Flagship) or **0 crew** (if standard Longship). No faction is ever eliminated. Backend records `sunk_ship_ids` / `dead_ship_ids` BEFORE respawn so the UI can sink hulls at the fight site first.
    * **Thematic Ship Heraldry**: Ships feature authentic Lore names via `Ship.get_name()`: Asha's *Black Wind*, Euron's *Silence*, Victarion's *Iron Victory*, and *Iron Longship I / II*.

 10. **Settlement Garrison Attrition & Harbor Recovery**:
    * **Garrison Defense Attrition**: When a Green Land keep raid fails but lands unblocked hits, the guard is weakened by `guard_lost = min(defense, net_attacker_hits)` (`defense = max(0, defense - guard_lost)`), creating openings for subsequent raiders.
    * **Seasonal Reset**: At season end all depleted settlement defenses replenish to `max_defense`; up to 2 Burned keeps are refreshed (unburned); Euron's first-raid flag resets.
    * **Home Harbor Crew Recovery**: At end of its turn, a faction flagship docked at ANY isle node with $\le 3$ crew passively recovers $+1$ crew (first qualifying flagship only). Reaver longships do not receive passive recovery.

 11. **SoundFX Audio Subsystem (see `ironprice-sound` skill)**:
    * **Vanilla Web Audio Pipeline**: Standalone `SoundFX` class (`web/js/sound.js`, 12 keys) manages low-latency CC0 WAV playback without external libraries. Voice pools (`MAX_VOICES=4`), volume/pitch jitter, lazy `unlock()` on first gesture.
    * **Full 14-clip library**: `sail/sail2/sail3` (waves), `end_turn` (horn), `dice`, `clash`, `sink`, `reave`, `storm`, `favor`, `card`, `victory`, `defeat`, `click` under `web/assets/sounds/`.
    * **Audio Mute & Persistence**: UI toggle (`#btn-sound-toggle`) persists mute state in `localStorage` (`ironprice_muted`) and lazily unlocks Web Audio on first user interaction to comply with browser autoplay policies.

12. **Naval Battle Fleet Rows Display**:
    * **Multi-Hull Battle Arena**: `BattleFleets` (`web/js/battle_fleets.js`) renders vertical fleet rows in the battle modal for every participating hull on both attacker and defender sides, preventing reinforcing ships from being hidden behind the flagship.
    * **Real-Time Hull Status**: Live crew counts, flagship pennants, and sunk markers are displayed cleanly and updated dynamically through battle resolution.

13. **Deferred Clash — Resolve NOW vs WAIT (`naval_choice.js` + `battle_manager.py`)**:
    * A human attacker who sails willingly into an enemy sea/isle with actions remaining enters `awaiting_choice` (no dice rolled yet; modal shows "resolve NOW or WAIT").
    * `POST /api/action {"action_type":"battle_choice","battle_id":..,"choice":"defer"}` parks the clash as `deferred`; remaining actions can sail a second friendly hull into the node (`reinforced:true`, $+1$ bonus die pool via stacking). Sailing elsewhere or opening a second battle is blocked.
    * The deferred clash auto-erupts (Round 1 roll) when actions hit 0 or on End Turn (`activate_deferred_battle`). AI attackers never defer — human-vs-AI rolls Round 1 immediately, AI-vs-AI auto-resolves both rounds headlessly.
    * Frontend: `NavalChoice.updateBanner` drives `#deferred-banner`; `refresh()` must never pop the dice modal while deferred; `updateActionButtons` keeps End Turn enabled but disables Call Storm while pending.

14. **Dice Math & Faction Traits (authoritative: `engine/dice.py`, `engine/combat.py`)**:
    * **Custom d6**: Kraken ×2 = 2 hits, Axe ×2 = 1 hit (2 if Victarion double-axes in `bay`), Shield ×1 = 1 block, Eye ×1 = drowned trigger.
    * **Pool**: `ceil(crew/2)` per hull, + aux-hull pools, Victarion $+1$, Euron-first-raid defender $-1$, cap 6. Reave attacker pool = flagship/reaver crew dice + bonuses; defender pool = `min(max(defense,1),6)`. Naval pools symmetric per side.
    * **Reave loot**: success needs `net_hits >= defense`. Burned keeps pay `-1 Hoard (min 1)`, `-1 Legend (min 0)`. Asha winning with 0 crew lost gains $+1$ Hoard (Kraken's Daughter). Casualties feed Favor: every 2 crew lost → $+1$ Favor (cap 7) via `apply_casualties_and_favor`.
    * **Flagships**: *Silence* (speed 3, Blood Price once/battle: reroll any dice, each new Eye = $+1$ Favor / $-1$ crew, defender $-1$ die on Euron's first raid/round-1); *Iron Victory* (capacity 6, speed 1 if crew ≥ 5 else 2, $+1$ die always, double Axes in `bay`); *Black Wind* (speed 2, Storm Belt immune — only this hull, not all Asha ships — free retreat, Asha plunder bonus).
    * **Miracles**: map `call_storm` = 4 Favor (sea zone only, 1 crew damage + pushback, costs 1 action, blocked while clash pending); battle `miracle_cost:2` = reroll own dice; `miracle_cost:6` = 5 unblockable hits. `Pray` is FREE ($+1$ Favor, cap 7, costs 1 action). Retreat: Asha free, others sacrifice 1 rearguard crew.
    * **Storm Belt** (all hulls except `asha_flagship`): Kraken/Axe = safe, Shield = pushed back to origin (action still spent), Eye = $-1$ crew / $+1$ Favor then continue into storm.
    * **Naval loot**: wiping a fleet steals 50% of loser's Hoard (Silence immune as loser flagship) + $+1$ Legend to winner.

15. **Season End & Scoring (`game_state.py`)**:
    * Per isle (`pyke/harlaw/greatwyk/oldwyk/orkmont`): faction with most crew present gains $+1$ Legend.
    * Refresh ≤ 2 Burned keeps, replenish ALL defenses to `max_defense`, reset Euron first-raid flags, then `season += 1`.
    * Game over after `max_seasons`: winner = sort by `(legend, hoard, favor, successful_raids)` descending — NOT the old `Legend×2+Hoard+Favor×1.5` formula still quoted in stale docs.

16. **REST Actions (`server.py` — `ai_factions`, not `ai_players`)**:
    * `POST /api/new_game {"max_seasons":5,"ai_factions":["Euron","Victarion"]}`; `GET /api/state|/api/map_data|/api/logs?lines=N`.
    * `POST /api/action`: `sail {ship_id,target_node}` (speed-gated, land targets rejected) | `muster {node_id,ship_id?}` (2 Hoard at Great Wyk else 3, full-capacity guard) | `reave {ship_id,target_land_id}` (adjacency + crew>0) | `battle_round {battle_id,retreat,use_blood_price,reroll_dice_indices,miracle_cost:2|6,continue_round}` | `battle_choice {battle_id,choice:resolve_now|defer}` | `favor_miracle {miracle_type:"call_storm",target_node}` | `pray {}` | `end_turn {}`. Sail/muster/reave/pray/call_storm are blocked while `awaiting_choice`; sail-while-`deferred` only reinforces.
    * `POST /api/ai_step {}` advances exactly one bot action.

17. **Frontend Module Map & Quota Pressure**:
    * `map_builder.js` (static SVG defs/edges/nodes) / `map_renderer.js` (ships, halos, clash/raid/sink tweens via `map_animator.js`) / `ui.js` (HUD, modals, dice tray) / `app.js` (event routing, AI pacing, reave/naval orchestration) / `dice_gate.js` (human click-to-roll gates) / `naval_choice.js` (NOW-vs-WAIT patches) / `battle_fleets.js` (fleet rows) / `api.js` / `sound.js`.
    * Quota watch (700-line limit, `tests/test_file_size.py`): `app.js` ~627 and `ui.js` ~620 are closest — put new UI logic in `dice_gate.js` / `naval_choice.js` / `battle_fleets.js` patches, never inline into `app.js`/`ui.js`. Bump `?v=` on every JS/CSS touch. Binary audio is exempt.

---

## 5. MVP Implementation Roadmap

When implementing subsequent game phases, follow the phase specifications:

* **Phase 1: Tactical Engine** (Completed)
  * Implemented: Movement, Reave combat dice, Muster with overflow, Pray, End Turn, 3 AI claimants, Web UI.
  * Spec: [MVP-Phase-1-Tactical-Engine.md](../../../MVP-Phase-1-Tactical-Engine.md).
* **Phase 2: Combat & Favor** (Completed)
  * Implemented: Willing-attacker naval clash choice (resolve NOW or WAIT/defer for reinforcements), 2-round fleet battles with retreat/stalemate/pushback, tactical dice rolling with net damage, Blood Price / reroll (2) / auto-win (6) / Call Storm (4) miracles.
  * Implemented: Drowned Favor track (0–7) via free Pray, casualty conversion (2 crew → 1 Favor), Storm Eye, and Blood Price Eyes.
  * Implemented: Asymmetric flagships (Silence speed 3 & Blood Price & first-raid −1 defender die, Iron Victory capacity 6 & Iron Captain +1 die & double Axes in bay & speed 1 at 5+ crew, Black Wind storm immunity & free retreat & Asha plunder bonus).
  * Implemented: Co-located friendly fleet dice stacking (each hull contributes ceil(crew/2), cap 6) for Reaves and Naval battles.
  * Implemented: Storm Belt hazards (Black Wind only immune), no-elimination respawn ("What is dead may never die" with 1 crew flagship / 0 crew reaver, triggered in battle and reave wipeout), southern map re-routing (`bay–storm–seaS` chain, `seaS`→fair/banefort/flint), garrison attrition + seasonal replenishment, flagship harbor recovery, and persistent logging subsystem (`logs/game.log`, `logs/error.log`).
  * Spec: [MVP-Phase-2-Combat-Favor.md](../../../MVP-Phase-2-Combat-Favor.md).
* **Phase 3: Tide & Faction Cards** (Next)
  * Add: 30 Tide event deck (Winter storms, Merchant convoys, Kraken sightings).
  * Add: Faction tactical action cards for Asha, Euron, and Victarion.
  * Spec: [MVP-Phase-3-Tide-Faction-Cards.md](../../../MVP-Phase-3-Tide-Faction-Cards.md).
* **Phase 4: Kingsmoot & Advanced AI**
  * Add: Final Moot voting phase with Lord speeches and support tokens.
  * Add: Strategic AI profiles (Asha: coastal raider, Euron: mystical blood sacrifices, Victarion: brutal fleet clash).
  * Spec: [MVP-Phase-4-Kingsmoot-AI.md](../../../MVP-Phase-4-Kingsmoot-AI.md).

