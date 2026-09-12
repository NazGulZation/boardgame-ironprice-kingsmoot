"""IRON PRICE: Kingsmoot — Heuristic AI Bot (Phase 2)"""
import random
from typing import Dict, Any, Optional
from .game_state import GameStateManager
from .models import NodeKind


class SimpleAI:
    @staticmethod
    def step(game: GameStateManager) -> Dict[str, Any]:
        """Execute one heuristic action for the active AI player."""
        if game.game_over:
            return {"success": False, "error": "Game is over"}

        active = game.get_active_player()
        if not active.is_ai:
            return {"success": False, "error": f"{active.faction} is a human player."}

        # 0. If AI is trapped in an active naval battle, resolve it
        if game.active_battle is not None:
            battle = game.active_battle
            # Safety: AI never defers — a willing human attacker owns choice states.
            if battle.state == "awaiting_choice":
                res = game.action_battle_choice(battle_id=battle.battle_id, choice="resolve_now")
                if res.get("success"):
                    return game.action_battle_round(battle_id=battle.battle_id, continue_round=True)
                return res
            if battle.state == "deferred":
                game.battle_manager.activate_deferred_battle(battle)
                return game.action_battle_round(battle_id=battle.battle_id, continue_round=True)
            _, att_ship = game.find_ship_location(battle.attacker_ship_id)
            _, def_ship = game.find_ship_location(battle.defender_ship_id)
            my_ship = att_ship if battle.attacker_faction == active.faction else def_ship
            opp_ship = def_ship if battle.attacker_faction == active.faction else att_ship

            # Check Euron Blood Price
            if active.faction == "Euron" and battle.blood_price_available and my_ship and my_ship.crew >= 2:
                last_h = battle.history[-1] if battle.history else None
                if last_h and (last_h.attacker_roll.hits <= 1 if battle.attacker_faction == active.faction else last_h.defender_roll.hits <= 1):
                    res = game.action_battle_round(battle_id=battle.battle_id, use_blood_price=True)
                    if res.get("success"):
                        return res

            # Check retreat heuristic for Round 1 (fleet totals, not single hull)
            if battle.state == "round1_decision" and my_ship and opp_ship:
                from engine.combat import CombatEngine as _CE
                node = game.nodes.get(battle.node_id)
                if node is not None:
                    my_aux = [s for s in node.occupants if s.faction == active.faction and s.id != my_ship.id and s.crew > 0]
                    opp_faction = battle.defender_faction if battle.attacker_faction == active.faction else battle.attacker_faction
                    opp_primary_id = battle.defender_ship_id if battle.attacker_faction == active.faction else battle.attacker_ship_id
                    opp_aux = [s for s in node.occupants if s.faction == opp_faction and s.id != opp_primary_id and s.crew > 0]
                    my_total = _CE.fleet_total_crew(my_ship, my_aux)
                    opp_total = _CE.fleet_total_crew(opp_ship, opp_aux)
                else:
                    my_total, opp_total = my_ship.crew, opp_ship.crew
                if my_total == 1 and opp_total >= 3:
                    return game.action_battle_round(battle_id=battle.battle_id, retreat=True)

            # Otherwise proceed to Round 2
            return game.action_battle_round(battle_id=battle.battle_id, continue_round=True)

        # 1. Check CALL STORM Miracle (4 Favor) if enemy is adjacent
        if active.favor >= 4:
            friendly_ships = game.get_player_ships(active.faction)
            for ship_loc, _ in friendly_ships:
                neighbors = game.map_engine.get_neighbors(ship_loc)
                for n_id in neighbors:
                    if game.nodes[n_id].kind == NodeKind.SEA.value:
                        enemies = [s for s in game.nodes[n_id].occupants if s.faction != active.faction and s.crew > 0]
                        if enemies:
                            res = game.action_favor_miracle("call_storm", target_node=n_id)
                            if res.get("success"):
                                return res

        ships = game.get_player_ships(active.faction)
        if not ships:
            return game.action_pray()

        # Pick active flagship or ship with most crew
        ships_sorted = sorted(ships, key=lambda s: (s[1].is_flagship, s[1].crew), reverse=True)
        node_id, ship = ships_sorted[0]

        # 2. MUSTER if at home port and crew is below max capacity
        if node_id == active.home_node and ship.crew < ship.max_crew:
            cost = 2 if node_id == "greatwyk" else 3
            if active.hoard >= cost:
                res = game.action_muster(node_id, ship.id)
                if res.get("success"):
                    return res

        # 3. REAVE if adjacent to a green land target
        reavable = game.map_engine.get_reavable_targets(node_id, game.nodes)
        if reavable and ship.crew >= 2:
            unburned = [t for t in reavable if not game.nodes[t].is_burned]
            target_id = unburned[0] if unburned else reavable[0]
            res = game.action_reave(ship.id, target_id)
            if res.get("success"):
                return res

        # 4. SAIL towards sea zones connecting to Green Lands or attack vulnerable enemy ships
        sailable_ships = [s for s in ships if s[1].crew > 0]
        if sailable_ships:
            s_sorted = sorted(sailable_ships, key=lambda s: (s[1].is_flagship, s[1].crew), reverse=True)
            s_node_id, s_ship = s_sorted[0]
            reachable = game.map_engine.get_reachable_nodes(s_node_id, max_speed=s_ship.get_speed())
            sea_targets = ["seaS", "seaC", "seaN", "storm", "bay"]

            # Prioritize sea zones with unburned targets or where we have crew advantage
            best_target = None
            for r_node in reachable:
                if r_node in sea_targets:
                    targets_from_r = game.map_engine.get_reavable_targets(r_node, game.nodes)
                    unburned_count = sum(1 for t in targets_from_r if not game.nodes[t].is_burned)
                    if unburned_count > 0:
                        best_target = r_node
                        break

            if not best_target and reachable:
                valid_destinations = [r for r in reachable if game.nodes[r].kind in [NodeKind.SEA.value, NodeKind.ISLE.value]]
                if valid_destinations:
                    best_target = random.choice(valid_destinations)

            if best_target and best_target != s_node_id:
                res = game.action_sail(s_ship.id, best_target)
                if res.get("success"):
                    return res

        # 5. PRAY if favor < 7
        if active.favor < 7:
            return game.action_pray()

        # 6. Fallback End Turn
        return game.action_end_turn()

