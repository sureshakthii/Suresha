// SQLite backup and verified restore.
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg] = process.argv.slice(2);
  const opt = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const dbFile = opt('--db', process.env.DB_PATH || 'data/kaippesi.db');
  if (cmd === 'backup') console.log(backup(dbFile, opt('--out', 'backups')));
  else if (cmd === 'verify') console.log(JSON.stringify(verify(arg), null, 2));
  else if (cmd === 'restore') console.log(JSON.stringify(restore(arg, dbFile), null, 2));
  else { console.error('usage: db-backup.mjs backup|verify <file>|restore <file>'); process.exit(1); }
}
