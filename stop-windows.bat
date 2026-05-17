@echo off
REM stop-windows.bat — Beendet den Familien-Code Server

echo Suche laufende Familien-Code Server...
taskkill /F /IM node.exe /T 2>nul
if %errorlevel% equ 0 (
  echo Server beendet.
) else (
  echo Kein Server lief.
)
timeout /t 2 /nobreak >nul
