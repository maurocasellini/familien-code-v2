#!/bin/bash
# Familien-Code v2 - Start-Script fuer Mac
# Doppelklick startet die App

cd "$(dirname "$0")"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Familien-Code v2 wird gestartet..."
echo "  herzbewegung · Numerologie & Astrologie"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "⚠ Achtung: .env.local fehlt!"
  echo "  Bitte eine Datei .env.local im Projektordner anlegen mit dem Inhalt:"
  echo "  ANTHROPIC_API_KEY=sk-ant-api03-DEIN-KEY"
  echo ""
  echo "Druecke Return zum Schliessen..."
  read
  exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
  echo "Erste Ausfuehrung: installiere Abhaengigkeiten (dauert paar Minuten)..."
  npm install
  if [ $? -ne 0 ]; then
    echo ""
    echo "⚠ Installation fehlgeschlagen. Bitte LOCAL_SETUP.md pruefen."
    read
    exit 1
  fi
fi

# Open browser after 4 seconds (give server time to start)
( sleep 4 && open http://localhost:3000 ) &

echo "Starte Server auf http://localhost:3000"
echo "Browser oeffnet sich automatisch."
echo ""
echo "Zum Beenden: dieses Fenster schliessen oder Ctrl-C druecken."
echo ""

npm run dev
