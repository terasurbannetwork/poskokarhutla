// SK-046: tiap rute /api/siklus/* dan tiap skrip pipeline Siklus terdaftar di cakupan.json dengan uji yang benar-benar memanggilnya.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const baca = (p) => readFileSync(join(ROOT, p), 'utf8');
const C = JSON.parse(baca('tests/siklus/cakupan.json'));
const WARGA = JSON.parse(baca('tests/warga/cakupan.json'));
const ruteWarga = ['diuji', 'dikecualikan', 'antre'].flatMap((s) => Object.keys(WARGA[s])).filter((k) => k.includes('/api/siklus'));
const statis = (k) => k.split(' ')[1].split('/').filter((x) => x && !x.startsWith(':')).pop();   // segmen statis terakhir (uji kadang memakai pembantu)

test('tiap rute /api/siklus/* di cakupan warga terdaftar di sini, tanpa rute hantu', () => {
  assert.deepEqual(Object.keys(C.rute).sort(), [...ruteWarga].sort(), 'daftarkan rute baru di tests/siklus/cakupan.json');
});

test('uji server dan layar yang didaftarkan ada dan menyebut rutenya', () => {
  for (const [k, v] of Object.entries(C.rute)) {
    assert.ok(v.server && existsSync(join(ROOT, v.server)), `${k}: uji server tidak ada`);
    assert.ok(baca(v.server).includes(statis(k)), `${k}: ${v.server} tidak menyebut rutenya`);
    for (const f of v.klien) assert.ok(existsSync(join(ROOT, f)) && baca(f).includes(statis(k)), `${k}: ${f} tidak menyebut rutenya`);
  }
});

test('tiap skrip pipeline terdaftar dan punya subperintah uji; tidak ada skrip hantu', () => {
  const ada = readdirSync(join(ROOT, 'scripts/siklus')).filter((n) => n.endsWith('.py')).sort();
  assert.deepEqual(Object.keys(C.skrip).sort(), ada, 'daftarkan skrip baru di tests/siklus/cakupan.json');
  for (const n of ada) assert.match(baca(`scripts/siklus/${n}`), /["']uji["']/, `${n}: tanpa subperintah uji`);
  assert.match(baca('package.json'), /scripts\/siklus\/\*\.py.*uji/, 'npm run uji:siklus harus menjalankan uji semua skrip');
});

test('peta data hijau: sumber Siklus ber-pemakai dan ber-jadwal (tidak ada yatim baru)', () => {
  const r = spawnSync('python3', ['scripts/agents/peta_data.py', 'periksa'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
