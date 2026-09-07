#!/usr/bin/env python3
"""
IRON PRICE: Kingsmoot — One-Click Game Launcher
Starts local Python server and opens default web browser.
"""
import sys
import os
import time
import webbrowser
import threading
from pathlib import Path
from server import run_server

def open_browser(url: str):
    time.sleep(0.6)
    print(f"Opening browser at: {url}")
    webbrowser.open(url)

if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
            
    url = f"http://localhost:{port}"
    threading.Thread(target=open_browser, args=(url,), daemon=True).start()
    run_server(port)
