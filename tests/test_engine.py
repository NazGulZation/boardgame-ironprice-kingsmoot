"""IRON PRICE: Kingsmoot — Unit Test Suite (Phase 1 Engine)"""
import unittest
import random
from engine.models import FactionType, DiceFace, NodeKind
from engine.dice import roll_dice_pool, calculate_crew_dice
from engine.map_engine import MapEngine
from engine.combat import CombatEngine
from engine.game_state import GameStateManager
from engine.ai import SimpleAI


class TestPhase1Engine(unittest.TestCase):
    def setUp(self):
        self.map_engine = MapEngine()
        self.game = GameStateManager(map_engine=self.map_engine, max_seasons=3)

    def test_map_loading(self):
        """Verify all 22 nodes and 27 edges load properly."""
        self.assertEqual(len(self.game.nodes), 22)
        # Check specific key nodes
        self.assertIn("pyke", self.game.nodes)
        self.assertIn("shield", self.game.nodes)
        self.assertIn("bay", self.game.nodes)
        self.assertEqual(self.game.nodes["pyke"].kind, "isle")
        self.assertEqual(self.game.nodes["bay"].kind, "sea")
        self.assertEqual(self.game.nodes["shield"].kind, "land")
        self.assertEqual(self.game.nodes["shield"].defense, 2)
        self.assertEqual(self.game.nodes["shield"].hoard, 2)
        self.assertEqual(self.game.nodes["shield"].legend, 1)

    def test_dice_mechanics(self):
        """Verify dice rolling and calculation."""
        # 4 crew -> 2 dice
        self.assertEqual(calculate_crew_dice(4), 2)
        # 1 crew -> 1 die
        self.assertEqual(calculate_crew_dice(1), 1)
        # 6 crew -> 3 dice
        self.assertEqual(calculate_crew_dice(6), 3)

        # Deterministic seed test
        rng = random.Random(42)
        res = roll_dice_pool(6, rng=rng)
        self.assertEqual(len(res.dice), 6)
        self.assertGreaterEqual(res.hits, 0)
        self.assertGreaterEqual(res.blocks, 0)
        self.assertGreaterEqual(res.eyes, 0)

    def test_initial_setup(self):
        """Verify 3 claimants starting state."""
        self.assertEqual(len(self.game.players), 3)
        asha = self.game.players[0]
        euron = self.game.players[1]
        vic = self.game.players[2]

        self.assertEqual(asha.faction, "Asha")
        self.assertEqual(asha.hoard, 5)
        self.assertEqual(asha.legend, 0)
        self.assertEqual(len(self.game.nodes["harlaw"].occupants), 3)

        self.assertEqual(euron.faction, "Euron")
        self.assertEqual(len(self.game.nodes["pyke"].occupants), 3)

        self.assertEqual(vic.faction, "Victarion")
        self.assertEqual(len(self.game.nodes["greatwyk"].occupants), 3)

    def test_movement_and_actions(self):
        """Verify movement along routes."""
        # Active player is Asha (at Harlaw)
        self.assertEqual(self.game.get_active_player().faction, "Asha")
        self.assertEqual(self.game.actions_remaining, 2)

        # Sail from Harlaw -> bay (reachable with speed 1-2)
        res = self.game.action_sail("asha_flagship", "bay")
        self.assertTrue(res.get("success"), res.get("error"))
        self.assertEqual(self.game.actions_remaining, 1)
        
        # Verify ship position
        node_id, ship = self.game.find_ship_location("asha_flagship")
        self.assertEqual(node_id, "bay")

    def test_muster_action(self):
        """Verify crew muster at home ports."""
        active = self.game.get_active_player()
        initial_hoard = active.hoard
        
        # Asha flagship has 4 crew, Asha Reaver 1 has 0 crew at Harlaw
        # Muster at Harlaw for Asha (costs 3 hoard)
        res = self.game.action_muster("harlaw", ship_id="asha_flagship")
        self.assertTrue(res.get("success"))
        self.assertEqual(active.hoard, initial_hoard - 3)
        # Verify overflow went to Asha Reaver 1
        reaver1 = next(s for s in self.game.nodes["harlaw"].occupants if s.id == "asha_reaver1")
        self.assertEqual(reaver1.crew, 3)

    def test_muster_blocked_when_all_full(self):
        """Verify muster is rejected and hoard is preserved when all ships at port are full."""
        active = self.game.get_active_player()
        initial_hoard = active.hoard
        # Fill all ships at Harlaw to 4
        for s in self.game.nodes["harlaw"].occupants:
            s.crew = s.max_crew

        res = self.game.action_muster("harlaw")
        self.assertFalse(res.get("success"))
        self.assertIn("full", res.get("error", "").lower())
        # Hoard must NOT be deducted
        self.assertEqual(active.hoard, initial_hoard)

    def test_reave_and_combat(self):
        """Verify green land reaving."""
        # Move Asha's ship to seaS
        self.game.action_sail("asha_flagship", "bay")
        self.game.action_sail("asha_flagship", "seaS")

        # Now active player switched because 2 actions used
        # Force Asha back to active for testing
        self.game.active_player_idx = 0
        self.game.actions_remaining = 2

        # Reave Shield Isles from seaS
        res = self.game.action_reave("asha_flagship", "shield")
        self.assertTrue(res.get("success"), res.get("error"))
        outcome = res["outcome"]
        self.assertIn("success", outcome)
        self.assertIn("attacker_roll", outcome)

    def test_sea_south_and_storm_raid_targets(self):
        """Verify Sunset Sea S can raid Fair Isle, Banefort, Flint's Finger, Shield, Oldtown, and Arbor."""
        neighbors_seaS = self.map_engine.get_neighbors("seaS")
        self.assertIn("fair", neighbors_seaS)
        self.assertIn("banefort", neighbors_seaS)
        self.assertIn("flint", neighbors_seaS)
        self.assertIn("shield", neighbors_seaS)
        self.assertIn("oldtown", neighbors_seaS)
        self.assertIn("arbor", neighbors_seaS)

        neighbors_storm = self.map_engine.get_neighbors("storm")
        self.assertIn("fair", neighbors_storm)
        self.assertIn("banefort", neighbors_storm)
        self.assertIn("flint", neighbors_storm)

    def test_full_season_and_ai_cycle(self):
        """Run simulated game steps with SimpleAI."""
        game = GameStateManager(max_seasons=2)
        # Set all players to AI for headless simulation
        for p in game.players:
            p.is_ai = True

        steps = 0
        max_steps = 200
        while not game.game_over and steps < max_steps:
            SimpleAI.step(game)
            steps += 1

        self.assertTrue(game.game_over, "Game should complete within seasons limit.")
        self.assertIsNotNone(game.winner)
        self.assertIn(game.winner, ["Asha", "Euron", "Victarion"])


if __name__ == "__main__":
    unittest.main()
