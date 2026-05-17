#!/bin/bash
# stop-mac.command — Beendet den Familien-Code Server

echo "Suche laufende Familien-Code Server..."
pkill -f 'next dev' && echo "✓ Server beendet." || echo "Kein Server lief."
sleep 1
