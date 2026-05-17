// electron/main.js
// Electron-Main-Process fuer Familien-Code v2
// Startet im production-Modus den Next.js-Server als child_process
// und oeffnet ein BrowserWindow, das auf localhost:PORT zeigt.
// Im development-Modus (NODE_ENV !== 'production') verbindet er sich nur
// zum bereits laufenden `next dev` auf Port 3000.

const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const isDev = !app.isPackaged;
const PORT = isDev ? 3000 : 3456; // Production nutzt anderen Port um Konflikte zu vermeiden

let mainWindow = null;
let nextProcess = null;

// Warte bis HTTP-Server antwortet
function waitForServer(port, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const req = http.get(`http://localhost:${port}`, () => resolve());
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server auf Port ${port} nicht erreichbar nach ${timeoutMs}ms`));
        } else {
          setTimeout(tryConnect, 500);
        }
      });
      req.setTimeout(2000, () => req.destroy());
    };
    tryConnect();
  });
}

// Startet Next.js production server (nur in packaged app)
function startNextServer() {
  if (isDev) return Promise.resolve();

  const appRoot = path.join(__dirname, '..');

  // Suche nach next binary im node_modules
  const isWin = process.platform === 'win32';
  const nextBin = path.join(appRoot, 'node_modules', '.bin', isWin ? 'next.cmd' : 'next');

  return new Promise((resolve, reject) => {
    nextProcess = spawn(nextBin, ['start', '-p', String(PORT)], {
      cwd: appRoot,
      env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT) },
      shell: isWin,
    });

    nextProcess.stdout.on('data', (data) => {
      console.log('[next]', data.toString());
    });
    nextProcess.stderr.on('data', (data) => {
      console.error('[next-err]', data.toString());
    });
    nextProcess.on('error', (err) => {
      console.error('Konnte Next.js nicht starten:', err);
      reject(err);
    });
    nextProcess.on('exit', (code) => {
      console.log(`Next.js Server beendet mit Code ${code}`);
    });

    // Warte bis Server antwortet
    waitForServer(PORT).then(resolve).catch(reject);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: 'Familien-Code',
    backgroundColor: '#F4E4D9',
    icon: path.join(__dirname, '..', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false, // Erst zeigen wenn ready-to-show, vermeidet Weiss-Flash
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Externe Links im Default-Browser oeffnen, nicht in Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Menue
  const template = [
    {
      label: 'Familien-Code',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Beenden' },
      ],
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo', label: 'Rueckgaengig' },
        { role: 'redo', label: 'Wiederherstellen' },
        { type: 'separator' },
        { role: 'cut', label: 'Ausschneiden' },
        { role: 'copy', label: 'Kopieren' },
        { role: 'paste', label: 'Einfuegen' },
        { role: 'selectAll', label: 'Alles auswaehlen' },
      ],
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'reload', label: 'Neu laden' },
        { role: 'forceReload', label: 'Erzwungenes Neuladen' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom zuruecksetzen' },
        { role: 'zoomIn', label: 'Vergroessern' },
        { role: 'zoomOut', label: 'Verkleinern' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Vollbild' },
      ],
    },
    {
      label: 'Fenster',
      submenu: [
        { role: 'minimize', label: 'Minimieren' },
        { role: 'close', label: 'Schliessen' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  try {
    if (!isDev) {
      // Production: starte Next.js intern
      console.log('Starte Next.js Server...');
      await startNextServer();
      console.log('Next.js bereit.');
    }
    createWindow();
  } catch (err) {
    dialog.showErrorBox(
      'Familien-Code konnte nicht starten',
      `Fehler beim Starten des Servers:\n\n${err.message}\n\nBitte stelle sicher dass die App vollstaendig installiert ist (mit npm install).`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (nextProcess) {
    nextProcess.kill();
    nextProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('before-quit', () => {
  if (nextProcess) {
    nextProcess.kill();
    nextProcess = null;
  }
});
