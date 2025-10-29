// G:\andiodownloader\andiodownloader\main.js
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

const APP_ROOT = __dirname;
const IS_DEV = !app.isPackaged;

// Fester Addon-Pfad wie in renderer.html
const ADDONS_DIR = "G:\\andiodownloader\\andiodownloader\\addons";

function ensureDirSync(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function createWindow() {
  ensureDirSync(ADDONS_DIR);

  const win = new BrowserWindow({
    width: 1300,
    height: 830,
    minWidth: 1100,
    minHeight: 720,
    title: 'ANDIO Downloader',
    backgroundColor: '#0a0e17',
    webPreferences: {
      preload: path.join(APP_ROOT, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Optional: Icon laden, wenn vorhanden
  const iconPath = path.join(APP_ROOT, 'assets', 'logo.png');
  if (fs.existsSync(iconPath)) {
    try { win.setIcon(iconPath); } catch {}
  }

  // renderer laden
  const rendererPath = path.join(APP_ROOT, 'renderer.html');
  await win.loadFile(rendererPath);

  if (IS_DEV) win.webContents.openDevTools({ mode: 'detach' });
}

/* ---------------- IPC HANDLER ---------------- */

// 1) Ordner wählen (fix für "Wählen"-Button)
ipcMain.handle('downloads:chooseDir', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Zielordner auswählen',
    properties: ['openDirectory', 'createDirectory']
  });
  if (res.canceled || !res.filePaths?.[0]) return { canceled: true };
  return { path: res.filePaths[0] };
});

// 2) Downloads starten (Demo-Simulation mit Fortschritt-Events)
ipcMain.handle('downloads:start', async (evt, { links, outDir }) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return { ok: false, error: 'No window' };
  if (!Array.isArray(links) || !links.length) return { ok: false, error: 'No links' };
  if (!outDir) return { ok: false, error: 'No outDir' };

  // Demo: simulierte Fortschritts-Events
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < links.length; i++) {
    let pct = 0;
    const total = 100 * 1024 * 1024; // 100 MB (demo)
    let done = 0;
    while (pct < 100) {
      await sleep(120);
      done = Math.min(total, done + 5 * 1024 * 1024);
      pct = Math.min(100, Math.round((done / total) * 100));
      win.webContents.send('downloads:state', {
        i, pct, done, total, speed: 512 * 1024, eta: Math.max(0, Math.round((100 - pct) / 5))
      });
    }
  }
  return { ok: true };
});

ipcMain.handle('downloads:abortAll', async () => {
  // Hier würdest du echte Downloads abbrechen.
  return { ok: true };
});

// 3) Chat (Echo-Demo)
ipcMain.handle('chat:ask', async (_evt, { model, prompt }) => {
  // Hier an deine lokale KI anbinden (Ollama, LM Studio, etc.)
  return `[${model}] → ${prompt}`;
});

// 4) Wizard: Datei erzeugen
ipcMain.handle('agent:createFile', async (_evt, { dir, name, content }) => {
  try {
    if (!dir || !name) throw new Error('dir/name required');
    ensureDirSync(dir);
    const filePath = path.join(dir, name);
    await fsp.writeFile(filePath, content ?? '', 'utf8');
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
});

// 5) Mediathek: Addons auflisten
ipcMain.handle('addons:list', async (_evt, { dir } = {}) => {
  const base = dir || ADDONS_DIR;
  ensureDirSync(base);
  const files = await fsp.readdir(base);
  const list = [];
  for (const f of files) {
    if (!f.toLowerCase().endsWith('.js') && !f.toLowerCase().endsWith('.disabled.js')) continue;
    const fp = path.join(base, f);
    const st = await fsp.stat(fp);
    const isDisabled = f.endsWith('.disabled.js');
    list.push({
      name: f.replace(/\.disabled\.js$/i, '').replace(/\.js$/i, ''),
      filename: f,
      version: '1.0.0',
      active: !isDisabled,
      mtime: st.mtimeMs
    });
  }
  return list;
});

// 6) Mediathek: Aktiv/Inaktiv durch Umbenennen (.js <-> .disabled.js)
ipcMain.handle('addons:setActive', async (_evt, { dir, name, active }) => {
  const base = dir || ADDONS_DIR;
  const fp = path.join(base, name);
  const isDisabled = name.endsWith('.disabled.js');
  if (active && isDisabled) {
    const newName = name.replace(/\.disabled\.js$/i, '.js');
    await fsp.rename(fp, path.join(base, newName));
    return { ok: true };
  }
  if (!active && !isDisabled) {
    const newName = name.replace(/\.js$/i, '.disabled.js');
    await fsp.rename(fp, path.join(base, newName));
    return { ok: true };
  }
  return { ok: true }; // already in desired state
});

// 7) Mediathek: Löschen
ipcMain.handle('addons:delete', async (_evt, { dir, name }) => {
  const base = dir || ADDONS_DIR;
  const fp = path.join(base, name);
  await fsp.unlink(fp);
  return { ok: true };
});

// 8) Explorer öffnen
ipcMain.handle('shell:openPath', async (_evt, { path: p }) => {
  if (!p) return { ok: false, error: 'No path' };
  ensureDirSync(p);
  await shell.openPath(p);
  return { ok: true };
});

/* ---------------- APP LIFECYCLE ---------------- */

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) await createWindow();
});
