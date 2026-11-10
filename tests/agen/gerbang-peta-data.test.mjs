// Gerbang peta data (10 Nov 2026): data eksternal yang diambil harus punya pemakai nyata dan penjadwal.
// Aturan pemilik: "gw ga mau hanya jadi data kosong". Yatim/tanpa-jadwal lama = utang ratchet
// (tests/agen/fixtures/peta-data-utang.json, hanya boleh menyusut). Yang BARU gagal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKRIP = join(ROOT, 'scripts/agents/peta_data.py');

const jalan = (...a) => spawnSync('python3', [SKRIP, ...a], { encoding: 'utf8', cwd: ROOT, maxBuffer: 1 << 26 });

function fixture(berkas) {
  const d = mkdtempSync(join(tmpdir(), 'peta-data-'));
  for (const [p, isi] of Object.entries(berkas)) {
    mkdirSync(dirname(join(d, p)), { recursive: true });
    writeFileSync(join(d, p), isi);
  }
  return d;
}
const KOSONG = join(mkdtempSync(join(tmpdir(), 'peta-utang-')), 'utang.json');
writeFileSync(KOSONG, JSON.stringify({ yatim: [], 'tanpa-jadwal': [], pengecualian: {} }));

const PENULIS = `import json\nURL="https://data.bmkg.go.id/x"\nopen("public/data/baru.json","w").write(json.dumps({}))\n`;
const WF = `on:\n  schedule:\n    - cron: "5 * * * *"\njobs:\n  a:\n    steps:\n      - run: python3 scripts/umum/baru.py\n`;

test('self-check peta_data.py hijau', () => {
  const r = jalan('uji');
  assert.equal(r.status, 0, r.stderr + r.stdout);
});

test('repo nyata: tidak ada yatim/tanpa-jadwal baru di luar utang ratchet', () => {
  const r = jalan('periksa');
  assert.equal(r.status, 0,
    `Peta data menemukan pelanggaran. Sebab: data baru diambil tanpa pemakai/penjadwal, atau utang lama sudah lunas tapi masih tercatat. ` +
    `Akibat: data kosong yang membusuk. Perbaiki: sambungkan layar/laporan/jadwal, atau sunting tests/agen/fixtures/peta-data-utang.json ` +
    `(pengecualian bertanggal+beralasan; utang hanya boleh berkurang).\n${r.stdout}${r.stderr}`);
});

test('mode gagal terbukti: berkas yatim buatan membuat periksa MERAH', () => {
  const akar = fixture({ 'scripts/umum/baru.py': PENULIS, '.github/workflows/a.yml': WF, 'public/data/baru.json': '{}' });
  const r = jalan('periksa', '--akar', akar, '--utang', KOSONG);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /baru\.json berstatus yatim/);
});

test('mode gagal terbukti: tanpa-jadwal buatan membuat periksa MERAH', () => {
  const akar = fixture({ 'scripts/umum/baru.py': PENULIS, 'public/data/baru.json': '{}', 'public/layar.js': 'fetch("data/baru.json")' });
  const r = jalan('periksa', '--akar', akar, '--utang', KOSONG);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /baru\.json berstatus tanpa-jadwal/);
});

test('berkas terpakai + terjadwal hijau; utang dan pengecualian bertanggal meloloskan; utang basi merah', () => {
  const hijau = fixture({ 'scripts/umum/baru.py': PENULIS, '.github/workflows/a.yml': WF, 'public/data/baru.json': '{}', 'public/layar.js': 'fetch("data/baru.json")' });
  assert.equal(jalan('periksa', '--akar', hijau, '--utang', KOSONG).status, 0);

  const yatim = fixture({ 'scripts/umum/baru.py': PENULIS, '.github/workflows/a.yml': WF, 'public/data/baru.json': '{}' });
  const tulis = o => { const p = join(mkdtempSync(join(tmpdir(), 'peta-utang-')), 'u.json'); writeFileSync(p, JSON.stringify(o)); return p; };
  const nama = 'public/data/baru.json';
  assert.equal(jalan('periksa', '--akar', yatim, '--utang', tulis({ yatim: [nama], 'tanpa-jadwal': [], pengecualian: {} })).status, 0);
  assert.equal(jalan('periksa', '--akar', yatim, '--utang',
    tulis({ yatim: [], 'tanpa-jadwal': [], pengecualian: { [nama]: { alasan: 'bahan uji sebelum layarnya ada', tanggal: '2026-11-10' } } })).status, 0);
  assert.equal(jalan('periksa', '--akar', yatim, '--utang',
    tulis({ yatim: [], 'tanpa-jadwal': [], pengecualian: { [nama]: { alasan: 'pendek', tanggal: '2026-11-10' } } })).status, 1);
  // ratchet: utang yang sudah tersambung wajib dihapus
  assert.equal(jalan('periksa', '--akar', hijau, '--utang', tulis({ yatim: [nama], 'tanpa-jadwal': [], pengecualian: {} })).status, 1);
});

test('keluaran peta memuat bagian tally dan berkas BMKG yang diminta pemilik', () => {
  const peta = JSON.parse(readFileSync(join(ROOT, 'docs/peta_data.json'), 'utf8'));
  const nama = new Set(peta.baris.map(b => b.berkas));
  for (const n of ['public/banjir/data/cuaca_bmkg_kab10.json', 'public/banjir/data/cuaca_bandara_bmkg.json', 'public/udara/data/omc_bmkg.json'])
    assert.ok(nama.has(n), `${n} hilang dari docs/peta_data.json: jalankan python3 scripts/agents/peta_data.py bangun`);
  assert.ok(peta.pasangan.length >= 4, 'daftar pasangan tally kosong');
  assert.match(readFileSync(join(ROOT, 'docs/PETA-DATA.md'), 'utf8'), /Pengecekan tally/);
});
