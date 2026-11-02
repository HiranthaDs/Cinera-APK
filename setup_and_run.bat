@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js 20 or newer is required. Download from https://nodejs.org/
 pause
 exit /b 1
)
if not exist .env (
 copy .env.example .env >nul
 echo Created .env. Add your TMDB_READ_ACCESS_TOKEN for the live movie catalog.
)
call npm install
if errorlevel 1 (
 echo npm install failed.
 pause
 exit /b 1
)
echo Starting Cinera frontend on http://localhost:5173
call npm run dev
pause
