@echo off
REM Familien-Code v2 - Start-Script fuer Windows
REM Doppelklick startet die App

cd /d "%~dp0"

echo.
echo ===================================================
echo   Familien-Code v2 wird gestartet...
echo   herzbewegung - Numerologie und Astrologie
echo ===================================================
echo.

REM Check .env.local
if not exist .env.local (
  echo Achtung: .env.local fehlt!
  echo Bitte eine Datei .env.local im Projektordner anlegen mit dem Inhalt:
  echo ANTHROPIC_API_KEY=sk-ant-api03-DEIN-KEY
  echo.
  pause
  exit /b 1
)

REM Check node_modules
if not exist node_modules (
  echo Erste Ausfuehrung: installiere Abhaengigkeiten ^(dauert paar Minuten^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo Installation fehlgeschlagen. Bitte LOCAL_SETUP.md pruefen.
    pause
    exit /b 1
  )
)

REM Open browser after 4 seconds
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

echo Starte Server auf http://localhost:3000
echo Browser oeffnet sich automatisch.
echo.
echo Zum Beenden: dieses Fenster schliessen oder Ctrl-C druecken.
echo.

call npm run dev

pause
