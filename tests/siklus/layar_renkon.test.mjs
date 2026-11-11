// Layar renkon dan gladi (SK-091, SK-092; UJ-F5-08): kedaluwarsa tampil dari server, usulan sistem tidak menimpa tanpa persetujuan staf, stok belum tercatat bukan 0,
// gladi berlabel model sederhana, skor "n dari 4 komponen". Jalan: node --test tests/siklus/layar_renkon.test.mjs   (tanpa Chrome, uji peramban dilewati)
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import path from 'node:path';
import {sajikan, bukaPeramban, cariChrome, galatNyata, PUB} from './_layar.mjs';
import * as B from '../../public/siklus/hitung.js';

runInThisContext(readFileSync(path.join(PUB, 'inti/format.js'), 'utf8') + ';globalThis.fmt = fmt;');
const R = await import('../../public/siklus/renkon.js');
const GL = await import('../../public/siklus/gladi.js');

const KJ = 'KJ-2026-9A2WGN3G', NOW = Date.parse('2026-11-10T03:00:00Z'), R1 = 'a1a2a3a4a5a6a7a8', R2 = 'a2a2a3a4a5a6a7a8', R3 = 'a3a2a3a4a5a6a7a8', G1 = 'b1b2b3b4b5b6b7b8', G2 = 'b2b2b3b4b5b6b7b8';
const seg = (status, sisa, ked = false) => ({status, berlaku_sampai: sisa == null ? null : '2027-01-01', sisa, reviu_jatuh: null, kedaluwarsa: ked, hari_tersisa: sisa});
const rk = (id, judul, status, kesegaran, ekstra = {}) => ({id, judul, bencana: 'banjir', prov: '32', kab4: '3201', status, versi: 1, induk_id: null, tgl_sah: null, berlaku_sampai: kesegaran.berlaku_sampai, no_penetapan: null, reviu_terakhir: null, asumsi: null, kerangka: null, kesenjangan: null,
  kesegaran, kedaluwarsa: kesegaran.kedaluwarsa, hari_tersisa: kesegaran.sisa, dibuat: NOW, diubah: NOW, oleh: 'x', dummy: 0, ...ekstra});
const DAFTAR = [rk(R1, 'Kontingensi Banjir Bogor', 'berlaku', seg('berlaku', 400), {no_penetapan: '12/2025'}), rk(R2, 'Kontingensi Gempa Bogor', 'berlaku', seg('segera_habis', 40)), rk(R3, 'Kontingensi Lama Bogor', 'berlaku', seg('kedaluwarsa', -3, true)),
  rk('a4a2a3a4a5a6a7a8', 'Kontingensi Baru', 'persiapan', seg('menunggu', null))];
const ASUMSI = {lingkungan: {nilai: 'Banjir rob musiman', sumber: 'BPBD Bogor', waktu: '2026-10-01', yakin: 'terverifikasi'}};
const DET = rk(R1, 'Kontingensi Banjir Bogor', 'persiapan', seg('menunggu', null), {asumsi: ASUMSI, kerangka: {jiwa: 1000, hari: 5, kk: null}, kesenjangan: {target_personel: 50, catatan: null}});
const BARANG = [{nama: 'beras', status: 'stok belum tercatat', gap: null, surplus: null}, B.kesenjanganItem('air_minum', {nilai: 12500, satuan: 'liter'}, {baik: 15000, rusak: 200, belum: 0, satuan: 'liter'})];
const PERS = {...B.kesenjanganPersonel(50, 40), cakupan: 'provinsi'};
const SKOR = B.skorGladi({kesegaran: null, barang: BARANG, personel: PERS, rekomendasi: [{tertaut: true}, {tertaut: false}]});
const SKEN = {label: 'Model sederhana, bukan prakiraan', yakin: 'terverifikasi', percepatan: 2, kejadian_mulai: '2025-03-04', jenis: 'banjir', total_langkah: 3, tanpa_identitas: true, replay_maret_2025: true, lisensi: 'NC (DEM): bukan untuk keperluan komersial',
  langkah: [{t_jam: 0, sumber: 'dibi', metrik: 'meninggal', nilai: 0}, {t_jam: 1.75, sumber: 'dibi', metrik: 'meninggal', nilai: 3}, {t_jam: 12, sumber: 'logbook', metrik: 'luka', nilai: 5}]};
const GLADI = [{id: G1, jenis: 'ruang', renkon_id: R1, kejadian_id: KJ, status: 'berjalan', skenario: SKEN, masalah: [{waktu: '2026-11-10T03:00:00Z', oleh: 'x', teks: 'Radio komunikasi mati'}], rekomendasi: null, dibuat: NOW, diubah: NOW, dummy: 0},
  {id: G2, jenis: 'lapang', renkon_id: R1, kejadian_id: KJ, status: 'selesai', skenario: {...SKEN, total_langkah: 1}, masalah: null, rekomendasi: [{bidang: 'renkon', teks: 'Tambah titik kumpul', tertaut: true}, {bidang: 'sarpras', teks: 'Perbaiki perahu', tertaut: false}], dibuat: NOW, diubah: NOW, dummy: 0}];

const api = (rekam = {post: []}) => (m, j, q, badan) => {
  if (j === '/api/staf/saya') return [200, {staf: {peran: ['koordalops']}}];
  if (j === '/api/akademisi/saya') return [401, {}];
  if (j === '/api/siklus/kejadian') return [200, {baris: [{id: KJ, jenis: 'banjir', kab4: '3201', mulai: '2025-03-04', fase: 'selesai'}], berikut: null}];
  if (j === '/api/siklus/renkon' && m === 'GET') return [200, {prov: q.get('prov'), baris: DAFTAR, terpotong: false}];
  if (j === `/api/siklus/renkon/${R1}` && m === 'GET') return [200, {renkon: DET, usulan: B.kebutuhanDasar({jiwa: 1000, hari: 5}), kesenjangan_hitung: {barang: BARANG, personel: PERS, catatan: 'stok dibaca dari LogPal; tidak disalin'}, skor: SKOR, gladi: GLADI.map((g) => ({id: g.id, jenis: g.jenis, status: g.status, kejadian_id: g.kejadian_id, diubah: g.diubah}))}];
  if (j === `/api/siklus/renkon/${R1}/asumsi`) { rekam.post.push(badan); return [200, {id: R1, status: 'persiapan'}]; }
  if (j === '/api/siklus/gladi' && m === 'GET') return [200, {renkon_id: q.get('renkon_id'), baris: GLADI}];
  if (j === `/api/siklus/gladi/${G1}` && m === 'GET') return [200, {gladi: GLADI[0], renkon: {id: R1, judul: DET.judul, status: 'persiapan'}, label: 'Model sederhana, bukan prakiraan'}];
  if (j === `/api/siklus/gladi/${G1}/status`) { rekam.post.push(badan); return [200, {id: G1, status: badan.ke}]; }
  return null;
};
const SALAH = /\bnull\b|undefined|NaN|\[object/;

test('renkon: status berikut, kelompok segmen, usulan tidak menimpa, gabung asumsi mempertahankan aspek lain', () => {
  assert.equal(R.statusBerikut('persiapan'), 'pelaksanaan'); assert.equal(R.statusBerikut('berlaku'), 'dimutakhirkan'); assert.equal(R.statusBerikut('dimutakhirkan'), null);
  assert.deepEqual(['semua', 'persiapan', 'berlaku', 'kedaluwarsa', 'dimutakhirkan'].map((k) => DAFTAR.filter((r) => R.cocokKelompok(r, k)).length), [4, 1, 2, 1, 0]);
  assert.equal(R.sisaTeks(DAFTAR[2]), 'lewat 3 hari'); assert.equal(R.sisaTeks(DAFTAR[1]), '40 hari'); assert.equal(R.sisaTeks(DAFTAR[3]), null);
  assert.deepEqual(R.usulanAspek(DET), {aspek: 'kependudukan', nilai: 1000, sumber: 'Usulan sistem dari kerangka respon', yakin: 'estimasi-model'});
  assert.equal(R.usulanAspek({...DET, asumsi: {kependudukan: {nilai: 1000}}}), null, 'sudah sama: tidak ada usulan'); assert.equal(R.usulanAspek({kerangka: {jiwa: null}}), null, 'jiwa kosong: tidak ada usulan');
  const g = R.gabungAsumsi(ASUMSI, 'kependudukan', {nilai: 1000, sumber: 'u', waktu: '2026-11-10', yakin: 'estimasi-model'});
  assert.deepEqual(Object.keys(g), ['lingkungan', 'kependudukan']); assert.equal(g.lingkungan.nilai, 'Banjir rob musiman'); assert.equal(R.gabungAsumsi(null, 'ekonomi', {nilai: 1, sumber: 's', waktu: '', yakin: 'hipotesis'}).ekonomi.waktu, null);
  assert.equal(R.angkaAtauTeks('12'), 12); assert.equal(R.angkaAtauTeks(' '), null); assert.equal(R.angkaAtauTeks('banyak'), 'banyak'); assert.equal(R.angkaAtauTeks('1e3'), '1e3');
});
test('gladi: urutan status, rekomendasi tertaut, jam dan nilai langkah; tanpa data menunggu bukan 0', () => {
  assert.equal(GL.statusBerikutGl('dirancang'), 'siap'); assert.equal(GL.statusBerikutGl('dievaluasi'), 'selesai'); assert.equal(GL.statusBerikutGl('selesai'), null);
  assert.deepEqual(GL.rekomendasiTertaut(GLADI[1].rekomendasi), {tertaut: 1, total: 2}); assert.deepEqual(GL.rekomendasiTertaut(null), {tertaut: 0, total: 0}); assert.equal(GL.belumTertaut(GLADI), 1);
  assert.equal(GL.jamTeks(1.75), 'T+1,8 jam'); assert.equal(GL.jamTeks(null), 'menunggu'); assert.equal(GL.nilaiLangkah({nilai: 0}), '0', 'nol sungguhan tetap 0'); assert.equal(GL.nilaiLangkah({nilai: null}), 'menunggu');
});

const chrome = cariChrome();
test('layar renkon dan gladi di Chrome nyata (1440 dan 390)', {skip: !chrome && 'Chrome tidak ditemukan; set CHROME_BIN'}, async (t) => {
  const pb = await bukaPeramban();
  try {
    await t.test('daftar renkon: kedaluwarsa dari server berpil, saring segmen satu frame, kosong tidak jadi 0', async () => {
      const s = await sajikan(api());
      try {
        for (const [w, hh] of [[1440, 900], [390, 844]]) {
          const T = await pb.tab(); await T.ukuran(w, hh); await T.buka(`${s.url}/siklus/renkon`, {tunggu: '#daftar tbody tr'});
          const d = await T.eval(`({jd: document.querySelector('#daftar h3').innerText, n: document.querySelectorAll('#daftar tbody tr').length, t: document.querySelector('#daftar').innerText, ked: document.querySelectorAll('#daftar .sk-fase[data-f=dibatalkan]').length, semua: document.body.innerText, ft: !!document.querySelector('.ex-ft'),
            aksi: [...document.querySelectorAll('#daftar [data-aksi]')].map((x) => x.textContent.trim())})`);
          assert.equal(d.n, 4); assert.match(d.jd, /2 berlaku, 1 kedaluwarsa, 1 berakhir dalam 90 hari/); assert.equal(d.ked, 1); assert.match(d.t, /lewat 3 hari/); assert.match(d.t, /menunggu/i); assert.doesNotMatch(d.semua, SALAH); assert.ok(!d.ft); assert.ok(d.aksi.includes('Renkon baru'));
          const r = await T.eval(`(async () => { const t0 = performance.now(); const b = [...document.querySelectorAll('#daftar .seg.penuh button')].find((x) => /Kedaluwarsa/.test(x.textContent)); b.click(); const p = b.getAttribute('aria-pressed');
            await new Promise((o) => requestAnimationFrame(() => requestAnimationFrame(o))); return {p, ms: performance.now() - t0, n: document.querySelectorAll('#daftar tbody tr').length}; })()`);
          assert.equal(r.p, 'true'); assert.ok(r.ms < 200, `${Math.round(r.ms)} ms`); assert.equal(r.n, 1);
          const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di ${w}`); assert.deepEqual(galatNyata(T), []); await T.tutup();
        }
      } finally { await s.tutup(); }
    });
    await t.test('detail: usulan tidak menimpa; Tolak tidak mengirim apa pun; Terima menulis isian dan mempertahankan aspek lain; stok belum tercatat bukan 0', async () => {
      const rekam = {post: []}, s = await sajikan(api(rekam));
      try {
        for (const [w, hh] of [[1440, 900], [390, 844]]) {
          rekam.post.length = 0;
          const T = await pb.tab(); await T.ukuran(w, hh); await T.buka(`${s.url}/siklus/renkon/${R1}`, {tunggu: '#renkon .seg.penuh'});
          const d = await T.eval(`({jd: document.querySelector('#renkon h3').innerText, t: document.querySelector('#renkon').innerText, semua: document.body.innerText, aksi: [...document.querySelectorAll('#renkon [data-aksi]')].map((x) => x.textContent.trim()), pil: document.querySelectorAll('#renkon .sk-pil').length})`);
          assert.match(d.jd, /1\.000 jiwa/); assert.match(d.jd, /skor kesiapan/); assert.match(d.t, /Kependudukan[\s\S]*belum diisi/); assert.match(d.t, /Kerangka respon menulis 1\.000 jiwa/); assert.match(d.t, /tidak menimpa isian tanpa persetujuan staf/);
          for (const a of ['Terima', 'Ubah', 'Tolak']) assert.ok(d.aksi.includes(a), a); assert.equal(rekam.post.length, 0, 'membuka layar tidak mengirim apa pun'); assert.doesNotMatch(d.semua, SALAH);
          const tolak = await T.eval(`(async () => { [...document.querySelectorAll('#renkon [data-aksi]')].find((x) => x.textContent.trim() === 'Tolak').click(); await new Promise((o) => setTimeout(o, 100)); return {t: document.querySelector('#renkon').innerText, aksi: [...document.querySelectorAll('#renkon [data-aksi]')].map((x) => x.textContent.trim())}; })()`);
          assert.equal(rekam.post.length, 0, 'tolak tidak menulis'); assert.match(tolak.t, /ditolak/); assert.ok(!tolak.aksi.includes('Terima')); await T.tutup();
        }
        rekam.post.length = 0;
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/renkon/${R1}`, {tunggu: '#renkon .seg.penuh'});
        await T.eval(`(async () => { [...document.querySelectorAll('#renkon [data-aksi]')].find((x) => x.textContent.trim() === 'Terima').click(); await new Promise((o) => setTimeout(o, 300)); })()`);
        assert.equal(rekam.post.length, 1); const a = rekam.post[0].asumsi; assert.equal(a.kependudukan.nilai, 1000); assert.equal(a.kependudukan.yakin, 'estimasi-model'); assert.equal(a.lingkungan.nilai, 'Banjir rob musiman', 'aspek lain tidak hilang');
        const k = await T.eval(`(async () => { [...document.querySelectorAll('#renkon .seg.penuh button')].find((x) => /Kesenjangan/.test(x.textContent)).click(); await new Promise((o) => setTimeout(o, 150)); return document.querySelector('#renkon').innerText; })()`);
        assert.match(k, /Beras[\s\S]*stok belum tercatat/); assert.match(k, /Air minum[\s\S]*12\.500 liter/); assert.match(k, /kurang 10 orang/); assert.match(k, /3 dari 4 komponen/); assert.doesNotMatch(k, /Beras\s+(Rp)?0\b/); assert.doesNotMatch(k, SALAH);
        const kb = await T.eval(`(async () => { [...document.querySelectorAll('#renkon .seg.penuh button')].find((x) => /Kerangka respon/.test(x.textContent)).click(); await new Promise((o) => setTimeout(o, 150)); return document.querySelector('#renkon').innerText; })()`);
        assert.match(kb, /Tempat sampah[\s\S]*menunggu/); assert.match(kb, /Sphere/); assert.doesNotMatch(kb, SALAH);
        assert.deepEqual(galatNyata(T), []); await T.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('gladi: daftar punya label putar ulang dan rekomendasi belum tertaut; detail berlabel model sederhana, pil hipotesis, replay Maret 2025, skor n dari 4', async () => {
      const rekam = {post: []}, s = await sajikan(api(rekam));
      try {
        for (const [w, hh] of [[1440, 900], [390, 844]]) {
          const T = await pb.tab(); await T.ukuran(w, hh); await T.buka(`${s.url}/siklus/gladi`, {tunggu: '#daftar tbody tr'});
          const d = await T.eval(`({jd: document.querySelector('#daftar h3').innerText, n: document.querySelectorAll('#daftar tbody tr').length, t: document.querySelector('#daftar').innerText, semua: document.body.innerText})`);
          assert.equal(d.n, 2); assert.match(d.jd, /2 gladi, 1 rekomendasi belum tertaut ke renkon/); assert.match(d.t, /bukan simulasi dan bukan prakiraan/); assert.match(d.t, /1 dari 2/); assert.match(d.t, /belum ada/); assert.doesNotMatch(d.semua, SALAH);
          const r = await T.eval(`(async () => { const t0 = performance.now(); const b = [...document.querySelectorAll('#daftar .seg.penuh button')].find((x) => /Lapang/.test(x.textContent)); b.click(); const p = b.getAttribute('aria-pressed');
            await new Promise((o) => requestAnimationFrame(() => requestAnimationFrame(o))); return {p, ms: performance.now() - t0, n: document.querySelectorAll('#daftar tbody tr').length}; })()`);
          assert.equal(r.p, 'true'); assert.ok(r.ms < 200); assert.equal(r.n, 1);
          const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di ${w}`); assert.deepEqual(galatNyata(T), []); await T.tutup();
        }
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/gladi/${G1}`, {tunggu: '#gladi .sk-garis'});
        const x = await T.eval(`({jd: document.querySelector('#gladi h3').innerText, t: document.querySelector('#gladi').innerText, hip: document.querySelectorAll('#gladi .sk-pil[data-y=hipotesis]').length, langkah: document.querySelectorAll('#gladi .sk-garis > li').length, semua: document.body.innerText,
          aksi: [...document.querySelectorAll('#gladi [data-aksi]')].map((a) => a.textContent.trim())})`);
        assert.match(x.t, /Model sederhana, bukan prakiraan/); assert.ok(x.hip >= 1); assert.equal(x.langkah, 3); assert.match(x.t, /Replay Maret 2025/); assert.match(x.t, /NC/); assert.match(x.t, /Radio komunikasi mati/); assert.match(x.t, /3 dari 4 komponen/);
        assert.match(x.t, /Belum ada rekomendasi; wajib terisi saat gladi selesai/); assert.match(x.jd, /3 langkah putar ulang/); assert.ok(x.aksi.includes('Lanjut ke dievaluasi')); assert.doesNotMatch(x.semua, SALAH); assert.doesNotMatch(x.t, /akan terjadi/);
        await T.eval(`(async () => { [...document.querySelectorAll('#gladi [data-aksi]')].find((a) => /Lanjut ke dievaluasi/.test(a.textContent)).click(); await new Promise((o) => setTimeout(o, 300)); })()`);
        assert.deepEqual(rekam.post, [{ke: 'dievaluasi'}]); assert.deepEqual(galatNyata(T), []); await T.tutup();
      } finally { await s.tutup(); }
    });
  } finally { await pb.tutup(); }
});
