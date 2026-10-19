@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>&1
if not errorlevel 1 (
 start "" "http://127.0.0.1:8765/index.html#tree"
 py -3 -m http.server 8765 --bind 127.0.0.1
 exit /b
)
where python >nul 2>&1
if not errorlevel 1 (
 start "" "http://127.0.0.1:8765/index.html#tree"
 python -m http.server 8765 --bind 127.0.0.1
 exit /b
)
echo Python is required to start the local WOW viewer.
pause
