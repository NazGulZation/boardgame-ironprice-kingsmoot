#!/usr/bin/env python3
"""
IRON PRICE: Kingsmoot — Web Server (Phase 1)
Pure Python 3 zero-dependency HTTP server & REST API.
"""
import sys
import json
import mimetypes
import traceback
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from engine.game_state import GameStateManager
from engine.ai import SimpleAI
from engine.map_engine import MapEngine
from engine.logger import get_logger, get_recent_logs

logger = get_logger("server")

BASE_DIR = Path(__file__).parent
WEB_DIR = BASE_DIR / "web"

# Global game state instance
CURRENT_GAME = GameStateManager()


class KingsmootHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def log_message(self, format, *args):
        """Override to route HTTP access logs through ironprice logger."""
        msg = "%s - - [%s] %s" % (self.address_string(), self.log_date_time_string(), format % args)
        logger.info(msg)

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

        if parsed.path == "/api/logs":
            query = parse_qs(parsed.query)
            max_lines = 100
            if "lines" in query:
                try:
                    max_lines = int(query["lines"][0])
                except ValueError:
                    pass
            self._send_json({
                "success": True,
                "logs": get_recent_logs(max_lines)
            })
            return

        if parsed.path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
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

        try:
            if parsed.path == "/api/new_game":
                global CURRENT_GAME
                max_seasons = payload.get("max_seasons", 5)
                ai_factions = payload.get("ai_factions", ["Euron", "Victarion"])
                
                CURRENT_GAME = GameStateManager(max_seasons=max_seasons)
                for p in CURRENT_GAME.players:
                    p.is_ai = (p.faction in ai_factions)

                logger.info("New game started: max_seasons=%d, ai_factions=%s", max_seasons, ai_factions)
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

                elif action_type == "battle_round":
                    battle_id = payload.get("battle_id")
                    retreat = payload.get("retreat", False)
                    use_blood_price = payload.get("use_blood_price", False)
                    reroll_dice_indices = payload.get("reroll_dice_indices")
                    miracle_cost = payload.get("miracle_cost")
                    continue_round = payload.get("continue_round", False)
                    res = CURRENT_GAME.action_battle_round(
                        battle_id=battle_id,
                        retreat=retreat,
                        use_blood_price=use_blood_price,
                        reroll_dice_indices=reroll_dice_indices,
                        miracle_cost=miracle_cost,
                        continue_round=continue_round
                    )

                elif action_type == "battle_choice":
                    battle_id = payload.get("battle_id")
                    choice = payload.get("choice", "resolve_now")
                    res = CURRENT_GAME.action_battle_choice(
                        battle_id=battle_id,
                        choice=choice
                    )

                elif action_type == "favor_miracle":
                    miracle_type = payload.get("miracle_type")
                    target_faction = payload.get("target_faction")
                    target_node = payload.get("target_node")
                    res = CURRENT_GAME.action_favor_miracle(
                        miracle_type=miracle_type,
                        target_faction=target_faction,
                        target_node=target_node
                    )
                elif action_type == "pray":
                    res = CURRENT_GAME.action_pray()

                elif action_type == "end_turn":
                    res = CURRENT_GAME.action_end_turn()

                if res.get("success"):
                    logger.info("Action '%s' completed successfully: %s", action_type, res.get("message", "OK"))
                else:
                    logger.warning("Action '%s' failed: %s", action_type, res.get("error", "Unknown error"))

                res["state"] = CURRENT_GAME.to_dict()
                self._send_json(res)
                return

            if parsed.path == "/api/ai_step":
                res = SimpleAI.step(CURRENT_GAME)
                if res.get("success"):
                    logger.info("AI Step executed: action=%s, player=%s", res.get("action"), res.get("player"))
                res["state"] = CURRENT_GAME.to_dict()
                self._send_json(res)
                return

            logger.warning("404 Not Found: POST %s", parsed.path)
            self.send_error(404, "Endpoint not found")

        except Exception as e:
            tb = traceback.format_exc()
            logger.error("Internal server error handling POST %s with payload %s:\n%s", parsed.path, payload, tb)
            self._send_json({
                "success": False,
                "error": f"Internal Server Error: {str(e)}"
            }, status=500)

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
    logger.info("==================================================")
    logger.info(" IRON PRICE: Kingsmoot — Server Running on port %s", port)
    logger.info(" URL: http://localhost:%s", port)
    logger.info("==================================================")
    print(f"==================================================")
    print(f" IRON PRICE: Kingsmoot — Server Running!")
    print(f" URL: http://localhost:{port}")
    print(f" Logs: logs/game.log & logs/error.log")
    print(f" Press Ctrl+C to stop the server.")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Stopping server...")
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
