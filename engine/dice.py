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


def evaluate_dice_faces(rolled: List[str], double_axes: bool = False) -> RollResult:
    """Evaluate a list of rolled dice faces into hits, blocks, and eyes."""
    hits = 0
    blocks = 0
    eyes = 0
    for face in rolled:
        if face == DiceFace.KRAKEN.value:
            hits += 2
        elif face == DiceFace.AXE.value:
            hits += 2 if double_axes else 1
        elif face == DiceFace.SHIELD.value:
            blocks += 1
        elif face == DiceFace.EYE.value:
            eyes += 1
    return RollResult(dice=rolled, hits=hits, blocks=blocks, eyes=eyes)


def roll_dice_pool(count: int, rng: random.Random = None, double_axes: bool = False) -> RollResult:
    """
    Roll a pool of N dice and calculate hits, blocks, and eyes.
    Kraken = 2 hits
    Axe = 1 hit (or 2 hits if double_axes is True, e.g. Victarion in Ironman's Bay)
    Shield = 1 block
    Eye = 1 Eye (Favor trigger)
    """
    if count <= 0:
        return RollResult(dice=[], hits=0, blocks=0, eyes=0)

    rolled = [roll_single_die(rng) for _ in range(count)]
    return evaluate_dice_faces(rolled, double_axes=double_axes)


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


def calculate_naval_dice(
    crew_count: int,
    is_victarion: bool = False,
    defender_against_euron_first_raid: bool = False,
    max_dice: int = 6
) -> int:
    """
    Calculate naval battle dice pool:
    - Base: ceil(crew / 2)
    - Victarion: +1 Raid Die (Iron Captain)
    - Defender against Euron's Silence first raid: -1 die (min 1)
    - Capped at max_dice (6)
    """
    if crew_count <= 0:
        return 0
    base = calculate_crew_dice(crew_count, max_dice=max_dice)
    if is_victarion:
        base += 1
    if defender_against_euron_first_raid:
        base -= 1
    return min(max(base, 1), max_dice)


def roll_storm_die(rng: random.Random = None) -> Tuple[str, str]:
    """
    Roll 1 Storm Die when entering the Storm Belt.
    Returns (die_face, outcome):
    - Kraken / Axe: 'safe' (Safe passage)
    - Shield: 'pushback' (Pushed back to origin node)
    - Eye: 'casualty' (Lose 1 crew, gain +1 Favor)
    """
    face = roll_single_die(rng)
    if face in [DiceFace.KRAKEN.value, DiceFace.AXE.value]:
        return face, "safe"
    elif face == DiceFace.SHIELD.value:
        return face, "pushback"
    else:  # Eye
        return face, "casualty"

