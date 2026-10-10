// SQLite backup and verified restore (library; CLI in scripts/db-backup.mjs).
//   node scripts/db-backup.mjs backup  [--db data/kaippesi.db] [--out backups/]   → consistent online copy (VACUUM INTO)
//   node scripts/db-backup.mjs verify  <file>                                      → integrity check + table row counts
//   node scripts/db-backup.mjs restore <file> [--db data/kaippesi.db]               → verify, keep the old DB as .pre-restore, swap in
// Run "backup" from cron (e.g. hourly) and copy the file off the server (object storage). Test a restore monthly.
//
// Encryption at rest: with BACKUP_ENCRYPTION_KEY (64 hex characters = 32 random bytes: `openssl rand -hex 32`) every
// backup is written as thunai-<time>.db.enc (AES-256-GCM, authenticated) and no plaintext copy is left behind;
// verify / restore decrypt to a private temporary file. Keep the key in the secret store, NOT next to the backups.
// Backup files and folders are created readable by the service user only (0600 / 0700).
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MAGIC = Buffer.from('THUNAIENC1');

/** 32-byte key from BACKUP_ENCRYPTION_KEY (hex), or null when backups are not encrypted. */
export function backupKey(raw = process.env.BACKUP_ENCRYPTION_KEY) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(s)) throw new Error('BACKUP_ENCRYPTION_KEY must be 64 hex characters (openssl rand -hex 32)');
  return Buffer.from(s, 'hex');
}

export function encryptFile(src, dest, key) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([c.update(fs.readFileSync(src)), c.final()]);
  fs.writeFileSync(dest, Buffer.concat([MAGIC, iv, c.getAuthTag(), body]), { mode: 0o600 });
}

export function decryptFile(src, dest, key) {
  const buf = fs.readFileSync(src);
  if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Not an encrypted Thunai backup');
  const iv = buf.subarray(MAGIC.length, MAGIC.length + 12);
  const tag = buf.subarray(MAGIC.length + 12, MAGIC.length + 28);
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  fs.writeFileSync(dest, Buffer.concat([d.update(buf.subarray(MAGIC.length + 28)), d.final()]), { mode: 0o600 }); // throws if tampered / wrong key
}

/** Run fn on a plaintext path for `file` (decrypting .enc backups to a private temp file first). */
function withPlain(file, fn, key = backupKey()) {
  if (!file.endsWith('.enc')) return fn(file);
  if (!key) throw new Error('BACKUP_ENCRYPTION_KEY is needed to read an encrypted backup');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-restore-'));
  const tmp = path.join(dir, 'plain.db');
  try { decryptFile(file, tmp, key); return fn(tmp); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

export function backup(dbFile, outDir, { key = backupKey() } = {}) {
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(outDir, `thunai-${stamp}.db`);
  const db = new DatabaseSync(dbFile);
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  db.close();
  try { fs.chmodSync(target, 0o600); } catch { /* not the owner */ }
  if (!key) return target;
  encryptFile(target, `${target}.enc`, key);
  fs.rmSync(target, { force: true });
  return `${target}.enc`;
}

export function verify(file, { key } = {}) {
  return withPlain(file, verifyPlain, key ?? backupKey());
}

function verifyPlain(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  const ok = db.prepare('PRAGMA integrity_check').get();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all().map((t) => t.name);
  const counts = Object.fromEntries(tables.map((t) => [t, db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get().n]));
  db.close();
  return { ok: Object.values(ok)[0] === 'ok', counts };
}

export function restore(file, dbFile, { key } = {}) {
  return withPlain(file, (plain) => {
    const v = verifyPlain(plain);
    if (!v.ok) throw new Error(`Backup failed integrity check: ${file}`);
    if (fs.existsSync(dbFile)) fs.copyFileSync(dbFile, `${dbFile}.pre-restore`);
    for (const ext of ['-wal', '-shm']) fs.rmSync(`${dbFile}${ext}`, { force: true });
    fs.copyFileSync(plain, dbFile);
    try { fs.chmodSync(dbFile, 0o600); fs.chmodSync(`${dbFile}.pre-restore`, 0o600); } catch { /* not the owner / no previous file */ }
    return v;
  }, key ?? backupKey());
}

/** Delete all but the newest `keep` backups in a directory. Returns the removed file names. */
export function prune(outDir, keep) {
  const files = fs.readdirSync(outDir).filter((f) => /^thunai-.*\.db(\.enc)?$/.test(f)).sort();
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

