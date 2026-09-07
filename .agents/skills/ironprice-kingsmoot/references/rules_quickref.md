# IRON PRICE: Kingsmoot — Rules Quick Reference

A 1v1v1 strategic Ironborn board game where three claimants vie to become King or Queen of the Iron Islands after the death of Balon Greyjoy.

---

## 1. Claimants & Starting Setup

| Claimant | Faction Color | Starting Port | Starting Ships | Starting Resources | Special Trait |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Asha Greyjoy** | Green (`#2ecc71`) | Harlaw | Flagship (4 crew), 2 Reavers (0 crew) | 5 Hoard, 0 Favor, 0 Legend, 4 Reserve | Port grants bonus card draws in later phases |
| **Euron Greyjoy** | Purple (`#9b59b6`) | Pyke | Flagship (4 crew), 2 Reavers (0 crew) | 5 Hoard, 0 Favor, 0 Legend, 2 Reserve | Dark Arts / Sorcery abilities |
| **Victarion Greyjoy** | Red (`#e74c3c`) | Great Wyk | Flagship (4 crew), 2 Reavers (0 crew) | 5 Hoard, 0 Favor, 0 Legend, 4 Reserve | Muster crew costs only 2 Hoard (instead of 3) |

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
* Move 1 friendly ship to an adjacent Sea or Isle node.
* **Speed**: Longships can move up to 2 connected nodes along naval edges.
* **Controls**: Left-click ship to select -> **Right-click destination sea/isle** to sail.

### B. Reave (1 Action)
* Attack an adjacent Green Land keep from a sea zone.
* **Requirements**: Friendly ship must have at least 1 crew member.
* **Combat Dice**:
  * Attacker rolls $D6 = \text{Ship Crew} + \text{Bonus Dice}$ (each co-located friendly ship in the sea zone with $\ge 1$ crew adds $+1$ bonus die).
  * Hits occur on 5 or 6 (Iron Price).
  * Total hits $\ge \text{Keep Defense}$: **Victory!** Keep is plundered. Attacker gains Keep's Hoard and Legend. Keep becomes **Burned** (reduced hoard on subsequent raids).
  * Total hits $< \text{Keep Defense}$: **Repelled!** Raid fails, ship takes counter-damage (loses 1 crew). If crew reaches 0, the ship immediately respawns at home port (1 crew for flagship, 0 for standard longship).
* **Controls**: Left-click ship -> **Right-click adjacent Green Land keep** to reave instantly.

### C. Muster Crew (1 Action)
* Recruit **3 crew** at your controlled home port.
* **Cost**: **2 Hoard** at Great Wyk (Victarion discount), **3 Hoard** elsewhere.
* **Distribution Rule**:
  * Crew goes onto the currently selected ship first up to capacity (max 4).
  * Excess crew overflows onto any empty friendly reaver longships stationed at that same port.
  * Any further remainder goes into the player's Reserve Crew pool.
* **Full Capacity Guard**: If all ships at the port are already at 4/4 capacity, the action is blocked with an error and **no Hoard is spent**.

### D. Pray to the Drowned God (1 Action)
* Pay **1 Hoard** to gain **+1 Favor**.
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
* **Sea Zones (4 nodes)**:
  * `bay` (Ironman's Bay): Calm inland waters connecting the Isles. Connects to `seaN`, `seaC`, and `storm` (direct connection to `seaS` is removed).
  * `seaN` (Sunset Sea North): Deep ocean bordering Deepwood Motte, Bear Island, Winterfell. Connects to `bay` and `seaC`.
  * `seaC` (Sunset Sea Central): Ocean bordering Seagard, Lannisport, Casterly Rock. Connects to `bay`, `seaN`, and `seaS`.
  * `seaS` (Sunset Sea South): Southern waters bordering Shield Isles, The Arbor, Oldtown, plus Fair Isle, Banefort, and Flint's Finger. Connects to `seaC` and `storm`.
  * `storm` (Storm Belt): Perilous shortcut between `bay` and `seaS`, bordering Fair Isle, Banefort, and Flint's Finger. Requires Storm Hazard roll upon entry (Asha immune).
* **Green Land Keeps (10 nodes)**:
  * **Northern Keeps** (reaved from `seaN`): Deepwood Motte (Def 3, Hrd 3, Leg 1), Bear Island (Def 4, Hrd 4, Leg 1), Winterfell Est. (Def 5, Hrd 5, Leg 2).
  * **Central Keeps** (reaved from `seaC`): Seagard (Def 3, Hrd 3, Leg 1), Lannisport (Def 4, Hrd 4, Leg 1), Casterly Rock (Def 6, Hrd 6, Leg 2).
  * **Southern Keeps** (underneath Storm Belt; reaved from `storm` OR `seaS`): Fair Isle (Def 2, Hrd 2, Leg 1), Banefort (Def 3, Hrd 3, Leg 1), Flint's Finger (Def 3, Hrd 3, Leg 1).
  * **Far Southern Keeps** (right side; reaved from `seaS`): Shield Isles (Def 2, Hrd 2, Leg 1), The Arbor (Def 2, Hrd 2, Leg 1), Oldtown (Def 5, Hrd 4, Leg 2).

---

## 5. Phase 2 Combat & Favor Mechanics

### A. Naval Battles
* Moving a ship into a Sea or Isle node containing enemy ships triggers a **Naval Clash**.
* Both sides roll tactical dice based on crew count, plus $+1$ bonus die for each co-located friendly ship in the node with $\ge 1$ crew.
* Hits reduce enemy crew. Defender blocks reduce incoming attacker hits.
* Net damage determines winner; retreating claimant falls back to previous node.
* Completely wiping an enemy fleet plunders 50% of their Hoard and awards **+1 Legend**.
* **What Is Dead May Never Die**: When any ship's crew drops to 0, it respawns at its home port with **1 crew** (if Flagship) or **0 crew** (if standard longship). No faction is ever eliminated.

### B. Drowned Favor Track (0–7) & Miracles
* Gained via: Pray action (+1), tactical Eye dice, or blood sacrifices (1 Favor per 2 crew lost).
* **2 Favor — Tactical Re-roll**: Re-roll tactical dice during naval battle.
* **4 Favor — Call Storm**: Strike enemy sea zone on map, battering enemy fleet back 1 node and dealing 1 crew damage.
* **6 Favor — Drowned God Wrath (Auto-Win)**: Instantly deal 5 unblockable hits in naval combat.

### C. Storm Belt Hazard
* Non-Asha claimants entering `storm` must roll the Storm Die:
  * Kraken / Axe: Safe passage.
  * Shield: Pushed back to origin sea node.
  * Eye: Drowned wave claims 1 crew (+1 Favor gained).

---

## 6. Scoring & Victory Calculation

When Season 5 concludes, total score is calculated:
$$\text{Total Score} = \text{Legend} \times 2 + \text{Hoard} + \text{Favor} \times 1.5 + \text{Controlled Keeps} \times 3$$
The claimant with the highest score is crowned King or Queen of the Iron Islands.
