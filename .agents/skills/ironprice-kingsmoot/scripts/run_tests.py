#!/usr/bin/env python3
"""
Helper script: Run all automated unit and integration tests for IRON PRICE: Kingsmoot.
Usage: python .agents/skills/ironprice-kingsmoot/scripts/run_tests.py
"""

import sys
import unittest
import time
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


def main():
    print("=" * 60)
    print("⚔️  IRON PRICE: Kingsmoot — Automated Test Suite Runner")
    print(f"📁 Project Root: {PROJECT_ROOT}")
    print("=" * 60)

    loader = unittest.TestLoader()
    suite = loader.discover(str(PROJECT_ROOT / "tests"), pattern="test_*.py")

    start_time = time.time()
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    elapsed = time.time() - start_time

    print("-" * 60)
    print(f"Total Tests Run : {result.testsRun}")
    print(f"Failures        : {len(result.failures)}")
    print(f"Errors          : {len(result.errors)}")
    print(f"Skipped         : {len(result.skipped)}")
    print(f"Time Elapsed    : {elapsed:.3f}s")
    print("-" * 60)

    if result.wasSuccessful():
        print("✅ ALL TESTS PASSED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("❌ TEST SUITE FAILED!")
        sys.exit(1)


if __name__ == "__main__":
    main()
