"""IRON PRICE: Kingsmoot — Dice Engine"""
import random
from typing import List, Tuple
from .models import DiceFace, RollResult

DICE_FACES = [
    DiceFace.KRAKEN.value,
    DiceFace.KRAKEN.value,
    DiceFace.AXE.value,
    DiceFace.AXE.value,
    DiceFace.SHIELD.value,
    DiceFace.EYE.value,
]


def roll_single_die(rng: random.Random = None) -> str:
    """Roll a single custom Ironborn d6 die."""
    if rng is None:
        return random.choice(DICE_FACES)
    return rng.choice(DICE_FACES)


def roll_dice_pool(count: int, rng: random.Random = None) -> RollResult:
    """
    Roll a pool of N dice and calculate hits, blocks, and eyes.
    Kraken = 2 hits
    Axe = 1 hit
    Shield = 1 block
    Eye = 1 Eye (Favor trigger)
    """
    if count <= 0:
        return RollResult(dice=[], hits=0, blocks=0, eyes=0)

    rolled = [roll_single_die(rng) for _ in range(count)]
    hits = 0
    blocks = 0
    eyes = 0

    for face in rolled:
        if face == DiceFace.KRAKEN.value:
            hits += 2
        elif face == DiceFace.AXE.value:
            hits += 1
        elif face == DiceFace.SHIELD.value:
            blocks += 1
        elif face == DiceFace.EYE.value:
            eyes += 1

    return RollResult(dice=rolled, hits=hits, blocks=blocks, eyes=eyes)


def calculate_crew_dice(crew_count: int, max_dice: int = 6) -> int:
    """
    Standard formula: 1 die per 2 crew (rounded up), capped at max_dice (default 6).
    1-2 crew = 1 die
    3-4 crew = 2 dice
    5-6 crew = 3 dice
    ...
    """
    if crew_count <= 0:
        return 0
    dice = (crew_count + 1) // 2
    return min(dice, max_dice)
