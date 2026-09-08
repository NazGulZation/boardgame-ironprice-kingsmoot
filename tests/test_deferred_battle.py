"""IRON PRICE: Kingsmoot — Deferred Naval Clash (willing attacker choice) Tests"""
import random
import unittest
from engine.game_state import GameStateManager
from engine.map_engine import MapEngine
from engine.combat import CombatEngine


def make_clash_setup(rng_seed=7):
    game = GameStateManager(map_engine=MapEngine(), max_seasons=3, rng=random.Random(rng_seed))
    _, vic_ship = game.find_ship_location("victarion_flagship")
    game._move_ship_to(vic_ship, "greatwyk", "bay")
    _, reaver = game.find_ship_location("asha_reaver1")
    reaver.crew = 2
    game.active_player_idx = 0  # Asha (human)
    game.actions_remaining = 2
    return game


class TestDeferredNavalClash(unittest.TestCase):
    def test_willing_attacker_gets_choice_not_immediate_roll(self):
        game = make_clash_setup()
        res = game.action_sail("asha_flagship", "bay")
        self.assertTrue(res.get("success"))
        self.assertTrue(res.get("battle_triggered"))
        self.assertTrue(res.get("awaiting_choice"))
        self.assertEqual(game.active_battle.state, "awaiting_choice")
        self.assertEqual(len(game.active_battle.history), 0)
        self.assertEqual(game.actions_remaining, 1)

    def test_final_action_auto_resolves_like_usual(self):
        game = make_clash_setup()
        game.actions_remaining = 1
        res = game.action_sail("asha_flagship", "bay")
        self.assertTrue(res.get("success"))
        self.assertTrue(res.get("battle_triggered"))
        self.assertIsNone(res.get("awaiting_choice"))
        self.assertNotEqual(game.active_battle.state if game.active_battle else "finished", "awaiting_choice")
        # Usual flow: Round 1 rolled immediately (decision) or finished on wipe.
        if game.active_battle is not None:
            self.assertIn(game.active_battle.state, ("round1_decision", "finished"))
            self.assertGreaterEqual(len(game.active_battle.history), 1)
        else:
            self.assertGreaterEqual(len(game.last_battle_outcome.history), 1)

    def test_resolve_now_rolls_round1(self):
        game = make_clash_setup()
        game.action_sail("asha_flagship", "bay")
        res = game.action_battle_choice(choice="resolve_now")
        self.assertTrue(res.get("success"))
        if game.active_battle is not None:
            self.assertEqual(game.active_battle.state, "round1_decision")
            self.assertEqual(len(game.active_battle.history), 1)
        else:
            self.assertGreaterEqual(len(game.last_battle_outcome.history), 1)

    def test_defer_then_reinforce_counts_bonus_die(self):
        game = make_clash_setup(rng_seed=123)
        game.action_sail("asha_flagship", "bay")
        res = game.action_battle_choice(choice="defer")
        self.assertTrue(res.get("success"))
        self.assertEqual(game.active_battle.state, "deferred")
        # Battle decisions blocked while deferred.
        blocked = game.action_battle_round(continue_round=True)
        self.assertFalse(blocked.get("success"))
        # Reinforce with second hull.
        res2 = game.action_sail("asha_reaver1", "bay")
        self.assertTrue(res2.get("success"), res2.get("error"))
        self.assertTrue(res2.get("reinforced"))
        # Activation rolled Round 1 with reinforcement stacked.
        battle = game.active_battle if game.active_battle else game.last_battle_outcome
        self.assertGreaterEqual(len(battle.history), 1)
        _, flag = game.find_ship_location("asha_flagship")
        loc_reaver, _ = game.find_ship_location("asha_reaver1")
        # Reaver may have respawned only if wiped; normally both now at bay.
        attacker_dice = len(battle.history[0].attacker_roll.dice)
        # Base flagship dice (4 crew = 2) + aux reaver (2 crew = 1) = 3, capped 6.
        self.assertGreaterEqual(attacker_dice, 3)

    def test_defer_blocks_second_battle_and_locks_combatants(self):
        game = make_clash_setup()
        game.action_sail("asha_flagship", "bay")
        game.action_battle_choice(choice="defer")
        # Combatant cannot sail away.
        locked = game.action_sail("asha_flagship", "seaN")
        self.assertFalse(locked.get("success"))
        # Second enemy front blocked: plant Euron ship at seaN then try to attack it.
        _, euron = game.find_ship_location("euron_flagship")
        game._move_ship_to(euron, "pyke", "seaN")
        _, reaver = game.find_ship_location("asha_reaver1")
        reaver.crew = 2
        # Reaver at harlaw cannot reach seaN in one sail? harlaw->bay->seaN needs speed 2: reachable.
        second = game.action_sail("asha_reaver1", "seaN")
        # Either unreachable or blocked as second battle; must NOT create new clash.
        if second.get("success"):
            self.assertEqual(game.active_battle.node_id, "bay")
        else:
            self.assertIn("deferred", second.get("error", "").lower() + "resolve")

    def test_end_turn_activates_deferred_without_advancing(self):
        game = make_clash_setup()
        game.action_sail("asha_flagship", "bay")
        game.action_battle_choice(choice="defer")
        active_before = game.get_active_player().faction
        res = game.action_end_turn()
        self.assertTrue(res.get("success"))
        self.assertTrue(res.get("battle_activated"))
        self.assertEqual(game.get_active_player().faction, active_before)
        battle = game.active_battle if game.active_battle else game.last_battle_outcome
        self.assertGreaterEqual(len(battle.history), 1)

    def test_muster_then_auto_activates_on_last_action(self):
        game = make_clash_setup()
        game.action_sail("asha_flagship", "bay")
        game.action_battle_choice(choice="defer")
        # Muster at home port consumes last action -> deferred clash must erupt, no turn advance yet.
        active_before = game.get_active_player().faction
        game.players[0].hoard = 10
        res = game.action_muster("harlaw")
        self.assertTrue(res.get("success"), res.get("error"))
        battle = game.active_battle if game.active_battle else game.last_battle_outcome
        self.assertGreaterEqual(len(battle.history), 1)
        # Turn only advances after the activated battle fully resolves.
        if game.active_battle is not None:
            self.assertEqual(game.get_active_player().faction, active_before)

    def test_ai_attacker_gets_no_choice(self):
        game = GameStateManager(map_engine=MapEngine(), max_seasons=3, rng=random.Random(9))
        _, asha = game.find_ship_location("asha_flagship")
        game._move_ship_to(asha, "harlaw", "bay")
        game.active_player_idx = 1  # Euron (AI)
        game.players[1].is_ai = True
        game.actions_remaining = 2
        res = game.action_sail("euron_flagship", "bay")
        self.assertTrue(res.get("success"))
        self.assertTrue(res.get("battle_triggered"))
        self.assertIsNone(res.get("awaiting_choice"))
        if game.active_battle is not None:
            self.assertNotEqual(game.active_battle.state, "awaiting_choice")

    def test_invalid_choice_rejected(self):
        game = make_clash_setup()
        game.action_sail("asha_flagship", "bay")
        res = game.action_battle_choice(choice="nonsense")
        self.assertFalse(res.get("success"))


if __name__ == "__main__":
    unittest.main()
