import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

let db = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    facebook_id TEXT UNIQUE,
    created_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT,
    expires_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
  CREATE TABLE IF NOT EXISTS otps (
    identifier TEXT PRIMARY KEY,
    code_hash TEXT,
    expires_at INTEGER,
    attempts INTEGER,
    sends INTEGER,
    window_start INTEGER
  );
  CREATE TABLE IF NOT EXISTS user_data (
    user_id TEXT PRIMARY KEY,
    data TEXT,
    updated_at INTEGER
  );
`;

/** Singleton SQLite handle. DB_PATH defaults to data/kaippesi.db; ':memory:' is supported. */
export function getDb() {
  if (db) return db;
  const file = process.env.DB_PATH || 'data/kaippesi.db';
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  return db;
}

export function resetDbForTests() {
  if (db) db.close();
  db = null;
}
