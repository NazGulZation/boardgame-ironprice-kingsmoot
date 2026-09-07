"""IRON PRICE: Kingsmoot — Heuristic AI Bot (Phase 1)"""
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

        ships = game.get_player_ships(active.faction)
        if not ships:
            return game.action_pray()

        # Pick active flagship or ship with most crew
        ships_sorted = sorted(ships, key=lambda s: (s[1].is_flagship, s[1].crew), reverse=True)
        node_id, ship = ships_sorted[0]

        # 1. MUSTER if at home port and crew is low
        if node_id == active.home_node and ship.crew < 4:
            cost = 2 if node_id == "greatwyk" else 3
            if active.hoard >= cost:
                res = game.action_muster(node_id, ship.id)
                if res.get("success"):
                    return res

        # 2. REAVE if adjacent to a green land target
        reavable = game.map_engine.get_reavable_targets(node_id, game.nodes)
        if reavable and ship.crew >= 2:
            # Prioritize unburned targets
            unburned = [t for t in reavable if not game.nodes[t].is_burned]
            target_id = unburned[0] if unburned else reavable[0]
            res = game.action_reave(ship.id, target_id)
            if res.get("success"):
                return res

        # 3. SAIL towards sea zones connecting to Green Lands
        reachable = game.map_engine.get_reachable_nodes(node_id, max_speed=2)
        sea_targets = ["seaS", "seaC", "seaN", "storm", "bay"]

        # Prioritize sea zones with unburned targets
        best_target = None
        for r_node in reachable:
            if r_node in sea_targets:
                targets_from_r = game.map_engine.get_reavable_targets(r_node, game.nodes)
                unburned_count = sum(1 for t in targets_from_r if not game.nodes[t].is_burned)
                if unburned_count > 0:
                    best_target = r_node
                    break
        
        if not best_target and reachable:
            best_target = random.choice(reachable)

        if best_target and best_target != node_id:
            res = game.action_sail(ship.id, best_target)
            if res.get("success"):
                return res

        # 4. PRAY if favor < 7
        if active.favor < 7:
            return game.action_pray()

        # 5. Fallback End Turn
        return game.action_end_turn()
