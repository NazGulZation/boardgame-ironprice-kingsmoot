# IRON PRICE: Kingsmoot — Rules Quick Reference

A 1v1v1 strategic Ironborn board game where three claimants vie to become King or Queen of the Iron Islands after the death of Balon Greyjoy.

---

## 1. Claimants & Starting Setup

| Claimant | Faction Color | Starting Port | Starting Ships | Starting Resources | Special Trait |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Asha Greyjoy** | Green (`#27ae60`) | Harlaw | Flagship *Black Wind* (4 crew, cap 4, speed 2), 2 Reavers (0 crew) | 5 Hoard, 0 Favor, 0 Legend, 4 Reserve | Kraken's Daughter: +1 Hoard when winning a raid with 0 crew lost; free retreat; *Black Wind* Storm immune |
| **Euron Greyjoy** | Purple (`#8e44ad`) | Pyke | Flagship *Silence* (4 crew, cap 4, speed 3), 2 Reavers (0 crew) | 5 Hoard, 0 Favor, 0 Legend, 2 Reserve | Blood Price (once/battle reroll; each new Eye = +1 Favor / −1 crew); defender −1 die on Euron's first raid each season |
| **Victarion Greyjoy** | Red (`#c0392b`) | Great Wyk | Flagship *Iron Victory* (4 crew, cap 6, speed 1 if crew ≥ 5 else 2), 2 Reavers (0 crew) | 5 Hoard, 0 Favor, 0 Legend, 4 Reserve | Iron Captain: +1 die every raid/battle; double Axes in Ironman's Bay; Muster costs only 2 Hoard at Great Wyk |

---

## 2. Turn Structure

* **Season Structure**: 5 Seasons per game (configurable in Solo/Spectator modes).
* **Round Structure**: In each season, players take turns in order: **Asha -> Euron -> Victarion**.
* **Action Points**: Each player receives **2 Action Points** per turn.
* When 2 actions are spent, turn automatically advances to the next claimant. If a player ends turn early, remaining actions are forfeited.
* At the end of Season 5, final scoring and Kingsmoot voting occurs.

---

## 3. Core Actions

### A. Sail (1 Action)
* Move 1 friendly ship with > 0 crew to a reachable Sea or Isle node (never directly onto land — reave from adjacent sea).
* **Speed**: *Silence* 3 nodes; *Iron Victory* 1 node if crew ≥ 5 else 2; all others 2 (`Ship.get_speed()`, `get_reachable_nodes`).
* **Storm check**: entering `storm` in anything except `asha_flagship` rolls the Storm Die (see §5C). Sailing while a clash is `awaiting_choice` is blocked; while `deferred` only reinforcements into the clash node are allowed.
* **Controls**: Left-click ship to select -> **Right-click destination sea/isle** to sail.

### B. Reave (1 Action)
* Attack an adjacent Green Land keep from a sea zone.
* **Requirements**: Friendly ship must have at least 1 crew member.
* **Combat Dice** (`engine/dice.py` + `engine/combat.py`):
  * Attacker pool = `ceil(ship.crew/2)` + `ceil(aux.crew/2)` per co-located friendly hull (crew > 0) + Victarion +1, capped at 6.
  * Defender pool = `min(max(keep.defense,1),6)` militia dice.
  * Faces: Kraken = 2 hits, Axe = 1 hit (2 for Victarion in `bay`), Shield = 1 block, Eye = drowned trigger.
  * `net_att = max(0, att.hits − def.blocks)`; `net_def = max(0, def.hits − att.blocks)`.
  * Total hits $\ge \text{Keep Defense}$: **Victory!** Plunder Hoard + Legend (Burned keeps: −1 Hoard min 1, −1 Legend min 0; Asha +1 Hoard if 0 crew lost). Keep becomes **Burned**. Counter-damage still applies.
  * Total hits $< \text{Keep Defense}$: **Repelled!** Ship + auxiliaries share `min(total_crew, net_def)` casualties (primary first); guard weakens by `min(defense, net_att)` (see §5D). If crew reaches 0, the ship immediately respawns at home port (1 crew for flagship, 0 for standard longship).
  * Every 2 crew lost → +1 Favor (cap 7).
* **Controls**: Left-click ship -> **Right-click adjacent Green Land keep** to reave instantly.

### C. Muster Crew (1 Action)
* Recruit **3 crew** at a node you control (`control == faction`) or your home port.
* **Cost**: **2 Hoard** at Great Wyk, **3 Hoard** elsewhere.
* **Distribution Rule**:
  * Crew goes onto the currently selected ship first up to capacity (max 4; 6 for *Iron Victory*).
  * Excess crew overflows onto any other friendly hulls stationed at that same port.
  * Any further remainder goes into the player's Reserve Crew pool.
* **Full Capacity Guard**: If all ships at the port are already at capacity, the action is blocked with an error and **no Hoard is spent**.

### D. Pray to the Drowned God (1 Action, FREE)
* Gain **+1 Favor** (cap 7). Costs no Hoard — only the action.
* Favor provides combat re-rolls and critical voting leverage during the Kingsmoot.

### E. End Turn (0 Actions)
* Pass the turn to the next player if no further actions are desired.

---

## 4. Map Geography

* **Iron Isles (5 nodes)**:
  * `pyke`: Euron's home port.
  * `harlaw`: Asha's home port.
  * `greatwyk`: Victarion's home port (reduced muster cost).
  * `oldwyk`: Sacred Kingsmoot site (+1 Favor, +1 Legend on visit).
  * `orkmont`: Rich mineral mines (+2 Hoard bonus at season end).
* **Sea Zones (5 nodes)**:
  * `bay` (Ironman's Bay): Calm inland waters connecting the Isles. Connects to `pyke/harlaw/greatwyk/oldwyk/orkmont`, `seaN`, `seaC`, and `storm` (no direct `bay–seaS` edge).
  * `seaN` (Sunset Sea North): Deep ocean bordering Deepwood Motte, Bear Island, Winterfell. Connects to `bay` and `seaC`.
  * `seaC` (Sunset Sea Central): Ocean bordering Seagard, Lannisport, Casterly Rock. Connects to `bay`, `seaN`, and `seaS`.
  * `seaS` (Sunset Sea South): Southern waters bordering Shield Isles, The Arbor, Oldtown, plus Fair Isle, Banefort, and Flint's Finger. Connects to `seaC` and `storm`.
  * `storm` (Storm Belt): Perilous shortcut between `bay` and `seaS`, bordering Fair Isle, Banefort, and Flint's Finger. Requires Storm Hazard roll upon entry (only `asha_flagship` immune).
* **Green Land Keeps (10 nodes)**:
  * **Northern Keeps** (reaved from `seaN`): Deepwood Motte (Def 3, Hrd 3, Leg 1), Bear Island (Def 4, Hrd 4, Leg 1), Winterfell Est. (Def 5, Hrd 5, Leg 2).
  * **Central Keeps** (reaved from `seaC`): Seagard (Def 3, Hrd 3, Leg 1), Lannisport (Def 4, Hrd 4, Leg 1), Casterly Rock (Def 6, Hrd 6, Leg 2).
  * **Southern Keeps** (underneath Storm Belt; reaved from `storm` OR `seaS`): Fair Isle (Def 2, Hrd 2, Leg 1), Banefort (Def 3, Hrd 3, Leg 1), Flint's Finger (Def 3, Hrd 3, Leg 1).
  * **Far Southern Keeps** (right side; reaved from `seaS`): Shield Isles (Def 2, Hrd 2, Leg 1), The Arbor (Def 2, Hrd 2, Leg 1), Oldtown (Def 5, Hrd 4, Leg 2).

---

## 5. Phase 2 Combat & Favor Mechanics

### A. Naval Battles (willing-attacker choice + up to 2 rounds)
* Moving a ship into a Sea or Isle node containing enemy ships (crew > 0) triggers a **Naval Clash**.
* Human attacker with actions left first chooses **Resolve NOW** (Round 1 rolls immediately) or **WAIT** (`deferred`: sail one more friendly hull in for extra dice; clash auto-erupts at 0 actions / End Turn). AI never defers; AI-vs-AI auto-resolves.
* Both sides roll `ceil(crew/2)` per live hull + Victarion +1 / Euron-first-raid defender −1, cap 6 (Victarion double Axes in `bay`). `net = max(0, hits − enemy.blocks)`; damage spreads primary-first across the fleet.
* Round 1 survivor line → `round1_decision`: Blood Price (Euron, once/battle), Favor reroll (2), Auto-Win (6), Retreat, or `continue_round` → Round 2 → finalize.
* Retreat: Asha free; others lose 1 rearguard crew. Attacker retreat falls back to origin; defender retreat is pushed to an adjacent sea/isle. Wiped hulls are recorded in `sunk_ship_ids` BEFORE respawn.
* Completely wiping an enemy fleet plunders 50% of their Hoard (Silence as loser flagship is immune to cargo steal) and awards **+1 Legend**. Both-survive ties compare total net hits (attacker wins ties → defender pushed; defender wins → attacker falls back; exact tie → stalemate, attacker falls back).
* **What Is Dead May Never Die**: When any ship's crew drops to 0, it respawns at its home port with **1 crew** (if Flagship) or **0 crew** (if standard longship). No faction is ever eliminated.

### B. Drowned Favor Track (0–7) & Miracles
* Gained via: free Pray action (+1), every 2 crew lost (+1 via `casualties_accumulator`), Storm Eye (+1), Blood Price Eyes (+1 each, costs 1 crew each).
* **2 Favor — Tactical Re-roll** (in-battle `miracle_cost:2`): Re-roll own dice during naval battle.
* **4 Favor — Call Storm** (map `favor_miracle`, 1 action): target an enemy-occupied Sea zone; victim loses 1 crew and is pushed back 1 node. Blocked while a clash is pending.
* **6 Favor — Drowned God Wrath (Auto-Win)** (in-battle `miracle_cost:6`): Instantly deal 5 unblockable hits in naval combat.

### C. Storm Belt Hazard (only `asha_flagship` immune)
* Other hulls entering `storm` roll 1 Storm Die:
  * Kraken / Axe: Safe passage.
  * Shield: Pushed back to origin sea node (action still spent).
  * Eye: Drowned wave claims 1 crew (+1 Favor gained), then continue into storm.

### D. Season End & Harbor
* Per isle (`pyke/harlaw/greatwyk/oldwyk/orkmont`): most-crew faction gains +1 Legend. Refresh ≤ 2 Burned keeps; replenish ALL defenses to `max_defense`; reset Euron first-raid flags.
* Harbor: flagship ending its turn docked at ANY isle with ≤ 3 crew gains +1 crew (first qualifying hull only).

---

## 6. Scoring & Victory Calculation

When `max_seasons` concludes, the winner is the claimant sorted first by
`(legend, hoard, favor, successful_raids)` descending (`game_state._resolve_game_over`).
There is NO `Legend×2 + Hoard + Favor×1.5` formula — any doc quoting it is stale.
