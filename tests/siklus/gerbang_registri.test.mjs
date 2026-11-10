// UJ-G0-01: registri sumber Siklus; tiap sumber punya pemilik, pemakai, jadwal, lisensi, jeda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SUMBER = join(ROOT, 'scripts/siklus/sumber.json');
const py = (...a) => spawnSync('python3', ['-I', join(ROOT, 'scripts/siklus/registri.py'), ...a], { encoding: 'utf8', cwd: ROOT });

test('self-check registri.py hijau', () => {
  const r = py('uji');
  assert.equal(r.status, 0, r.stderr + r.stdout);
});

test('sumber.json nyata sah dan tiap sumber punya pemilik, pemakai, jadwal, lisensi, jeda', () => {
  const r = py('periksa');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const d = JSON.parse(readFileSync(SUMBER, 'utf8'));
  assert.equal(d.sumber.length, 43);
  for (const x of d.sumber) {
    for (const k of ['pemilik', 'pemakai', 'jadwal', 'lisensi'])
      assert.ok(String(x[k]).trim(), `${x.id}: ${k} kosong`);
    assert.ok(x.jeda >= 2, `${x.id}: jeda < 2`);
  }
});

test('sumber tanpa pemakai DITOLAK oleh registri.py (mode gagal terbukti)', () => {
  const d = JSON.parse(readFileSync(SUMBER, 'utf8'));
  delete d.sumber[3].pemakai;
  const dir = mkdtempSync(join(tmpdir(), 'registri-'));
  const salah = join(dir, 'sumber.json');
  writeFileSync(salah, JSON.stringify(d));
  const r = spawnSync('python3', ['-I', '-c',
    `import importlib.util,sys\ns=importlib.util.spec_from_file_location("r","${join(ROOT, 'scripts/siklus/registri.py')}")\nm=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nx=m.periksa(m.muat("${salah}"))\nprint("\\n".join(x));sys.exit(1 if x else 0)`],
    { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /pemakai kosong/);
});

test('jumlah anggaran lapis tidak melampaui plafon 4 GB', () => {
  const { anggaran: a } = JSON.parse(readFileSync(SUMBER, 'utf8'));
  assert.equal(a.plafon_byte, 4_000_000_000);
  assert.ok(Object.values(a.lapis).reduce((s, v) => s + v, 0) <= a.plafon_byte);
});
