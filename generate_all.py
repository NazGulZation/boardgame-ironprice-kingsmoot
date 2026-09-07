#!/usr/bin/env python3
"""Generate Iron Price: Kingsmoot assets — cards.json, map.json, map.png, cards-print.pdf, How-to-Play.pdf"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from fpdf import FPDF

BASE = Path(__file__).parent

# ---------------- DATA ----------------
TIDE_TYPES = [
    {"name": "Boarding Party", "sail": 1, "effect": "+2 Raid Dice when attacking. Discard after battle."},
    {"name": "Shield Wall", "sail": 1, "effect": "Block 2 hits this round. Play in battle."},
    {"name": "Full Sail", "sail": 3, "effect": "+2 movement to one fleet this turn. Draw 1 card if you end at sea."},
    {"name": "Drowned Blessing", "sail": 1, "effect": "Cancel all EYE results you rolled. Gain +1 Favor per EYE cancelled."},
    {"name": "Pay the Iron Price", "sail": 1, "effect": "Discard 2 Hoard -> place +3 crew on your attacking ship immediately."},
    {"name": "We Do Not Sow", "sail": 2, "effect": "If you win this raid: double Hoard taken, gain no Legend this raid."},
    {"name": "Thralls Take", "sail": 2, "effect": "After winning a raid: steal 1 enemy crew as thrall (+1 crew to your ship, max carry)."},
    {"name": "Salt Wife", "sail": 1, "effect": "+1 hand size until end of Season. Draw 1 card now."},
    {"name": "Storm Warning", "sail": 2, "effect": "Your fleets ignore Storm Belt rolls this turn. Sail +1."},
    {"name": "Night Raid", "sail": 2, "effect": "+3 dice if this is your first Reave this Season. Defender rolls -1 die."},
    {"name": "Pillage", "sail": 2, "effect": "Loot a Burned land you occupy immediately at reduced value. No battle."},
    {"name": "Ironborn Resolve", "sail": 1, "effect": "Ignore 2 hits dealt to you this round."},
    {"name": "Storm God's Wrath", "sail": 1, "effect": "All fleets in one sea zone roll a Storm die now (even yours)."},
    {"name": "Drowned Priest", "sail": 1, "effect": "+2 Drowned Favor. If at Old Wyk: +3 instead."},
    {"name": "War Horn", "sail": 2, "effect": "+1 die to every battle you fight this turn."},
]

FACTION_CARDS = {
    "Euron": [
        {"name": "Silence Ambush", "sail": 2, "effect": "Defender rolls -2 dice this round. If you win, +1 Legend."},
        {"name": "Crow's Eye", "sail": 1, "effect": "Re-roll any dice. Each EYE: +1 Favor (no crew loss this card)."},
        {"name": "Dragon Horn", "sail": 1, "effect": "Force one enemy fleet to lose 2 crew OR retreat. Costs 2 Favor."},
        {"name": "Warlock Shade", "sail": 2, "effect": "Look at defender's hand. Discard 1 card from it."},
        {"name": "Mute Crew", "sail": 1, "effect": "Immune to steals/events this Season. +1 block."},
        {"name": "Blood Sacrifice", "sail": 1, "effect": "Lose 2 crew -> +4 dice this round."},
        {"name": "Stormcaller", "sail": 2, "effect": "Force opponent to re-roll all SHIELD results."},
        {"name": "Euron's Madness", "sail": 1, "effect": "Roll +3 dice. Lose 1 crew for each miss (2)."},
        {"name": "Qarth Treasure", "sail": 3, "effect": "Gain 4 Hoard if you win this raid. Sail 3."},
        {"name": "Nightmare Fleet", "sail": 2, "effect": "Move 2 fleets this turn instead of 1."},
    ],
    "Victarion": [
        {"name": "Iron Victory Charge", "sail": 2, "effect": "+2 dice. Axes count double this round."},
        {"name": "Shield Breaker", "sail": 1, "effect": "Enemy SHIELDS block nothing this round."},
        {"name": "Drowned Baptism", "sail": 1, "effect": "After losing crew: +2 Favor, +1 die next round."},
        {"name": "Iron Fleet Ram", "sail": 2, "effect": "Enemy fleet cannot retreat this battle. +1 die."},
        {"name": "Victarion's Fury", "sail": 1, "effect": "+1 hit per AXE you rolled (axes = 2 hits)."},
        {"name": "Muster the Fleet", "sail": 1, "effect": "Place +2 crew on any port you control, free."},
        {"name": "Boarding Axe", "sail": 1, "effect": "+3 dice when you have more crew than defender."},
        {"name": "Sea Bitch Tribute", "sail": 2, "effect": "Gain 2 Hoard. +1 die if attacking Lannisport/Casterly."},
        {"name": "Drowned God's Fist", "sail": 1, "effect": "Spend up to 3 Favor: +1 die per Favor spent."},
        {"name": "Unbowed", "sail": 1, "effect": "Ignore up to 3 hits this round."},
    ],
    "Asha": [
        {"name": "Parley", "sail": 2, "effect": "Steal 2 Hoard from a rival in the same sea zone. No battle."},
        {"name": "Black Wind Dash", "sail": 3, "effect": "Sail +3, then Reave in the same turn. Retreat free."},
        {"name": "Smuggler's Cove", "sail": 2, "effect": "Swap 2 Hoard -> draw 3 cards."},
        {"name": "Kraken's Daughter", "sail": 1, "effect": "Win a raid with no losses: draw 2 cards, +1 Legend."},
        {"name": "Reading the Tide", "sail": 3, "effect": "Draw 3 cards. Discard 1."},
        {"name": "Hit and Run", "sail": 2, "effect": "+1 die. After round 1, retreat free with full loot if winning."},
        {"name": "Harlaw Alliance", "sail": 1, "effect": "Use a Harlaw port as if you control it this turn."},
        {"name": "Sneak Ashore", "sail": 2, "effect": "Ignore 2 Defense on a Green Land this raid."},
        {"name": "Ransom", "sail": 1, "effect": "After winning vs rival: they pay you 3 Hoard or lose 2 crew."},
        {"name": "Queen's Gambit", "sail": 1, "effect": "Discard your hand: +1 die per card discarded this battle."},
    ],
}

NODES = [
    {"id": "pyke", "name": "Pyke", "kind": "isle", "x": 300, "y": 400, "special": "Euron starts. Port: +1 card", "control": "Euron"},
    {"id": "harlaw", "name": "Harlaw", "kind": "isle", "x": 350, "y": 250, "special": "Asha starts. Port: +1 card", "control": "Asha"},
    {"id": "greatwyk", "name": "Great Wyk", "kind": "isle", "x": 280, "y": 550, "special": "Victarion starts. Muster 2 Hoard", "control": "Victarion"},
    {"id": "oldwyk", "name": "Old Wyk", "kind": "isle", "x": 450, "y": 400, "special": "Kingsmoot: +1 Favor +1 Legend", "defense": 2},
    {"id": "orkmont", "name": "Orkmont", "kind": "isle", "x": 420, "y": 560, "special": "+2 Hoard at season end", "defense": 2},
    {"id": "bay", "name": "Ironman's Bay", "kind": "sea", "x": 620, "y": 410, "special": "Home waters (safe)"},
    {"id": "seaN", "name": "Sunset Sea N", "kind": "sea", "x": 920, "y": 250, "special": ""},
    {"id": "seaC", "name": "Sunset Sea C", "kind": "sea", "x": 920, "y": 460, "special": ""},
    {"id": "seaS", "name": "Sunset Sea S", "kind": "sea", "x": 920, "y": 670, "special": ""},
    {"id": "storm", "name": "Storm Belt", "kind": "sea", "x": 720, "y": 620, "special": "Roll Storm on entry"},
    {"id": "deepwood", "name": "Deepwood Motte", "kind": "land", "x": 1250, "y": 170, "defense": 3, "hoard": 3, "legend": 1},
    {"id": "bear", "name": "Bear Island", "kind": "land", "x": 1460, "y": 170, "defense": 4, "hoard": 4, "legend": 1},
    {"id": "winterfell", "name": "Winterfell Est.", "kind": "land", "x": 1670, "y": 220, "defense": 5, "hoard": 5, "legend": 2},
    {"id": "seagard", "name": "Seagard", "kind": "land", "x": 1250, "y": 410, "defense": 3, "hoard": 3, "legend": 1},
    {"id": "lannisport", "name": "Lannisport", "kind": "land", "x": 1460, "y": 420, "defense": 4, "hoard": 4, "legend": 1},
    {"id": "casterly", "name": "Casterly Rock", "kind": "land", "x": 1670, "y": 460, "defense": 6, "hoard": 6, "legend": 2},
    {"id": "shield", "name": "Shield Isles", "kind": "land", "x": 1250, "y": 660, "defense": 2, "hoard": 2, "legend": 1},
    {"id": "fair", "name": "Fair Isle", "kind": "land", "x": 1460, "y": 680, "defense": 2, "hoard": 2, "legend": 1},
    {"id": "oldtown", "name": "Oldtown", "kind": "land", "x": 1670, "y": 700, "defense": 5, "hoard": 4, "legend": 2},
    {"id": "banefort", "name": "Banefort", "kind": "land", "x": 1250, "y": 860, "defense": 3, "hoard": 3, "legend": 1},
    {"id": "arbor", "name": "The Arbor", "kind": "land", "x": 1460, "y": 860, "defense": 2, "hoard": 2, "legend": 1},
    {"id": "flint", "name": "Flint's Finger", "kind": "land", "x": 1670, "y": 880, "defense": 3, "hoard": 3, "legend": 1},
]

EDGES = [
    ["pyke", "bay"], ["harlaw", "bay"], ["greatwyk", "bay"], ["oldwyk", "bay"], ["orkmont", "bay"],
    ["bay", "seaN"], ["bay", "seaC"], ["bay", "seaS"], ["bay", "storm"],
    ["seaN", "seaC"], ["seaC", "seaS"],
    ["seaN", "deepwood"], ["seaN", "bear"], ["seaN", "winterfell"],
    ["seaC", "seagard"], ["seaC", "lannisport"], ["seaC", "casterly"],
    ["seaS", "shield"], ["seaS", "fair"], ["seaS", "oldtown"], ["seaS", "arbor"],
    ["storm", "seaS"], ["storm", "banefort"], ["storm", "flint"], ["storm", "fair"],
    ["seaS", "banefort"], ["seaS", "flint"],
]

DICE = {"faces": ["Kraken x2 (2 hits)", "Kraken x2 (2 hits)", "Axe x2 (1 hit)", "Axe x2 (1 hit)", "Shield x1 (block)", "Eye x1 (drowned)"], "substitute": "d6: 6=Kraken, 4-5=Axe, 3=Shield, 1=Eye, 2=miss"}


def sanitize(t: str) -> str:
    reps = {"\u2014": "-", "\u2013": "-", "\u2019": "'", "\u2018": "'", "\u201c": '"', "\u201d": '"', "\u2026": "...", "\u2192": "->"}
    for k, v in reps.items():
        t = t.replace(k, v)
    return t.encode("latin-1", "replace").decode("latin-1")


# ---------------- JSON ----------------
def build_json():
    tide_full = []
    cid = 1
    for t in TIDE_TYPES:
        for _ in range(4):
            tide_full.append({"id": cid, "deck": "Tide", "name": t["name"], "sail": t["sail"], "effect": t["effect"]})
            cid += 1
    for fac, cards in FACTION_CARDS.items():
        for c in cards:
            tide_full.append({"id": cid, "deck": fac, "name": c["name"], "sail": c["sail"], "effect": c["effect"]})
            cid += 1
    cards_json = {
        "game": "IRON PRICE: Kingsmoot",
        "counts": {"tide_unique": len(TIDE_TYPES), "tide_total": 60, "faction_per_player": 10, "faction_total": 30, "grand_total": 90},
        "tide_types": [{**t, "copies": 4} for t in TIDE_TYPES],
        "faction_cards": FACTION_CARDS,
        "all_cards": tide_full,
        "dice": DICE,
    }
    def _compact_card_json(d):
        lines = ['{', f'  "game": {json.dumps(d["game"])},', f'  "counts": {json.dumps(d["counts"])},', '  "tide_types": [']
        for i, item in enumerate(d.get("tide_types", [])):
            comma = ',' if i < len(d["tide_types"]) - 1 else ''
            lines.append('    ' + json.dumps(item) + comma)
        lines.append('  ],\n  "faction_cards": [')
        for i, item in enumerate(d.get("faction_cards", [])):
            comma = ',' if i < len(d["faction_cards"]) - 1 else ''
            lines.append('    ' + json.dumps(item) + comma)
        lines.append('  ],\n  "all_cards": [')
        for i, item in enumerate(d.get("all_cards", [])):
            comma = ',' if i < len(d["all_cards"]) - 1 else ''
            lines.append('    ' + json.dumps(item) + comma)
        lines.append('  ],')
        lines.append('  "dice": ' + json.dumps(d["dice"], indent=4).replace('\n', '\n  '))
        lines.append('}\n')
        return '\n'.join(lines)
    (BASE / "cards.json").write_text(_compact_card_json(cards_json), encoding="utf-8")

    map_json = {"game": "IRON PRICE: Kingsmoot", "nodes": NODES, "edges": EDGES, "dice": DICE,
                "rules_summary": "5 seasons x 3 turns x 2 actions. Most Legend wins."}
    (BASE / "map.json").write_text(json.dumps(map_json, indent=2), encoding="utf-8")
    print(f"cards: {len(tide_full)} total, nodes: {len(NODES)}")


# ---------------- MAP PNG ----------------
def build_map_png():
    W, H = 1920, 1080
    sea = (18, 42, 66)
    img = Image.new("RGB", (W, H), sea)
    d = ImageDraw.Draw(img)
    try:
        f_title = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 34)
        f_node = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
        f_small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 16)
    except Exception:
        f_title = f_node = f_small = ImageFont.load_default()

    d.text((30, 15), "IRON PRICE: Kingsmoot  —  schematic map (not to scale)", font=f_title, fill=(233, 200, 120))
    d.text((30, 60), "Gold = Iron Isles (control scores)   Green = raid targets Def/Hoard+Legend   Blue = seas   Dashed = storm route", font=f_small, fill=(200, 210, 220))

    pos = {n["id"]: (n["x"], n["y"]) for n in NODES}
    # edges
    for a, b in EDGES:
        x1, y1 = pos[a]
        x2, y2 = pos[b]
        is_storm = "storm" in (a, b)
        if is_storm:
            # dashed
            steps = 12
            for i in range(steps):
                if i % 2 == 0:
                    t1, t2 = i / steps, (i + 1) / steps
                    d.line([x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1, x1 + (x2 - x1) * t2, y1 + (y2 - y1) * t2], fill=(140, 160, 190), width=2)
        else:
            d.line([x1, y1, x2, y2], fill=(90, 120, 150), width=3)

    colors = {"isle": (212, 175, 55), "land": (58, 130, 70), "sea": (70, 130, 180)}
    for n in NODES:
        x, y = n["x"], n["y"]
        kind = n["kind"]
        r = 46 if kind == "isle" else (40 if kind == "land" else 52)
        fill = colors[kind]
        outline = (240, 230, 200) if kind != "sea" else (200, 220, 240)
        d.ellipse([x - r, y - r, x + r, y + r], fill=fill, outline=outline, width=3)
        label = n["name"]
        # name above
        d.text((x - 70, y - r - 26), label, font=f_node, fill=(245, 240, 220))
        if kind == "land":
            sub = f"D{n['defense']}  {n['hoard']}+{n['legend']}"
            d.text((x - 32, y - 12), sub, font=f_node, fill=(255, 255, 255))
        elif kind == "isle":
            d.text((x - 30, y - 10), "ISLE", font=f_small, fill=(40, 30, 10))
        else:
            d.text((x - 28, y - 10), "SEA", font=f_small, fill=(230, 240, 250))
    # legend box
    d.rectangle([30, 920, 660, 1050], fill=(10, 26, 42), outline=(233, 200, 120), width=2)
    d.text((45, 935), "Euron: Pyke   Asha: Harlaw   Victarion: Great Wyk", font=f_small, fill=(240, 220, 170))
    d.text((45, 960), "Old Wyk: +1 Favor +1 Legend    Orkmont: +2 Hoard", font=f_small, fill=(240, 220, 170))
    d.text((45, 985), "Bounty: raiding the Legend leader pays +1 Hoard", font=f_small, fill=(240, 220, 170))
    d.text((45, 1010), "Storm Belt entry: roll 1 die - Shield=pushed back, Eye=lose 1 crew", font=f_small, fill=(240, 220, 170))
    img.save(BASE / "map.png")
    print("map.png saved")


# ---------------- CARDS PDF ----------------
def build_cards_pdf():
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(False)
    type_color = {"Tide": (70, 130, 180), "Euron": (120, 40, 40), "Victarion": (60, 60, 60), "Asha": (40, 110, 70)}
    # flatten deck in print order
    deck = []
    for t in TIDE_TYPES:
        for _ in range(4):
            deck.append(("Tide", t["name"], t["sail"], t["effect"]))
    for fac in ["Euron", "Victarion", "Asha"]:
        for c in FACTION_CARDS[fac]:
            deck.append((fac, c["name"], c["sail"], c["effect"]))

    CW, CH = 63, 88
    ML, MT, GAP = 10, 12, 2
    for i, (dtype, name, sail, effect) in enumerate(deck):
        if i % 9 == 0:
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(200, 200, 200)
            pdf.set_xy(ML, 4)
            pdf.cell(190, 6, sanitize(f"IRON PRICE: Kingsmoot cards {i+1}-{min(i+9, len(deck))} / {len(deck)}  -  print at 100%, cut 63x88mm"), align="C")
        idx = i % 9
        col, row = idx % 3, idx // 3
        x = ML + col * (CW + GAP)
        y = MT + row * (CH + GAP)
        r, g, b = type_color[dtype]
        pdf.set_fill_color(r, g, b)
        pdf.rect(x, y, CW, CH, style="DF")
        # header
        pdf.set_xy(x + 2, y + 2)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(CW - 4, 5, sanitize(f"{dtype.upper()}  |  SAIL {sail}"), align="C")
        # body white
        pdf.set_fill_color(250, 246, 235)
        pdf.rect(x + 2, y + 9, CW - 4, CH - 11, style="F")
        pdf.set_xy(x + 4, y + 11)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(20, 20, 20)
        pdf.multi_cell(CW - 8, 5, sanitize(name), align="C")
        pdf.set_xy(x + 4, y + 24)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(40, 40, 40)
        pdf.multi_cell(CW - 8, 4.5, sanitize(effect), align="C")
        pdf.set_xy(x + 4, y + CH - 9)
        pdf.set_font("Helvetica", "I", 7)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(CW - 8, 4, sanitize("We Do Not Sow"), align="C")
    pdf.output(BASE / "cards-print.pdf")
    print("cards-print.pdf saved")


# ---------------- RULEBOOK PDF ----------------
def build_rules_pdf():
    md = (BASE / "How-to-Play.md").read_text(encoding="utf-8")
    pdf = FPDF(unit="mm", format="A4")
    pdf.set_auto_page_break(True, margin=18)
    # cover
    pdf.add_page()
    pdf.set_fill_color(12, 28, 44)
    pdf.rect(0, 0, 210, 297, style="F")
    pdf.set_y(60)
    pdf.set_font("Helvetica", "B", 34)
    pdf.set_text_color(233, 200, 120)
    pdf.multi_cell(190, 14, "IRON PRICE", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 22)
    pdf.multi_cell(190, 12, "Kingsmoot", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 13)
    pdf.set_text_color(210, 220, 230)
    pdf.multi_cell(190, 8, sanitize("A 1 vs 1 vs 1 Ironborn game of reaving in Westeros"), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 11)
    pdf.multi_cell(190, 7, sanitize("We Do Not Sow. Euron vs Victarion vs Asha."), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(190, 7, sanitize("3 players | 75-90 min | How to Play + print-and-play"), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_y(250)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(150, 165, 180)
    pdf.multi_cell(190, 6, sanitize("Fan-made prototype set in the world of A Song of Ice and Fire. Unofficial, non-commercial."), align="C", new_x="LMARGIN", new_y="NEXT")

    # body pages
    pdf.add_page()
    LM = 10
    PW = 190
    for raw in md.splitlines():
        line = raw.rstrip()
        if not line.strip():
            pdf.ln(2)
            continue
        pdf.set_x(LM)
        if line.startswith("# "):
            pdf.set_font("Helvetica", "B", 20)
            pdf.set_text_color(20, 40, 60)
            pdf.multi_cell(PW, 9, sanitize(line[2:]), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)
        elif line.startswith("## "):
            pdf.ln(2)
            pdf.set_font("Helvetica", "B", 14)
            pdf.set_text_color(120, 40, 40)
            pdf.multi_cell(PW, 8, sanitize(line[3:]), new_x="LMARGIN", new_y="NEXT")
        elif line.startswith("### "):
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(30, 60, 90)
            pdf.multi_cell(PW, 7, sanitize(line[4:]), new_x="LMARGIN", new_y="NEXT")
        elif line.startswith("- ") or line.startswith("* "):
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(30, 30, 30)
            pdf.set_x(LM + 6)
            pdf.multi_cell(PW - 6, 5.5, sanitize("- " + line[2:]), markdown=True, new_x="LMARGIN", new_y="NEXT")
        elif line[0].isdigit() and len(line) > 2 and line[1] in ".)":
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(30, 30, 30)
            pdf.set_x(LM + 6)
            pdf.multi_cell(PW - 6, 5.5, sanitize(line), markdown=True, new_x="LMARGIN", new_y="NEXT")
        elif line.startswith("|"):
            if set(line.strip()) <= set("|:- "):
                continue
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(40, 40, 40)
            cleaned = sanitize(line).replace("|", " / ").strip(" /")
            pdf.set_x(LM + 4)
            pdf.multi_cell(PW - 4, 5, cleaned, new_x="LMARGIN", new_y="NEXT")
        elif line.startswith(">"):
            pdf.set_font("Helvetica", "I", 10)
            pdf.set_text_color(80, 80, 80)
            pdf.multi_cell(PW, 6, sanitize(line.lstrip("> ")), new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(30, 30, 30)
            pdf.multi_cell(PW, 5.5, sanitize(line), markdown=True, new_x="LMARGIN", new_y="NEXT")
    # map page
    if (BASE / "map.png").exists():
        pdf.add_page(orientation="L")
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(20, 40, 60)
        pdf.cell(0, 10, "Map (schematic - see map.png / map.json for data)", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.image(str(BASE / "map.png"), x=10, y=22, w=277)
    pdf.output(BASE / "How-to-Play.pdf")
    print("How-to-Play.pdf saved")


if __name__ == "__main__":
    build_json()
    build_map_png()
    build_cards_pdf()
    build_rules_pdf()
