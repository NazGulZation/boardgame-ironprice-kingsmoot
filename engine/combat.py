"""IRON PRICE: Kingsmoot — Combat & Naval Battle Engine (Phase 2)"""
import random
from typing import Dict, Optional, Tuple, List
from .models import (
    MapNode, Ship, PlayerState, RollResult, ReaveOutcome,
    BattleRoundResult, BattleState, DiceFace
)
from .dice import (
    roll_dice_pool, calculate_crew_dice, calculate_naval_dice,
    evaluate_dice_faces, roll_single_die
)


class CombatEngine:
    @staticmethod
    def apply_casualties_and_favor(player: PlayerState, crew_lost: int) -> int:
        """
        Record crew lost, convert every 2 casualties into +1 Favor (up to max 7).
        Returns the amount of Favor gained.
        """
        if crew_lost <= 0:
            return 0
        player.casualties_accumulator += crew_lost
        favor_gained = player.casualties_accumulator // 2
        player.casualties_accumulator %= 2
        if favor_gained > 0:
            player.favor = min(7, player.favor + favor_gained)
        return favor_gained

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
        - Victarion: +1 Raid Die (Iron Captain).
        - Attacker rolls: (crew + 1) // 2 + bonus_dice (capped at 6).
        - Defender (Keep Militia) rolls: target_node.defense dice.
        - Asha (Kraken's Daughter): Win a raid with 0 crew lost -> +1 bonus Hoard.
        """
        # Victarion passive: +1 Raid Die in every battle and raid
        if attacker.faction == "Victarion":
            bonus_dice += 1

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
        crew_lost = min(ship.crew, net_def_hits)

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

            # Asha trait: Kraken's Daughter (win without crew loss -> +1 Hoard)
            if attacker.faction == "Asha" and crew_lost == 0:
                hoard_loot += 1

        # Defeat fueling miracles: 1 Favor per 2 crew lost
        favor_gained = CombatEngine.apply_casualties_and_favor(attacker, crew_lost)

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
            crew_lost=crew_lost,
            favor_gained=favor_gained
        )

    @staticmethod
    def calculate_naval_dice_count(
        ship: Ship,
        faction: str,
        is_defender: bool,
        opposing_faction: str,
        opposing_first_raid_defense: bool
    ) -> int:
        """Calculate the dice pool for a fleet in naval combat."""
        is_victarion = (faction == "Victarion")
        # Defender against Euron's Silence on first raid of the season gets -1 die
        defender_against_euron = (is_defender and opposing_faction == "Euron" and opposing_first_raid_defense)
        return calculate_naval_dice(
            ship.crew,
            is_victarion=is_victarion,
            defender_against_euron_first_raid=defender_against_euron,
            max_dice=6
        )

    @staticmethod
    def roll_naval_dice(
        ship: Ship,
        faction: str,
        node_id: str,
        dice_count: int,
        rng: random.Random = None
    ) -> RollResult:
        """Roll dice for a naval combatant, applying Victarion's double axes in Ironman's Bay."""
        double_axes = (faction == "Victarion" and node_id == "bay")
        return roll_dice_pool(dice_count, rng=rng, double_axes=double_axes)

    @staticmethod
    def apply_blood_price(
        roll: RollResult,
        ship: Ship,
        player: PlayerState,
        reroll_indices: Optional[List[int]] = None,
        rng: random.Random = None
    ) -> Tuple[RollResult, int, int]:
        """
        Euron's Blood Price power:
        Re-rolls selected dice (or all dice if not specified).
        Each Eye rolled grants +1 Favor but costs 1 crew!
        Returns (new_roll, favor_gained, crew_lost).
        """
        new_dice = list(roll.dice)
        indices_to_reroll = reroll_indices if reroll_indices is not None else list(range(len(new_dice)))

        for idx in indices_to_reroll:
            if 0 <= idx < len(new_dice):
                new_dice[idx] = roll_single_die(rng)

        new_roll = evaluate_dice_faces(new_dice, double_axes=False)

        # Count Eyes rolled on the newly rolled dice
        eyes_rolled = sum(1 for idx in indices_to_reroll if 0 <= idx < len(new_dice) and new_dice[idx] == DiceFace.EYE.value)

        # Each Eye rolled grants +1 Favor but costs 1 crew
        favor_gained = min(7 - player.favor, eyes_rolled)
        player.favor = min(7, player.favor + eyes_rolled)
        crew_lost = min(ship.crew, eyes_rolled)
        ship.crew -= crew_lost

        return new_roll, favor_gained, crew_lost

    @staticmethod
    def apply_favor_reroll(
        roll: RollResult,
        reroll_indices: Optional[List[int]] = None,
        double_axes: bool = False,
        rng: random.Random = None
    ) -> RollResult:
        """Spend 2 Favor to re-roll selected dice (or all dice)."""
        new_dice = list(roll.dice)
        indices = reroll_indices if reroll_indices is not None else list(range(len(new_dice)))
        for idx in indices:
            if 0 <= idx < len(new_dice):
                new_dice[idx] = roll_single_die(rng)
        return evaluate_dice_faces(new_dice, double_axes=double_axes)

    @staticmethod
    def resolve_naval_round(
        attacker: PlayerState,
        defender: PlayerState,
        attacker_ship: Ship,
        defender_ship: Ship,
        node_id: str,
        round_num: int,
        attacker_roll: Optional[RollResult] = None,
        defender_roll: Optional[RollResult] = None,
        miracle_autowin: Optional[str] = None,  # 'attacker' or 'defender'
        rng: random.Random = None
    ) -> BattleRoundResult:
        """
        Resolves one round of PvP fleet combat.
        miracle_autowin: 6 Favor spent -> grants 5 unblockable hits.
        """
        # Determine initial rolls if not already rolled
        if attacker_roll is None:
            att_dice_count = CombatEngine.calculate_naval_dice_count(
                attacker_ship, attacker.faction, is_defender=False,
                opposing_faction=defender.faction,
                opposing_first_raid_defense=False
            )
            attacker_roll = CombatEngine.roll_naval_dice(
                attacker_ship, attacker.faction, node_id, att_dice_count, rng=rng
            )

        if defender_roll is None:
            is_euron_first_raid = (attacker.faction == "Euron" and not attacker.first_raid_defense_used and round_num == 1)
            def_dice_count = CombatEngine.calculate_naval_dice_count(
                defender_ship, defender.faction, is_defender=True,
                opposing_faction=attacker.faction,
                opposing_first_raid_defense=is_euron_first_raid
            )
            defender_roll = CombatEngine.roll_naval_dice(
                defender_ship, defender.faction, node_id, def_dice_count, rng=rng
            )

        # Hits & blocks calculation
        if miracle_autowin == "attacker":
            net_att_hits = 5  # Unblockable 5 hits
            net_def_hits = 0
        elif miracle_autowin == "defender":
            net_att_hits = 0
            net_def_hits = 5  # Unblockable 5 hits
        else:
            net_att_hits = max(0, attacker_roll.hits - defender_roll.blocks)
            net_def_hits = max(0, defender_roll.hits - attacker_roll.blocks)

        att_crew_lost = min(attacker_ship.crew, net_def_hits)
        def_crew_lost = min(defender_ship.crew, net_att_hits)

        # Apply casualties
        attacker_ship.crew -= att_crew_lost
        defender_ship.crew -= def_crew_lost

        # Fuel miracles from defeat casualties (1 Favor per 2 crew lost)
        CombatEngine.apply_casualties_and_favor(attacker, att_crew_lost)
        CombatEngine.apply_casualties_and_favor(defender, def_crew_lost)

        return BattleRoundResult(
            round_num=round_num,
            attacker_roll=attacker_roll,
            defender_roll=defender_roll,
            net_attacker_hits=net_att_hits,
            net_defender_hits=net_def_hits,
            attacker_crew_lost=att_crew_lost,
            defender_crew_lost=def_crew_lost,
            miracle_used=f"autowin_{miracle_autowin}" if miracle_autowin else None
        )

    @staticmethod
    def resolve_loot_and_rewards(
        winner: PlayerState,
        loser: PlayerState,
        loser_ship: Ship
    ) -> Tuple[int, int]:
        """
        When an enemy fleet is wiped/sunk:
        - Transfers 50% of loser's Hoard to victor (unless loser is Euron's Silence which is immune to cargo steal).
        - Awards +1 Legend to victor.
        Returns (hoard_plundered, legend_awarded).
        """
        hoard_stolen = 0
        is_euron_silence = (loser.faction == "Euron" and loser_ship.is_flagship)
        if not is_euron_silence and loser.hoard > 0:
            hoard_stolen = loser.hoard // 2
            loser.hoard -= hoard_stolen
            winner.hoard += hoard_stolen

        legend_awarded = 1
        winner.legend += legend_awarded

        return hoard_stolen, legend_awarded
