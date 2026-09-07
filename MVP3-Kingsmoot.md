# MVP3 — Kingsmoot (full game, playable 75–90 min)

**Goal:** the complete `How-to-Play.md` game. Adds identity (Faction cards), risk (Storm), texture (Burned), and 1v1v1 balance (Bounty/Wrath).
**Requires:** MVP2. Deltas below.

## What is NEW

1. **30 Faction cards** (10 each, `cards.json` → Euron / Victarion / Asha). Draw: keep Faction deck separate; draw 1 at start of Seasons 2 and 4 (max 5 in hand over limit allowed, discard down at season end).
2. **Full powers:** Euron Blood Price (re-roll any, each Eye = +1 Favor, -1 crew), Victarion Iron Captain (+1 die always; Axes double in Ironman's Bay), Asha Kraken's Daughter (win clean → draw 1; free retreat R1).
3. **Storm Belt node + Storm rolls:** entering Storm Belt or via card → roll 1 die: Kraken/Axe=safe, Shield=pushed back, Eye=lose 1 crew, gain 1 Favor.
4. **Burned / Pillage / Repair:** sacked lands get Burned (-1 Hoard until Repaired for 2 Hoard, or Pillaged for reduced loot without battle).
5. **Full map:** all 12 lands incl. Winterfell Est. (5/5+2), Casterly Rock (6/6+2), Oldtown (5/4+2). All 22 nodes / 27 edges in `map.json`.
6. **Catch-up:** Bounty (raiding Legend leader +1 Hoard), Wrath (leader loses 1 crew per ship at sea at season end).
7. **Full Favor miracles:** 2=re-roll, 4=storm strike (target adjacent fleet loses 1 / pushed back), 6=auto-win one round (5 hits).
8. **5 Seasons** x 3 Turns x 2 Actions. Full action list: Sail / Muster / Reave / Pillage-Repair / Pray.

## Win (same as rulebook)

Most Legend after 5 Seasons. Tie → Hoard → Favor → fewest Burned caused (reavers show restraint).

## Playtest questions

1. Does the leader actually get caught (Bounty + Wrath)? (If runaway wins twice → raise Bounty to +2 Hoard.)
2. Do Storm + Faction cards create stories without AP? (If Storm stalls → make Black Wind + Storm Warning ignore it, already in.)
3. Game length < 90 min? (If over → cut to 2 Turns per player in Seasons 1–2.)

**Next:** MVP4 locks numbers, no new mechanics.
