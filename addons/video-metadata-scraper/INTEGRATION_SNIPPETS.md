# Integration-Snippets

## main.js (am Ende anhängen)
```js
// === [Addon: Video Metadata Scraper] IPC ===
import path from 'node:path';
import { getDirs, setDirs, removeDir, scan, stats, exportJsonl } from './addons/video-metadata-scraper/index.js';

let ADDON_FS_WRITE_ALLOWED = true; // per Setting steuerbar

function guardWrite() {
  if (!ADDON_FS_WRITE_ALLOWED) throw new Error('Dateioperationen sind deaktiviert.');
}

ipcMain.handle('addon:video:get-dirs', async () => await getDirs());
ipcMain.handle('addon:video:set-dirs', async (_e, dirs) => { guardWrite(); return await setDirs(dirs); });
ipcMain.handle('addon:video:remove-dir', async (_e, dir) => { guardWrite(); return await removeDir(dir); });
ipcMain.handle('addon:video:scan', async (_e) => {
  const prog = (p) => { mainWindow?.webContents.send('addon:video:scan:progress', p); };
  return await scan(prog);
});
ipcMain.handle('addon:video:stats', async () => stats());
ipcMain.handle('addon:video:export', async (_e, outFile) => { guardWrite(); return await exportJsonl(outFile); });
ipcMain.on('addon:video:set-write-allowed', (_e, allowed) => { ADDON_FS_WRITE_ALLOWED = !!allowed; });
```

## preload.js (am Ende anhängen)
```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('videoAddon', {
  getDirs: () => ipcRenderer.invoke('addon:video:get-dirs'),
  setDirs: (dirs) => ipcRenderer.invoke('addon:video:set-dirs', dirs),
  removeDir: (dir) => ipcRenderer.invoke('addon:video:remove-dir', dir),
  scan: () => ipcRenderer.invoke('addon:video:scan'),
  onScanProgress: (cb) => ipcRenderer.on('addon:video:scan:progress', (_e, payload) => cb(payload)),
  stats: () => ipcRenderer.invoke('addon:video:stats'),
  export: (outFile) => ipcRenderer.invoke('addon:video:export', outFile),
  setWriteAllowed: (allowed) => ipcRenderer.send('addon:video:set-write-allowed', allowed)
});
```

## HTML (Panel)
```html
<div class="card">
  <h3>Video-Addon</h3>
  <input id="vidDirs" placeholder="C:\Videos;D:\Aufnahmen" style="width:100%;">
  <div style="margin:6px 0">
    <button id="vidSaveDirs">Speichern</button>
    <label style="margin-left:12px"><input type="checkbox" id="vidAllowWrite" checked> Dateioperationen erlauben</label>
  </div>
  <div style="margin:6px 0">
    <button id="vidScan">Scan starten</button>
    <button id="vidStats">Statistik</button>
    <button id="vidExport">Export JSONL</button>
  </div>
  <h4>Log</h4>
  <pre id="vidLog" style="height:120px; overflow:auto; background:#111; color:#9ad;"> </pre>
  <h4>Ausgabe</h4>
  <pre id="vidOut" style="height:220px; overflow:auto; background:#111; color:#ccc;"> </pre>
</div>
```

## renderer.js (Logik)
```js
(function () {
  const $ = (id) => document.getElementById(id);

  const dirsEl = $('vidDirs');
  const allowEl = $('vidAllowWrite');
  const btnSave = $('vidSaveDirs');
  const btnScan = $('vidScan');
  const btnStats = $('vidStats');
  const btnExport = $('vidExport');
  const logEl = $('vidLog');
  const outEl = $('vidOut');

  function log(msg) {
    const ts = new Date().toISOString().substring(11,19);
    logEl.textContent += `[${ts}] ${msg}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  }
  function show(obj) { outEl.textContent = JSON.stringify(obj, null, 2); }

  if (window.videoAddon) {
    window.videoAddon.getDirs().then(dirs => { dirsEl.value = (dirs || []).join(';'); });
    window.videoAddon.setWriteAllowed(allowEl.checked);
    window.videoAddon.onScanProgress(p => log(`Progress ${p.done}/${p.total}`));
  }

  allowEl?.addEventListener('change', () => {
    window.videoAddon?.setWriteAllowed(allowEl.checked);
    log(`WriteAllowed=${allowEl.checked}`);
  });

  btnSave?.addEventListener('click', async () => {
    const dirs = dirsEl.value.split(';').map(s => s.trim()).filter(Boolean);
    try { const after = await window.videoAddon.setDirs(dirs); log(`Ordner gespeichert (${after.length})`); show({ dirs: after }); }
    catch (e) { log(`FEHLER: ${e.message}`); }
  });

  btnScan?.addEventListener('click', async () => {
    try { log('Scan gestartet …'); const res = await window.videoAddon.scan(); log(`Scan fertig: ${res.total} Dateien in ${res.tookHuman}`); show(res); }
    catch (e) { log(`FEHLER: ${e.message}`); }
  });

  btnStats?.addEventListener('click', async () => {
    const s = await window.videoAddon.stats(); log('Statistik aktualisiert'); show(s);
  });

  btnExport?.addEventListener('click', async () => {
    const file = `C:\\Users\\${(window.osUser || 'Public')}\\Desktop\\videos.jsonl`;
    try { const r = await window.videoAddon.export(file); log(`Export: ${r.rows} Zeilen -> ${r.file}`); show(r); }
    catch (e) { log(`FEHLER: ${e.message}`); }
  });
})();
```
