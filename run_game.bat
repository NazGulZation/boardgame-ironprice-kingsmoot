@echo off
title IRON PRICE: Kingsmoot
echo ========================================================
echo  IRON PRICE: Kingsmoot — Launching Phase 1 Web Game
echo ========================================================
echo.

if exist "C:\Users\555501210001\AppData\Local\Programs\Python\Python312\python.exe" (
    "C:\Users\555501210001\AppData\Local\Programs\Python\Python312\python.exe" run_game.py
) else (
    python run_game.py
)

pause
