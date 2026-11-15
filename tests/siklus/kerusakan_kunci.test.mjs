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

// v2: jangkar null hanya sah selagi versi kriteria ini belum ada di origin/main (belum di-push); sesudah push sesi induk wajib mengisinya.
const diOrigin = (() => { try { return execFileSync('git', ['show', `origin/main:${KRI}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) === teks; } catch { return false; } })();

test('jangkar_commit wajib terisi begitu versi kriteria ini sudah ada di origin/main', () => {
  assert.ok(sidik.jangkar_commit || !diOrigin, 'isi jangkar_commit (hash commit yang memuat kriteria) sesudah push');
});

test('riwayat v1 tercatat di kriteria dan sidik, versi sama', () => {
  assert.equal(K.versi, sidik.versi);
  const v1 = { sidik: '9493ddcc1ab3789d900d599212b6bb6995c882073d61946160563cee62ae60aa', jangkar_commit: '16f7ec1928bebb2755e34494636665fde6617eb1' };
  assert.deepEqual([K.riwayat[0].sidik, K.riwayat[0].jangkar_commit], [v1.sidik, v1.jangkar_commit]);
  assert.deepEqual([sidik.riwayat[0].sidik, sidik.riwayat[0].jangkar_commit], [v1.sidik, v1.jangkar_commit]);
});

test('v2: aturan baca 10 m, pengecualian, plasebo, kelayakan, keterbatasan terkunci', () => {
  assert.equal(K.aturan_baca.resolusi_m, 10);
  assert.ok(K.aturan_baca.grid_k >= 2 && K.aturan_baca.fraksi_air_min > 0);
  assert.equal(K.adegan.min_sah_komposit, 2);
  assert.equal(K.adegan.jendela_cari_hari, 120);
  assert.equal(K.adegan.titik_geometri, 400);
  assert.equal(K.adegan.plasebo.min_jarak_hari_dari_mulai, 12);
  assert.equal(K.pengecualian_mekanis.min_bagian_terliput, 0.9);
  assert.ok(K.kelayakan.min_pasangan >= 20 && K.kelayakan.naif_hand_wajib);
  assert.match(K.keterbatasan_wajib.join(' '), /sawah dan tambak/);
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
