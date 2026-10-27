// Swa-uji skrip panen J1 genangan Jakarta (luring; tanpa jaringan). Lihat docs/multi-bencana/RANCANGAN-GENANGAN-JAKARTA.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const SKRIP = ['bersama', 'tiff_mini', 'equi7', 'petabencana', 'gfm', 'hujan_jam', 'debit_hulu', 'medan', 'saluran', 'gedung'];

for (const s of SKRIP) {
  test(`genangan/${s}.py swa-uji`, () => {
    const arg = ['bersama', 'tiff_mini', 'equi7'].includes(s) ? [] : ['uji'];
    const out = execFileSync('python3', [`scripts/banjir/genangan/${s}.py`, ...arg], { encoding: 'utf8', timeout: 120000 });
    assert.match(out, /ok/);
  });
}
