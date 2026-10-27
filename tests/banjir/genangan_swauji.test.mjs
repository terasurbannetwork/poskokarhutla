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

test('genangan/mesin.mjs swa-uji (subsidensi, alur 4-tersambung, profil monoton, tanggul, disagregasi hujan)', () => {
  const out = execFileSync('node', ['scripts/banjir/genangan/mesin.mjs', 'uji'], { encoding: 'utf8', timeout: 120000 });
  assert.match(out, /ok/);
});

test('genangan/kunci_j3.py swa-uji (sidik, jangkar, buka sekali, penilai wajib)', () => {
  const out = execFileSync('python3', ['scripts/banjir/genangan/kunci_j3.py', 'uji'], { encoding: 'utf8', timeout: 120000 });
  assert.match(out, /ok/);
});

for (const s of ['skor_j3', 'kalibrasi_j3']) {
  test(`genangan/${s}.py swa-uji`, () => {
    const out = execFileSync('python3', [`scripts/banjir/genangan/${s}.py`, 'uji'], { encoding: 'utf8', timeout: 120000 });
    assert.match(out, /ok/);
  });
}
