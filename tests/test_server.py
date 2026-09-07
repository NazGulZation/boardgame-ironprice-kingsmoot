"""IRON PRICE: Kingsmoot — Server and API Integration Tests"""
import unittest
import threading
import time
import urllib.request
import json
from server import run_server
from http.server import HTTPServer
from server import KingsmootHandler


class TestServerIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.port = 8765
        cls.httpd = HTTPServer(("", cls.port), KingsmootHandler)
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.server_thread.start()
        time.sleep(0.2)

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def test_get_index(self):
        """Test serving HTML index."""
        url = f"http://localhost:{self.port}/index.html"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.status, 200)
            content = response.read().decode("utf-8")
            self.assertIn("IRON PRICE", content)

    def test_get_state(self):
        """Test GET /api/state."""
        url = f"http://localhost:{self.port}/api/state"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.status, 200)
            data = json.loads(response.read().decode("utf-8"))
            self.assertIn("season", data)
            self.assertIn("players", data)
            self.assertEqual(len(data["players"]), 3)
            self.assertIn("nodes", data)

    def test_action_and_new_game(self):
        """Test POST /api/new_game and POST /api/action."""
        # Start new game
        url = f"http://localhost:{self.port}/api/new_game"
        body = json.dumps({"max_seasons": 3, "ai_factions": ["Euron", "Victarion"]}).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.status, 200)
            data = json.loads(response.read().decode("utf-8"))
            self.assertTrue(data["success"])

        # Execute Sail
        url = f"http://localhost:{self.port}/api/action"
        body = json.dumps({
            "action_type": "sail",
            "ship_id": "asha_flagship",
            "target_node": "bay"
        }).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.status, 200)
            data = json.loads(response.read().decode("utf-8"))
            self.assertTrue(data["success"])
            self.assertEqual(data["state"]["actions_remaining"], 1)

        # Execute Pray
        body = json.dumps({"action_type": "pray"}).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as response:
            self.assertEqual(response.status, 200)
            data = json.loads(response.read().decode("utf-8"))
            self.assertTrue(data["success"])


if __name__ == "__main__":
    unittest.main()
