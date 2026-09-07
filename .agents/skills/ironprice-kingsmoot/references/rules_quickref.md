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
  * Attacker rolls $D6 = \text{Ship Crew}$ (e.g. 4 dice for full flagship).
  * Hits occur on 5 or 6 (Iron Price).
  * Total hits $\ge \text{Keep Defense}$: **Victory!** Keep is plundered. Attacker gains Keep's Hoard and Legend. Keep becomes **Burned** (reduced hoard on subsequent raids).
  * Total hits $< \text{Keep Defense}$: **Repelled!** Raid fails, ship takes counter-damage (loses 1 crew).
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
  * `bay` (Ironman's Bay): Calm inland waters connecting the Isles.
  * `seaN` (Sunset Sea North): Deep ocean bordering Deepwood Motte, Bear Island, Winterfell.
  * `seaC` (Sunset Sea Central): Ocean bordering Seagard, Lannisport, Casterly Rock.
  * `seaS` (Sunset Sea South): Ocean bordering Shield Isles, Fair Isle, Oldtown.
  * `storm` (Storm Belt): Perilous sea passage requiring storm hazard checks.
* **Green Land Keeps (10 nodes)**:
  * Ranging from light keeps (Defense 2, Hoard 2) to impenetrable fortresses (Casterly Rock: Defense 6, Hoard 6).

---

## 5. Scoring & Victory Calculation

When Season 5 concludes, total score is calculated:
$$\text{Total Score} = \text{Legend} \times 2 + \text{Hoard} + \text{Favor} \times 1.5 + \text{Controlled Keeps} \times 3$$
The claimant with the highest score is crowned King or Queen of the Iron Islands.
