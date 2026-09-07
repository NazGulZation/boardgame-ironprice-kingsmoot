# IRON PRICE: Kingsmoot — MVP Roadmap (Overview)

4 playable phases. Each MVP is a complete, testable game. Stop after any MVP and you still have a game.

## Roadmap at a glance

| MVP | Name | Hook | New mechanics vs prior | Playtime | Win |
|---|---|---|---|---|---|
| 1 | Blood and Salt | Sail, roll, reave | Core loop only: Sail / Muster / Reave, simplified dice, 3 card types, minimal powers | 30–40 min | First to 5 Legend, or most after 3 Seasons |
| 2 | Captains and Cards | Hands matter | Full Tide deck (15 types), different hand sizes + ships, Pray + Favor (reroll only), Old Wyk / Orkmont | 45–60 min | Most Legend after 4 Seasons |
| 3 | Kingsmoot | The full game | 30 Faction cards, Storm Belt, Burned / Pillage / Repair, Season scoring + Bounty + Wrath | 75–90 min | Most Legend after 5 Seasons + finale |
| 4 | Salt Throne | Balanced + shippable | Balance pass, final Kingsmoot bonuses, 2p variant, print polish + TTS, playtest kit | 75–90 min | Same as MVP3, tuned |

## Design rules for all MVPs

1. **Playable alone:** each MVP file contains full setup + turn + win. You do not need later files to play.
2. **Only additive:** MVP2+ never rewrites MVP1 core math (dice = 1 per 2 crew, Kraken=2 / Axe=1 / Shield=block / Eye=miss+Favor-seed). They only add cards, spaces, and scoring.
3. **Proxy-friendly:** every MVP lists exactly which cards/nodes from `cards.json` / `map.json` to use, so you can play from the current print.
4. **Exit criteria:** each MVP has 3 playtest questions. Do not advance until they pass.

## File map

- `MVP1-Blood-and-Salt.md` — play this first. Needs: `map.png` (use 12 nodes only), 12 Tide cards, 3 d6.
- `MVP2-Captains-and-Cards.md` — needs full `cards-print.pdf` Tide set (60).
- `MVP3-Kingsmoot.md` — needs full map (22 nodes) + all 90 cards. Equals `How-to-Play.md`.
- `MVP4-Salt-Throne.md` — polish + balance + publishing. No new core rules.

## Build order

1. Play MVP1 twice. Fix dice math before adding cards.
2. Play MVP2 twice. Fix hand flow / ship differences before adding Faction cards.
3. Play MVP3 twice. Fix catch-up (Bounty/Wrath) before locking scoring.
4. MVP4 is tuning + assets only. No mechanic experiments here.
