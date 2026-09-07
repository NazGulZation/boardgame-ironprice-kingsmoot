"""IRON PRICE: Kingsmoot — Central Game State Manager (Phase 2)"""
import random
from typing import Dict, List, Optional, Any, Tuple
from .models import (
    PlayerState, MapNode, Ship, FactionType, NodeKind, ReaveOutcome,
    BattleState, BattleRoundResult, StormHazardResult
)
from .map_engine import MapEngine
from .combat import CombatEngine
from .dice import calculate_crew_dice, roll_storm_die
from .logger import get_logger


class GameStateManager:
    def __init__(self, map_engine: Optional[MapEngine] = None, max_seasons: int = 5, rng: random.Random = None):
        self.map_engine = map_engine or MapEngine()
        self.max_seasons = max_seasons
        self.rng = rng or random.Random()
        
        self.season: int = 1
        self.turn_in_season: int = 1  # 1 to 3
        self.active_player_idx: int = 0
        self.actions_remaining: int = 2
        self.game_over: bool = False
        self.winner: Optional[str] = None
        self.last_reave_outcome: Optional[ReaveOutcome] = None
        self.last_hazard_outcome: Optional[StormHazardResult] = None
        self.active_battle: Optional[BattleState] = None
        self.last_battle_outcome: Optional[BattleState] = None
        self.logs: List[str] = []
        self.logger = get_logger("game_state")

        # Initialize Nodes
        self.nodes: Dict[str, MapNode] = self.map_engine.create_fresh_nodes()

        # Initialize Players
        self.players: List[PlayerState] = [
            PlayerState(
                faction=FactionType.ASHA.value,
                name="Asha Greyjoy",
                title="Kraken's Daughter",
                color="#27ae60",
                home_node="harlaw",
                is_ai=False,
                hoard=5,
                legend=0,
                favor=0,
                reserve_crew=4
            ),
            PlayerState(
                faction=FactionType.EURON.value,
                name="Euron Greyjoy",
                title="Crow's Eye",
                color="#8e44ad",
                home_node="pyke",
                is_ai=True,
                hoard=5,
                legend=0,
                favor=0,
                reserve_crew=2
            ),
            PlayerState(
                faction=FactionType.VICTARION.value,
                name="Victarion Greyjoy",
                title="The Iron Captain",
                color="#c0392b",
                home_node="greatwyk",
                is_ai=True,
                hoard=5,
                legend=0,
                favor=0,
                reserve_crew=4
            )
        ]

        # Place initial ships
        self._setup_initial_ships()
        self._log("The Kingsmoot begins! Balon Greyjoy is dead. Three claimants prepare to reave.")

    def _setup_initial_ships(self):
        """Place starting flagships and reaver longships for each player."""
        # Asha at Harlaw (The Black Wind: max_crew=4, speed=2)
        asha_flagship = Ship(id="asha_flagship", faction="Asha", is_flagship=True, crew=4, max_crew=4)
        asha_reaver1 = Ship(id="asha_reaver1", faction="Asha", is_flagship=False, crew=0, max_crew=4)
        asha_reaver2 = Ship(id="asha_reaver2", faction="Asha", is_flagship=False, crew=0, max_crew=4)
        self.nodes["harlaw"].occupants.extend([asha_flagship, asha_reaver1, asha_reaver2])

        # Euron at Pyke (The Silence: max_crew=4, speed=3)
        euron_flagship = Ship(id="euron_flagship", faction="Euron", is_flagship=True, crew=4, max_crew=4)
        euron_reaver1 = Ship(id="euron_reaver1", faction="Euron", is_flagship=False, crew=0, max_crew=4)
        euron_reaver2 = Ship(id="euron_reaver2", faction="Euron", is_flagship=False, crew=0, max_crew=4)
        self.nodes["pyke"].occupants.extend([euron_flagship, euron_reaver1, euron_reaver2])

        # Victarion at Great Wyk (Iron Victory: max_crew=6, speed=1 if 5+ crew else 2)
        vic_flagship = Ship(id="victarion_flagship", faction="Victarion", is_flagship=True, crew=4, max_crew=6)
        vic_reaver1 = Ship(id="victarion_reaver1", faction="Victarion", is_flagship=False, crew=0, max_crew=4)
        vic_reaver2 = Ship(id="victarion_reaver2", faction="Victarion", is_flagship=False, crew=0, max_crew=4)
        self.nodes["greatwyk"].occupants.extend([vic_flagship, vic_reaver1, vic_reaver2])

    def get_active_player(self) -> PlayerState:
        return self.players[self.active_player_idx]

    def _get_player_by_faction(self, faction: str) -> Optional[PlayerState]:
        for p in self.players:
            if p.faction == faction:
                return p
        return None

    def _log(self, msg: str):
        self.logs.append(msg)
        if len(self.logs) > 60:
            self.logs.pop(0)
        self.logger.info(msg)

    def find_ship_location(self, ship_id: str) -> Tuple[Optional[str], Optional[Ship]]:
        for node_id, node in self.nodes.items():
            for ship in node.occupants:
                if ship.id == ship_id:
                    return node_id, ship
        return None, None

    def get_player_ships(self, faction: str) -> List[Tuple[str, Ship]]:
        result = []
        for node_id, node in self.nodes.items():
            for ship in node.occupants:
                if ship.faction == faction:
                    result.append((node_id, ship))
        return result

    def _move_ship_to(self, ship: Ship, from_node_id: str, to_node_id: str):
        """Safely moves a ship between two nodes."""
        if from_node_id in self.nodes and ship in self.nodes[from_node_id].occupants:
            self.nodes[from_node_id].occupants.remove(ship)
        if to_node_id in self.nodes:
            self.nodes[to_node_id].occupants.append(ship)

    def _push_ship_back(self, ship: Ship, from_node_id: str):
        """Pushes a defeated or storm-battered ship back to an adjacent haven or origin."""
        neighbors = self.map_engine.get_neighbors(from_node_id)
        player = self._get_player_by_faction(ship.faction)
        if player and player.home_node in neighbors:
            dest = player.home_node
        else:
            valid_destinations = [n for n in neighbors if self.nodes[n].kind in [NodeKind.SEA.value, NodeKind.ISLE.value]]
            dest = valid_destinations[0] if valid_destinations else from_node_id

        self._move_ship_to(ship, from_node_id, dest)

    # ---------------- ACTIONS ----------------

    def action_sail(self, ship_id: str, target_node_id: str) -> Dict[str, Any]:
        """Sail a ship up to its max speed to an adjacent or reachable node."""
        if self.game_over:
            return {"success": False, "error": "Game is already over."}
        if self.active_battle is not None:
            return {"success": False, "error": "Cannot sail while fleet battle is active."}
        if self.actions_remaining <= 0:
            return {"success": False, "error": "No actions remaining this turn."}

        active = self.get_active_player()
        curr_node_id, ship = self.find_ship_location(ship_id)

        if not ship or ship.faction != active.faction:
            return {"success": False, "error": f"Ship {ship_id} not found or not owned by {active.faction}."}

        if target_node_id not in self.nodes:
            return {"success": False, "error": f"Target node {target_node_id} does not exist."}

        target_node = self.nodes[target_node_id]
        if target_node.kind == NodeKind.LAND.value:
            return {"success": False, "error": "Cannot sail directly onto Green Land targets; you must reave from adjacent sea."}

        if curr_node_id == target_node_id:
            return {"success": False, "error": f"Ship {ship.id} is already at {target_node.name}."}

        speed = ship.get_speed()
        reachable = self.map_engine.get_reachable_nodes(curr_node_id, max_speed=speed)
        if target_node_id not in reachable:
            return {"success": False, "error": f"Node {target_node.name} is not reachable from {curr_node_id} (speed {speed})."}

        curr_node = self.nodes[curr_node_id]

        # 1. Storm Belt Entry Hazard Check
        if target_node_id == "storm" and ship.id != "asha_flagship":
            die_face, outcome = roll_storm_die(self.rng)
            if outcome == "pushback":
                hazard = StormHazardResult(
                    ship_id=ship.id,
                    faction=active.faction,
                    origin_node=curr_node_id,
                    storm_node="storm",
                    die_face=die_face,
                    outcome="pushback",
                    crew_lost=0,
                    favor_gained=0,
                    final_node=curr_node_id
                )
                self.last_hazard_outcome = hazard
                self.actions_remaining -= 1
                self._log(f"🌊 [Storm Belt] Violent gales repelled {ship.id} back to {curr_node.name}! (Rolled Shield)")
                self._check_auto_turn_advance()
                return {
                    "success": True,
                    "ship_id": ship_id,
                    "from": curr_node_id,
                    "to": curr_node_id,
                    "hazard": hazard.to_dict(),
                    "pushed_back": True
                }
            elif outcome == "casualty":
                crew_lost = min(ship.crew, 1)
                ship.crew -= crew_lost
                favor_gained = min(7 - active.favor, 1)
                active.favor = min(7, active.favor + 1)
                hazard = StormHazardResult(
                    ship_id=ship.id,
                    faction=active.faction,
                    origin_node=curr_node_id,
                    storm_node="storm",
                    die_face=die_face,
                    outcome="casualty",
                    crew_lost=crew_lost,
                    favor_gained=favor_gained,
                    final_node="storm"
                )
                self.last_hazard_outcome = hazard
                self._log(f"🌊 [Storm Belt] Raging waves claim 1 warrior from {ship.id} to the depths! (+1 Favor. Rolled Eye)")
            else:  # safe
                hazard = StormHazardResult(
                    ship_id=ship.id,
                    faction=active.faction,
                    origin_node=curr_node_id,
                    storm_node="storm",
                    die_face=die_face,
                    outcome="safe",
                    crew_lost=0,
                    favor_gained=0,
                    final_node="storm"
                )
                self.last_hazard_outcome = hazard
                self._log(f"🌊 [Storm Belt] {ship.id} braves the storm safely! (Rolled {die_face})")
        elif target_node_id == "storm" and ship.id == "asha_flagship":
            self._log("🦅 Asha's Black Wind navigates the Storm Belt unharmed (Storm Immunity).")

        # 2. Execute Movement
        self._move_ship_to(ship, curr_node_id, target_node_id)
        self.actions_remaining -= 1

        # 3. Detect Enemy Presence -> Trigger PvP Fleet Clash
        enemy_ships = [s for s in target_node.occupants if s.faction != active.faction and s.crew > 0]
        if enemy_ships:
            defender_ship = enemy_ships[0]
            defender_player = self._get_player_by_faction(defender_ship.faction)
            battle_id = f"b_{self.season}_{self.turn_in_season}_{len(self.logs)}"

            battle = BattleState(
                battle_id=battle_id,
                node_id=target_node_id,
                origin_node_id=curr_node_id,
                attacker_faction=active.faction,
                defender_faction=defender_player.faction,
                attacker_ship_id=ship.id,
                defender_ship_id=defender_ship.id,
                round_num=1,
                state="round1_ready"
            )
            self.active_battle = battle
            self._log(f"⚔️ FLEET CLASH! [{active.faction}] {ship.id} attacks [{defender_player.faction}] {defender_ship.id} at {target_node.name}!")

            human_involved = (not active.is_ai or not defender_player.is_ai)
            if human_involved:
                self._init_battle_round_1(battle)
                return {
                    "success": True,
                    "ship_id": ship_id,
                    "from": curr_node_id,
                    "to": target_node_id,
                    "battle_triggered": True,
                    "battle": battle.to_dict()
                }
            else:
                self._auto_resolve_battle(battle)
                self._check_auto_turn_advance()
                return {
                    "success": True,
                    "ship_id": ship_id,
                    "from": curr_node_id,
                    "to": target_node_id,
                    "battle_triggered": True,
                    "battle": battle.to_dict()
                }

        self._log(f"[{active.faction}] sailed {ship.id} from {curr_node.name} to {target_node.name}.")
        self._check_auto_turn_advance()
        return {"success": True, "ship_id": ship_id, "from": curr_node_id, "to": target_node_id}

    def _init_battle_round_1(self, battle: BattleState):
        """Initializes Round 1 dice roll and casualties for an active naval battle."""
        attacker = self._get_player_by_faction(battle.attacker_faction)
        defender = self._get_player_by_faction(battle.defender_faction)
        _, attacker_ship = self.find_ship_location(battle.attacker_ship_id)
        _, defender_ship = self.find_ship_location(battle.defender_ship_id)

        if not attacker_ship or not defender_ship:
            self.active_battle = None
            return

        round_res = CombatEngine.resolve_naval_round(
            attacker, defender, attacker_ship, defender_ship,
            battle.node_id, round_num=1, rng=self.rng
        )
        battle.history.append(round_res)
        battle.total_attacker_crew_lost += round_res.attacker_crew_lost
        battle.total_defender_crew_lost += round_res.defender_crew_lost

        if attacker.faction == "Euron":
            attacker.first_raid_defense_used = True

        self.last_battle_outcome = battle
        if attacker_ship.crew == 0 or defender_ship.crew == 0:
            self._finalize_battle(battle)
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
        if self.active_battle is None:
            return {"success": False, "error": "No active naval battle in progress."}

        battle = self.active_battle
        attacker = self._get_player_by_faction(battle.attacker_faction)
        defender = self._get_player_by_faction(battle.defender_faction)
        _, attacker_ship = self.find_ship_location(battle.attacker_ship_id)
        _, defender_ship = self.find_ship_location(battle.defender_ship_id)

        if not attacker_ship or not defender_ship:
            self.active_battle = None
            return {"success": False, "error": "Combatant ship not found."}

        active = self.get_active_player()

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
                        reroll_indices=reroll_dice_indices, rng=self.rng
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
                        reroll_indices=reroll_dice_indices, rng=self.rng
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

                self._log(f"🩸 Euron invokes Blood Price! Re-rolled dice -> +{favor_g} Favor gained, {crew_l} crew sacrificed.")
                if attacker_ship.crew == 0 or defender_ship.crew == 0:
                    self._finalize_battle(battle)
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
                        rng=self.rng
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
                        rng=self.rng
                    )
                    last_round.net_defender_hits = max(0, last_round.defender_roll.hits - last_round.attacker_roll.blocks)
                    att_loss = min(attacker_ship.crew, last_round.net_defender_hits)
                    attacker_ship.crew -= att_loss
                    last_round.attacker_crew_lost += att_loss
                    battle.total_attacker_crew_lost += att_loss
                    CombatEngine.apply_casualties_and_favor(attacker, att_loss)

                self._log(f"🌊 [{active.faction}] spent 2 Favor to re-roll tactical dice!")
                if attacker_ship.crew == 0 or defender_ship.crew == 0:
                    self._finalize_battle(battle)
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

            self._log(f"🌊 [{active.faction}] cast AUTO-WIN (6 Favor)! 5 unblockable hits dealt to {target_ship.id}!")
            if attacker_ship.crew == 0 or defender_ship.crew == 0:
                self._finalize_battle(battle)
            return {"success": True, "battle": battle.to_dict()}

        # 4. Retreat Decision
        if retreat:
            ret_faction = active.faction
            ret_ship = attacker_ship if active == attacker else defender_ship
            if ret_faction == "Asha":
                self._log("🦅 Asha executes free retreat without rearguard casualty (Kraken's Daughter).")
            else:
                if ret_ship.crew > 0:
                    ret_ship.crew -= 1
                    CombatEngine.apply_casualties_and_favor(active, 1)
                    self._log(f"🛡️ [{ret_faction}] sacrificed 1 crew as rearguard to break off combat.")

            if active == attacker:
                self._move_ship_to(attacker_ship, battle.node_id, battle.origin_node_id)
                battle.winner = defender.faction
            else:
                self._push_ship_back(defender_ship, battle.node_id)
                battle.winner = attacker.faction

            battle.retreated_faction = ret_faction
            battle.state = "finished"
            self.active_battle = None
            self._check_auto_turn_advance()
            return {"success": True, "battle": battle.to_dict(), "retreated": True}

        # 5. Advance to Round 2
        if continue_round:
            battle.round_num = 2
            round2_res = CombatEngine.resolve_naval_round(
                attacker, defender, attacker_ship, defender_ship,
                battle.node_id, round_num=2, rng=self.rng
            )
            battle.history.append(round2_res)
            battle.total_attacker_crew_lost += round2_res.attacker_crew_lost
            battle.total_defender_crew_lost += round2_res.defender_crew_lost
            self._finalize_battle(battle)
            return {"success": True, "battle": battle.to_dict()}

        return {"success": False, "error": "Invalid battle action."}

    def _finalize_battle(self, battle: BattleState):
        """Resolves winner, looting, pushback, and cleanup for finished fleet combat."""
        attacker = self._get_player_by_faction(battle.attacker_faction)
        defender = self._get_player_by_faction(battle.defender_faction)
        _, attacker_ship = self.find_ship_location(battle.attacker_ship_id)
        _, defender_ship = self.find_ship_location(battle.defender_ship_id)
        node = self.nodes[battle.node_id]

        if not attacker_ship or not defender_ship:
            battle.state = "finished"
            self.active_battle = None
            return

        # Case 1: Defender wiped out
        if defender_ship.crew == 0 and attacker_ship.crew > 0:
            battle.winner = attacker.faction
            hoard, legend = CombatEngine.resolve_loot_and_rewards(attacker, defender, defender_ship)
            battle.hoard_plundered = hoard
            battle.legend_awarded = legend
            self._log(f"🎉 [{attacker.faction}] SUNK/WIPED [{defender.faction}] {defender_ship.id} at {node.name}! Plundered {hoard} Hoard and gained +{legend} Legend!")

        # Case 2: Attacker wiped out
        elif attacker_ship.crew == 0 and defender_ship.crew > 0:
            battle.winner = defender.faction
            hoard, legend = CombatEngine.resolve_loot_and_rewards(defender, attacker, attacker_ship)
            battle.hoard_plundered = hoard
            battle.legend_awarded = legend
            self._log(f"🎉 [{defender.faction}] DEFENDED {node.name}! [{attacker.faction}] {attacker_ship.id} was wiped out! Gained +{legend} Legend!")

        # Case 3: Both survive after Round 2
        else:
            tot_att_hits = sum(h.net_attacker_hits for h in battle.history)
            tot_def_hits = sum(h.net_defender_hits for h in battle.history)
            if tot_att_hits > tot_def_hits:
                battle.winner = attacker.faction
                self._log(f"⚔️ [{attacker.faction}] broke the line with {tot_att_hits} vs {tot_def_hits} net hits! [{defender.faction}] is pushed back.")
                self._push_ship_back(defender_ship, from_node_id=battle.node_id)
            elif tot_def_hits > tot_att_hits:
                battle.winner = defender.faction
                self._log(f"🛡️ [{defender.faction}] held ground with {tot_def_hits} vs {tot_att_hits} net hits! [{attacker.faction}] falls back.")
                self._move_ship_to(attacker_ship, battle.node_id, battle.origin_node_id)
            else:
                battle.is_stalemate = True
                self._log(f"⚖️ Battle ended in STALEMATE ({tot_att_hits} = {tot_def_hits}). [{attacker.faction}] falls back to sea.")
                self._move_ship_to(attacker_ship, battle.node_id, battle.origin_node_id)

        battle.state = "finished"
        self.last_battle_outcome = battle
        self.active_battle = None
        self._check_auto_turn_advance()

    def _auto_resolve_battle(self, battle: BattleState):
        """Headless AI-vs-AI naval battle resolver."""
        self._init_battle_round_1(battle)
        if battle.state == "finished":
            return

        euron_player = self._get_player_by_faction("Euron")
        if (battle.attacker_faction == "Euron" or battle.defender_faction == "Euron") and battle.blood_price_available:
            self.action_battle_round(battle_id=battle.battle_id, use_blood_price=True)
            if battle.state == "finished":
                return

        _, att_ship = self.find_ship_location(battle.attacker_ship_id)
        _, def_ship = self.find_ship_location(battle.defender_ship_id)
        if att_ship and def_ship:
            if att_ship.crew == 1 and def_ship.crew >= 3:
                self.action_battle_round(battle_id=battle.battle_id, retreat=True)
                return

        self.action_battle_round(battle_id=battle.battle_id, continue_round=True)

    def action_favor_miracle(
        self,
        miracle_type: str,
        target_faction: Optional[str] = None,
        target_node: Optional[str] = None
    ) -> Dict[str, Any]:
        """Casts a Drowned God miracle (Call Storm: 4 Favor)."""
        if self.game_over:
            return {"success": False, "error": "Game is already over."}
        if self.actions_remaining <= 0:
            return {"success": False, "error": "No actions remaining this turn."}

        active = self.get_active_player()

        if miracle_type == "call_storm":
            if active.favor < 4:
                return {"success": False, "error": f"Not enough Favor. Need 4, have {active.favor}."}
            if not target_node or target_node not in self.nodes:
                return {"success": False, "error": "Invalid target node for Call Storm."}

            node = self.nodes[target_node]
            if node.kind != NodeKind.SEA.value:
                return {"success": False, "error": "Call Storm can only target Sea zones."}

            enemy_ships = [s for s in node.occupants if s.faction != active.faction and s.crew > 0]
            if not enemy_ships:
                return {"success": False, "error": f"No enemy fleet found at {node.name}."}

            enemy_ship = enemy_ships[0]
            enemy_player = self._get_player_by_faction(enemy_ship.faction)

            active.favor -= 4
            enemy_ship.crew = max(0, enemy_ship.crew - 1)
            CombatEngine.apply_casualties_and_favor(enemy_player, 1)
            self._push_ship_back(enemy_ship, target_node)

            self.actions_remaining -= 1
            self._log(f"🌊 [{active.faction}] invokes CALL STORM (4 Favor)! {enemy_ship.id} at {node.name} loses 1 crew and is battered back!")
            self._check_auto_turn_advance()
            return {"success": True, "miracle": "call_storm", "favor": active.favor}

        return {"success": False, "error": f"Unknown miracle type: {miracle_type}"}

    def action_muster(self, node_id: str, ship_id: Optional[str] = None) -> Dict[str, Any]:
        """Muster crew at a controlled home port."""
        if self.game_over:
            return {"success": False, "error": "Game is already over."}
        if self.actions_remaining <= 0:
            return {"success": False, "error": "No actions remaining this turn."}

        active = self.get_active_player()
        if node_id not in self.nodes:
            return {"success": False, "error": f"Node {node_id} does not exist."}

        node = self.nodes[node_id]
        if node.control != active.faction and node_id != active.home_node:
            return {"success": False, "error": f"You do not control {node.name} to muster crew."}

        cost = 2 if node_id == "greatwyk" else 3
        if active.hoard < cost:
            return {"success": False, "error": f"Not enough Hoard to muster. Needed {cost}, have {active.hoard}."}

        friendly_ships = [s for s in node.occupants if s.faction == active.faction]
        total_capacity = sum(s.max_crew - s.crew for s in friendly_ships)
        
        if friendly_ships and total_capacity <= 0:
            return {"success": False, "error": f"Semua kapal di {node.name} sudah penuh ({friendly_ships[0].max_crew}/{friendly_ships[0].max_crew} crew)!"}

        active.hoard -= cost
        crew_to_add = 3
        assigned_details = []

        target_ship = None
        if ship_id:
            for s in friendly_ships:
                if s.id == ship_id:
                    target_ship = s
                    break

        if target_ship and target_ship.crew < target_ship.max_crew:
            take = min(target_ship.max_crew - target_ship.crew, crew_to_add)
            target_ship.crew += take
            crew_to_add -= take
            assigned_details.append(f"{target_ship.id} (now {target_ship.crew})")

        if crew_to_add > 0:
            for s in friendly_ships:
                if s != target_ship and s.crew < s.max_crew:
                    take = min(s.max_crew - s.crew, crew_to_add)
                    s.crew += take
                    crew_to_add -= take
                    assigned_details.append(f"{s.id} (now {s.crew})")
                    if crew_to_add <= 0:
                        break

        if crew_to_add > 0:
            active.reserve_crew += crew_to_add
            assigned_details.append(f"{crew_to_add} in reserve")

        self.actions_remaining -= 1
        detail_str = ", ".join(assigned_details) if assigned_details else "into reserve"
        self._log(f"🛡️ [{active.faction}] mustered 3 crew at {node.name} for {cost} Hoard -> {detail_str}.")

        self._check_auto_turn_advance()
        return {"success": True, "node_id": node_id, "cost": cost}

    def action_reave(self, ship_id: str, target_land_id: str) -> Dict[str, Any]:
        """Reave an adjacent Green Land keep."""
        if self.game_over:
            return {"success": False, "error": "Game is already over."}
        if self.actions_remaining <= 0:
            return {"success": False, "error": "No actions remaining this turn."}

        active = self.get_active_player()
        curr_node_id, ship = self.find_ship_location(ship_id)

        if not ship or ship.faction != active.faction:
            return {"success": False, "error": f"Ship {ship_id} not found or not owned by {active.faction}."}

        if ship.crew <= 0:
            return {"success": False, "error": "Ship has 0 crew and cannot reave!"}

        if target_land_id not in self.nodes:
            return {"success": False, "error": f"Target land {target_land_id} does not exist."}

        target_node = self.nodes[target_land_id]
        if target_node.kind != NodeKind.LAND.value:
            return {"success": False, "error": f"{target_node.name} is not a Green Land raid target."}

        if not self.map_engine.is_adjacent(curr_node_id, target_land_id):
            return {"success": False, "error": f"{ship.id} at {curr_node_id} is not adjacent to {target_node.name}."}

        outcome = CombatEngine.resolve_greenland_reave(active, ship, target_node, rng=self.rng)
        self.last_reave_outcome = outcome

        ship.crew -= outcome.crew_lost

        if outcome.success:
            active.hoard += outcome.hoard_gained
            active.legend += outcome.legend_gained
            active.successful_raids += 1
            target_node.is_burned = True
            self._log(f"⚔️ [{active.faction}] SACKED {target_node.name}! +{outcome.hoard_gained} Hoard, +{outcome.legend_gained} Legend. (Lost {outcome.crew_lost} crew)")
        else:
            self._log(f"🛡️ [{active.faction}] raid on {target_node.name} was REPELLED! (Hits: {outcome.net_attacker_hits}/{outcome.defense_required}, Lost {outcome.crew_lost} crew)")

        self.actions_remaining -= 1
        self._check_auto_turn_advance()
        return {"success": True, "outcome": outcome.to_dict()}

    def action_pray(self) -> Dict[str, Any]:
        """Pray to the Drowned God to gain +1 Favor."""
        if self.game_over:
            return {"success": False, "error": "Game is already over."}
        if self.actions_remaining <= 0:
            return {"success": False, "error": "No actions remaining this turn."}

        active = self.get_active_player()
        if active.favor >= 7:
            return {"success": False, "error": "Favor is already at maximum (7)."}

        active.favor = min(7, active.favor + 1)
        self.actions_remaining -= 1
        self._log(f"🌊 [{active.faction}] prayed to the Drowned God (Favor: {active.favor}/7).")

        self._check_auto_turn_advance()
        return {"success": True, "favor": active.favor}

    def action_end_turn(self) -> Dict[str, Any]:
        """Manually end turn if actions are remaining."""
        if self.game_over:
            return {"success": False, "error": "Game is already over."}

        active = self.get_active_player()
        self._log(f"[{active.faction}] ended turn.")
        self._advance_turn()
        return {"success": True}

    def _check_auto_turn_advance(self):
        """Auto advance if no actions remaining and no active battle in progress."""
        if self.active_battle is None and self.actions_remaining <= 0:
            self._advance_turn()

    def _advance_turn(self):
        """Advance player turn, round, and season. Also checks No-Elimination respawn."""
        self.actions_remaining = 2
        self.active_player_idx = (self.active_player_idx + 1) % len(self.players)

        # No-Elimination Respawn check for incoming active player
        active = self.get_active_player()
        total_crew = sum(s.crew for _, s in self.get_player_ships(active.faction))
        if total_crew <= 0:
            ships = self.get_player_ships(active.faction)
            flagship = next((s for _, s in ships if s.is_flagship), None)
            if flagship:
                curr_node_id, _ = self.find_ship_location(flagship.id)
                self._move_ship_to(flagship, curr_node_id or active.home_node, active.home_node)
                flagship.crew = 3
                self._log(f"⚓ [WHAT IS DEAD MAY NEVER DIE] {active.name} respawned at {self.nodes[active.home_node].name} with 1 Flagship and 3 fresh warriors!")

        # If wrapped back to first player (Asha), advance turn in season
        if self.active_player_idx == 0:
            self.turn_in_season += 1
            if self.turn_in_season > 3:
                self._resolve_season_end()

    def _resolve_season_end(self):
        """Handle end-of-season scoring and transition."""
        self._log(f"=== SEASON {self.season} ENDS ===")

        for isle_id in ["pyke", "harlaw", "greatwyk", "oldwyk", "orkmont"]:
            node = self.nodes.get(isle_id)
            if node and node.occupants:
                counts = {}
                for ship in node.occupants:
                    counts[ship.faction] = counts.get(ship.faction, 0) + ship.crew
                if counts:
                    top_faction = max(counts, key=counts.get)
                    for p in self.players:
                        if p.faction == top_faction:
                            p.legend += 1
                            self._log(f"🏰 {p.faction} controls {node.name} (+1 Legend).")

        refreshed = 0
        for node in self.nodes.values():
            if node.kind == NodeKind.LAND.value and node.is_burned:
                node.is_burned = False
                refreshed += 1
                if refreshed >= 2:
                    break
        if refreshed > 0:
            self._log(f"🔥 Refreshed {refreshed} Burned keep(s).")

        for p in self.players:
            p.first_raid_defense_used = False

        self.season += 1
        self.turn_in_season = 1

        if self.season > self.max_seasons:
            self._resolve_game_over()
        else:
            self._log(f"=== SEASON {self.season} BEGINS ===")

    def _resolve_game_over(self):
        """Final Kingsmoot resolution and crowning."""
        self.game_over = True
        self.season = self.max_seasons

        sorted_players = sorted(
            self.players,
            key=lambda p: (p.legend, p.hoard, p.favor, p.successful_raids),
            reverse=True
        )
        winner_p = sorted_players[0]
        self.winner = winner_p.faction
        self._log(f"👑 KINGSMOOT COMPLETE! {winner_p.name} ({winner_p.title}) is crowned King of Salt and Rock with {winner_p.legend} Legend!")

    def to_dict(self) -> Dict[str, Any]:
        """Serialize complete state for REST API."""
        return {
            "season": self.season,
            "max_seasons": self.max_seasons,
            "turn_in_season": self.turn_in_season,
            "active_player_idx": self.active_player_idx,
            "active_faction": self.get_active_player().faction,
            "actions_remaining": self.actions_remaining,
            "game_over": self.game_over,
            "winner": self.winner,
            "last_reave_outcome": self.last_reave_outcome.to_dict() if self.last_reave_outcome else None,
            "last_hazard_outcome": self.last_hazard_outcome.to_dict() if self.last_hazard_outcome else None,
            "active_battle": self.active_battle.to_dict() if self.active_battle else None,
            "last_battle_outcome": self.last_battle_outcome.to_dict() if self.last_battle_outcome else None,
            "players": [p.to_dict() for p in self.players],
            "nodes": {nid: node.to_dict() for nid, node in self.nodes.items()},
            "logs": self.logs[-20:]
        }

