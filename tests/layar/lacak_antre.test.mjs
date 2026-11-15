/* Antrean lapor /lacak di atas PbAntre (KP-13): public/lacak_lapor.js dijalankan di vm dengan DOM tiruan, penyimpanan memori, fetch tiruan.
   Dibuktikan: foto diunggah dulu baru laporan, header x-lacak hanya saat kirim (tak tersimpan di butir), 410 = butir ditolak lalu antrean tautan dibersihkan,
   409 ber-langkah = keadaan berubah dan tak dikirim ulang, 5xx = tunggu dan tetap, peringatan 5 jam, migrasi butir pb_lacak dengan klien_id dan foto. node --test tests/layar/lacak_antre.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const TOKEN = "tok-rahasia-uji";
function dunia(indexedDB) {
  const els = new Map(), dok = {activeElement: null, addEventListener() {}, visibilityState: "hidden", createElement: () => el("x")};
  function el(id) { return els.get(id) || (els.set(id, {id, hidden: false, value: "", innerHTML: "", textContent: "", dataset: {}, disabled: false, open: false, className: "", addEventListener() {}, setAttribute() {}, click() {},
    querySelectorAll: () => [], classList: {toggle() {}}}), els.get(id)); }
  dok.getElementById = el;
  const panggil = [];
  const sb = {indexedDB, document: dok, Blob, FormData, TextEncoder, structuredClone, crypto, URL, Intl, Date, setTimeout, clearTimeout, setInterval() {}, navigator: {onLine: true}, console,
    addEventListener() {}, AbortController, fetch: async (url, o) => { panggil.push({url, h: o.headers, body: o.body}); const r = sb.jawab(url); return {ok: r.s >= 200 && r.s < 300, status: r.s, json: async () => r.j}; }, jawab: () => ({s: 200, j: {}})};
  sb.window = sb;
  vm.createContext(sb);
  for (const f of ["public/inti/antre.js", "public/lacak_lapor.js"]) vm.runInContext(readFileSync(f, "utf8"), sb, {filename: f});
  return {sb, el, panggil};
}
const LAPOR = {langkah: "kabar", kondisi: [], alasan_bukan_api: [], bekas: null, rinci: null, foto: false, riwayat: []};
const foto = () => ({media: new Blob(["a"]), thumb: new Blob(["b"]), exif: null, kamera: true});
const TK = "ffffffffffffffffffffffff";
const gps = (w = Date.now()) => ({lat: 1, lon: 2, akurasi: 5, waktu_gps: w, zona: "Asia/Jakarta", sampel: [[1, 2, 5, w]]});
async function mulai(d, o = {}) {
  const log = {mati: [], kosong: 0, segar: 0};
  await d.sb.LacakLapor.mulai({token: TOKEN, lapor: LAPOR, simpan: d.sb.PbAntre.memori(), simpanDraf: d.sb.PbAntre.memori(),
    mati: x => log.mati.push(x), antreanKosong: () => log.kosong++, segarkan: async () => { log.segar++; return undefined; }, ...o});
  const tk = await (async () => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(TOKEN)))].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 24))();
  const S = d.sb.PbAntre._registri.get("lacak:" + tk);
  return {log, S, tk};
}
const tambah = (S, tk, klien, berkas = [foto(), foto()], dibuat = Date.now()) =>
  S.masukkan({klien_id: klien, dibuat, data: {tk, langkah: "kabar", kondisi: null, alasan: null, bekas: null, catatan: "c", isi: {}, gps: gps(dibuat), berkas}});

test("foto diunggah dulu, lalu laporan; x-lacak hanya di header; token tak ada di butir", async () => {
  const d = dunia(); d.sb.jawab = u => u.endsWith("/media") ? {s: 201, j: {id: "m" + d.panggil.length}} : {s: 201, j: {id: 7}};
  const {S, tk, log} = await mulai(d);
  await tambah(S, tk, "klienA"); const sebelum = JSON.stringify(await S.daftar(), (k, v) => v instanceof Blob ? "blob" : v);
  assert.ok(!sebelum.includes(TOKEN));
  await S.kirimSekarang();
  assert.deepEqual(d.panggil.map(p => p.url), ["/api/lacak/media", "/api/lacak/media", "/api/lacak/lapor"]);
  assert.ok(d.panggil.every(p => p.h["x-lacak"] === TOKEN && p.h["x-pb"] === "1"));
  const b = JSON.parse(d.panggil[2].body); assert.equal(b.klien_id, "klienA"); assert.equal(b.media.length, 2); assert.equal(await S.menunggu(), 0);
  await new Promise(r => setTimeout(r, 20)); assert.ok(log.segar >= 1, "info disegarkan sesudah terkirim");
});

test("kegagalan lapor tidak mengulang unggah foto (id diingat); 503 menahan butir", async () => {
  const d = dunia(); let lapor = 0; d.sb.jawab = u => u.endsWith("/media") ? {s: 201, j: {id: "m"}} : ++lapor === 1 ? {s: 503, j: {}} : {s: 201, j: {id: 1}};
  const {S, tk} = await mulai(d); await tambah(S, tk, "klienB");
  await S.kirimSekarang(); assert.equal(await S.menunggu(), 1); assert.ok(S.tundaSampai > Date.now());
  await S.kirimSekarang(); assert.equal(await S.menunggu(), 0);
  assert.equal(d.panggil.filter(p => p.url.endsWith("/media")).length, 2, "foto tidak diunggah ulang");
});

test("410: butir ditolak lalu seluruh antrean tautan dibersihkan dan C.mati menyebut jumlah", async () => {
  const d = dunia(); d.sb.jawab = () => ({s: 410, j: {galat: "Tautan sudah ditutup"}});
  const {S, tk, log} = await mulai(d); await tambah(S, tk, "k1", [], Date.now() - 2000); await tambah(S, tk, "k2", [], Date.now() - 1000);
  await S.kirimSekarang(); await new Promise(r => setTimeout(r, 20));
  assert.equal((await S.daftar()).length, 0); assert.equal(log.mati.length, 1);
  assert.match(log.mati[0].galat, /Tautan sudah ditutup\. 2 laporan di ponsel ini belum terkirim/);
});

test("409 ber-langkah: keadaan berubah, alasan tampil dengan tombol Buang, tidak dikirim ulang", async () => {
  const d = dunia(); d.sb.jawab = () => ({s: 409, j: {langkah: "cekulang"}});
  const {S, tk} = await mulai(d); await tambah(S, tk, "k1", []); await S.kirimSekarang(); await S.kirimSekarang();
  assert.equal(d.panggil.length, 1);
  const [x] = await S.daftar(); assert.equal(x.status, "berubah"); assert.match(x.alasan, /keadaan tugas sudah berubah/);
  await new Promise(r => setTimeout(r, 20)); assert.match(d.el("antreanLapor").innerHTML, /data-buang="k1"/);
});

test("butir berumur lebih dari 5 jam memberi peringatan hampir 6 jam", async () => {
  const d = dunia(); d.sb.jawab = () => ({s: 0, j: {}});
  const {S, tk} = await mulai(d); await tambah(S, tk, "k1", [], Date.now() - 5.5 * 3600e3); await S.kirimSekarang(); await new Promise(r => setTimeout(r, 20));
  assert.match(d.el("antreanLapor").innerHTML, /hampir 6 jam/); assert.match(d.el("antreanLapor").innerHTML, /tidak ada sinyal/);
});

test("migrasi pb_lacak: klien_id, foto, dan id foto terunggah dipertahankan; basis lama dihapus", async () => {
  const log = []; const lama = {antrean: [{id: "x", tk: await tkDari(TOKEN), klien_id: "lamaKlien", langkah: "konfirmasi", kondisi: "padam", alasan: null, bekas: "ya", catatan: "", isi: {}, gps: gps(), dibuat: Date.now(), coba: 2,
    berkas: [{media: null, thumb: null, mediaId: "m9"}, foto()]}], draf: []};
  const d = dunia(idbPalsu(lama, log)); d.sb.jawab = () => ({s: 0, j: {}}); const {S} = await mulai(d);
  assert.equal(JSON.stringify(log), '["hapus"]', "dihapus sekali, saat mulai"); assert.equal(await S.menunggu(), 1);
  const [x] = await S.daftar(); assert.equal(x.klien_id, "lamaKlien"); assert.equal(x.data.berkas[0].mediaId, "m9"); assert.ok(x.data.berkas[1].media instanceof Blob);
  d.panggil.length = 0; d.sb.jawab = u => u.endsWith("/media") ? {s: 201, j: {id: "m10"}} : {s: 201, j: {}};
  await S.kirimSekarang();
  assert.equal(d.panggil.filter(p => p.url.endsWith("/media")).length, 1, "foto yang sudah terunggah dilewati");
  assert.deepEqual(JSON.parse(d.panggil.at(-1).body).media, ["m9", "m10"]);
});

test("draf pilihan dan foto bertahan lewat saluran lacak-draf", async () => {
  const d = dunia(); const o = {simpan: d.sb.PbAntre.memori(), simpanDraf: d.sb.PbAntre.memori()};
  const a = await mulai(d, o); assert.ok(a.S);
  const SD = d.sb.PbAntre._registri.get("lacak-draf");
  await SD.masukkan({klien_id: a.tk, data: {kondisi: "padam", veg: ["x"], catatan: "hai"}}); await SD.masukkan({klien_id: a.tk + ":foto", data: {foto: [foto()]}});
  assert.equal(d.el("catatan").value, "", "belum dimuat"); // muat ulang halaman = mulai lagi pada penyimpanan yang sama
  const d2 = dunia(); d2.sb.PbAntre = d2.sb.PbAntre; await d2.sb.LacakLapor.mulai({token: TOKEN, lapor: LAPOR, simpan: o.simpan, simpanDraf: o.simpanDraf, mati() {}, segarkan: async () => {}});
  assert.equal(d2.el("catatan").value, "hai"); assert.equal(d2.sb.LacakLapor.menunggu(), 1);
});

/* indexedDB palsu: hanya open (getAll per store) dan deleteDatabase, cukup untuk PbAntre.pindahDari */
function idbPalsu(data, log) {
  const tunda = f => setTimeout(f, 0);
  return {open: () => { const r = {}; tunda(() => { r.result = {objectStoreNames: {contains: s => s in data}, close() {},
      transaction: s => ({objectStore: () => ({getAll: () => { const q = {}; tunda(() => { q.result = data[s]; q.onsuccess(); }); return q; }})})}; r.onsuccess(); }); return r; },
    deleteDatabase: () => { const r = {}; tunda(() => { log.push("hapus"); r.onsuccess(); }); return r; }};
}
const tkDari = async tok => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tok)))].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 24);

test("dua tautan: butir dipilah ke saluran masing-masing, hanya tautan halaman ini yang dikirim", async () => {
  const tk = await tkDari(TOKEN), log = [];
  const lama = {antrean: [{tk, klien_id: "milikku", langkah: "kabar", kondisi: null, isi: {}, gps: gps(), dibuat: Date.now() - 1000, berkas: []},
    {tk: TK, klien_id: "milikLain", langkah: "kabar", kondisi: null, isi: {}, gps: gps(), dibuat: Date.now() - 2000, berkas: []}], draf: []};
  const d = dunia(idbPalsu(lama, log)); d.sb.jawab = () => ({s: 201, j: {}});
  const {S} = await mulai(d); await S.kirimSekarang();
  assert.equal(JSON.stringify(d.panggil.map(p => JSON.parse(p.body).klien_id)), '["milikku"]');
  const lain = d.sb.PbAntre._registri.get("lacak:" + TK);
  assert.equal(JSON.stringify((await lain.daftar()).map(x => [x.klien_id, x.status])), '[["milikLain","menunggu"]]', "butir tautan lain tetap antre");
  assert.equal(await S.menunggu(), 0); assert.equal(JSON.stringify(log), '["hapus"]');
});

test("draf berfoto lama ikut pindah, basis lama dihapus hanya setelah draf dan antrean pindah", async () => {
  const tk = await tkDari(TOKEN), log = [];
  const lama = {antrean: [{tk, klien_id: "a", langkah: "kabar", isi: {}, gps: gps(), dibuat: Date.now(), berkas: []}],
    draf: [{tk, kondisi: "padam", catatan: "setengah", veg: [], desa: ""}, {tk: tk + ":foto", foto: [foto()]}, {tk: TK, catatan: "tautan lain"}]};
  const d = dunia(idbPalsu(lama, log)); const o = {simpan: d.sb.PbAntre.memori(), simpanDraf: d.sb.PbAntre.memori()};
  const SDm = o.simpanDraf; let urut = [];
  const aslinya = SDm.taruh; SDm.taruh = async x => { urut.push("draf"); return aslinya(x); };
  const idbLog = idbPalsu(lama, { push: x => urut.push(x) }); d.sb.indexedDB = idbLog;
  await d.sb.LacakLapor.mulai({token: TOKEN, lapor: LAPOR, ...o, mati() {}, segarkan: async () => {}});
  assert.equal(urut.at(-1), "hapus"); assert.ok(urut.filter(x => x === "hapus").length === 1 && urut.indexOf("draf") < urut.indexOf("hapus"), "draf ditulis sebelum basis dihapus");
  assert.equal(d.el("catatan").value, "setengah"); assert.equal(d.sb.LacakLapor.menunggu(), 2, "1 butir antre + draf berfoto");
  const SD = d.sb.PbAntre._registri.get("lacak-draf");
  assert.equal(JSON.stringify((await SD.daftar()).map(x => x.klien_id).sort()), JSON.stringify([tk, tk + ":foto", TK].sort()));
});

test("migrasi gagal menulis draf: basis lama tidak dihapus", async () => {
  const tk = await tkDari(TOKEN), log = [], lama = {antrean: [], draf: [{tk, catatan: "x"}]};
  const d = dunia(idbPalsu(lama, log)); const m = d.sb.PbAntre.memori(); m.taruh = async () => { throw new Error("penuh"); };
  await d.sb.LacakLapor.mulai({token: TOKEN, lapor: LAPOR, simpan: d.sb.PbAntre.memori(), simpanDraf: m, mati() {}, segarkan: async () => {}});
  assert.equal(log.length, 0);
});
