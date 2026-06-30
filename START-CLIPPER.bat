@echo off
REM ============================================================
REM  SHADDAI Clipper — one-click launcher.
REM  Builds the app if needed, starts the engine (which also serves
REM  the UI), and opens it in your browser at http://localhost:8787
REM ============================================================
cd /d "%~dp0"

if not exist "dist\index.html" (
  echo First-time setup: building the app ^(one minute^)...
  call npm install
  call npm run build
)

echo.
echo Starting SHADDAI Clipper at http://localhost:8787
echo Close this window to stop it.
echo.

start "" http://localhost:8787
cd server
node --import tsx/esm src/server.ts
