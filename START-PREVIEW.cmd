@echo off
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  python preview.py
) else (
  py -3 preview.py
)
pause
