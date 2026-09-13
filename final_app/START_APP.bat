@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install Node.js LTS from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)
if not exist data mkdir data
if not exist data\users.csv echo id,name,email,phone,age,created_at>data\users.csv
start "Novazova Server" /min cmd /c "node server.js"
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000/"
echo.
echo Novazova is running at http://localhost:3000/
echo User dashboard: http://localhost:3000/admin
pause
