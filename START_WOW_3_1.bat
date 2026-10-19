@echo off
setlocal
cd /d "%~dp0"
rem Start the server before opening the browser, and keep it alive.
where py >nul 2>&1
if not errorlevel 1 (
 start "WOW 3.1 local server" cmd /k "cd /d ""%~dp0"" && py -3 -m http.server 8765 --bind 127.0.0.1"
 goto open
)
where python >nul 2>&1
if not errorlevel 1 (
 start "WOW 3.1 local server" cmd /k "cd /d ""%~dp0"" && python -m http.server 8765 --bind 127.0.0.1"
 goto open
)
echo No Python executable was found. This preview needs a local web server.
pause
exit /b 1
:open
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:8765/index.html#tree"
echo Keep the WOW local server window open while browsing.
