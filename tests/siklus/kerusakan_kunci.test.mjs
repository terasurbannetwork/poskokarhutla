// KS-01 / RENCANA-UJI T1: kriteria uji banjir kerusakan satelit terkunci. Berubah diam-diam = merah.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const KRI = 'scripts/siklus/kerusakan_kriteria.json';
const SID = 'scripts/siklus/kerusakan_sidik.json';
const teks = readFileSync(KRI, 'utf8');
const sidik = JSON.parse(readFileSync(SID, 'utf8'));
const K = JSON.parse(teks);
const sha = (s) => createHash('sha256').update(s).digest('hex');

test('sidik berkas kriteria cocok dengan kerusakan_sidik.json', () => {
  assert.equal(sha(teks.replace(/\n$/, '')), sidik.sidik);
});

const diHead = (() => { try { execFileSync('git', ['cat-file', '-e', `HEAD:${KRI}`], { stdio: 'ignore' }); return true; } catch { return false; } })();

test('jangkar_commit wajib terisi begitu berkas kriteria sudah ada di HEAD', () => {
  assert.ok(sidik.jangkar_commit || !diHead, 'isi jangkar_commit (hash commit yang memuat kriteria) sesudah commit pertama');
});

test('bila sudah dijangkar, isi di commit jangkar sama persis', () => {
  if (!sidik.jangkar_commit) return; // belum di HEAD: menunggu commit pertama
  const isi = execFileSync('git', ['show', `${sidik.jangkar_commit}:${KRI}`], { encoding: 'utf8' });
  assert.equal(isi, teks);
  execFileSync('git', ['merge-base', '--is-ancestor', sidik.jangkar_commit, 'HEAD']);
});

test('kriteria banjir: kab dan kecamatan terpisah, ambang bersumber, tanpa angka karangan', () => {
  assert.equal(K.tingkat_kabupaten.min_n_uji, 30);
  assert.equal(K.tingkat_kabupaten.min_rho_uji, 0.3);
  assert.equal(K.tingkat_kabupaten.vonis_maksimal, 'lulus_terbatas');
  assert.equal(K.tingkat_kecamatan.min_unit_uji, 40);
  assert.equal(K.tingkat_kecamatan.min_rho_uji, 0.5);
  assert.match(K.tingkat_kecamatan.status_kebenaran, /^menunggu/);
});

test('pasangan: n uji memadai, kalibrasi dan uji tak berbagi blok, kolom lengkap', () => {
  const ix = Object.fromEntries(K.pasangan_kolom.map((c, i) => [c, i]));
  const bagian = { kalibrasi: new Set(), uji: new Set() };
  const n = { kalibrasi: 0, uji: 0 };
  const kunci = new Set();
  for (const r of K.pasangan) {
    assert.equal(r.length, K.pasangan_kolom.length);
    assert.ok(r[ix.rumah_terendam_dibi] > 0);
    assert.ok(r[ix.mulai] >= '2017-01-01');
    bagian[r[ix.bagian]].add(r[ix.blok]);
    n[r[ix.bagian]]++;
    const k = [r[ix.sumber], r[ix.prov], r[ix.kab], r[ix.mulai]].join('|');
    assert.ok(!kunci.has(k), 'pasangan ganda ' + k);
    kunci.add(k);
  }
  assert.ok(n.uji >= K.tingkat_kabupaten.min_n_uji && n.kalibrasi > 0);
  for (const b of bagian.uji) assert.ok(!bagian.kalibrasi.has(b), 'blok terbelah ' + b);
});

test('parameter terkunci: selisih, CI, benih, adegan, kisi dB, skor', () => {
  const t = K.tingkat_kabupaten, k = K.tingkat_kecamatan;
  assert.equal(t.selisih_plasebo_min, 0.05);
  assert.equal(t.selisih_naif_min, 0.05);
  assert.equal(k.selisih_plasebo_min, 0.05);
  assert.equal(k.selisih_naif_min, 0.05);
  assert.deepEqual([t.ci.tingkat, t.ci.ulang, t.ci.benih], [0.9, 1000, 20261115]);
  assert.match(t.ci.jenis, /blok sumber\|bulan/);
  assert.match(t.ci.sensitivitas, /per kabupaten/);
  assert.equal(K.pemisahan.benih, 20261115);
  assert.equal(K.adegan.n_sebelum, 3);
  assert.equal(K.adegan.sesudah_maks_hari, 6);
  assert.deepEqual(K.skor_satelit.kisi_db, [-16, -17, -18, -19, -20]);
  assert.match(K.skor_satelit.keluarga_ambang, /ABSOLUT, polarisasi VV saja/);
  assert.match(K.batas_klaim, /peringkat besar-kecil/);
  assert.ok(K.pembanding.naif.length >= 6);
});

test('blok dan bagian dihitung ulang dari sha256(benih|blok)', () => {
  const ix = Object.fromEntries(K.pasangan_kolom.map((c, i) => [c, i]));
  const ukuran = new Map();
  for (const r of K.pasangan) {
    assert.equal(r[ix.blok], `${r[ix.sumber]}|${r[ix.mulai].slice(0, 7)}`);
    ukuran.set(r[ix.blok], (ukuran.get(r[ix.blok]) || 0) + 1);
  }
  const urut = [...ukuran.keys()].sort((a, b) => {
    const x = sha(`${K.pemisahan.benih}|${a}`), y = sha(`${K.pemisahan.benih}|${b}`);
    return x < y ? -1 : x > y ? 1 : 0;
  });
  const tot = { kalibrasi: 0, uji: 0 }, peta = {};
  for (const b of urut) {
    const g = tot.kalibrasi <= tot.uji ? 'kalibrasi' : 'uji';
    peta[b] = g;
    tot[g] += ukuran.get(b);
  }
  for (const r of K.pasangan) assert.equal(r[ix.bagian], peta[r[ix.blok]]);
});
