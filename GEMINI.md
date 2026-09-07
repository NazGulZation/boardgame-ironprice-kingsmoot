# Project Rules — IRON PRICE: Kingsmoot

## 1. Architectural Constraints
- **Zero External Python Dependencies**: Use only Python 3.10+ standard library.
- **Pure Vanilla Web Stack**: Vanilla HTML5, CSS3, ES6 JavaScript with SVG 1.1 graphics. No bundlers or npm dependencies.
- **Strict 700-Line Quota**: No file in the repository may exceed **700 lines**. If any file exceeds this quota, refactor and modularize it into focused submodules. Verified by `tests/test_file_size.py`.
- **Browser Cache Busting**: Whenever modifying CSS or JS in `web/`, bump version query strings in `web/index.html`.
- **Interaction Model**: Left-click to inspect/select; right-click for direct tactical execution (Sail / Reave).
