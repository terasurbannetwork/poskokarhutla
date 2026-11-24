// Gerbang PKH-45 (data/kajian-bnpb/pembanding-pantaukarhutla/TIKET.md, kelompok G).
// Aturan: keluaran publik konsesi tidak menautkan tokoh/pemilik manfaat ke perusahaan,
// dan layar konsesi selalu memuat catatan "bukan bukti" (kaitan lokasi, bukan vonis).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const baca = (p) => readFileSync(join(ROOT, p), 'utf8');

const KUNCI_TERLARANG = ['tokoh', 'pemilik_manfaat', 'beneficial'];
const FRASA_TERLARANG = /Tokoh terkait|tokoh politik|Jabatan politik/i;
// Berkas yang memakai frasa itu untuk hal lain (bukan konsesi), dengan alasannya.
const KECUALI_FRASA = {
  'public/akademisi.js': 'direktori pakar: "jabatan politik" = riwayat jabatan publik pakar, tak terkait konsesi',
};
const LAYAR_KONSESI = ['public/aktor.js', 'public/konsesi.js', 'public/laporan_konsesi.js', 'public/laporan_konsesi.html', 'public/bnpb/saham.js'];
const PADANAN = /bukan bukti/i;

// Mengembalikan jalur kunci terlarang yang bernilai tidak kosong.
function kunciBerisi(node, jalur = '$') {
  const hasil = [];
  if (Array.isArray(node)) node.forEach((v, i) => hasil.push(...kunciBerisi(v, `${jalur}[${i}]`)));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const kosong = v == null || v === '' || (typeof v === 'object' && !Object.keys(v).length);
      if (KUNCI_TERLARANG.includes(k) && !kosong) hasil.push(`${jalur}.${k}`);
      hasil.push(...kunciBerisi(v, `${jalur}.${k}`));
    }
  }
  return hasil;
}

const urutBawaanTitik = (src) => /\burut\s*:\s*["']titik["']/.test(src);

function* berkas(dir, ekstensi) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* berkas(p, ekstensi);
    else if (ekstensi.some((e) => n.endsWith(e))) yield p;
  }
}

test('uji sintetis: gerbang merah pada pelanggaran contoh', () => {
  assert.deepEqual(kunciBerisi({ perusahaan: [{ nama: 'X', tokoh: ['A'] }] }), ['$.perusahaan[0].tokoh']);
  assert.deepEqual(kunciBerisi({ pemilik_manfaat: { nama: 'B' } }), ['$.pemilik_manfaat']);
  assert.deepEqual(kunciBerisi({ beneficial: 'C' }), ['$.beneficial']);
  assert.deepEqual(kunciBerisi({ tokoh: [], beneficial: '', pemilik_manfaat: null }), []);
  assert.ok(FRASA_TERLARANG.test('<h3>Tokoh terkait</h3>') && FRASA_TERLARANG.test('Jabatan politik'));
  assert.ok(urutBawaanTitik('const S = {urut: "titik"}') && !urutBawaanTitik('{urut: "luas_bakar_ha"}'));
  assert.ok(!PADANAN.test('Sorotan perusahaan'));
});

test('JSON publik konsesi dan aktor tanpa tokoh/pemilik manfaat terisi', () => {
  const daftar = [...berkas(join(ROOT, 'public/data/konsesi2026'), ['.json']), join(ROOT, 'public/data/aktor_karhutla.json')];
  const pelanggar = [];
  for (const p of daftar) {
    for (const j of kunciBerisi(JSON.parse(readFileSync(p, 'utf8')))) pelanggar.push(`${relative(ROOT, p)} ${j}`);
  }
  assert.deepEqual(pelanggar.slice(0, 10), [],
    'Sebab: keluaran publik memuat tokoh/pemilik manfaat tak kosong. Akibat: tokoh ditautkan ke perusahaan (pencemaran nama, PKH-45 aturan 3). ' +
    'Perbaikan: hapus kunci itu dari skrip penulis (scripts/data/konsesi_laporan.py, aktor_walhi.py) lalu bangun ulang JSON.');
});

test('skrip penulis tidak menulis kunci "tokoh"', () => {
  for (const p of ['scripts/data/konsesi_laporan.py', 'scripts/data/aktor_walhi.py']) {
    const penulis = baca(p).split('\n').filter((l) => /["']tokoh["']\s*:/.test(l));
    assert.deepEqual(penulis, [], `${p} menulis kunci "tokoh" ke keluaran publik. Akibat: tokoh tertaut ke perusahaan. Perbaikan: hapus barisnya (PKH-45).`);
  }
});

test('teks tokoh politik tidak muncul di layar publik', () => {
  const pelanggar = [];
  for (const p of berkas(join(ROOT, 'public'), ['.js', '.html'])) {
    const rel = relative(ROOT, p);
    if (KECUALI_FRASA[rel]) continue;
    const m = readFileSync(p, 'utf8').match(FRASA_TERLARANG);
    if (m) pelanggar.push(`${rel}: "${m[0]}"`);
  }
  assert.deepEqual(pelanggar, [],
    'Sebab: frasa tokoh politik muncul di layar. Akibat: kaitan orang ke perusahaan tampil sebagai fakta. ' +
    'Perbaikan: hapus teksnya; bila berkas tidak terkait konsesi, tambahkan ke KECUALI_FRASA dengan alasan.');
});

test('tiap layar konsesi memuat catatan "bukan bukti"', () => {
  const tanpa = LAYAR_KONSESI.filter((p) => !PADANAN.test(baca(p)));
  assert.deepEqual(tanpa, [],
    'Sebab: layar konsesi tanpa kalimat "bukan bukti". Akibat: kaitan lokasi bisa dibaca sebagai vonis kesalahan perusahaan. ' +
    'Perbaikan: tambahkan catatan "titik panas di konsesi bukan bukti pelaku/kesalahan" di layar itu.');
});

test('urutan bawaan laporan konsesi bukan jumlah titik', () => {
  assert.ok(!urutBawaanTitik(baca('public/laporan_konsesi.js')),
    'Sebab: urutan bawaan = titik. Akibat: perusahaan terbesar tampil teratas seolah paling bersalah. Perbaikan: pakai luas_bakar_ha.');
});
