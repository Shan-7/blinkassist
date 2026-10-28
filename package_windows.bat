@echo off
setlocal enabledelayedexpansion
title Blink-Assist -- Windows One-Click Packager
color 0B

echo ======================================================================
echo          CogniText x M2W Blink-Assist -- Windows Packager
echo ======================================================================
echo.
echo [*] Checking Python installation...

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set PY_CMD=python
) else (
    where py >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set PY_CMD=py
    ) else (
        echo [X] ERROR: Python was not found on your system!
        echo     Please install Python 3.10, 3.11, or 3.12 from https://www.python.org/
        echo     IMPORTANT: Check the box "Add Python to PATH" during installation.
        echo.
        pause
        exit /b 1
    )
)

echo [*] Using: !PY_CMD!
!PY_CMD! --version
echo.

:: 1. Setup build virtual environment
if not exist ".venv_build\Scripts\activate.bat" (
    echo [*] Creating isolated build environment in .venv_build...
    !PY_CMD! -m venv .venv_build
    if %ERRORLEVEL% neq 0 (
        echo [X] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

echo [*] Activating build environment...
call .venv_build\Scripts\activate.bat

echo [*] Upgrading pip, setuptools, wheel...
python -m pip install --upgrade pip setuptools wheel --quiet

echo [*] Installing dependencies from requirements.txt...
python -m pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo [X] Error installing requirements.
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo [*] Building Windows Executable with PyInstaller...
echo     (Bundling MediaPipe FaceMesh models, OpenCV, and Tkinter GUI)
echo ======================================================================
echo.

python -m PyInstaller blink_assist.spec --clean --noconfirm

if not exist "dist\BlinkAssist\BlinkAssist.exe" (
    echo.
    echo [X] Build failed! Check the output logs above for errors.
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo [OK] Build SUCCESSFUL!
echo ======================================================================
echo Executable location: dist\BlinkAssist\BlinkAssist.exe
echo.
echo [*] Packaging distribution folder into BlinkAssist_Windows.zip...

powershell -Command "if (Test-Path 'BlinkAssist_Windows.zip') { Remove-Item 'BlinkAssist_Windows.zip' -Force }; Compress-Archive -Path 'dist\BlinkAssist\*' -DestinationPath 'BlinkAssist_Windows.zip' -Force"

if exist "BlinkAssist_Windows.zip" (
    echo [OK] Created ready-to-share ZIP package:
    echo      --> BlinkAssist_Windows.zip
    echo.
    echo [*] You can now send 'BlinkAssist_Windows.zip' to any Windows user!
    echo     They just need to unzip it and double-click BlinkAssist.exe.
    echo.
)

echo [*] Opening folder in Windows Explorer...
explorer /select,dist\BlinkAssist\BlinkAssist.exe

echo.
echo Done! Press any key to exit.
pause >nul
