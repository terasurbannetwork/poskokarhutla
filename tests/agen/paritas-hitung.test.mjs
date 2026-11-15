import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { urai, hitung, bandingAcuan } from '../../scripts/agents/paritas.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const baru = () => ({ galat: [], turun: [] });
const BUKTI = 'scripts/agents/paritas.mjs:3';
const DAFTAR = ['scripts/agents/paritas.mjs'];

test('urai membaca bentuk biasa dan bentuk dengan kolom status paket', () => {
  const md = [
    `| A01 | x | ADA | ${BUKTI} | c |`,
    `| A02 | x | dibuat | ADA | ${BUKTI} | c |`,
    '| A03 | x | tidak berlaku (alasan) | TB | - |',
    '| A04 | x | SEBAGIAN | - |',
    '| A05 | x | BELUM | - |',
    '| bukan baris | ADA |',
  ].join('\n');
  assert.deepEqual(urai(md).map(b => [b.kode, b.status]),
    [['A01', 'ada'], ['A02', 'ada'], ['A03', 'tb'], ['A04', 'sebagian'], ['A05', 'belum']]);
});

test('TB tidak dijumlah ke berlaku; komponen G dihitung terpisah', () => {
  const b = urai(`| A01 | x | ADA | ${BUKTI} |\n| A02 | x | TB | - |\n| A03 | x | BELUM | - |\n| G01 | x | BELUM | - |`);
  const h = hitung('banjir', b, DAFTAR, baru());
  assert.deepEqual([h.a_f.ada, h.a_f.belum, h.a_f.tb, h.a_f.berlaku], [1, 1, 1, 2]);
  assert.equal(h.g.berlaku, 1);
});

test('K5: G02/G03/G10 gempa|cuaca|udara tidak berlaku ditolak; bencana lain boleh', () => {
  for (const id of ['gempa', 'cuaca', 'udara'])
    for (const k of ['G02', 'G03', 'G10']) {
      const l = baru();
      hitung(id, urai(`| ${k} | x | TB | - |`), DAFTAR, l);
      assert.equal(l.galat.length, 1, `${id} ${k} harus ditolak`);
    }
  const l = baru();
  hitung('longsor', urai('| G02 | x | TB | - |'), DAFTAR, l);
  hitung('gempa', urai('| G01 | x | TB | - |'), DAFTAR, l);
  assert.equal(l.galat.length, 0);
});

test('ADA tanpa berkas bukti diturunkan ke SEBAGIAN dan dilaporkan', () => {
  const md = '| A01 | x | ADA | berkas/yang/tidak/ada.py:1 |\n| A02 | x | ADA | tanpa jalur sama sekali |';
  const l = baru();
  const h = hitung('banjir', urai(md), DAFTAR, l);
  assert.deepEqual([h.a_f.ada, h.a_f.sebagian], [0, 2]);
  assert.equal(l.turun.length, 2);
});

test('ADA banjir turun dari acuan = gagal; sama atau naik lolos', () => {
  const acuan = JSON.parse(readFileSync(join(ROOT, 'tests/agen/fixtures/paritas-acuan.json'), 'utf8'));
  assert.equal(acuan.banjir.ada, 73);
  const lapor = (ada) => { const l = baru(); bandingAcuan({ banjir: { a_f: { ada } } }, acuan, l); return l.galat.length; };
  assert.equal(lapor(72), 1, 'turun harus gagal (jahat)');
  assert.equal(lapor(73), 0);
  assert.equal(lapor(80), 0);
  // bencana tanpa berkas (karhutla) tidak mengarang kunci
  const l = baru(); bandingAcuan({}, { karhutla: { ada: 9 } }, l);
  assert.equal(l.galat.length, 0);
});

test('integrasi: paritas.mjs --cek lolos pada repo nyata', () => {
  const r = spawnSync('node', ['scripts/agents/paritas.mjs', '--cek'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, `paritas --cek gagal. Sebab: ${r.stderr}\nAkibat: paritas.json/tabel basi atau ADA turun dari acuan.\nPerbaiki: node scripts/agents/paritas.mjs lalu periksa bukti yang hilang.`);
});
