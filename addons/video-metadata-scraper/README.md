# Video Metadata Scraper (Addon)

- Rekursiver Scan konfigurierter Ordner
- ffprobe-Metadaten
- Persistenz: SQLite (WAL)
- Export: JSONL

## Install
1. Ordner nach `andiodownloader/addons/video-metadata-scraper/` legen
2. `npm install` im Addon-Ordner
3. App starten

## Steuerung (IPC)
- addon:video:get-dirs / set-dirs / remove-dir
- addon:video:scan (mit Progress-Events)
- addon:video:stats
- addon:video:export
