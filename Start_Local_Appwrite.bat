@echo off
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 goto use_node
echo Starting PrepressHub at http://localhost:8788
start "" http://localhost:8788
python -m http.server 8788
goto done
:use_node
where npx >nul 2>nul
if errorlevel 1 (
  echo Python or Node.js was not found. Install one of them and try again.
  pause
  exit /b 1
)
echo Starting PrepressHub at http://localhost:8788
start "" http://localhost:8788
npx --yes http-server . -p 8788 -c-1
:done
pause
