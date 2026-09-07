"""IRON PRICE: Kingsmoot — Combat & Reaving Engine"""
import random
from typing import Dict, Optional, Tuple
from .models import MapNode, Ship, PlayerState, RollResult, ReaveOutcome
from .dice import roll_dice_pool, calculate_crew_dice


class CombatEngine:
    @staticmethod
    def resolve_greenland_reave(
        attacker: PlayerState,
        ship: Ship,
        target_node: MapNode,
        bonus_dice: int = 0,
        rng: random.Random = None
    ) -> ReaveOutcome:
        """
        Resolve a Reave against a Green Land keep.
        - Attacker rolls: (crew + 1) // 2 + bonus_dice (capped at 6)
        - Defender (Keep Militia) rolls: target_node.defense dice
        """
        # Attacker roll
        att_dice_count = min(calculate_crew_dice(ship.crew) + bonus_dice, 6)
        attacker_roll = roll_dice_pool(att_dice_count, rng=rng)

        # Defender roll (militia)
        def_dice_count = min(max(target_node.defense, 1), 6)
        defender_roll = roll_dice_pool(def_dice_count, rng=rng)

        # Calculate net results
        net_att_hits = max(0, attacker_roll.hits - defender_roll.blocks)
        net_def_hits = max(0, defender_roll.hits - attacker_roll.blocks)

        success = (net_att_hits >= target_node.defense)

        hoard_loot = 0
        legend_loot = 0
        if success:
            if target_node.is_burned:
                # Sacked keeps worth -1 Hoard, min 1
                hoard_loot = max(1, target_node.hoard - 1)
                legend_loot = max(0, target_node.legend - 1)
            else:
                hoard_loot = target_node.hoard
                legend_loot = target_node.legend

        crew_lost = min(ship.crew, net_def_hits)

        return ReaveOutcome(
            target_id=target_node.id,
            target_name=target_node.name,
            attacker_faction=attacker.faction,
            attacker_roll=attacker_roll,
            defender_roll=defender_roll,
            net_attacker_hits=net_att_hits,
            defense_required=target_node.defense,
            success=success,
            hoard_gained=hoard_loot,
            legend_gained=legend_loot,
            crew_lost=crew_lost
        )
