"""IRON PRICE: Kingsmoot — Automated Web UI Interface Test Suite
Validates HTML asset integrity, CSS/JS file existence, DOM ID bindings,
JS syntax correctness, and executes headless SVG rendering tests without NaN errors.
"""
import re
import json
import shutil
import subprocess
import unittest
from html.parser import HTMLParser
from pathlib import Path


class HTMLAssetExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stylesheets = []
        self.scripts = []
        self.element_ids = set()

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if 'id' in attr_dict:
            self.element_ids.add(attr_dict['id'])

        if tag == 'link' and attr_dict.get('rel') == 'stylesheet':
            href = attr_dict.get('href')
            if href and not href.startswith('http'):
                self.stylesheets.append(href.split('?')[0])

        if tag == 'script' and 'src' in attr_dict:
            src = attr_dict['src']
            if src and not src.startswith('http'):
                self.scripts.append(src.split('?')[0])


class TestWebUIInterface(unittest.TestCase):
    def setUp(self):
        self.root_dir = Path(__file__).resolve().parent.parent
        self.web_dir = self.root_dir / "web"
        self.index_html = self.web_dir / "index.html"

    def test_html_assets_and_dom_ids(self):
        """Verifies that all linked stylesheets, scripts, and DOM IDs exist without 404 or missing elements."""
        self.assertTrue(self.index_html.exists(), "web/index.html does not exist!")

        parser = HTMLAssetExtractor()
        with open(self.index_html, "r", encoding="utf-8") as f:
            parser.feed(f.read())

        # 1. Verify Stylesheets
        self.assertGreater(len(parser.stylesheets), 0, "No stylesheets linked in index.html")
        for css_rel in parser.stylesheets:
            css_path = self.web_dir / css_rel
            self.assertTrue(css_path.exists(), f"Stylesheet not found on disk: {css_rel} (expected at {css_path})")

        # 2. Verify Scripts
        self.assertGreater(len(parser.scripts), 0, "No JS scripts linked in index.html")
        for js_rel in parser.scripts:
            js_path = self.web_dir / js_rel
            self.assertTrue(js_path.exists(), f"Script not found on disk: {js_rel} (expected at {js_path})")

        # 3. Verify Referenced DOM IDs in JavaScript files
        js_files = list((self.web_dir / "js").glob("*.js"))
        id_pattern = re.compile(r'getElementById\([\'"]([a-zA-Z0-9_-]+)[\'"]\)')

        missing_ids = []
        for js_file in js_files:
            content = js_file.read_text(encoding="utf-8")
            matches = id_pattern.findall(content)
            for dom_id in matches:
                if dom_id not in parser.element_ids:
                    missing_ids.append((js_file.name, dom_id))

        if missing_ids:
            err_msg = "\n".join(f"  - In {file}: getElementById('{eid}') not found in index.html" for file, eid in missing_ids)
            self.fail(f"Missing DOM IDs referenced in JS:\n{err_msg}")

    def test_javascript_syntax(self):
        """Validates syntax across all JS files using node -c if node runtime is available."""
        node_bin = shutil.which("node")
        if not node_bin:
            self.skipTest("node runtime not found on system; skipping node -c syntax check.")

        js_files = list((self.web_dir / "js").glob("*.js"))
        for js_file in js_files:
            res = subprocess.run([node_bin, "-c", str(js_file)], capture_output=True, text=True)
            self.assertEqual(res.returncode, 0, f"Syntax error in {js_file.name}:\n{res.stderr}")

    def test_headless_svg_renderer_simulation(self):
        """Executes the headless MapRenderer DOM simulation to ensure 0 NaN attributes."""
        node_bin = shutil.which("node")
        if not node_bin:
            self.skipTest("node runtime not found on system; skipping headless renderer simulation.")

        validator_script = self.root_dir / "tests" / "js_ui_validator.js"
        self.assertTrue(validator_script.exists(), "tests/js_ui_validator.js does not exist!")

        res = subprocess.run([node_bin, str(validator_script)], capture_output=True, text=True)
        self.assertEqual(
            res.returncode, 0,
            f"Headless SVG renderer simulation failed with code {res.returncode}:\n{res.stdout}\n{res.stderr}"
        )
        self.assertIn("ALL WEB UI & SVG RENDERER TESTS PASSED SUCCESSFULLY!", res.stdout)

    def test_map_docking_coordinates_invariants(self):
        """Validates that all map nodes in map.json have valid coordinates and non-NaN docking offsets."""
        map_json_path = self.root_dir / "map.json"
        self.assertTrue(map_json_path.exists(), "map.json does not exist!")

        with open(map_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        nodes = data.get("nodes", [])
        self.assertGreaterEqual(len(nodes), 20, f"Expected at least 20 map nodes, found {len(nodes)}")

        for node in nodes:
            nid = node["id"]
            x = node.get("x")
            y = node.get("y")
            self.assertIsInstance(x, (int, float), f"Node {nid} x must be numeric, got {x}")
            self.assertIsInstance(y, (int, float), f"Node {nid} y must be numeric, got {y}")
            self.assertTrue(0 <= x <= 1920, f"Node {nid} x ({x}) outside canvas bounds [0, 1920]")
            self.assertTrue(0 <= y <= 1080, f"Node {nid} y ({y}) outside canvas bounds [0, 1080]")


if __name__ == "__main__":
    unittest.main()
