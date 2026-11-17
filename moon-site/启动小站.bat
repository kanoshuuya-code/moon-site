@echo off
chcp 65001 >nul
title TO YY - Moon Site
cd /d "%~dp0"
set PORT=8642
set PY=
where python >nul 2>nul && set PY=python
if not defined PY (where py >nul 2>nul && set PY=py)
if not defined PY (
  echo [X] Python not found - please install Python first.
  pause
  exit /b
)
echo Moon site starting: http://127.0.0.1:%PORT%/index.html
start "MoonSiteServer" /min cmd /c "%PY% server.py %PORT%"
timeout /t 1 >nul
start "" "http://127.0.0.1:%PORT%/index.html?r=%RANDOM%"
echo OK - site opened in your browser.
echo To stop: close the minimized server window (MoonSiteServer).
timeout /t 4 >nul
