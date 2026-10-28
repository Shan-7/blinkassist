@echo off
title Blink-Assist Web App Launcher
color 0E

echo ======================================================================
echo          CogniText x M2W Blink-Assist -- Web App Launcher
echo ======================================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [X] Node.js is not found. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

cd web
if not exist "node_modules" (
    echo [*] Installing web app dependencies...
    call npm install
)

echo [*] Starting Next.js Web Application...
start http://localhost:3000
call npm run dev
