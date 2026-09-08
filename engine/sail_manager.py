"""IRON PRICE: Kingsmoot — Sail & Deferred Reinforcement Manager (Phase 2)"""
from typing import Dict, Any
from .models import BattleState, StormHazardResult, NodeKind
from .dice import roll_storm_die


class SailManager:
    """Handles ship sailing, storm hazards, clash triggers and deferred reinforcement."""

    def __init__(self, game_state):
        self.gs = game_state

    def action_sail(self, ship_id: str, target_node_id: str) -> Dict[str, Any]:
        """Sail a ship up to its max speed to an adjacent or reachable node."""
        gs = self.gs
        if gs.game_over:
            return {"success": False, "error": "Game is already over."}
        if gs.active_battle is not None and gs.active_battle.state == "awaiting_choice":
            return {"success": False, "error": "Choose to resolve the naval clash now or wait for reinforcements first."}
        if gs.active_battle is not None and gs.active_battle.state not in ("deferred", "awaiting_choice"):
            return {"success": False, "error": "Cannot sail while fleet battle is active."}
        if gs.actions_remaining <= 0:
            return {"success": False, "error": "No actions remaining this turn."}

        active = gs.get_active_player()
        curr_node_id, ship = gs.find_ship_location(ship_id)

        if not ship or ship.faction != active.faction:
            return {"success": False, "error": f"Ship {ship_id} not found or not owned by {active.faction}."}

        if target_node_id not in gs.nodes:
            return {"success": False, "error": f"Target node {target_node_id} does not exist."}

        target_node = gs.nodes[target_node_id]
        if target_node.kind == NodeKind.LAND.value:
            return {"success": False, "error": "Cannot sail directly onto Green Land targets; you must reave from adjacent sea."}

        if curr_node_id == target_node_id:
            return {"success": False, "error": f"Ship {ship.id} is already at {target_node.name}."}

        speed = ship.get_speed()
        reachable = gs.map_engine.get_reachable_nodes(curr_node_id, max_speed=speed)
        if target_node_id not in reachable:
            return {"success": False, "error": f"Node {target_node.name} is not reachable from {curr_node_id} (speed {speed})."}

        curr_node = gs.nodes[curr_node_id]

        # 1. Storm Belt Entry Hazard Check
        if target_node_id == "storm" and ship.id != "asha_flagship":
            die_face, outcome = roll_storm_die(gs.rng)
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
                gs.last_hazard_outcome = hazard
                gs.actions_remaining -= 1
                gs._log(f"🌊 [Storm Belt] Violent gales repelled {ship.id} back to {curr_node.name}! (Rolled Shield)")
                gs._check_auto_turn_advance()
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
                if ship.crew == 0:
                    gs.respawn_ship_if_dead(ship)
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
                gs.last_hazard_outcome = hazard
                gs._log(f"🌊 [Storm Belt] Raging waves claim 1 warrior from {ship.id} to the depths! (+1 Favor. Rolled Eye)")
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
                gs.last_hazard_outcome = hazard
                gs._log(f"🌊 [Storm Belt] {ship.id} braves the storm safely! (Rolled {die_face})")
        elif target_node_id == "storm" and ship.id == "asha_flagship":
            gs._log("🦅 Asha's Black Wind navigates the Storm Belt unharmed (Storm Immunity).")

        # 2b. Deferred-clash reinforcement window.
        deferred = gs.active_battle if (gs.active_battle is not None and gs.active_battle.state == "deferred") else None
        if deferred is not None:
            if ship.id in (deferred.attacker_ship_id, deferred.defender_ship_id):
                return {"success": False, "error": f"Ship {ship.id} is locked in the deferred clash at {gs.nodes[deferred.node_id].name}; resolve it first."}
            if target_node_id != deferred.node_id:
                other_enemies = [s for s in target_node.occupants if s.faction != active.faction and s.crew > 0]
                if other_enemies:
                    return {"success": False, "error": f"Resolve the deferred clash at {gs.nodes[deferred.node_id].name} before opening a second battle."}
            gs._move_ship_to(ship, curr_node_id, target_node_id)
            gs.actions_remaining -= 1
            if target_node_id == deferred.node_id:
                gs._log(f"🛡️ [{active.faction}] reinforces the deferred clash at {target_node.name} with {ship.id}! (+1 bonus die in the coming battle)")
                gs._maybe_activate_deferred_battle()
                return {
                    "success": True,
                    "ship_id": ship_id,
                    "from": curr_node_id,
                    "to": target_node_id,
                    "reinforced": True,
                    "battle_triggered": True,
                    "battle": gs.active_battle.to_dict() if gs.active_battle else deferred.to_dict(),
                    "deferred": gs.active_battle is not None and gs.active_battle.state == "deferred"
                }
            gs._log(f"[{active.faction}] sailed {ship.id} from {curr_node.name} to {target_node.name} (clash at {gs.nodes[deferred.node_id].name} still deferred).")
            gs._maybe_activate_deferred_battle()
            gs._check_auto_turn_advance()
            return {
                "success": True,
                "ship_id": ship_id,
                "from": curr_node_id,
                "to": target_node_id,
                "battle": gs.active_battle.to_dict() if gs.active_battle else None,
                "deferred": gs.active_battle is not None and gs.active_battle.state == "deferred"
            }

        # 2. Execute Movement
        gs._move_ship_to(ship, curr_node_id, target_node_id)
        gs.actions_remaining -= 1

        # 3. Detect Enemy Presence -> Trigger PvP Fleet Clash
        enemy_ships = [s for s in target_node.occupants if s.faction != active.faction and s.crew > 0]
        if enemy_ships:
            defender_ship = enemy_ships[0]
            defender_player = gs._get_player_by_faction(defender_ship.faction)
            battle_id = f"b_{gs.season}_{gs.turn_in_season}_{len(gs.logs)}"

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
            gs.active_battle = battle
            gs._log(f"⚔️ FLEET CLASH! [{active.faction}] {ship.id} attacks [{defender_player.faction}] {defender_ship.id} at {target_node.name}!")

            # Willing attacker choice: human attacker with actions left may
            # resolve NOW or WAIT for reinforcement. Final action resolves now.
            if not active.is_ai and gs.actions_remaining > 0:
                battle.state = "awaiting_choice"
                battle.deferred = False
                gs._log(f"⏳ [{active.faction}] may resolve the clash NOW or WAIT until end of actions to bring reinforcements!")
                return {
                    "success": True,
                    "ship_id": ship_id,
                    "from": curr_node_id,
                    "to": target_node_id,
                    "battle_triggered": True,
                    "awaiting_choice": True,
                    "can_defer": True,
                    "battle": battle.to_dict()
                }

            human_involved = (not active.is_ai or not defender_player.is_ai)
            if human_involved:
                gs._init_battle_round_1(battle)
                return {
                    "success": True,
                    "ship_id": ship_id,
                    "from": curr_node_id,
                    "to": target_node_id,
                    "battle_triggered": True,
                    "battle": battle.to_dict()
                }
            else:
                gs._auto_resolve_battle(battle)
                gs._check_auto_turn_advance()
                return {
                    "success": True,
                    "ship_id": ship_id,
                    "from": curr_node_id,
                    "to": target_node_id,
                    "battle_triggered": True,
                    "battle": battle.to_dict()
                }

        gs._log(f"[{active.faction}] sailed {ship.id} from {curr_node.name} to {target_node.name}.")
        gs._check_auto_turn_advance()
        return {"success": True, "ship_id": ship_id, "from": curr_node_id, "to": target_node_id}
