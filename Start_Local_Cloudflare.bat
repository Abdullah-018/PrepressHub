@echo off
cd /d "%~dp0"
where npx >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install Node.js LTS from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)
echo Starting PrepressHub at http://localhost:8788
start "" http://localhost:8788
npx wrangler pages dev . --port 8788
pause
