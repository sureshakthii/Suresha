// CLI for server/backup.js — see the header there.
//   node scripts/db-backup.mjs backup | verify <file> | restore <file>  [--db data/kaippesi.db] [--out backups/]
import { backup, verify, restore } from '../server/backup.js';

export { backup, verify, restore, prune, startBackupSchedule } from '../server/backup.js';

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg] = process.argv.slice(2);
  const opt = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const dbFile = opt('--db', process.env.DB_PATH || 'data/kaippesi.db');
  if (cmd === 'backup') console.log(backup(dbFile, opt('--out', 'backups')));
  else if (cmd === 'verify') console.log(JSON.stringify(verify(arg), null, 2));
  else if (cmd === 'restore') console.log(JSON.stringify(restore(arg, dbFile), null, 2));
  else { console.error('usage: db-backup.mjs backup|verify <file>|restore <file>'); process.exit(1); }
}
