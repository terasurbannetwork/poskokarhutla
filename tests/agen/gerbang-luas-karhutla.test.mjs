// Keputusan pemilik 31 Okt 2026: luas karhutla resmi KLHK/SiPongi/Kemenhut BOLEH dikutip dengan
// label sumber jelas. Larangan tetap untuk Koordalops, Buku Data BNPB, dan dokumen luar lain.
// Gerbang aturan pemilik: luas karhutla HANYA dari sistem Centurisk97.
// Buku Data BNPB 2024 Tabel L14 = luas per provinsi (jumlah ±9.819 ha), BUKAN nasional.
// Sebab: angka luar dipakai sebagai angka nasional menyesatkan pembaca naskah/peta.
// Akibat gagal: entri/berkas yang ditunjuk harus dibuang atau diganti angka dari peta_karhutla.json.
// Perbaikan: hapus entri dari angka.json, atau tandai jelas per provinsi + bukan nasional.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TOPIK = /karhutla|kebakaran hutan/i;
const UKURAN = /luas|\bha\b|hektar/i;
const LUAR = /bnpb-2025-buku-data-2024|buku data|koordalops/i;
const PROVINSI_BUKAN_NASIONAL = /per[\s-]*provinsi/i;
const BUKAN_NASIONAL = /bukan\s+(luas\s+)?nasional|tidak\s+nasional/i;

// Mengembalikan daftar kunci pelanggar.
export function periksaAngka(angka) {
  const rusak = [];
  for (const [kunci, e] of Object.entries(angka)) {
    const teks = JSON.stringify(e);
    if (!TOPIK.test(kunci + teks) || !UKURAN.test(kunci + teks)) continue;
    if (!LUAR.test(`${e.pustaka ?? ''} ${e.sumber ?? ''}`)) continue;
    const sah = PROVINSI_BUKAN_NASIONAL.test(`${kunci} ${e.catatan ?? ''} ${e.sumber ?? ''}`) &&
      BUKAN_NASIONAL.test(`${e.catatan ?? ''} ${e.keyakinan ?? ''}`);
    if (!sah) rusak.push(kunci);
  }
  return rusak;
}

// 9.819 / 9819 yang berdekatan (<= 100 karakter) dengan kata karhutla/kebakaran hutan.
const ANGKA_9819 = /(?<![\d.,])9[.]?819(?![\d]|[.,]\d)/g;
export function cari9819(teks) {
  const hit = [];
  for (const m of teks.matchAll(ANGKA_9819)) {
    const sekitar = teks.slice(Math.max(0, m.index - 100), m.index + 100);
    if (TOPIK.test(sekitar)) hit.push(m.index);
  }
  return hit;
}

function* berkas(dir, ekstensi) {
  for (const n of readdirSync(dir, { withFileTypes: true })) {
    if (/ 2(\.|$)/.test(n.name)) continue;
    const p = join(dir, n.name);
    if (n.isDirectory()) yield* berkas(p, ekstensi);
    else if (ekstensi.some((x) => n.name.endsWith(x)) && statSync(p).size < 2e6) yield p;
  }
}

const angkaJson = JSON.parse(readFileSync(join(ROOT, 'data/kajian-bnpb/data/angka.json'), 'utf8'));

test('kasus negatif: pemeriksa menolak entri tiruan yang melanggar, meloloskan yang sah', () => {
  const buruk = {
    'a.nasional.luas_karhutla': { nilai: 9819, pustaka: 'bnpb-2025-buku-data-2024', satuan: 'ha', sumber: 'Buku Data 2024' },
    'b.karhutla.luas': { nilai: 1, satuan: 'ha', sumber: 'Koordalops' },
  };
  assert.deepEqual(periksaAngka(buruk), Object.keys(buruk));
  const sah = {
    'd.karhutla.luas_prov': { nilai: 5, sumber: 'Buku Data 2024', catatan: 'luas karhutla per provinsi, bukan nasional' },
    'e.karhutla.luas': { nilai: 5, sumber: 'Pengolahan Centurisk97, peta_karhutla.json' },
    'g.karhutla.luas': { nilai: 5, sumber: 'SiPongi Kementerian Kehutanan' },
    'f.banjir.luas': { nilai: 5, sumber: 'Buku Data 2024' },
  };
  assert.deepEqual(periksaAngka(sah), []);
  assert.equal(cari9819('Luas karhutla 9.819 ha').length, 1);
  assert.equal(cari9819('luas kebakaran hutan 9819').length, 1);
  assert.equal(cari9819('koordinat 109.819 lintang').length, 0);
  assert.equal(cari9819('banjir 9.819 ha').length, 0);
});

test('angka.json: tak ada luas karhutla bersumber Buku Data 2024 / dokumen luar tanpa tanda per provinsi', () => {
  const rusak = periksaAngka(angkaJson.angka);
  assert.deepEqual(rusak, [],
    `Luas karhutla hanya boleh dari sistem Centurisk97 (peta_karhutla.json), bukan dokumen luar (butir 47). ` +
    `Akibatnya angka luar tampil sebagai angka nasional. Hapus entri ini atau tandai per provinsi + "bukan nasional": ${rusak.join(', ')}`);
});

test('angka 9.819 tidak muncul sebagai luas karhutla di angka.json, public, bangun', () => {
  const temuan = [];
  const periksa = (p) => {
    if (cari9819(readFileSync(p, 'utf8')).length) temuan.push(relative(ROOT, p));
  };
  // _catatan angka.json memang menyebut 9.819 sebagai larangan; periksa isi entrinya saja.
  if (cari9819(JSON.stringify(angkaJson.angka)).length) temuan.push('data/kajian-bnpb/data/angka.json (angka)');
  for (const p of berkas(join(ROOT, 'public'), ['.js', '.html', '.json'])) periksa(p);
  for (const p of berkas(join(ROOT, 'data/kajian-bnpb/bangun'), ['.js', '.mjs', '.html', '.json', '.py', '.md'])) periksa(p);
  assert.deepEqual(temuan, [],
    `9.819 ha = jumlah luas karhutla PER PROVINSI Buku Data 2024 L14, bukan luas nasional; jangan dipakai (butir 47). ` +
    `Ganti dengan luas dari sistem Centurisk97. Berkas: ${temuan.join(', ')}`);
});

test('entri luas karhutla bersumber SiPongi wajib berlabel SiPongi/KLHK/Kemenhut di sumbernya', () => {
  const tanpaLabel = Object.entries(angkaJson.angka)
    .filter(([k, e]) => /sipongi/i.test(`${k} ${e.pustaka ?? ''}`) && TOPIK.test(k) && UKURAN.test(k + JSON.stringify(e)))
    .filter(([, e]) => !/sipongi|klhk|kemenhut|kementerian kehutanan/i.test(e.sumber ?? ''))
    .map(([k]) => k);
  assert.deepEqual(tanpaLabel, [],
    `Luas SiPongi boleh dikutip hanya dengan label sumber jelas. Tulis SiPongi/KLHK/Kemenhut di field sumber: ${tanpaLabel.join(', ')}`);
});
