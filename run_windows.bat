@echo off
setlocal enabledelayedexpansion
title Blink-Assist -- Windows Launcher
color 0A

echo ======================================================================
echo              CogniText x M2W Blink-Assist -- Desktop App
echo ======================================================================
echo.

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set PY_CMD=python
) else (
    where py >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set PY_CMD=py
    ) else (
        echo [X] ERROR: Python was not found!
        echo     Please install Python from https://www.python.org/
        echo     (Check "Add Python to PATH" during installation)
        pause
        exit /b 1
    )
)

:: Create environment if needed
if not exist ".venv\Scripts\activate.bat" (
    echo [*] Setting up virtual environment in .venv...
    !PY_CMD! -m venv .venv
    call .venv\Scripts\activate.bat
    echo [*] Installing dependencies (first-time only)...
    python -m pip install --upgrade pip --quiet
    python -m pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)

echo [*] Launching Blink-Assist Desktop Application...
python app_gui.py

if %ERRORLEVEL% neq 0 (
    echo.
    echo [!] App exited with code %ERRORLEVEL%.
    pause
)
