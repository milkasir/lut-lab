@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1"
) else (
  node "%~dp0tools\serve.cjs"
)
pause
