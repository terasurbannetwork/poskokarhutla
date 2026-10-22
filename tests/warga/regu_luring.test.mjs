/* Regu luring: fungsi murni lapangan_tugas.js (ubin peta) dan acuanLokal sw-lapangan.js, dimuat lewat vm tanpa peramban. */
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = b => fs.readFileSync(new URL(`../../public/${b}`, import.meta.url), "utf8");
test("daftarUbin: radius 10 km zoom 7-14 kecil dan memuat ubin pusat", () => {
  const c = vm.createContext({console, Math, Set, Number}); c.globalThis = c; vm.runInContext(baca("lapangan_tugas.js"), c);
  const L = c.LapanganTugas, u = L.daftarUbin(-2.2, 113.9, 10, 7, 14);
  assert.ok(u.length > 50 && u.length < L.BATAS.ubinMaks, `n=${u.length}`);
  const z14 = u.filter(x => x.z === 14), x = Math.floor((113.9 + 180) / 360 * 2 ** 14);
  assert.ok(z14.some(t => t.x === x));
  assert.ok(z14.length >= 49 && z14.length <= 144);
});
test("acuanLokal mengambil js/css lokal saja", () => {
  const c = vm.createContext({self: {addEventListener() {}, registration: {}}, caches: {}, URL, Set, RegExp});
  vm.runInContext(baca("sw-lapangan.js") + "\nthis.acuan = acuanLokal;", c);
  assert.deepEqual([...c.acuan('<link rel="stylesheet" href="/a.css?v=ab"><script src="https://x.io/b.js"></script><script src="/c.js?v=1" defer></script>')], ["/a.css?v=ab", "/c.js?v=1"]);
});
/* Pengikatan draf dan peta luring ke kode regu (ponsel bersama). */
const muatLapangan = () => {   // lapangan.js penuh dengan DOM palsu (Proxy elemen)
  const el = () => new Proxy(function () {}, {get: (t, k) => k === "addEventListener" || k === "setAttribute" ? () => {} : t[k], set: (t, k, v) => (t[k] = v, true), apply: () => el()});
  const simpan = new Map(), ls = {getItem: k => simpan.has(k) ? simpan.get(k) : null, setItem: (k, v) => simpan.set(k, String(v)), removeItem: k => simpan.delete(k)};
  const w = {location: {hash: "", pathname: "/lapangan"}, history: {replaceState() {}}, addEventListener() {}};
  const c = vm.createContext({window: w, localStorage: ls, console, JSON, Array, Number, Uint8Array, TextEncoder, Promise, setInterval() {}, setTimeout() {},
    location: w.location, history: w.history, addEventListener() {}, navigator: {onLine: true}, crypto: globalThis.crypto, document: {getElementById: el, querySelectorAll: () => [], querySelector: () => null}, Date});
  vm.runInContext(baca("lapangan.js"), c); return {w, ls};
};
test("saringDraf: hanya draf berhash kode aktif; lama tanpa hash dan kode lain dibuang", () => {
  const {saringDraf} = muatLapangan().w.LapanganDraf, a = [{h: "aaaa", body: 1}, {h: "bbbb", body: 2}, {body: 3}, null];
  assert.deepEqual(JSON.parse(JSON.stringify(saringDraf(a, "aaaa"))), {milik: [{h: "aaaa", body: 1}], buang: 3});
  assert.equal(saringDraf(a, null).milik.length, 0);   // tanpa kode: tidak ada yang boleh terkirim
  assert.equal(saringDraf("rusak", "aaaa").buang, 0);
});
test("lapangan_tugas.js: peta terikat hash kode regu", () => {
  const t = baca("lapangan_tugas.js"), j = baca("lapangan.js");
  assert.match(t, /m\.h === opsi\.kh\(\)/); assert.match(t, /h: opsi\.kh\(\)/); assert.match(t, /m\.h !== o\.kh\(\)\) hapusPeta/);
  assert.match(j, /kodeTidakBerlaku\(\) \{[^}]*hapusPeta/);
  assert.match(j, /rec = \{h: kh,/);
});
test("capLama: draf lama tanpa cap diberi hash kode tersimpan, bukan dibuang; tanpa kode tersimpan tetap tanpa cap", () => {
  const {saringDraf, capLama} = muatLapangan().w.LapanganDraf, lama = [{body: 1}, {h: "bbbb", body: 2}];
  const a = JSON.parse(JSON.stringify(capLama(lama, "aaaa")));
  assert.deepEqual(a.map(d => d.h), ["aaaa", "bbbb"]);
  assert.equal(saringDraf(a, "aaaa").milik.length, 1);   // kode sama: draf lama selamat
  assert.equal(saringDraf(a, "cccc").buang, 2);           // kode lain: dibuang
  assert.equal(saringDraf(capLama(lama, null), "aaaa").buang, 2);   // tanpa kode tersimpan: dibuang
});

/* Multi-bahaya: layar regu memakai KartuApi.KAMUS (satu kamus), karhutla tanpa `bencana` tidak berubah */
import {muatKartu} from "../bnpb/kartu_fixture.mjs";
const bentukDari = () => { const c = vm.createContext({console, Math, Set, Number}); c.globalThis = c; vm.runInContext(baca("lapangan_tugas.js"), c); return c.LapanganTugas.bentukForm; };
test("bentukForm: tanpa bencana atau tanpa KartuApi = karhutla, teks bawaan", () => {
  const f = bentukDari(), K = muatKartu();
  for (const b of [f({id: 1}, K), f(null, K), f({bencana: "tidak_ada"}, K), f({bencana: "banjir"}, null)]) assert.deepEqual({...b}, {b: "karhutla", api: true, sebut: "Api", titik: "titik api", kondisi: "Kondisi api", st: null, hipotesis: false});
});
test("bentukForm: banjir memakai kata surut, bukan api; kunci status ke server tetap", () => {
  const b = bentukDari()({bencana: "banjir", bencana_nama: "Banjir"}, muatKartu());
  assert.equal(b.api, false); assert.equal(b.sebut, "Banjir"); assert.equal(b.kondisi, "Kondisi banjir");
  assert.deepEqual(Object.keys(b.st), ["menyala", "bara", "padam", "tidak_ditemukan"]);
  assert.equal(b.st.padam, "Sudah surut"); assert.equal(b.st.tidak_ditemukan, "Bukan banjir"); assert.equal(b.hipotesis, false);
});
test("bentukForm: gempa tanpa pilihan selesai; kekeringan selalu Hipotesis", () => {
  const f = bentukDari(), K = muatKartu();
  assert.equal(f({bencana: "gempa"}, K).st.padam, null);
  assert.equal(f({bencana: "kekeringan"}, K).hipotesis, true);
  assert.equal(f({bencana: "cuaca", hipotesis: true}, K).hipotesis, true);
});
test("lapangan: modul api hanya untuk karhutla, tanpa kamus salinan, ?v= dinaikkan", () => {
  const h = baca("lapangan.html"), j = baca("lapangan.js"), t = baca("lapangan_tugas.js");
  for (const k of ["Luas terbakar", "Sudah dipadamkan", "Sumber air terdekat", "Tautan mosaik drone"]) assert.match(h, new RegExp(`<label data-api>${k}`));
  assert.match(h, /id="hKondisi"/); assert.match(h, /lapangan_tugas\.js\?v=2/); assert.match(h, /instansi_kartu\.js\?v=2/); assert.match(h, /lapangan\.js\?v=2/);
  assert.match(j, /mulai\(\{bentuk: atur,/); assert.match(t, /bt\.api && window\.AksesKartu/); assert.match(t, /bt\.api && cara\.length/);
  assert.doesNotMatch(j + t, /Banjir sudah surut|Mulai surut|Masih tergenang/, "kamus tidak boleh disalin");
  assert.match(baca("sw-lapangan.js"), /VERSI = 2,/);
});
