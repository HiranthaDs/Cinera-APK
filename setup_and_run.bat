@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js 20 or newer is required. Download from https://nodejs.org/
 pause
 exit /b 1
)
if not exist .dev.vars (
 copy .dev.vars.example .dev.vars >nul
 echo Created .dev.vars. Add your TMDB_READ_ACCESS_TOKEN for the live movie catalog.
)
call npm install
if errorlevel 1 (
 echo npm install failed.
 pause
 exit /b 1
)
echo Starting Cinera on the local Cloudflare Workers runtime at http://localhost:5173
call npm run dev
pause
