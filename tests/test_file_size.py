"""IRON PRICE: Kingsmoot — Automated File Size & Line Limit Test Suite
Validates that NO file in the project exceeds 700 lines to prevent code bloat.
"""
import unittest
from pathlib import Path

MAX_ALLOWED_LINES = 700
IGNORED_DIRS = {
    ".git",
    "__pycache__",
    "logs",
    ".tempmediaStorage",
    ".user_uploaded",
    ".system_generated",
    ".gemini",
    "venv",
    ".venv"
}
IGNORED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".pdf",
    ".pyc",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf"
}


class TestFileSizeLimit(unittest.TestCase):
    def setUp(self):
        self.project_root = Path(__file__).resolve().parent.parent

    def test_no_file_exceeds_700_lines(self):
        """Ensures all source code, markup, styles, configs, and docs stay <= 700 lines."""
        violations = []
        scanned_count = 0

        for path in self.project_root.rglob("*"):
            if not path.is_file():
                continue

            # Check if any parent directory is in ignored dirs
            if any(part in IGNORED_DIRS for part in path.parts):
                continue

            if path.suffix.lower() in IGNORED_EXTENSIONS:
                continue

            scanned_count += 1
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    line_count = sum(1 for _ in f)
            except Exception as e:
                self.fail(f"Failed to read file {path}: {e}")

            if line_count > MAX_ALLOWED_LINES:
                rel_path = path.relative_to(self.project_root)
                violations.append((str(rel_path), line_count))

        self.assertGreater(scanned_count, 15, f"Expected to scan at least 15 files, but only scanned {scanned_count}")
        
        if violations:
            msg_lines = [
                f"\n❌ {len(violations)} file(s) exceeded the strict {MAX_ALLOWED_LINES}-line limit:"
            ]
            for rel_path, count in violations:
                msg_lines.append(f"  - {rel_path}: {count} lines (exceeds by {count - MAX_ALLOWED_LINES})")
            msg_lines.append(
                f"\nPlease refactor and modularize these files into clean submodules so that each file stays <= {MAX_ALLOWED_LINES} lines."
            )
            self.fail("\n".join(msg_lines))


if __name__ == "__main__":
    unittest.main()
