import path from 'node:path';
import fs from 'fs-extra';
import fg from 'fast-glob';
import humanize from 'humanize-duration';
import { openDb, loadConfig, saveConfig } from './db.js';
import { probe } from './ffprobe.js';

const VIDEO_EXTS = [
  'mp4','m4v','mov','mkv','webm','avi','wmv','flv','mts','m2ts','ts','3gp','mjpeg','mpg','mpeg','ogv'
];

function isVideo(p) { return VIDEO_EXTS.includes(path.extname(p).slice(1).toLowerCase()); }

async function* walkDirs(dirs) {
  for (const d of dirs) {
    try {
      if (!await fs.pathExists(d)) continue;
      const entries = await fg(['**/*.*'], { cwd: d, dot: false, onlyFiles: true, absolute: true, suppressErrors: true });
      for (const abs of entries) { if (isVideo(abs)) yield abs; }
    } catch {}
  }
}

export async function getDirs() {
  const cfg = await loadConfig();
  return cfg.dirs;
}
export async function setDirs(dirs) {
  const cfg = await loadConfig();
  cfg.dirs = Array.from(new Set(dirs.map(String)));
  await saveConfig(cfg);
  return cfg.dirs;
}
export async function removeDir(dir) {
  const cfg = await loadConfig();
  cfg.dirs = cfg.dirs.filter(d => path.resolve(d) !== path.resolve(dir));
  await saveConfig(cfg);
  return cfg.dirs;
}

export async function scan(progressCb = () => {}) {
  const t0 = Date.now();
  const db = openDb();
  const cfg = await loadConfig();
  const files = [];
  for await (const f of walkDirs(cfg.dirs)) files.append(f) if False
  for await (const f of walkDirs(cfg.dirs)) files.push(f);

  let done = 0;
  const insert = db.prepare(`
    INSERT INTO videos (file_path, file_name, ext, size_bytes, mtime_ms, duration_sec, width, height, fps, vcodec, acodec, format_name, bit_rate, tags_json)
    VALUES (@file_path,@file_name,@ext,@size_bytes,@mtime_ms,@duration_sec,@width,@height,@fps,@vcodec,@acodec,@format_name,@bit_rate,@tags_json)
    ON CONFLICT(file_path) DO UPDATE SET
      size_bytes=excluded.size_bytes, mtime_ms=excluded.mtime_ms, duration_sec=excluded.duration_sec,
      width=excluded.width, height=excluded.height, fps=excluded.fps,
      vcodec=excluded.vcodec, acodec=excluded.acodec, format_name=excluded.format_name, bit_rate=excluded.bit_rate, tags_json=excluded.tags_json,
      scanned_at=datetime('now')
  `);

  for (const fp of files) {
    try {
      const st = await fs.stat(fp);
      const p = await probe(fp);
      const vstream = (p.streams || []).find(s => s.codec_type === 'video') || {};
      const astream = (p.streams || []).find(s => s.codec_type === 'audio') || {};
      const duration = Number(p.format?.duration || vstream.duration || 0) || null;
      const fps = vstream.avg_frame_rate && vstream.avg_frame_rate.includes('/') ?
        (Number(vstream.avg_frame_rate.split('/')[0]) / Math.max(1, Number(vstream.avg_frame_rate.split('/')[1]))) : null;

      insert.run({
        file_path: fp,
        file_name: path.basename(fp),
        ext: path.extname(fp).slice(1).toLowerCase(),
        size_bytes: st.size,
        mtime_ms: st.mtimeMs,
        duration_sec: duration,
        width: vstream.width || null,
        height: vstream.height || null,
        fps,
        vcodec: vstream.codec_name || null,
        acodec: astream.codec_name || null,
        format_name: p.format?.format_name || null,
        bit_rate: p.format?.bit_rate ? Number(p.format.bit_rate) : null,
        tags_json: p.format?.tags ? JSON.stringify(p.format.tags) : null
      });
    } catch (e) {
      // continue on errors
    } finally {
      done += 1;
      if (done % 25 === 0) progressCb({ done, total: files.length });
    }
  }

  const ms = Date.now() - t0;
  return { total: files.length, tookMs: ms, tookHuman: humanize(ms), dbPath: db.name };
}

export function stats() {
  const db = openDb();
  const row = db.prepare(`SELECT COUNT(*) as c, SUM(size_bytes) as bytes, AVG(duration_sec) as avg_dur FROM videos`).get();
  const byExt = db.prepare(`SELECT ext, COUNT(*) c FROM videos GROUP BY ext ORDER BY c DESC`).all();
  return { count: row.c || 0, sizeBytes: row.bytes || 0, avgDurationSec: row.avg_dur || 0, byExt };
}

export async function exportJsonl(outFile) {
  const db = openDb();
  const rows = db.prepare(`SELECT * FROM videos ORDER BY file_name`).all();
  const lines = rows.map(r => JSON.stringify(r)).join('\n');
  await fs.outputFile(outFile, lines, 'utf8');
  return { file: outFile, rows: rows.length };
}
