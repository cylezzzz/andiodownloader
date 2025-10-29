import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import Database from 'better-sqlite3';

const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const DATA_DIR = path.join(APPDATA, 'AndioDownloader', 'addons', 'video-metadata-scraper');
const DB_PATH = path.join(DATA_DIR, 'videos.db');
const CFG_PATH = path.join(DATA_DIR, 'config.json');

await fs.ensureDir(DATA_DIR);

export function openDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_dirs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dir TEXT UNIQUE NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT UNIQUE NOT NULL,
      file_name TEXT NOT NULL,
      ext TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      mtime_ms INTEGER NOT NULL,
      duration_sec REAL,
      width INTEGER, height INTEGER, fps REAL, vcodec TEXT, acodec TEXT,
      format_name TEXT, bit_rate INTEGER, tags_json TEXT,
      scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_videos_ext ON videos(ext);
    CREATE INDEX IF NOT EXISTS idx_videos_mtime ON videos(mtime_ms);
  `);
  return db;
}

export async function loadConfig() {
  if (!(await fs.pathExists(CFG_PATH))) {
    await fs.writeJson(CFG_PATH, { dirs: [] }, { spaces: 2 });
  }
  return fs.readJson(CFG_PATH);
}

export async function saveConfig(cfg) {
  await fs.writeJson(CFG_PATH, cfg, { spaces: 2 });
}
