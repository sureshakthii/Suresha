import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { backup, verify, restore, prune } from '../scripts/db-backup.mjs';

test('backup → verify → restore round-trip keeps every row', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-bk-'));
  const live = path.join(dir, 'live.db');
  const db = new DatabaseSync(live);
  db.exec("PRAGMA journal_mode = WAL; CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT); INSERT INTO users VALUES ('a', 'Anbu'), ('b', 'Bala');");
  const file = backup(live, path.join(dir, 'backups'));
  db.exec("DELETE FROM users; INSERT INTO users VALUES ('x', 'oops');");
  db.close();
  const v = verify(file);
  assert.equal(v.ok, true);
  assert.equal(v.counts.users, 2);
  restore(file, live);
  const back = new DatabaseSync(live);
  assert.deepEqual(back.prepare('SELECT name FROM users ORDER BY id').all().map((r) => r.name), ['Anbu', 'Bala']);
  back.close();
  assert.ok(fs.existsSync(`${live}.pre-restore`), 'the replaced database is kept');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('prune keeps only the newest backups', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thunai-pr-'));
  for (const n of ['2026-01-01', '2026-01-02', '2026-01-03']) fs.writeFileSync(path.join(dir, `thunai-${n}.db`), '');
  assert.deepEqual(prune(dir, 2), ['thunai-2026-01-01.db']);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['thunai-2026-01-02.db', 'thunai-2026-01-03.db']);
  fs.rmSync(dir, { recursive: true, force: true });
});
