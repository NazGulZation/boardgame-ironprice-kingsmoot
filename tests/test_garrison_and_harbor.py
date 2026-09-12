"""IRON PRICE: Kingsmoot — Unit Tests for Settlement Garrison Attrition & Harbor Flagship Crew"""
import unittest
from engine.game_state import GameStateManager
from engine.combat import CombatEngine
from engine.models import Ship, PlayerState, MapNode, DiceFace, NodeKind
from engine.dice import RollResult


class MockHitsRNG:
    """Mock RNG to control combat rolls deterministically."""
    def __init__(self, face=DiceFace.AXE.value):
        self.face = face

    def choice(self, seq):
        return self.face


class TestSettlementGarrisonAttrition(unittest.TestCase):
    def setUp(self):
        self.game = GameStateManager(max_seasons=3)

    def test_failed_raid_with_net_hits_reduces_guard(self):
        """When a raid fails but net_attacker_hits > 0, target settlement defense is reduced."""
        # Move Asha's flagship to seaS so it's adjacent to shield (defense 2)
        self.game.nodes["harlaw"].occupants.clear()
        flag = Ship(id="asha_flagship", faction="Asha", is_flagship=True, crew=1)
        self.game.nodes["seaS"].occupants.append(flag)

        target = self.game.nodes["shield"]
        orig_defense = target.defense
        self.assertEqual(orig_defense, 2)
        self.assertEqual(target.max_defense, 2)

        # Attacker rolls 1 hit (AXE), Defender rolls 0 blocks (AXE, AXE -> hits)
        # Net att hits = 1, required defense = 2. 1 < 2 -> repelled.
        # Defense should be reduced by 1 -> new defense 1.
        self.game.rng = MockHitsRNG(DiceFace.AXE.value)
        res = self.game.action_reave("asha_flagship", "shield")
        self.assertTrue(res.get("success"), res.get("error"))

        outcome = res["outcome"]
        self.assertFalse(outcome["success"])
        self.assertEqual(outcome["net_attacker_hits"], 1)
        self.assertEqual(outcome["guard_lost"], 1)
        self.assertEqual(outcome["new_defense"], 1)
        self.assertEqual(target.defense, 1)

    def test_failed_raid_with_zero_net_hits_does_not_reduce_guard(self):
        """When net_attacker_hits == 0 (e.g. all blocked), guard is not reduced."""
        self.game.nodes["harlaw"].occupants.clear()
        flag = Ship(id="asha_flagship", faction="Asha", is_flagship=True, crew=1)
        self.game.nodes["seaS"].occupants.append(flag)

        target = self.game.nodes["shield"]
        orig_defense = target.defense

        # Force attacker to roll EYE (0 hits), defender rolls SHIELD
        # net_att_hits = 0 -> guard_lost = 0
        class ZeroHitsRNG:
            def __init__(self):
                self.calls = 0

            def choice(self, seq):
                self.calls += 1
                # Attacker roll (call 1): Eye
                if self.calls == 1:
                    return DiceFace.EYE.value
                return DiceFace.SHIELD.value

        self.game.rng = ZeroHitsRNG()
        res = self.game.action_reave("asha_flagship", "shield")
        self.assertTrue(res.get("success"))

        outcome = res["outcome"]
        self.assertFalse(outcome["success"])
        self.assertEqual(outcome["net_attacker_hits"], 0)
        self.assertEqual(outcome["guard_lost"], 0)
        self.assertEqual(target.defense, orig_defense)

    def test_chipped_guard_makes_subsequent_raid_succeed(self):
        """A settlement weakened from 2 to 1 defense can be sacked by a single hit next raid."""
        self.game.nodes["harlaw"].occupants.clear()
        flag = Ship(id="asha_flagship", faction="Asha", is_flagship=True, crew=2)
        self.game.nodes["seaS"].occupants.append(flag)

        target = self.game.nodes["shield"]
        target.defense = 1  # Pre-weakened from prior raid attrition

        # Attacker rolls AXE (1 hit), defender rolls Eye (0 blocks)
        # Net att hits = 1 >= target.defense (1) -> success!
        self.game.rng = MockHitsRNG(DiceFace.AXE.value)
        res = self.game.action_reave("asha_flagship", "shield")
        self.assertTrue(res.get("success"))

        outcome = res["outcome"]
        self.assertTrue(outcome["success"])
        self.assertTrue(target.is_burned)

    def test_seasonal_replenishment_restores_guard(self):
        """At start of next season, all depleted settlement defenses replenish to max_defense."""
        target = self.game.nodes["shield"]
        target.defense = 1  # Weakened
        self.assertEqual(target.max_defense, 2)

        # Trigger season end
        self.game._resolve_season_end()

        # Guard restored
        self.assertEqual(target.defense, target.max_defense)
        self.assertEqual(target.defense, 2)


class TestHarborFlagshipFreeCrew(unittest.TestCase):
    def setUp(self):
        self.game = GameStateManager(max_seasons=3)

    def test_flagship_at_harbor_gains_free_crew_if_lte_3(self):
        """Flagship ending turn at harbor with <= 3 crew gains 1 free crew."""
        flag = next(s for _, s in self.game.get_player_ships("Asha") if s.is_flagship)
        flag.crew = 2  # <= 3
        curr_loc, _ = self.game.find_ship_location(flag.id)
        self.assertEqual(curr_loc, "harlaw")
        self.assertEqual(self.game.nodes[curr_loc].kind, NodeKind.ISLE.value)

        # Asha ends turn
        res = self.game.action_end_turn()
        self.assertTrue(res.get("success"))

        # Asha's flagship gained 1 crew (2 -> 3)
        self.assertEqual(flag.crew, 3)

    def test_flagship_at_harbor_at_4_crew_gains_no_free_crew(self):
        """Flagship ending turn with 4 crew does not exceed 4 from passive harbor crew."""
        flag = next(s for _, s in self.game.get_player_ships("Asha") if s.is_flagship)
        flag.crew = 4  # Not <= 3

        res = self.game.action_end_turn()
        self.assertTrue(res.get("success"))
        self.assertEqual(flag.crew, 4)

    def test_flagship_at_sea_gains_no_free_crew(self):
        """Flagship ending turn at sea (not harbor) does not gain free crew."""
        # Move Asha's flagship to Ironman's Bay (sea)
        self.game.nodes["harlaw"].occupants.clear()
        flag = Ship(id="asha_flagship", faction="Asha", is_flagship=True, crew=2)
        self.game.nodes["bay"].occupants.append(flag)

        res = self.game.action_end_turn()
        self.assertTrue(res.get("success"))
        self.assertEqual(flag.crew, 2)

    def test_reaver_longship_at_harbor_does_not_gain_free_crew(self):
        """Standard non-flagship longships do not gain free crew at harbor."""
        reaver = next(s for _, s in self.game.get_player_ships("Asha") if not s.is_flagship)
        reaver.crew = 1

        flag = next(s for _, s in self.game.get_player_ships("Asha") if s.is_flagship)
        flag.crew = 4  # Flagship full so only reaver has <= 3

        res = self.game.action_end_turn()
        self.assertTrue(res.get("success"))
        self.assertEqual(reaver.crew, 1)


if __name__ == "__main__":
    unittest.main()
