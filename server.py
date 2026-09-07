#!/usr/bin/env python3
"""
IRON PRICE: Kingsmoot — Web Server (Phase 1)
Pure Python 3 zero-dependency HTTP server & REST API.
"""
import sys
import json
import mimetypes
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from engine.game_state import GameStateManager
from engine.ai import SimpleAI
from engine.map_engine import MapEngine

BASE_DIR = Path(__file__).parent
WEB_DIR = BASE_DIR / "web"

# Global game state instance
CURRENT_GAME = GameStateManager()


class KingsmootHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        
        # API Endpoints
        if parsed.path == "/api/state":
            self._send_json(CURRENT_GAME.to_dict())
            return
        
        if parsed.path == "/api/map_data":
            with open(BASE_DIR / "map.json", "r", encoding="utf-8") as f:
                data = json.load(f)
            self._send_json(data)
            return

        # Static assets
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            payload = json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            payload = {}

        if parsed.path == "/api/new_game":
            global CURRENT_GAME
            max_seasons = payload.get("max_seasons", 5)
            ai_factions = payload.get("ai_factions", ["Euron", "Victarion"])
            
            CURRENT_GAME = GameStateManager(max_seasons=max_seasons)
            for p in CURRENT_GAME.players:
                p.is_ai = (p.faction in ai_factions)

            self._send_json({
                "success": True,
                "message": "New game started",
                "state": CURRENT_GAME.to_dict()
            })
            return

        if parsed.path == "/api/action":
            action_type = payload.get("action_type")
            res = {"success": False, "error": f"Unknown action: {action_type}"}

            if action_type == "sail":
                ship_id = payload.get("ship_id")
                target_node = payload.get("target_node")
                res = CURRENT_GAME.action_sail(ship_id, target_node)

            elif action_type == "muster":
                node_id = payload.get("node_id")
                ship_id = payload.get("ship_id")
                res = CURRENT_GAME.action_muster(node_id, ship_id)

            elif action_type == "reave":
                ship_id = payload.get("ship_id")
                target_land_id = payload.get("target_land_id")
                res = CURRENT_GAME.action_reave(ship_id, target_land_id)

            elif action_type == "pray":
                res = CURRENT_GAME.action_pray()

            elif action_type == "end_turn":
                res = CURRENT_GAME.action_end_turn()

            res["state"] = CURRENT_GAME.to_dict()
            self._send_json(res)
            return

        if parsed.path == "/api/ai_step":
            res = SimpleAI.step(CURRENT_GAME)
            res["state"] = CURRENT_GAME.to_dict()
            self._send_json(res)
            return

        self.send_error(404, "Endpoint not found")

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _send_json(self, data: dict, status: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


def run_server(port: int = 8000):
    server_address = ("", port)
    httpd = HTTPServer(server_address, KingsmootHandler)
    print(f"==================================================")
    print(f" IRON PRICE: Kingsmoot — Server Running!")
    print(f" URL: http://localhost:{port}")
    print(f" Press Ctrl+C to stop the server.")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
