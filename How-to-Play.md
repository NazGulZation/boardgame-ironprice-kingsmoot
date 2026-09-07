# IRON PRICE: Kingsmoot
## How to Play — 1 vs 1 vs 1 Ironborn Board Game
### A Game of Reaving in the World of A Song of Ice and Fire

> *We Do Not Sow. Balon Greyjoy is dead. The Driftwood Crown lies empty on Old Wyk. Three claimants fit out their longships.*

**Players:** 3 (strict 1v1v1) | **Time:** 75–90 min | **Age:** 14+ | **Complexity:** Medium

---

## 1. The Story

After Balon's death, the Ironborn are called to a Kingsmoot on Old Wyk. Custom demands the king be chosen by captains — but all know legend, not words, will decide.

Three have the strength to claim it:

- **EURON CROW'S EYE** — sorcerer, captain of the *Silence*, brother who laughs at gods.
- **VICTARION THE IRON CAPTAIN** — brute, captain of the *Iron Victory*, fist of the Iron Fleet.
- **ASHA KRAKEN'S DAUGHTER** — cunning, captain of the *Black Wind*, who takes with wit what others take with axes.

Each sails to reave the green lands, fill their hoard, and return with legend enough to be named King of Salt and Rock.

After **5 Seasons**, the claimant with the most **Legend** is crowned.

---

## 2. What You Need (Components)

- **Game Map** (`map.png` / printed): 5 Iron Isle ports + 12 Green Land raid targets + sea zones. See Section 4.
- **3 Faction Boards** + wooden pieces:
  - 3 Longships per player (faction flagship + 2 reavers)
  - 15 crew cubes per player
- **18 Raid Dice** (custom d6, shared pool — roll up to 6 at once):
  - 2x KRAKEN (counts as 2 hits)
  - 2x AXE (counts as 1 hit)
  - 1x SHIELD (blocks 1 hit)
  - 1x EYE (Drowned trigger, no hit/block)
- **90 Cards:**
  - 60 Tide Cards (shared deck, 15 types x4 copies)
  - 30 Faction Cards (10 per claimant, unique)
  - Full list in `cards.json` / printable in `cards-print.pdf`
- **Tokens:** Hoard (gold), Legend (VP), Favor markers, Burned markers, Control flags, Bounty marker, Season marker

If you lack custom dice: use normal d6 — 6=Kraken, 4–5=Axe, 3=Shield, 1=Eye, 2=miss.

---

## 3. The Three Claimants — Variable Player Powers

| | Euron Crow's Eye | Victarion Iron Captain | Asha Kraken's Daughter |
|---|---|---|---|
| **Style** | Dice chaos / sorcery | Brute combat | Speed / hand management |
| **Hand size** | 5 | 4 | 6 |
| **Start crew** | 6 | 8 | 8 |
| **Start Hoard** | 5 | 5 | 5 |
| **Flagship** | *Silence* — Move 3. Silent: defenders roll -1 die on first raid vs Euron each Season. Immune to steal. | *Iron Victory* — Carry 6 (vs 4). Move 1 if fully loaded (5–6 crew). | *Black Wind* — Move 2, ignores Storm spaces. May Raid and Sail in same turn. |
| **Power** | **Blood Price:** Once per battle, re-roll any number of your dice. Each EYE rolled this way: +1 Favor, -1 crew. | **Iron Captain:** +1 Raid Die in every battle/raid. Axes count double on home waters (Ironman's Bay). | **Kraken's Daughter:** Draw +1 card when you win a raid without losing crew. Free retreat after round 1. |
| **Weakness** | Fragile crew, swingy | Small hand, slow when heavy | -1 die in fair fights |

Faction Cards (10 each) reinforce this. Euron manipulates dice, Victarion adds raw hits, Asha moves and steals.

---

## 4. The Map

### Iron Isles (your home — area control scores each Season)
1. **Pyke** — Euron starts here. Port: +1 card if controlled.
2. **Harlaw** — Asha starts here. Port: +1 card if controlled.
3. **Great Wyk** — Victarion starts here. Muster: crew costs 2 (not 3) here.
4. **Old Wyk** — Neutral. Kingsmoot. Whoever controls it at Season end: +1 Favor +1 Legend.
5. **Orkmont** — Neutral. Rich mines: +2 Hoard if controlled at Season end.

### Green Lands (raid targets — Defense / Loot Hoard+Legend)
**North Shore (hard):** Deepwood Motte 3 / 3+1, Bear Island 4 / 4+1, Winterfell Estuary 5 / 5+2
**West Shore (medium):** Seagard 3 / 3+1, Lannisport 4 / 4+1, Casterly Rock 6 / 6+2
**South Shore (fast):** Shield Isles 2 / 2+1, Fair Isle 2 / 2+1, Banefort 3 / 3+1, Arbor 2 / 2+1, Oldtown 5 / 4+2, Flint's Finger 3 / 3+1

Sacked keeps get a **Burned** marker: worth -1 Hoard until Repaired. Sacking the Legend leader gives **+1 bonus Hoard (Bounty)**.

### Sea Zones (movement spaces)
Ironman's Bay (home waters, safe) — Sunset Sea North / Central / South — Storm Belt (roll Storm die on entry: Kraken/Axe=safe, Shield=pushed back, Eye=lose 1 crew).

Full connections in `map.json`. Schematic: each Isle connects to Ironman's Bay; Bay connects to the three Sunset Seas; each Sunset Sea connects to its 4 coastal targets.

---

## 5. Setup (5 minutes)

1. Place map center. Place Season marker on Season 1, Favor track at 0 for all.
2. Each player takes faction board, 3 ships, crew, 5 Hoard.
   - Euron: 6 crew (4 on *Silence* at Pyke, 2 ashore). Victarion: 8 crew (Great Wyk). Asha: 8 crew (Harlaw).
   - Place other 2 reaver ships empty at your home port.
3. Shuffle Tide Deck. Deal to hand size (Euron 5, Victarion 4, Asha 6). Deal 3 Faction Cards to each player, keep 2, shuffle rest into Tide Deck? (Recommended intro) OR keep Faction deck separate: draw 1 Faction card at Season 2 and 4. Use separate for first game.
4. Place 2 crew as neutrals on Old Wyk and Orkmont (Defense 2).
5. Give Bounty marker to no one. Youngest player goes first (Asha historically).

---

## 6. How to Win

Most **Legend** after 5 Seasons + Final Kingsmoot bonuses wins. Legend comes from:

- Sacking Green Lands (the +X after the slash, e.g. 4+1 = 4 Hoard, 1 Legend)
- Holding Isles at Season end (+1 Legend per Isle, Old Wyk +1 extra)
- Kingsmoot finale: +3 most Favor, +2 most successful raids, +1 per 5 Hoard banked

**No elimination.** What is dead may never die: any ship reduced to 0 crew immediately respawns at its home port — flagship with 1 crew, standard longship as an empty hull (0 crew). Losing gives Favor (1 per 2 crew lost) — defeat fuels miracles.

---

## 7. Round Structure

Game = **5 Seasons**. Each Season:

1. **Seasons Start:** Refresh 2 Burned lands (flip face-up), all players draw to hand size.
2. **Player Turns:** In order, each player takes **3 Turns**. On your Turn take **2 Actions** (can repeat):
   - **Sail** — Move one fleet up to its Speed. Carries crew. Entering Storm Belt = roll Storm.
   - **Muster** — At a port you control, spend 3 Hoard (2 at Great Wyk) → +3 crew there.
   - **Reave** — Attack adjacent Green Land or rival fleet/port. See Section 8.
   - **Pillage / Repair** — At a Burned land you occupy: gain its reduced loot (Pillage) OR pay 2 Hoard to flip it fresh (Repair).
   - **Pray** — Discard 1 card → +1 Drowned Favor.
3. **Season End:**
   - a. Control scoring: +1 Legend per Isle you occupy (most crew wins ties → most ships breaks).
   - b. Greed: most Hoard held → +2 Legend (tie: no one).
   - c. Old Wyk holder +1 Favor. Orkmont holder +2 Hoard.
   - d. Wrath: Legend leader loses 1 crew per ship at sea (Storm God envies). Place Bounty on leader.
   - e. Discard down to hand size.

After Season 5 → **Final Kingsmoot** scoring, crown winner.

---

## 8. Reaving & Battles — Dice Rolling

**Reave** a Green Land: your fleet must be adjacent. Defense = static value + militia roll (roll Defense dice once using Raid Dice).

**Rival battle:** both roll: `1 die per 2 crew (round up) + ship/card bonuses` (max 6 dice each side).

**One battle = up to 2 rounds:**
1. Attacker rolls, defender rolls. Each player may play **1 card** per round.
2. Count: Krakens=2 hits, Axes=1 hit, Shields=block 1. Eyes trigger Drowned (gain Favor if you Pray, or fuel Euron).
3. Defender removes crew 1-for-1 per unblocked hit, then attacker takes losses. If attacker wins (defender wiped or Green Land defense beaten), take Loot immediately, place Burned, gain Legend.
4. Asha may retreat free after round 1. Others retreat by losing 1 crew as rearguard.

**Storm roll** when entering Storm Belt or with certain cards: roll 1 die. Kraken/Axe = pass. Shield = pushed back to where you came. Eye = Drown 1 crew, gain 1 Favor.

**Drowned Favor (0–7 track) — spend anytime on your turn:**
- 2 Favor: re-roll any dice
- 4 Favor: call storm — target enemy fleet in adjacent zone loses 1 crew / pushed back
- 6 Favor: auto-win one battle round (counts as 5 hits)

---

## 9. Tide Cards — Hand Management

Cards are dual-use. Every card has a **Sail value (1–3, top-left)** and an **Effect**.

- Discard for Sail: +1 move per Sail point to one fleet this turn, OR +1 die per 2 Sail points in one battle.
- Play for Effect: follow text, then discard. Max 1 card per battle round (plus Faction card if different name).

**Hand limits matter.** Victarion (4) must burn cards for dice. Asha (6) can hoard combos. Euron (5) cycles fast via re-rolls.

**Shared Tide Deck (15 types x4 = 60):** Boarding Party (+2 dice attack), Shield Wall (+2 blocks), Full Sail (Sail 3, move +2), Drowned Blessing (cancel Eyes → Favor), Pay the Iron Price (discard 2 Hoard → +3 crew in battle), We Do Not Sow (win → double Hoard, no Legend), Thralls Take (steal 1 crew as thrall), Salt Wife (+1 hand this Season), Storm Warning (ignore Storm), Night Raid (+3 dice if attacking first this Season), Pillage (instant loot Burned land), Ironborn Resolve (ignore 2 hits), Storm God's Wrath (all ships in zone roll Storm), Drowned Priest (+2 Favor), War Horn (+1 die to all your ships this turn).

**Faction Cards (10 each, 30 total):** e.g. Euron *Dragon Horn / Stormcaller / Silence Ambush*, Victarion *Iron Victory Charge / Shield Breaker / Drowned Baptism*, Asha *Parley / Black Wind Dash / Smuggler's Cove*. Full text in `cards.json`.

---

## 10. Strategy & 1v1v1 Balance

- **Euron:** rush Oldtown/Casterly early with re-rolls. Pray little — your Eyes ARE prayer. Don't overextend with 6 crew.
- **Victarion:** own Ironman's Bay, farm Seagard/Fair Isle, then slam leader late. Muster cheap at Great Wyk.
- **Asha:** hit Shield Isles/Arbor fast, retreat, draw cards, steal Hoard with Parley. Win on card velocity, not dice.
- **Bounty rule:** raiding the leader pays +1 Hoard. Two behind naturally gang up without formal alliances.
- **Wrath rule:** leader bleeds at sea at Season end — come home to Pyke/Harlaw/Great Wyk to hide.

---

## 11. Variant & First-Game Advice

- **Learning game:** play 3 Seasons only, ignore Storm Belt and Favor 4/6 miracles.
- **2-player:** remove Orkmont, play first to 10 Legend.
- **Print:** `cards-print.pdf` is 9-per-page poker (63x88mm). `map.png` is 1920px schematic — print A3. This PDF is rules; `map.json` + `cards.json` are machine-readable for Tabletop Simulator.

*Design by you, with salt and smoke. What is dead may never die.*
