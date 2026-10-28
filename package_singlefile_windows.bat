@echo off
setlocal enabledelayedexpansion
title Blink-Assist -- Windows Single-File EXE Builder
color 0B

echo ======================================================================
echo       CogniText x M2W Blink-Assist -- Single-File EXE Builder
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
        echo [X] ERROR: Python was not found! Install Python 3.10-3.12 with "Add to PATH".
        pause
        exit /b 1
    )
)

if not exist ".venv_build\Scripts\activate.bat" (
    echo [*] Creating virtual environment .venv_build...
    !PY_CMD! -m venv .venv_build
)

call .venv_build\Scripts\activate.bat
python -m pip install -r requirements.txt --quiet

echo.
echo [*] Compiling Single-File Standalone EXE...
echo     (This may take 1-2 minutes to compress all dependencies)
echo.

python -m PyInstaller blink_assist_singlefile.spec --clean --noconfirm

if not exist "dist\BlinkAssist-Standalone.exe" (
    echo.
    echo [X] Build failed! Check the output logs above.
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo [OK] Standalone Executable Ready!
echo ======================================================================
echo Output: dist\BlinkAssist-Standalone.exe
echo.
echo You can directly send this single file to any Windows user.
echo.
explorer /select,dist\BlinkAssist-Standalone.exe
pause
