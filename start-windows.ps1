# start-windows.ps1 — Hintergrund-Launcher fuer Familien-Code
# Doppelklick auf FamilienCode.lnk (= Shortcut zu diesem Script mit hidden window) startet die App
# Manuell: powershell -ExecutionPolicy Bypass -File start-windows.ps1

$ErrorActionPreference = "SilentlyContinue"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

$LogFile = Join-Path $ProjectRoot "familien-code.log"
"$(Get-Date) - Starte Familien-Code" | Out-File -Append $LogFile

# Check .env.local
if (-not (Test-Path .env.local)) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "Bitte eine Datei .env.local im Projektordner anlegen mit:`nANTHROPIC_API_KEY=sk-ant-...",
        "Familien-Code: .env.local fehlt",
        'OK', 'Error'
    )
    exit 1
}

# Check Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "Bitte erst Node.js installieren: https://nodejs.org/de/download/",
        "Familien-Code: Node.js fehlt",
        'OK', 'Error'
    )
    exit 1
}

# First-run install
if (-not (Test-Path node_modules)) {
    # Notification
    $balloon = New-Object System.Windows.Forms.NotifyIcon
    $balloon.Icon = [System.Drawing.SystemIcons]::Information
    $balloon.BalloonTipTitle = "Familien-Code"
    $balloon.BalloonTipText = "Erstinstallation laeuft, einen Moment..."
    $balloon.Visible = $true
    $balloon.ShowBalloonTip(5000)
    npm install >> $LogFile 2>&1
}

# Browser nach 4 Sekunden oeffnen
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 4
    Start-Process "http://localhost:3000"
} | Out-Null

# Server starten (hidden)
$proc = Start-Process -FilePath "npm" -ArgumentList "run","dev" `
    -WorkingDirectory $ProjectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput "$LogFile.out" `
    -RedirectStandardError "$LogFile.err" `
    -PassThru

# PID speichern damit wir den Server spaeter beenden koennen
$proc.Id | Out-File -FilePath (Join-Path $ProjectRoot ".server.pid")

# Optional: Tray-Icon (laesst Susana den Server elegant beenden)
# (Wuerde mehr Code brauchen, fuer V2 lassen)
