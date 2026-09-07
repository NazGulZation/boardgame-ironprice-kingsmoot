---
title: Strict 700-Line File Size Quota
description: Enforce a strict maximum limit of 700 lines per file across all codebase assets to prevent bloat.
trigger: always_on
---

# Strict 700-Line File Size Quota Rule

To ensure code maintainability, clean architectural modularity, and prevent bloat, all files in this project must strictly comply with the **700-line quota**.

## 1. Rule Definition
- **Maximum Lines**: No file in the repository (Python, JavaScript, CSS, HTML, JSON, Markdown, etc.) may exceed **700 lines**.
- **Scope**: All project files, excluding ignored runtime artifacts (`logs/`, `__pycache__/`, `.git/`) and binary media assets (`.png`, `.jpg`, `.pdf`).

## 2. Refactoring Protocol When Exceeding Quota
If a file exceeds or approaches 700 lines:
1. **Never allow or bypass the quota**: Do not compress code into unreadable one-liners or delete needed functionality.
2. **Modularize & Decouple**:
   - For **Python backend** (`engine/`): Split out domain subsystems into dedicated modules (e.g., `battle_manager.py`, `combat.py`, `map_engine.py`, `dice.py`). Maintain clean delegation from facade managers.
   - For **Frontend Web UI** (`web/js/`): Split complex renderers into builder and animator controllers (e.g., `map_renderer.js`, `map_builder.js`, `map_animator.js`).
   - For **Stylesheets** (`web/css/`): Separate concerns into focused CSS stylesheets (e.g., `style.css`, `panels.css`, `modals.css`, `battle.css`, `animations.css`).
   - For **Data files** (`*.json`): Use compact per-record formatting or split into data modules.

## 3. Automated Validation
- Every modification must pass the automated line quota test suite:
  ```powershell
  python -m unittest tests/test_file_size.py
  ```
- Any commit or PR containing a file with > 700 lines will fail automated testing.
