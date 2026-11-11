// Layar masa depan (SK-097; UJ-F6-06): pil hipotesis di tiap angka, dua horizon, rentang antarmodel, kalimat "bukan ramalan kejadian", tanpa angka tunggal, ringkasan publik menunggu bukan nol.
// Jalan: node --test tests/siklus/layar_masadepan.test.mjs   (tanpa Chrome, uji peramban dilewati)
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import path from 'node:path';
import {sajikan, bukaPeramban, cariChrome, galatNyata, PUB} from './_layar.mjs';

runInThisContext(readFileSync(path.join(PUB, 'inti/format.js'), 'utf8') + ';globalThis.fmt = fmt;');
const M = await import('../../public/siklus/masadepan.js');

const cel = (med, p17, p83, rel, sat, n = 5) => ({median: med, p17, p83, n_model: n, n_model_positif: Math.max(0, n - 1), relatif_median: rel, selisih_dasar: med, satuan: sat, dasar_median: 100});
const KAB = (h) => ({ssp245: {rx1day: cel(5 * h, 2, 9 * h, 4.5 * h, 'mm'), rx5day: cel(12 * h, 4, 20 * h, 8.4 * h, 'mm'), cdd: cel(-3 * h, -8, 2, -2 * h, 'hari')}, ssp585: {rx1day: cel(6 * h, 3, 11 * h, 5 * h, 'mm'), rx5day: cel(15 * h, 6, 25 * h, 10 * h, 'mm'), cdd: cel(-1, -6, 4, -1, 'hari')}});
const MD = {v: 1, jenis: 'masa_depan', yakin: 'hipotesis', prov: '32', dasar: {periode: '1995-2014'}, horizon: ['2030', '2050'], skenario: ['ssp245', 'ssp585'], indeks: ['rx1day', 'rx5day', 'cdd'], kab: {3201: {2030: KAB(1), 2050: KAB(2)}},
  muka_laut: {2030: {ssp245: {status: 'menunggu', median: null, rentang: null, alasan: 'horizon tidak ada di tabel AR6', yakin: 'hipotesis'}, ssp585: {status: 'menunggu', median: null, rentang: null}},
    2050: {ssp245: {median: 0.2, rentang: [0.17, 0.26], dasar: '1995-2014', yakin: 'hipotesis', catatan: 'keluaran meter, bukan area tergenang; penurunan muka tanah tidak dihitung'}, ssp585: {median: 0.23, rentang: [0.2, 0.29], yakin: 'hipotesis'}}},
  catatan: 'selisih terhadap dasar, bukan ramalan kejadian', keterbatasan: 'grid sekitar 27 km'};
const TUMBUH = {v: 1, jenis: 'tumbuh', yakin: 'hipotesis', prov: '32', kab: {3201: {epoch: [2015, 2020, 2025, 2030], cagr_persen: {'2015-2020': {nilai: 1.0, basis: 'pengamatan'}, '2020-2030': {nilai: null, basis: 'model'}},
  zona: {banjir: {luas_m2: 1, pasangan: {'2015-2020': {cagr_persen: 2.8, basis: 'pengamatan', indeks_konsentrasi: 3}, '2020-2030': {cagr_persen: null, basis: 'model', indeks_konsentrasi: null}}}}, tata_ruang: {pippib_ha: null, konsesi_ha: null, rtrw: 'tidak otomatis'}}}};
const RING = {v: 1, yakin: 'hipotesis', prov: {32: {2030: {ssp245: {rx1day: 3.2, rx5day: 7.9, cdd: -1.5}}, 2050: {ssp245: {rx1day: 5.1, rx5day: 12.4, cdd: -2.2}}}}, status: null};
const api = ({tumbuh = true, ring = RING} = {}) => (m, j, q) => {
  if (j === '/api/staf/saya') return [200, {staf: {peran: ['koordalops']}}];
  if (j === '/api/akademisi/saya') return [401, {}];
  if (j === '/api/siklus/masadepan') {
    if (!q.get('prov')) return ring ? [200, ring] : [404, {galat: 'menunggu: ringkasan masa depan belum dibangun'}];
    if (q.get('jenis') === 'tumbuh') return tumbuh ? [200, TUMBUH] : [404, {galat: 'menunggu'}];
    return q.get('prov') === '32' ? [200, MD] : [404, {galat: 'menunggu: berkas masa depan provinsi ini belum dibangun'}];
  }
  return null;
};
const SALAH = /\bnull\b|undefined|NaN|\[object/;

test('fungsi murni: arah sinyal, rentang wajib dua ujung, judul menunggu bukan angka palsu, bab tumbuh', () => {
  assert.equal(M.arah(3), 'naik'); assert.equal(M.arah(-1), 'turun'); assert.equal(M.arah(0), 'tetap'); assert.equal(M.arah(null), null);
  assert.deepEqual(M.rentangSel({p17: 1, p83: 4}), [1, 4]); assert.equal(M.rentangSel({p17: 1, p83: null}), null, 'satu ujung = menunggu'); assert.equal(M.rentangSel(null), null);
  assert.equal(M.sel(MD.kab[3201], '2050', 'ssp245', 'cdd').satuan, 'hari'); assert.equal(M.sel(MD.kab[3201], '2060', 'ssp245', 'cdd'), null);
  assert.deepEqual(M.babTumbuh(TUMBUH.kab[3201]).map((x) => x.nilai), [1.0, null]); assert.deepEqual(M.babTumbuh({}), []);
});

const chrome = cariChrome();
test('layar masa depan di Chrome nyata (1440 dan 390)', {skip: !chrome && 'Chrome tidak ditemukan; set CHROME_BIN'}, async (t) => {
  const pb = await bukaPeramban();
  try {
    await t.test('detail: pil hipotesis di tiap baris, kalimat bukan ramalan, rentang antarmodel, dua horizon dan skenario, muka laut menunggu pada 2030', async () => {
      const s = await sajikan(api());
      try {
        for (const [w, hh] of [[1440, 900], [390, 844]]) {
          const T = await pb.tab(); await T.ukuran(w, hh); await T.buka(`${s.url}/siklus/masa-depan?prov=32`, {tunggu: '#masadepan tbody tr'});
          const d = await T.eval(`({jd: document.querySelector('#masadepan h3').innerText, t: document.querySelector('#masadepan').innerText, semua: document.body.innerText, baris: document.querySelector('#masadepan .ex-tabel').querySelectorAll('tbody tr').length,
            hip: document.querySelector('#masadepan .ex-tabel').querySelectorAll('tbody .sk-pil[data-y=hipotesis]').length, rentang: document.querySelectorAll('#masadepan .sk-rentang').length, ft: !!document.querySelector('.ex-ft'), seg: [...document.querySelectorAll('#masadepan .seg.penuh button')].map((b) => b.textContent.trim())})`);
          assert.match(d.jd, /naik 16,8 persen pada 2050/); assert.match(d.jd, /bukan ramalan kejadian/); assert.equal(d.baris, 3); assert.equal(d.hip, 3, 'pil hipotesis di tiap baris'); assert.ok(d.rentang >= 4, 'bilah rentang indeks dan muka laut');
          assert.match(d.t, /bukan ramalan kejadian/); assert.match(d.t, /17 sampai 26 cm/); assert.match(d.t, /Muka laut/i); assert.match(d.t, /Bangunan tumbuh di zona bahaya/i); assert.match(d.t, /RTRW: tidak ada sumber otomatis/); assert.match(d.t, /penurunan muka tanah/i);
          assert.deepEqual(d.seg.slice(0, 4), ['2030', '2050', 'SSP2-4.5 (sedang)', 'SSP5-8.5 (tinggi)']); assert.ok(!d.ft); assert.doesNotMatch(d.semua, SALAH); assert.doesNotMatch(d.semua, /akan terjadi|pasti|·|—/);
          const r = await T.eval(`(async () => { const t0 = performance.now(); const b = [...document.querySelectorAll('#masadepan .seg.penuh button')].find((x) => x.textContent.trim() === '2030'); b.click(); const p = b.getAttribute('aria-pressed');
            await new Promise((o) => requestAnimationFrame(() => requestAnimationFrame(o))); return {p, ms: performance.now() - t0, jd: document.querySelector('#masadepan h3').innerText, t: document.querySelector('#masadepan').innerText}; })()`);
          assert.equal(r.p, 'true'); assert.ok(r.ms < 200, `${Math.round(r.ms)} ms`); assert.match(r.jd, /naik 8,4 persen pada 2030/); assert.match(r.t, /horizon tidak ada di tabel AR6/); assert.match(r.t, /menunggu/i);
          const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, `gulir mendatar di ${w}`); assert.deepEqual(galatNyata(T), []); await T.tutup();
        }
        assert.deepEqual(s.hilang, []);
      } finally { await s.tutup(); }
    });
    await t.test('tanpa GHSL kartu bangunan tumbuh tidak tampil; provinsi tanpa berkas menunggu bukan nol', async () => {
      const s = await sajikan(api({tumbuh: false}));
      try {
        const T = await pb.tab(); await T.ukuran(1440, 900); await T.buka(`${s.url}/siklus/masa-depan?prov=32`, {tunggu: '#masadepan tbody tr'});
        const t = await T.eval(`document.querySelector('#masadepan').innerText`); assert.doesNotMatch(t, /Bangunan tumbuh di zona bahaya/i); assert.match(t, /Selisih terhadap dasar 1995-2014/i); await T.tutup();
        const T2 = await pb.tab(); await T2.buka(`${s.url}/siklus/masa-depan?prov=31`, {tunggu: '#masadepan .sk-kead'});
        const k = await T2.eval(`document.querySelector('#masadepan').innerText`); assert.match(k, /menunggu hitungan model iklim|belum dibangun/i); assert.doesNotMatch(k, SALAH); await T2.tutup();
      } finally { await s.tutup(); }
    });
    await t.test('ringkasan semua provinsi: median hipotesis; belum dibangun menunggu tanpa angka', async () => {
      const s = await sajikan(api()), s2 = await sajikan(api({ring: null}));
      try {
        const T = await pb.tab(); await T.ukuran(390, 844); await T.buka(`${s.url}/siklus/masa-depan`, {tunggu: '#masadepan tbody tr'});
        const d = await T.eval(`({jd: document.querySelector('#masadepan h3').innerText, t: document.querySelector('#masadepan').innerText, hip: document.querySelectorAll('#masadepan tbody .sk-pil[data-y=hipotesis]').length})`);
        assert.match(d.jd, /1 provinsi punya sinyal perubahan iklim hipotesis, bukan ramalan kejadian/); assert.equal(d.hip, 3); assert.match(d.t, /12,4/); assert.doesNotMatch(d.t, SALAH);
        const l = await T.lebihLebar(); assert.ok(l.sw <= l.iw + 1, 'gulir mendatar 390'); await T.tutup();
        const T2 = await pb.tab(); await T2.buka(`${s2.url}/siklus/masa-depan`, {tunggu: '#masadepan .sk-kead'});
        const k = await T2.eval(`document.querySelector('#masadepan').innerText`); assert.match(k, /Menunggu hitungan indeks iklim/); assert.doesNotMatch(k, /\d+,\d/); await T2.tutup();
      } finally { await s.tutup(); await s2.tutup(); }
    });
  } finally { await pb.tutup(); }
});
