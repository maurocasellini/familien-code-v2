# Familien-Code v2 - Lokale Installation

Diese Anleitung beschreibt wie du die App **lokal auf deinem Computer** laufen lassen kannst. So bleibt alles privat (kein Vercel, kein Cloud-Server), die Geburtsdaten deiner Klienten verlassen deinen Rechner nicht (ausser fuer den AI-Aufruf an Anthropic), und du hast die volle Swiss-Ephemeris-Praezision fuer die Astrologie.

## Was du brauchst

1. **Node.js** (Version 18 oder neuer)
   - Mac: https://nodejs.org/de/download/ → "macOS Installer (.pkg)" laden, doppelklicken, durchklicken
   - Windows: https://nodejs.org/de/download/ → "Windows Installer (.msi)" laden, doppelklicken, durchklicken
2. **Anthropic API Key** (hast du schon)

## Erste Installation (einmalig)

### Schritt 1: Code herunterladen

Variante A (einfach, ZIP):
- Gehe auf https://github.com/maurocasellini/familien-code-v2
- Klicke "Code" (gruener Button) > "Download ZIP"
- Entpacke die ZIP, z.B. nach `/Users/susana/familien-code-v2` (Mac) oder `C:\Users\Susana\familien-code-v2` (Windows)

Variante B (mit Git, fuer Updates einfacher):
```bash
git clone https://github.com/maurocasellini/familien-code-v2.git
cd familien-code-v2
```

### Schritt 2: Abhaengigkeiten installieren

Oeffne ein Terminal (Mac: Terminal-App / Windows: PowerShell oder cmd) und navigiere in den Projekt-Ordner:

```bash
cd /Users/susana/familien-code-v2   # Mac
cd C:\Users\Susana\familien-code-v2  # Windows
```

Dann:
```bash
npm install
```

Das laedt alle benoetigten Pakete inklusive **Swiss Ephemeris** runter. Dauert beim ersten Mal ein paar Minuten.

### Schritt 3: Anthropic API Key konfigurieren

Erstelle im Projektordner eine Datei mit Namen **`.env.local`** (achtung: mit Punkt davor) und schreibe rein:

```
ANTHROPIC_API_KEY=sk-ant-api03-DEIN-KEY-HIER
```

Den Key findest du unter https://console.anthropic.com/settings/keys

### Schritt 4: Erste Ausfuehrung

```bash
npm run dev
```

Warte bis "Ready - started server on 0.0.0.0:3000" steht.
Oeffne dann im Browser: **http://localhost:3000**

## Taegliche Nutzung (nach der Installation)

Du hast zwei Optionen:

### Option A: Doppelklick-Script (empfohlen)

Wir haben zwei Start-Scripts vorbereitet:

- **Mac:** `start-mac.command` doppelklicken
- **Windows:** `start-windows.bat` doppelklicken

Das Script oeffnet ein Terminal-Fenster, startet die App, und oeffnet den Browser. Zum Beenden: Terminal-Fenster schliessen.

### Option B: Manuell

```bash
cd /Users/susana/familien-code-v2
npm run dev
```

Und im Browser http://localhost:3000 oeffnen.

## Updates einspielen

Wenn Mauro Verbesserungen pusht:

Variante A (ZIP): neue ZIP von GitHub runterladen, alte Files ueberschreiben (NICHT `.env.local` ueberschreiben!), `npm install` nochmal laufen lassen.

Variante B (Git):
```bash
cd /Users/susana/familien-code-v2
git pull
npm install
```

## Was funktioniert lokal anders als auf Vercel?

| Feature | Lokal | Vercel |
|---|---|---|
| Numerologie-Berechnungen | Voll | Voll |
| Persoenliches Jahr, Monate, Pinnacles | Voll | Voll |
| Swiss Ephemeris Astrologie (Mond, Aszendent, alle Planeten) | **Voll** | Approximation oder gar nicht |
| Geocoding fuer Geburtsort | Voll | Voll |
| Generations-Dauer | Beliebig (kein Timeout) | Max 60s (Hobby) bzw 300s (Pro) |
| Datenschutz (Klientendaten bleiben lokal) | Voll | Vercel sieht sie kurz |
| Mehrere Geraete | Nur dieses eine | Ueberall ueber URL |

## Problemloesung

**"Command not found: npm"** → Node.js wurde nicht installiert. Schritt 1 nochmal machen.

**"Cannot find module 'swisseph'"** → `npm install` wurde nicht ausgefuehrt. Schritt 2 nochmal.

**App startet, aber "Internal Server Error" beim Analysieren** → Wahrscheinlich `.env.local` fehlt oder der API-Key ist falsch. Schritt 3 pruefen.

**Port 3000 schon belegt** → Eine andere App nutzt den Port. Beende sie, oder starte mit `npm run dev -- -p 3001` und nutze http://localhost:3001

## Fragen

Bei Problemen: kontaktiere Mauro.
