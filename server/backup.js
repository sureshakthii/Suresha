// SQLite backup and verified restore (library; CLI in scripts/db-backup.mjs).
//   node scripts/db-backup.mjs backup  [--db data/kaippesi.db] [--out backups/]   → consistent online copy (VACUUM INTO)
//   node scripts/db-backup.mjs verify  <file>                                      → integrity check + table row counts
//   node scripts/db-backup.mjs restore <file> [--db data/kaippesi.db]               → verify, keep the old DB as .pre-restore, swap in
// Run "backup" from cron (e.g. hourly) and copy the file off the server (object storage). Test a restore monthly.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function backup(dbFile, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(outDir, `thunai-${stamp}.db`);
  const db = new DatabaseSync(dbFile);
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  db.close();
  return target;
}

export function verify(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  const ok = db.prepare('PRAGMA integrity_check').get();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all().map((t) => t.name);
  const counts = Object.fromEntries(tables.map((t) => [t, db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get().n]));
  db.close();
  return { ok: Object.values(ok)[0] === 'ok', counts };
}

export function restore(file, dbFile) {
  const v = verify(file);
  if (!v.ok) throw new Error(`Backup failed integrity check: ${file}`);
  if (fs.existsSync(dbFile)) fs.copyFileSync(dbFile, `${dbFile}.pre-restore`);
  for (const ext of ['-wal', '-shm']) fs.rmSync(`${dbFile}${ext}`, { force: true });
  fs.copyFileSync(file, dbFile);
  return v;
}

/** Delete all but the newest `keep` backups in a directory. Returns the removed file names. */
export function prune(outDir, keep) {
  const files = fs.readdirSync(outDir).filter((f) => /^thunai-.*\.db$/.test(f)).sort();
  const old = files.slice(0, Math.max(0, files.length - keep));
  for (const f of old) fs.rmSync(path.join(outDir, f), { force: true });
  return old;
}

/**
 * Server-side schedule: BACKUP_DIR enables it; BACKUP_EVERY_HOURS (default 24) and BACKUP_KEEP (default 14).
 * Each backup is verified right after it is written. Copy BACKUP_DIR off the machine (object storage) too.
 */
export function startBackupSchedule({ dbFile = process.env.DB_PATH || 'data/kaippesi.db', dir = process.env.BACKUP_DIR } = {}) {
  if (!dir || dbFile === ':memory:') return null;
  const every = Math.max(1, Number(process.env.BACKUP_EVERY_HOURS) || 24) * 3600000;
  const keep = Math.max(1, Number(process.env.BACKUP_KEEP) || 14);
  const run = () => {
    try {
      const file = backup(dbFile, dir);
      const v = verify(file);
      if (!v.ok) console.error(`[backup] integrity check FAILED for ${file}`);
      prune(dir, keep);
      console.log(`[backup] ${file} ok=${v.ok}`);
    } catch (e) { console.error('[backup] failed:', e.message); }
  };
  setTimeout(run, 60000).unref?.();
  const t = setInterval(run, every);
  t.unref?.();
  return t;
}

