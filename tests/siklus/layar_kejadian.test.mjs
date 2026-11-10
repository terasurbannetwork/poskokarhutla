// Layar Buku Besar Kejadian (SK-027, SK-028, SK-031; UJ-F1-16): Chrome nyata di 1440 dan 390 piksel, CSP asli, API palsu.
// Jalan: node --test tests/siklus/layar_kejadian.test.mjs   (tanpa Chrome, uji peramban dilewati; uji sumber tetap jalan)
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {sajikan, bukaPeramban, cariChrome, galatNyata, KJ, PUB} from './_layar.mjs';

const SKRIP = readdirSync(path.join(PUB, 'siklus')).filter((n) => n.endsWith('.js')).map((n) => [n, readFileSync(path.join(PUB, 'siklus', n), 'utf8')]);
const KJ2 = 'KJ-2026-7K3M9Q2A', KJ_ALIAS = 'KJ-2026-0A0A0A0A';
const SID = 'a'.repeat(16), SID2 = 'b'.repeat(16);
const BARIS = [
  {id: KJ, nama: 'Banjir Bogor November 2026', jenis: 'banjir', kab4: '3201', prov: '32', mulai: '2026-11-05', fase: 'tanggap', publik: 1, dummy: 0},
  {id: KJ2, nama: 'Gempa Rote Ndao', jenis: 'gempa', kab4: null, prov: null, mulai: '2026-11-03', fase: 'terdeteksi', publik: 0, dummy: 1},
  {id: 'KJ-2026-MT5Z0ZVT', nama: 'Karhutla Aceh Selatan', jenis: 'karhutla', kab4: '1101', prov: '11', mulai: '2026-11-01', fase: 'selesai', publik: 0, dummy: 0},
];
const DAMPAK = (n, y) => ({meninggal: {n, y, t: '2026'}, terdampak: {n: null, y: 'menunggu', t: null}});
const DETAIL = {
  kejadian: {...BARIS[0], akhir: null, tanggap_mulai: '2026-11-05', tanggap_akhir: null, ringkasan_publik: 'Banjir bandang merendam sebagian kecamatan di Kabupaten Bogor.', yakin: 'resmi', diubah: Date.now()},
  wilayah: 'Bogor, Jawa Barat', kab: ['3201'],
  sumber: [
    {id: SID, sumber: 'dibi', kode: 'D1', status: 'terpasang', jenis: 'banjir', kab4: '3201', mulai: '2026-11-05', dampak: DAMPAK(12, 'resmi'), pengenal_luar: null, dummy: 0},
    {id: SID2, sumber: 'logbook', kode: 'L1', status: 'terpasang', jenis: 'banjir', kab4: '3201', mulai: '2026-11-05', dampak: DAMPAK(15, 'terverifikasi'), pengenal_luar: null, dummy: 0},
  ],
  selisih: [], kaji_ids: [], pulih_ids: [],
  jejak: [{id: 2, waktu: Date.now() - 36e5, oleh: 'staf:1', obyek: 'kejadian', obyek_id: KJ, aksi: 'fase', dari: 'terverifikasi', ke: 'tanggap', catatan: null}, {id: 1, waktu: Date.now() - 72e5, oleh: 'sistem:ingest', obyek: 'kejadian', obyek_id: KJ, aksi: 'buat', dari: null, ke: 'terdeteksi', catatan: null}],
};
const PERAN = {ko: {saya: [200, {staf: {peran: ['koordalops']}}], akad: [401, {galat: 'x'}]}, sa: {saya: [401, {galat: 'x'}], akad: [200, {peran: ['admin'], super: true}]}};

const buatApi = (peran, kosong = false) => (metode, jalur, q) => {
  if (jalur === '/api/staf/saya') return PERAN[peran].saya;
  if (jalur === '/api/akademisi/saya') return PERAN[peran].akad;
  if (jalur === '/api/siklus/kejadian' && metode === 'GET') return [200, {baris: kosong ? [] : BARIS, berikut: null}];
  if (jalur === '/api/siklus/antrean') return [200, {baris: [], berikut: null}];
  if (jalur === `/api/siklus/kejadian/${KJ}`) return [200, DETAIL];
  if (jalur === `/api/siklus/kejadian/${KJ_ALIAS}`) return [200, {alias_ke: KJ}];
  if (jalur === `/api/siklus/kejadian/${KJ}/fase` && metode === 'POST') return [200, {id: KJ, fase: 'transisi'}];
  if (jalur === '/api/siklus/dummy' && metode === 'POST') return [201, {dibuat: 7, per_tabel: {sk_kejadian: 7}}];
  return null;
};

test('sumber layar: tanpa innerHTML, tanpa on*, tanpa style inline, tanpa kaki sumber, tanpa toLocaleString lepas, tanpa kolom total', () => {
  assert.ok(SKRIP.length >= 5);
  for (const [n, t] of SKRIP) {
    assert.doesNotMatch(t, /innerHTML|insertAdjacentHTML|document\.write/, `${n}: markup mentah`);
    assert.doesNotMatch(t, /\bon[a-z]{3,}\s*=\s*["'`]|\.on(click|change|input)\s*=/, `${n}: handler inline`);
    assert.doesNotMatch(t, /setAttribute\(\s*["']style["']|\sstyle\s*=\s*["']/, `${n}: style inline (CSP)`);
    assert.doesNotMatch(t, /Sumber: |class:\s*"ex-ft"/, `${n}: kaki sumber`);
    assert.doesNotMatch(t, /toLocaleString\(/, `${n}: formatter angka kedua`);
  }
  const kej = SKRIP.find(([n]) => n === 'kejadian.js')[1];
  assert.doesNotMatch(kej, /h\("th",[^)]*"Total"/i, 'kolom total dilarang (KA 7)');
  assert.match(kej, /nanti/, 'isi berat ditunda lewat nanti()');
});

test('hanya peran Super Admin memasang dummy: jalur pemasangan memeriksa p.sa', () => {
  const inti = SKRIP.find(([n]) => n === 'inti.js')[1];
  assert.match(inti, /if \(p\.sa\) \(await import\("\.\/dummy\.js"\)\)\.pasangDummy/);
});

const chrome = cariChrome();
test('layar kejadian di Chrome nyata (1440 dan 390)', {skip: !chrome && 'Chrome tidak ditemukan; set CHROME_BIN'}, async (t) => {
  const pb = await bukaPeramban();
  try {
    await t.test('daftar: kartu standar, pilihan penuh lebar, selisih tanpa total, kosong berupa kata', async () => {
      const s = await sajikan(buatApi('ko'));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900);
        await T.buka(`${s.url}/siklus/kejadian`, {tunggu: '#daftar table'});
        const d = await T.eval(`(() => { const k = document.querySelector('#daftar'); return {ex: k.classList.contains('ex-std'), ey: !!k.querySelector('.ex-ey'), hl: !!k.querySelector('h3 .hl'), baris: k.querySelectorAll('tbody tr').length,
          kepala: [...k.querySelectorAll('thead th')].map(x => x.textContent), titles: [...k.querySelectorAll('thead th')].every(x => x.title), penuh: !!k.querySelector('.seg.penuh'), ft: !!k.querySelector('.ex-ft'), teks: k.innerText, seg: k.querySelector('.seg.penuh').getBoundingClientRect().width, kartu: k.getBoundingClientRect().width}; })()`);
        assert.ok(d.ex && d.ey && d.hl && !d.ft); assert.equal(d.baris, 3); assert.ok(d.titles, 'definisi kolom di title kepala');
        assert.ok(!d.kepala.some((x) => /total/i.test(x)), 'tanpa kolom total');
        assert.match(d.teks, /wilayah belum terpetakan/); assert.ok(d.seg > d.kartu * 0.8, 'deretan pilihan penuh lebar');
        // chrome urgent: aria-pressed berganti dalam tick yang sama dengan klik; isi menyusul
        const urgent = await T.eval(`(() => { const b = [...document.querySelectorAll('#daftar .seg.penuh button')].find(x => /Banjir/.test(x.textContent)); b.click(); return b.getAttribute('aria-pressed'); })()`);
        assert.equal(urgent, 'true');
        await T.tungguFungsi(`document.querySelectorAll('#daftar tbody tr').length === 1`);
        assert.deepEqual(galatNyata(T), []); assert.deepEqual(s.hilang, []);
        await T.ukuran(390, 844); await T.buka(`${s.url}/siklus/kejadian`, {tunggu: '#daftar table'});
        const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di 390: ${l.sw} > ${l.iw}`);
        await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('daftar kosong menulis kata, bukan angka nol', async () => {
      const s = await sajikan(buatApi('ko', true));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/kejadian`, {tunggu: '.sk-kead[data-k=kosong]'});
        const teks = await T.eval(`document.querySelector('#daftar').innerText`);
        assert.match(teks, /Belum ada kejadian pada rentang ini/); assert.doesNotMatch(teks, /\b0 kejadian/);
        await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('detail: dampak per sumber berdampingan dengan selisih tertulis, tanpa total; linimasa; alias mengarah ke penyintas', async () => {
      const s = await sajikan(buatApi('ko'));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900);
        await T.buka(`${s.url}/siklus/kejadian/${KJ}`, {tunggu: '#k-dampak .sk-ber'});
        const d = await T.eval(`(() => ({ber: document.querySelector('#k-dampak .sk-ber').innerText, kepala: [...document.querySelectorAll('#k-dampak thead th')].map(x => x.textContent), judul: document.querySelector('#k-kepala h3').innerText,
          garis: document.querySelectorAll('#k-waktu .sk-garis li').length, fase: document.querySelector('#k-kepala .sk-fase').textContent, tombol: [...document.querySelectorAll('#k-kepala [data-aksi]')].map(x => x.textContent.trim()), tid: document.querySelector('#k-dampak').innerText}))()`);
        assert.match(d.ber, /DIBI 12, Logbook Pusdalops 15, selisih 3/); assert.ok(d.kepala.includes('Selisih')); assert.ok(!d.kepala.some((x) => /total/i.test(x)));
        assert.match(d.judul, /12 jiwa menurut DIBI, 15 menurut Logbook, selisih 3/); assert.equal(d.garis, 2); assert.match(d.fase, /Tanggap/);
        assert.match(d.tid, /tidak ada/, 'terdampak tidak dilaporkan: ditulis tidak ada, bukan 0'); assert.ok(d.tombol.includes('Naikkan') && d.tombol.includes('Gabung'));
        assert.deepEqual(galatNyata(T), []);
        await T.buka(`${s.url}/siklus/kejadian/${KJ_ALIAS}`); await T.tungguFungsi(`location.pathname.endsWith('${KJ}')`, 8000);
        await T.ukuran(390, 844); await T.buka(`${s.url}/siklus/kejadian/${KJ}`, {tunggu: '#k-dampak .sk-ber'});
        const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di 390: ${l.sw} > ${l.iw}`);
        await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('dummy: dua ikon hanya untuk Super Admin; isi memuat ulang dan melapor jumlah nyata', async () => {
      const ko = await sajikan(buatApi('ko'));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${ko.url}/siklus/kejadian`, {tunggu: '#daftar table'});
        await new Promise((r) => setTimeout(r, 400));
        assert.equal(await T.eval(`document.querySelectorAll('.sk-dummy').length`), 0, 'peran lain: DOM dummy tidak dibuat');
        await T.tutup();
      } finally { await ko.tutup(); }
      const sa = await sajikan(buatApi('sa'));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${sa.url}/siklus/kejadian`, {tunggu: '.sk-dummy'});
        assert.equal(await T.eval(`document.querySelectorAll('.sk-dummy button').length`), 2);
        await T.klik('.sk-dummy button[data-dummy=isi]');
        await T.tungguFungsi(`document.getElementById('toast').textContent.includes('7 baris dummy dibuat')`, 10000);
        const p = sa.catat.find((c) => c.jalur === '/api/siklus/dummy'); assert.ok(p, 'rute dummy dipanggil');
        assert.equal(p.xpb, '1'); assert.equal(p.badan.aksi, 'isi'); assert.equal(p.badan.halaman, 'kejadian'); assert.match(p.badan.periode.dari, /^\d{4}-\d\d-\d\d$/); assert.match(p.badan.periode.sampai, /^\d{4}-\d\d-\d\d$/);
        assert.deepEqual(galatNyata(T), []); await T.tutup();
      } finally { await sa.tutup(); }
    });
  } finally { await pb.tutup(); }
});
