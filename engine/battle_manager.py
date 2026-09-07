"""IRON PRICE: Kingsmoot — Fleet Battle Manager (Phase 2)"""
from typing import Dict, List, Optional, Any
from .models import BattleState
from .combat import CombatEngine


class BattleManager:
    """Handles naval combat engagement, rounds, miracles, blood price, and retreat."""

    def __init__(self, game_state):
        self.gs = game_state

    def init_battle_round_1(self, battle: BattleState):
        """Initializes Round 1 dice roll and casualties for an active naval battle."""
        attacker = self.gs._get_player_by_faction(battle.attacker_faction)
        defender = self.gs._get_player_by_faction(battle.defender_faction)
        _, attacker_ship = self.gs.find_ship_location(battle.attacker_ship_id)
        _, defender_ship = self.gs.find_ship_location(battle.defender_ship_id)

        if not attacker_ship or not defender_ship:
            self.gs.active_battle = None
            return

        round_res = CombatEngine.resolve_naval_round(
            attacker, defender, attacker_ship, defender_ship,
            battle.node_id, round_num=1, rng=self.gs.rng
        )
        battle.history.append(round_res)
        battle.total_attacker_crew_lost += round_res.attacker_crew_lost
        battle.total_defender_crew_lost += round_res.defender_crew_lost

        if attacker.faction == "Euron":
            attacker.first_raid_defense_used = True

        self.gs.last_battle_outcome = battle
        if attacker_ship.crew == 0 or defender_ship.crew == 0:
            self.finalize_battle(battle)
        else:
            battle.state = "round1_decision"
            battle.round_num = 1

    def action_battle_round(
        self,
        battle_id: Optional[str] = None,
        retreat: bool = False,
        use_blood_price: bool = False,
        reroll_dice_indices: Optional[List[int]] = None,
        miracle_cost: Optional[int] = None,
        continue_round: bool = False
    ) -> Dict[str, Any]:
        """Executes a round action in an active naval battle (Blood Price, Miracle, Retreat, or Round 2)."""
        if self.gs.active_battle is None:
            return {"success": False, "error": "No active naval battle in progress."}

        battle = self.gs.active_battle
        attacker = self.gs._get_player_by_faction(battle.attacker_faction)
        defender = self.gs._get_player_by_faction(battle.defender_faction)
        _, attacker_ship = self.gs.find_ship_location(battle.attacker_ship_id)
        _, defender_ship = self.gs.find_ship_location(battle.defender_ship_id)

        if not attacker_ship or not defender_ship:
            self.gs.active_battle = None
            return {"success": False, "error": "Combatant ship not found."}

        active = self.gs.get_active_player()

        # 1. Euron Blood Price Re-roll
        if use_blood_price:
            if not battle.blood_price_available:
                return {"success": False, "error": "Blood Price can only be used once per battle."}
            euron_player = attacker if attacker.faction == "Euron" else defender
            euron_ship = attacker_ship if attacker.faction == "Euron" else defender_ship
            battle.blood_price_available = False

            if battle.history:
                last_round = battle.history[-1]
                if euron_player == attacker:
                    new_roll, favor_g, crew_l = CombatEngine.apply_blood_price(
                        last_round.attacker_roll, euron_ship, euron_player,
                        reroll_indices=reroll_dice_indices, rng=self.gs.rng
                    )
                    last_round.attacker_roll = new_roll
                    last_round.blood_price_used = True
                    last_round.blood_price_favor_gained = favor_g
                    last_round.blood_price_crew_lost = crew_l
                    last_round.net_attacker_hits = max(0, new_roll.hits - last_round.defender_roll.blocks)
                    def_loss = min(defender_ship.crew, last_round.net_attacker_hits)
                    defender_ship.crew -= def_loss
                    last_round.defender_crew_lost += def_loss
                    battle.total_defender_crew_lost += def_loss
                    CombatEngine.apply_casualties_and_favor(defender, def_loss)
                else:
                    new_roll, favor_g, crew_l = CombatEngine.apply_blood_price(
                        last_round.defender_roll, euron_ship, euron_player,
                        reroll_indices=reroll_dice_indices, rng=self.gs.rng
                    )
                    last_round.defender_roll = new_roll
                    last_round.blood_price_used = True
                    last_round.blood_price_favor_gained = favor_g
                    last_round.blood_price_crew_lost = crew_l
                    last_round.net_defender_hits = max(0, new_roll.hits - last_round.attacker_roll.blocks)
                    att_loss = min(attacker_ship.crew, last_round.net_defender_hits)
                    attacker_ship.crew -= att_loss
                    last_round.attacker_crew_lost += att_loss
                    battle.total_attacker_crew_lost += att_loss
                    CombatEngine.apply_casualties_and_favor(attacker, att_loss)

                self.gs._log(f"🩸 Euron invokes Blood Price! Re-rolled dice -> +{favor_g} Favor gained, {crew_l} crew sacrificed.")
                if attacker_ship.crew == 0 or defender_ship.crew == 0:
                    self.finalize_battle(battle)
                return {"success": True, "battle": battle.to_dict()}

        # 2. Favor Miracle: Re-roll (2 Favor)
        if miracle_cost == 2:
            if active.favor < 2:
                return {"success": False, "error": "Not enough Favor (2 required for Re-roll)."}
            active.favor -= 2
            if battle.history:
                last_round = battle.history[-1]
                if active == attacker:
                    last_round.attacker_roll = CombatEngine.apply_favor_reroll(
                        last_round.attacker_roll, reroll_indices=reroll_dice_indices,
                        double_axes=(active.faction == "Victarion" and battle.node_id == "bay"),
                        rng=self.gs.rng
                    )
                    last_round.net_attacker_hits = max(0, last_round.attacker_roll.hits - last_round.defender_roll.blocks)
                    def_loss = min(defender_ship.crew, last_round.net_attacker_hits)
                    defender_ship.crew -= def_loss
                    last_round.defender_crew_lost += def_loss
                    battle.total_defender_crew_lost += def_loss
                    CombatEngine.apply_casualties_and_favor(defender, def_loss)
                else:
                    last_round.defender_roll = CombatEngine.apply_favor_reroll(
                        last_round.defender_roll, reroll_indices=reroll_dice_indices,
                        double_axes=(defender.faction == "Victarion" and battle.node_id == "bay"),
                        rng=self.gs.rng
                    )
                    last_round.net_defender_hits = max(0, last_round.defender_roll.hits - last_round.attacker_roll.blocks)
                    att_loss = min(attacker_ship.crew, last_round.net_defender_hits)
                    attacker_ship.crew -= att_loss
                    last_round.attacker_crew_lost += att_loss
                    battle.total_attacker_crew_lost += att_loss
                    CombatEngine.apply_casualties_and_favor(attacker, att_loss)

                self.gs._log(f"🌊 [{active.faction}] spent 2 Favor to re-roll tactical dice!")
                if attacker_ship.crew == 0 or defender_ship.crew == 0:
                    self.finalize_battle(battle)
                return {"success": True, "battle": battle.to_dict()}

        # 3. Favor Miracle: Auto-Win (6 Favor)
        if miracle_cost == 6:
            if active.favor < 6:
                return {"success": False, "error": "Not enough Favor (6 required for Auto-Win)."}
            active.favor -= 6
            target_ship = defender_ship if active == attacker else attacker_ship
            target_player = defender if active == attacker else attacker
            unblockable_hits = min(target_ship.crew, 5)
            target_ship.crew -= unblockable_hits
            CombatEngine.apply_casualties_and_favor(target_player, unblockable_hits)

            if battle.history:
                last_round = battle.history[-1]
                last_round.miracle_used = "autowin_6favor"
                if active == attacker:
                    last_round.net_attacker_hits += unblockable_hits
                    last_round.defender_crew_lost += unblockable_hits
                else:
                    last_round.net_defender_hits += unblockable_hits
                    last_round.attacker_crew_lost += unblockable_hits

            self.gs._log(f"🌊 [{active.faction}] cast AUTO-WIN (6 Favor)! 5 unblockable hits dealt to {target_ship.id}!")
            if attacker_ship.crew == 0 or defender_ship.crew == 0:
                self.finalize_battle(battle)
            return {"success": True, "battle": battle.to_dict()}

        # 4. Retreat Decision
        if retreat:
            ret_faction = active.faction
            ret_ship = attacker_ship if active == attacker else defender_ship
            if ret_faction == "Asha":
                self.gs._log("🦅 Asha executes free retreat without rearguard casualty (Kraken's Daughter).")
            else:
                if ret_ship.crew > 0:
                    ret_ship.crew -= 1
                    CombatEngine.apply_casualties_and_favor(active, 1)
                    self.gs._log(f"🛡️ [{ret_faction}] sacrificed 1 crew as rearguard to break off combat.")

            if active == attacker:
                self.gs._move_ship_to(attacker_ship, battle.node_id, battle.origin_node_id)
                battle.winner = defender.faction
            else:
                self.gs._push_ship_back(defender_ship, battle.node_id)
                battle.winner = attacker.faction

            battle.retreated_faction = ret_faction
            battle.state = "finished"
            self.gs.active_battle = None
            self.gs._check_auto_turn_advance()
            return {"success": True, "battle": battle.to_dict(), "retreated": True}

        # 5. Advance to Round 2
        if continue_round:
            battle.round_num = 2
            round2_res = CombatEngine.resolve_naval_round(
                attacker, defender, attacker_ship, defender_ship,
                battle.node_id, round_num=2, rng=self.gs.rng
            )
            battle.history.append(round2_res)
            battle.total_attacker_crew_lost += round2_res.attacker_crew_lost
            battle.total_defender_crew_lost += round2_res.defender_crew_lost
            self.finalize_battle(battle)
            return {"success": True, "battle": battle.to_dict()}

        return {"success": False, "error": "Invalid battle action."}

    def finalize_battle(self, battle: BattleState):
        """Resolves winner, looting, pushback, and cleanup for finished fleet combat."""
        attacker = self.gs._get_player_by_faction(battle.attacker_faction)
        defender = self.gs._get_player_by_faction(battle.defender_faction)
        _, attacker_ship = self.gs.find_ship_location(battle.attacker_ship_id)
        _, defender_ship = self.gs.find_ship_location(battle.defender_ship_id)
        node = self.gs.nodes[battle.node_id]

        if not attacker_ship or not defender_ship:
            battle.state = "finished"
            self.gs.active_battle = None
            return

        # Case 1: Defender wiped out
        if defender_ship.crew == 0 and attacker_ship.crew > 0:
            battle.winner = attacker.faction
            hoard, legend = CombatEngine.resolve_loot_and_rewards(attacker, defender, defender_ship)
            battle.hoard_plundered = hoard
            battle.legend_awarded = legend
            self.gs._log(f"🎉 [{attacker.faction}] SUNK/WIPED [{defender.faction}] {defender_ship.id} at {node.name}! Plundered {hoard} Hoard and gained +{legend} Legend!")

        # Case 2: Attacker wiped out
        elif attacker_ship.crew == 0 and defender_ship.crew > 0:
            battle.winner = defender.faction
            hoard, legend = CombatEngine.resolve_loot_and_rewards(defender, attacker, attacker_ship)
            battle.hoard_plundered = hoard
            battle.legend_awarded = legend
            self.gs._log(f"🎉 [{defender.faction}] DEFENDED {node.name}! [{attacker.faction}] {attacker_ship.id} was wiped out! Gained +{legend} Legend!")

        # Case 3: Both survive after Round 2
        else:
            tot_att_hits = sum(h.net_attacker_hits for h in battle.history)
            tot_def_hits = sum(h.net_defender_hits for h in battle.history)
            if tot_att_hits > tot_def_hits:
                battle.winner = attacker.faction
                self.gs._log(f"⚔️ [{attacker.faction}] broke the line with {tot_att_hits} vs {tot_def_hits} net hits! [{defender.faction}] is pushed back.")
                self.gs._push_ship_back(defender_ship, from_node_id=battle.node_id)
            elif tot_def_hits > tot_att_hits:
                battle.winner = defender.faction
                self.gs._log(f"🛡️ [{defender.faction}] held ground with {tot_def_hits} vs {tot_att_hits} net hits! [{attacker.faction}] falls back.")
                self.gs._move_ship_to(attacker_ship, battle.node_id, battle.origin_node_id)
            else:
                battle.is_stalemate = True
                self.gs._log(f"⚖️ Battle ended in STALEMATE ({tot_att_hits} = {tot_def_hits}). [{attacker.faction}] falls back to sea.")
                self.gs._move_ship_to(attacker_ship, battle.node_id, battle.origin_node_id)

        battle.state = "finished"
        self.gs.last_battle_outcome = battle
        self.gs.active_battle = None
        self.gs._check_auto_turn_advance()

    def auto_resolve_battle(self, battle: BattleState):
        """Headless AI-vs-AI naval battle resolver."""
        self.init_battle_round_1(battle)
        if battle.state == "finished":
            return

        euron_player = self.gs._get_player_by_faction("Euron")
        if (battle.attacker_faction == "Euron" or battle.defender_faction == "Euron") and battle.blood_price_available:
            self.action_battle_round(battle_id=battle.battle_id, use_blood_price=True)
            if battle.state == "finished":
                return

        _, att_ship = self.gs.find_ship_location(battle.attacker_ship_id)
        _, def_ship = self.gs.find_ship_location(battle.defender_ship_id)
        if att_ship and def_ship:
            if att_ship.crew == 1 and def_ship.crew >= 3:
                self.action_battle_round(battle_id=battle.battle_id, retreat=True)
                return

        self.action_battle_round(battle_id=battle.battle_id, continue_round=True)
