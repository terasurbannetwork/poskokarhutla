/* Api baru Himawari-9: tandaiBaru (src/himawari.js) apa adanya, rute /api/himawari lewat worker.fetch dengan R2 palsu berpenyangga memori,
   dan nilaiTitik (src/ews.js) dengan hasil muatan yang sama. Tanpa mock logika. */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {tandaiBaru, BARU_KM} from "../../src/himawari.js";
import {nilaiTitik} from "../../src/ews.js";
import {readFileSync} from "node:fs";
import worker from "../../src/worker.js";

const kini = Date.parse("2026-10-19T03:00:00Z"), acuan = "2026-10-19T02:50:00Z";
const hw = (baris, a = acuan) => ({acuan: a, baris});
const firms = (baris, a = acuan) => ({acuan: a, baris});
const H = [-2, 114, 20, 30, 3, 3, 1, 4, 50];   // lat lon u frp level rel qf n u0
const lonKm = (lat, k) => k / (111.19 * Math.cos(lat * Math.PI / 180));   // derajat bujur untuk k km
const baru = (h, f, t = kini) => tandaiBaru(h, f, t).map(r => r[9]);

uji("himawari: tandaiBaru: FIRMS dalam 4 km = bukan baru, 5 km = baru, semua keyakinan dihitung", () => {
  assert.equal(BARU_KM, 4);
  assert.deepEqual(baru(hw([H]), firms([[-2, 114 + lonKm(-2, 3), -1, "VIIRS", 5, 0]])), [0], "3 km, keyakinan 0");
  assert.deepEqual(baru(hw([H]), firms([[-2, 114 + lonKm(-2, 5), -1, "VIIRS", 5, 2]])), [1], "5 km");
  assert.deepEqual(baru(hw([H]), null), [1], "tanpa FIRMS");
});
uji("himawari: tandaiBaru: FIRMS lebih tua dari 24 jam tidak menutup", () => {
  assert.deepEqual(baru(hw([H]), firms([[-2, 114, -25, "VIIRS", 5, 2]])), [1]);
  assert.deepEqual(baru(hw([H]), firms([[-2, 114, -23, "VIIRS", 5, 2]])), [0]);
});
uji("himawari: tandaiBaru: n=1, level 1, u>60 bukan baru; acuan basi = tak ada yang baru", () => {
  assert.deepEqual(baru(hw([[-2, 114, 20, 30, 3, 3, 1, 1, 20], [-2, 114, 20, 30, 1, 3, 1, 4, 50], [-2, 114, 61, 30, 3, 3, 1, 4, 90], [-2, 114, 60, 30, 2, 5, 1, 2, 60]]), null), [0, 0, 0, 1]);
  assert.deepEqual(baru(hw([H]), null, kini + 3 * 3600e3), [0], "acuan 3 j 10 mnt");
  assert.deepEqual(baru(hw([H], "2026-10-19T00:00:00Z"), null), [1], "tepat 3 j masih sah");
});
uji("himawari: tandaiBaru: baris lama 7 kolom dianggap n=1 (bukan baru) dan tetap berbentuk 10 kolom", () => {
  const [r] = tandaiBaru(hw([[-2, 114, 20, 30, 3, 3, 1]]), null, kini);
  assert.deepEqual(r, [-2, 114, 20, 30, 3, 3, 1, 1, 20, 0]);
});

const ACU_NYATA = new Date(Date.now() - 600e3).toISOString(), RAW = hw([H, [-3, 115, 20, 30, 3, 3, 1, 1, 20], [5.9, 116.1, 20, 30, 3, 3, 1, 4, 50]], ACU_NYATA);   // baris 3: Sabah (Malaysia), dibuang dari respons   // rute memakai jam nyata
const r2 = o => ({get: async k => k === "data/himawari.json" && o ? {body: new Response(JSON.stringify(o)).body} : null});
/* ASSETS asli dari public/: saringan wilayah Indonesia (src/titik.js wilayah) memakai poligon provinsi sungguhan */
const ASSETS = {fetch: async q => { try { return new Response(readFileSync(new URL("../../public" + new URL(q.url).pathname, import.meta.url))); } catch (e) { return new Response(null, {status: 404}); } }};
const D1 = isi => ({prepare: () => ({first: async () => isi ? {isi: JSON.stringify(isi)} : null})});
uji("himawari: /api/himawari menambah kolom baru + n_baru, FIRMS dari D1 menutup", async () => {
  const ambil = async env => (await worker.fetch(new Request("https://x.test/api/himawari?k=" + Math.random()), env, undefined)).json();
  const a = await ambil({MEDIA: r2({...RAW, kolom: ["lat", "lon", "u", "frp_mw", "level", "rel", "qf"]}), DB: D1(null), ASSETS});
  assert.equal(a.kolom.at(-1), "w"); assert.equal(a.n_baru, a.baris.filter(r => r[9]).length);
  assert.ok(a.baris.every(r => r.length === 11 && a.wilayah[r[10]].split("|").length === 3)); assert.equal(a.baris.reduce((s, r) => s + r[9], 0), a.n_baru);
  assert.equal(a.acuan, RAW.acuan);
  assert.deepEqual(a.baris.map(r => r[9]), [1, 0]);   // Sabah tidak ikut terkirim
  const c = await ambil({MEDIA: r2(RAW), DB: D1(firms([[-2, 114, -1, "VIIRS", 5, 1]], ACU_NYATA)), ASSETS});
  assert.deepEqual(c.baris.map(r => r[9]), [0, 0]); assert.equal(c.n_baru, 0);
});
uji("himawari: /api/himawari: objek R2 hilang = kosong", async () => {
  const b = await (await worker.fetch(new Request("https://x.test/api/himawari?z=1"), {MEDIA: r2(null)}, undefined)).json();
  assert.deepEqual(b, {acuan: null, baris: [], n_baru: 0});
});

/* nilaiTitik: data.hwBaru [[lat, lon, u, frp, level]] seperti hasil muatData; titik FIRMS tersaring ke data.titik */
const h0 = "2026-10-19", dasar = {kini, fwi: null, titik: [], cuaca: [], status: null, rob: null, hwBaru: [[-2, 114, 20, 30, 3]], hwAcuan: acuan};
const km3 = lonKm(-2, 3), km10 = lonKm(-2, 10);
uji("himawari: nilaiTitik: api baru 3 km = tingkat 3, 10 km = tingkat 2, 20 km = tidak ada", () => {
  const a = nilaiTitik(dasar, -2, 114 + km3, "", h0);
  assert.equal(a.length, 1); assert.equal(a[0].tingkat, 3); assert.equal(a[0].judul, "Api baru terdeteksi sangat dekat"); assert.equal(a[0].hari, 0);
  assert.match(a[0].rincian, /Himawari-9 \(JAXA\) mendeteksi api baru 3,0 km dari lokasi Anda, 20 menit sebelum pukul 09\.50 WIB; belum tercatat satelit NASA FIRMS\./);
  assert.match(a[0].sumber, /Himawari-9 \(JAXA\)/);
  const b = nilaiTitik(dasar, -2, 114 + km10, "", h0);
  assert.equal(b[0].tingkat, 2); assert.equal(b[0].judul, "Api baru terdeteksi di sekitar Anda");
  assert.deepEqual(nilaiTitik(dasar, -2, 114 + lonKm(-2, 20), "", h0), []);
});
uji("himawari: nilaiTitik: tanpa duplikat kunci bila blok FIRMS sudah memberi tingkat sama", () => {
  const f = nilaiTitik({...dasar, titik: [[-2, 114 + km3 + 0.01, kini]]}, -2, 114 + km3, "", h0);
  assert.equal(f.length, 1); assert.equal(f[0].judul, "Titik panas sangat dekat");
  const kunci = f.map(e => e.kunci); assert.equal(new Set(kunci).size, kunci.length);
  const g = nilaiTitik({...dasar, titik: [[-2, 114 + km10, kini]]}, -2, 114 + km3, "", h0);   // FIRMS hanya Siaga, Himawari Awas: tingkat lebih tinggi menang
  assert.equal(g.length, 1); assert.equal(g[0].tingkat, 3);
});
uji("himawari: nilaiTitik: FWI Siaga hari ini tidak menelan kabar api baru (kunci sendiri, menang seri)", () => {
  const fwi = {grid: [{lat: -2, lon: 114, hari: [{tgl: h0, fwi: 20}]}]};
  const a = nilaiTitik({...dasar, fwi}, -2, 114 + km10, "", h0).filter(e => e.hari === 0);
  assert.equal(a.length, 1); assert.equal(a[0].tingkat, 2); assert.equal(a[0].kunci, `karhutla-hw|${h0}|2`); assert.equal(a[0].sumber_jenis, "himawari");
});
uji("himawari: tandaiBaru: di luar Indonesia (saringan wilayah) tidak pernah baru", () => {
  assert.deepEqual(baru(hw([H]), null, kini), [1]);
  assert.deepEqual(tandaiBaru(hw([H]), null, kini, () => false).map(r => r[9]), [0]);
});
