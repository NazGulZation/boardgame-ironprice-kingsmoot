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

    def _asha_ships(self):
        ships = {s.id: s for _, s in self.game.get_player_ships("Asha")}
        return ships["asha_flagship"], ships["asha_reaver1"], ships["asha_reaver2"]

    def _advance_into_asha_turn(self):
        """Ends Victarion's turn so Asha's turn (and harbor recovery) starts."""
        self.game.active_player_idx = 2  # Victarion
        self.game.actions_remaining = 2
        res = self.game.action_end_turn()
        self.assertTrue(res.get("success"))
        self.assertEqual(self.game.get_active_player().faction, "Asha")
        return res

    def test_flagship_has_priority_over_reaver(self):
        """Flagship below max takes the single +1 even when a reaver also needs crew."""
        flag, reaver1, _ = self._asha_ships()
        flag.crew = 2
        reaver1.crew = 1
        self.assertEqual(self.game.find_ship_location(flag.id)[0], "harlaw")

        self._advance_into_asha_turn()

        self.assertEqual(flag.crew, 3)
        self.assertEqual(reaver1.crew, 1)

    def test_reaver_eligible_when_flagship_full(self):
        """A reaver at the home node gains +1 when the flagship needs nothing."""
        flag, reaver1, _ = self._asha_ships()
        flag.crew = 4  # full
        reaver1.crew = 1

        self._advance_into_asha_turn()
        self.assertEqual(flag.crew, 4)
        self.assertEqual(reaver1.crew, 2)

    def test_highest_crew_reaver_chosen(self):
        """Among reavers, the one with the highest crew is chosen."""
        flag, reaver1, reaver2 = self._asha_ships()
        flag.crew = 4  # full
        reaver1.crew = 1
        reaver2.crew = 2

        self._advance_into_asha_turn()
        self.assertEqual(reaver2.crew, 3)
        self.assertEqual(reaver1.crew, 1)

    def test_no_3_cap_harbor_can_reach_max(self):
        """Harbor bonus applies above 3 crew, capped only at max_crew."""
        flag, reaver1, reaver2 = self._asha_ships()
        flag.crew = 3
        reaver1.crew = 4  # full
        reaver2.crew = 4  # full

        self._advance_into_asha_turn()
        self.assertEqual(flag.crew, 4)

    def test_capped_at_max_crew(self):
        """Ships already at max_crew gain nothing (Victarion flagship 6/6)."""
        flag = next(s for _, s in self.game.get_player_ships("Victarion") if s.is_flagship)
        self.game.active_player_idx = 1  # Euron ends turn -> Victarion's turn starts
        self.game.actions_remaining = 2
        self.assertEqual(flag.crew, 4)
        flag.crew = 6
        for _, s in self.game.get_player_ships("Victarion"):
            if not s.is_flagship:
                s.crew = s.max_crew

        res = self.game.action_end_turn()
        self.assertTrue(res.get("success"))
        self.assertEqual(self.game.get_active_player().faction, "Victarion")
        self.assertEqual(flag.crew, 6)

    def test_only_own_home_node_counts(self):
        """A flagship on a foreign isle gains nothing; only its own home node counts."""
        flag, reaver1, reaver2 = self._asha_ships()
        # Home node full so nothing there can claim the bonus.
        reaver1.crew = 4
        reaver2.crew = 4
        flag.crew = 2
        self.game._move_ship_to(flag, "harlaw", "pyke")  # foreign isle harbor
        self.assertEqual(self.game.nodes["pyke"].kind, NodeKind.ISLE.value)

        self._advance_into_asha_turn()
        self.assertEqual(flag.crew, 2)

    def test_flagship_at_sea_gains_no_free_crew(self):
        """Flagship starting its turn at sea (not harbor) does not gain free crew."""
        # Move Asha's flagship to Ironman's Bay (sea)
        self.game.nodes["harlaw"].occupants.clear()
        flag = Ship(id="asha_flagship", faction="Asha", is_flagship=True, crew=2)
        self.game.nodes["bay"].occupants.append(flag)

        self._advance_into_asha_turn()
        self.assertEqual(flag.crew, 2)

    def test_harbor_recovery_payload_for_animation(self):
        """Turn start exposes last_harbor_recovery so the UI can play the +N floater."""
        flag, _, _ = self._asha_ships()
        flag.crew = 2

        self._advance_into_asha_turn()
        rec = self.game.to_dict()["last_harbor_recovery"]
        self.assertIsNotNone(rec)
        self.assertEqual(rec["ship_id"], "asha_flagship")
        self.assertEqual(rec["gained"], 1)
        self.assertEqual(rec["node_id"], "harlaw")
        self.assertEqual(rec["faction"], "Asha")

    def test_no_harbor_payload_when_nothing_eligible(self):
        """No payload when every home ship is already at max crew."""
        for _, s in self.game.get_player_ships("Asha"):
            s.crew = s.max_crew

        self._advance_into_asha_turn()
        self.assertIsNone(self.game.to_dict()["last_harbor_recovery"])

    def test_opening_round_has_no_recovery(self):
        """Turn 1 advances grant no harbor crew (fair opening for Asha)."""
        self.game.active_player_idx = 0  # Asha ends her opening turn
        self.game.actions_remaining = 2
        res = self.game.action_end_turn()
        self.assertTrue(res.get("success"))
        self.assertEqual(self.game.get_active_player().faction, "Euron")
        # Euron reavers sit empty at home but gain nothing on turn 1.
        for _, s in self.game.get_player_ships("Euron"):
            if not s.is_flagship:
                self.assertEqual(s.crew, 0)
        self.assertIsNone(self.game.to_dict()["last_harbor_recovery"])

    def test_opening_round_skips_victarion_too(self):
        """Euron ending turn 1 grants Victarion nothing either."""
        self.game.active_player_idx = 1  # Euron ends his opening turn
        self.game.actions_remaining = 2
        flag = next(s for _, s in self.game.get_player_ships("Victarion") if s.is_flagship)
        self.assertEqual(flag.crew, 4)

        res = self.game.action_end_turn()
        self.assertTrue(res.get("success"))
        self.assertEqual(self.game.get_active_player().faction, "Victarion")
        self.assertEqual(flag.crew, 4)
        self.assertIsNone(self.game.to_dict()["last_harbor_recovery"])


if __name__ == "__main__":
    unittest.main()
