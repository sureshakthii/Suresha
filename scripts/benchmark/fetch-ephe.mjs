// Downloads the Swiss Ephemeris data files (planets + Moon, 1800–2399) used by the benchmark into ./ephe.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'ephe');
mkdirSync(dir, { recursive: true });
for (const f of ['sepl_18.se1', 'semo_18.se1']) {
  if (existsSync(join(dir, f))) { console.log(`✔ ${f} present`); continue; }
  const res = await fetch(`https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/${f}`);
  if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
  writeFileSync(join(dir, f), Buffer.from(await res.arrayBuffer()));
  console.log(`✔ downloaded ${f}`);
}
