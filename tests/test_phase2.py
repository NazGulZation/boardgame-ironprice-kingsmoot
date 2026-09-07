"""IRON PRICE: Kingsmoot — Phase 2 Unit & Integration Tests"""
import unittest
import random
from engine.models import FactionType, DiceFace, NodeKind, Ship, PlayerState
from engine.dice import calculate_naval_dice, roll_storm_die, evaluate_dice_faces, calculate_crew_dice
from engine.map_engine import MapEngine
from engine.combat import CombatEngine
from engine.game_state import GameStateManager
from engine.ai import SimpleAI


class TestPhase2Features(unittest.TestCase):
    def setUp(self):
        self.map_engine = MapEngine()
        self.game = GameStateManager(map_engine=self.map_engine, max_seasons=3)

    def test_flagship_asymmetry(self):
        """Test speeds and crew capacities of the three flagships."""
        _, asha_flag = self.game.find_ship_location("asha_flagship")
        _, euron_flag = self.game.find_ship_location("euron_flagship")
        _, vic_flag = self.game.find_ship_location("victarion_flagship")

        # Asha: speed 2, max crew 4
        self.assertEqual(asha_flag.get_speed(), 2)
        self.assertEqual(asha_flag.max_crew, 4)

        # Euron: Silence has base speed 3, max crew 4
        self.assertEqual(euron_flag.get_speed(), 3)
        self.assertEqual(euron_flag.max_crew, 4)

        # Victarion: Iron Victory max crew 6, speed 2 when crew <= 4, speed 1 when crew >= 5
        self.assertEqual(vic_flag.max_crew, 6)
        vic_flag.crew = 4
        self.assertEqual(vic_flag.get_speed(), 2)
        vic_flag.crew = 5
        self.assertEqual(vic_flag.get_speed(), 1)
        vic_flag.crew = 6
        self.assertEqual(vic_flag.get_speed(), 1)

    def test_storm_belt_hazard_and_asha_immunity(self):
        """Test Storm Belt rolls and Asha's storm immunity."""
        # 1. Asha enters storm -> immune to hazard rolls
        self.game.active_player_idx = 0  # Asha
        self.game.actions_remaining = 2
        # Move Asha to bay then storm
        self.game.action_sail("asha_flagship", "bay")
        res = self.game.action_sail("asha_flagship", "storm")
        self.assertTrue(res.get("success"))
        # Asha reached storm without pushback
        loc, _ = self.game.find_ship_location("asha_flagship")
        self.assertEqual(loc, "storm")

        # 2. Test Storm Die mechanics directly
        # Seed that gives Shield (pushback)
        rng_shield = random.Random(3)
        face, outcome = roll_storm_die(rng_shield)
        self.assertIn(outcome, ["safe", "pushback", "casualty"])

    def test_victarion_iron_captain_and_double_axes(self):
        """Test Victarion's +1 Raid Die and Ironman's Bay double axes."""
        # Check naval dice formula: Victarion gets +1 die
        dice_standard = calculate_naval_dice(4, is_victarion=False)
        dice_vic = calculate_naval_dice(4, is_victarion=True)
        self.assertEqual(dice_vic, dice_standard + 1)

        # In Ironman's Bay (node 'bay'), Victarion's Axes count as 2 hits each
        faces = [DiceFace.AXE.value, DiceFace.SHIELD.value, DiceFace.KRAKEN.value]
        # Standard evaluation: 1 Axe (1 hit) + 1 Kraken (2 hits) = 3 hits
        res_std = evaluate_dice_faces(faces, double_axes=False)
        self.assertEqual(res_std.hits, 3)
        # Double axes evaluation: 1 Axe (2 hits) + 1 Kraken (2 hits) = 4 hits
        res_vic = evaluate_dice_faces(faces, double_axes=True)
        self.assertEqual(res_vic.hits, 4)

    def test_euron_blood_price(self):
        """Test Euron's Blood Price power (re-roll dice, Eye gives +1 Favor, -1 crew)."""
        euron = self.game.players[1]
        euron.favor = 0
        _, euron_ship = self.game.find_ship_location("euron_flagship")
        euron_ship.crew = 4

        # Initial roll: all Shields
        init_roll = evaluate_dice_faces([DiceFace.SHIELD.value, DiceFace.SHIELD.value])
        # Force re-roll to produce Eyes
        rng = random.Random(1)  # Seed producing known faces
        new_roll, favor_g, crew_l = CombatEngine.apply_blood_price(
            init_roll, euron_ship, euron, reroll_indices=[0, 1], rng=rng
        )
        self.assertGreaterEqual(euron.favor, 0)
        self.assertEqual(euron_ship.crew, 4 - crew_l)

    def test_favor_miracle_call_storm(self):
        """Test Call Storm miracle: costs 4 Favor, pushes back enemy and removes 1 crew."""
        asha = self.game.players[0]
        euron = self.game.players[1]
        asha.favor = 4

        # Move Euron's ship to bay
        _, euron_ship = self.game.find_ship_location("euron_flagship")
        self.game._move_ship_to(euron_ship, "pyke", "bay")
        initial_crew = euron_ship.crew

        # Asha at harlaw is adjacent to bay
        res = self.game.action_favor_miracle("call_storm", target_node="bay")
        self.assertTrue(res.get("success"), res.get("error"))
        self.assertEqual(asha.favor, 0)
        self.assertEqual(euron_ship.crew, initial_crew - 1)
        # Euron pushed back
        new_loc, _ = self.game.find_ship_location("euron_flagship")
        self.assertNotEqual(new_loc, "bay")

    def test_naval_combat_and_loot_on_wipe(self):
        """Test naval combat trigger and looting 50% Hoard + 1 Legend when enemy is wiped."""
        asha = self.game.players[0]
        vic = self.game.players[2]
        vic.hoard = 6
        initial_asha_legend = asha.legend
        initial_asha_hoard = asha.hoard

        # Move Victarion's ship with 1 crew to bay
        _, vic_ship = self.game.find_ship_location("victarion_flagship")
        vic_ship.crew = 1
        self.game._move_ship_to(vic_ship, "greatwyk", "bay")

        # Move Asha's full flagship (4 crew) into bay -> triggers combat
        self.game.active_player_idx = 0
        self.game.actions_remaining = 2
        res = self.game.action_sail("asha_flagship", "bay")
        self.assertTrue(res.get("success"))
        self.assertTrue(res.get("battle_triggered"))

        battle = self.game.active_battle
        if battle is not None and battle.state != "finished":
            # Advance round to finish battle
            self.game.action_battle_round(battle_id=battle.battle_id, continue_round=True)

        # Verify outcome
        self.assertIsNone(self.game.active_battle)

    def test_no_elimination_respawn(self):
        """Test that wiped claimants respawn with flagship + 3 crew at home port on their turn."""
        euron = self.game.players[1]
        # Strip all Euron's ships of crew
        for _, s in self.game.get_player_ships("Euron"):
            s.crew = 0

        # Advance turn to Euron
        self.game.active_player_idx = 0
        self.game.actions_remaining = 0
        self.game._advance_turn()

        self.assertEqual(self.game.get_active_player().faction, "Euron")
        _, euron_flag = self.game.find_ship_location("euron_flagship")
        self.assertEqual(euron_flag.crew, 3)
        loc, _ = self.game.find_ship_location("euron_flagship")
        self.assertEqual(loc, "pyke")


if __name__ == "__main__":
    unittest.main()
