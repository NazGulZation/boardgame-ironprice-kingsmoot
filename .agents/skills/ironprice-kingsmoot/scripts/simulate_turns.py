#!/usr/bin/env python3
"""
Helper script: Simulate headless AI games to verify state invariants, rules balance, and win conditions.
Usage: python .agents/skills/ironprice-kingsmoot/scripts/simulate_turns.py [--games N] [--seasons N]
"""

import sys
import argparse
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from engine.game_state import GameStateManager
from engine.ai import SimpleAI


def verify_invariants(game: GameStateManager, step_num: int):
    """Assert game rules invariants remain unbroken at all times."""
    for p in game.players:
        assert p.hoard >= 0, f"Step {step_num}: Player {p.faction} has negative hoard ({p.hoard})!"
        assert p.reserve_crew >= 0, f"Step {step_num}: Player {p.faction} has negative reserve crew!"

    for n_id, node in game.nodes.items():
        for ship in node.occupants:
            assert 0 <= ship.crew <= ship.max_crew, (
                f"Step {step_num}: Ship {ship.id} has invalid crew {ship.crew}/{ship.max_crew} at {n_id}!"
            )


def simulate_game(game_idx: int, seasons: int = 5, max_steps: int = 500):
    game = GameStateManager(max_seasons=seasons)
    for p in game.players:
        p.is_ai = True

    steps = 0
    while not game.game_over and steps < max_steps:
        verify_invariants(game, steps)
        SimpleAI.step(game)
        steps += 1

    verify_invariants(game, steps)
    assert game.game_over, f"Game {game_idx} did not conclude within {max_steps} steps!"
    assert game.winner in ["Asha", "Euron", "Victarion"], f"Game {game_idx} had invalid winner: {game.winner}"

    return {
        "game": game_idx,
        "steps": steps,
        "winner": game.winner,
        "scores": {p.faction: (p.legend * 2 + p.hoard + p.favor * 1.5) for p in game.players},
        "stats": {p.faction: {"hoard": p.hoard, "legend": p.legend, "raids": p.successful_raids} for p in game.players}
    }


def main():
    parser = argparse.ArgumentParser(description="Run headless Iron Price game simulations.")
    parser.add_argument("--games", type=int, default=5, help="Number of full games to simulate (default: 5)")
    parser.add_argument("--seasons", type=int, default=5, help="Seasons per game (default: 5)")
    args = parser.parse_args()

    print("=" * 60)
    print(f"⚔️  IRON PRICE: Kingsmoot — Headless Game Simulator")
    print(f"Simulating {args.games} game(s) with {args.seasons} seasons each...")
    print("=" * 60)

    win_counts = {"Asha": 0, "Euron": 0, "Victarion": 0}
    total_steps = 0

    for i in range(1, args.games + 1):
        res = simulate_game(i, seasons=args.seasons)
        win_counts[res["winner"]] += 1
        total_steps += res["steps"]
        print(f"Game #{i:02d}: Winner = {res['winner']:<10} | Steps = {res['steps']} | Scores = {res['scores']}")

    print("-" * 60)
    print("Simulation Summary:")
    print(f"  Asha Victories      : {win_counts['Asha']} ({win_counts['Asha']/args.games*100:.1f}%)")
    print(f"  Euron Victories     : {win_counts['Euron']} ({win_counts['Euron']/args.games*100:.1f}%)")
    print(f"  Victarion Victories : {win_counts['Victarion']} ({win_counts['Victarion']/args.games*100:.1f}%)")
    print(f"  Avg Steps per Game  : {total_steps / args.games:.1f}")
    print("=" * 60)
    print("✅ All state invariants verified without errors!")


if __name__ == "__main__":
    main()
