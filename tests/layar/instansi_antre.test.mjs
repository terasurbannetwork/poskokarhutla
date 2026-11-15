/* Antrean luring /instansi di atas PbAntre (KP-14): public/instansi.js utuh dijalankan di vm dengan DOM tiruan, penyimpanan memori, XHR dan fetch tiruan.
   Dibuktikan: satu saluran per akun (butir akun lain tidak pernah terkirim dan tetap terhitung di banner), butir > 7 hari dibuang, unggah berkas dulu baru isian
   (x-akun hanya di header kirim, id media tahan gagal, blob dilepas), tombol Buang, migrasi pb_instansi + pb_instansi_draf (draf selamat, basis lama dihapus). node --test tests/layar/instansi_antre.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const ANTRE = readFileSync("public/inti/antre.js", "utf8").replace('"pb_instansi",', '"pb_instansi", "pb_instansi_draf",');   // daftar putih basis lama: entri untuk draf diminta ke pemilik inti/antre.js
const tidur = ms => new Promise(r => setTimeout(r, ms));
const LUAS = {id: "A", status: "aktif", wilayah: "Kab Uji", wajib_ganti: false};

function elemen() {
  const dasar = {hidden: false, value: "", innerHTML: "", textContent: "", dataset: {}, disabled: false, open: false, className: "", children: [], style: {}, ls: {},
    addEventListener(n, f) { this.ls[n] = f; }, classList: {toggle() {}, add() {}, remove() {}, contains: () => false}, querySelector: () => null, querySelectorAll: () => [], closest: () => null};
  return new Proxy(dasar, {get: (o, k) => k in o ? o[k] : typeof k === "string" ? () => undefined : undefined, set: (o, k, v) => (o[k] = v, true)});
}
function idbPalsu(data, log) {
  const tunda = f => setTimeout(f, 0);
  return {open: nama => { const r = {}; tunda(() => { const d = data[nama] || {}; r.result = {objectStoreNames: {contains: s => s in d}, close() {},
      transaction: () => ({objectStore: s => ({getAll: () => { const q = {}; tunda(() => { q.result = d[s]; q.onsuccess(); }); return q; }})})}; r.onsuccess(); }); return r; },
    deleteDatabase: nama => { const r = {}; tunda(() => { log.push(nama); r.onsuccess(); }); return r; }};
}
function dunia({indexedDB, akun = LUAS, sebelum} = {}) {
  const els = new Map(), $ = id => id === "fBencana" ? null : els.get(id) || (els.set(id, elemen()), els.get(id));
  const panggil = [], mem = {};
  const dok = {getElementById: $, addEventListener() {}, visibilityState: "hidden", createElement: () => elemen(), querySelector: () => null, querySelectorAll: () => [], body: elemen(), documentElement: elemen()};
  class XHR { constructor() { this.upload = {}; this.h = {}; } open(m, u) { this.u = u; } setRequestHeader(k, v) { this.h[k] = v; }
    send(fd) { panggil.push({tipe: "xhr", url: this.u, h: this.h}); const r = sb.jawabXhr(this.u); setTimeout(() => { this.status = r.s; this.responseText = JSON.stringify(r.j); this.upload.onprogress?.({lengthComputable: true, loaded: 1, total: 2}); this.onload(); }, 0); } }
  const sb = {indexedDB, document: dok, Blob, File: Blob, FormData, TextEncoder, structuredClone, crypto, URL: {createObjectURL: () => "blob:x", revokeObjectURL() {}}, Intl, Date, setTimeout, clearTimeout, setInterval() {}, console,
    navigator: {onLine: true}, location: {search: "", hash: "", pathname: "/instansi"}, history: {replaceState() {}}, XMLHttpRequest: XHR, AbortController, requestAnimationFrame: f => setTimeout(f, 0),
    matchMedia: () => ({matches: false, addEventListener() {}}), addEventListener() {}, removeEventListener() {}, getComputedStyle: () => ({}),
    localStorage: {_: {}, getItem(k) { return k in this._ ? this._[k] : null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; }, key(i) { return Object.keys(this._)[i] ?? null; }, get length() { return Object.keys(this._).length; }},
    KartuApi: {idBencana: t => t.bencana || "karhutla", KAMUS: {karhutla: {}}}, bacaExif: () => null,
    fetch: async (url, o = {}) => { panggil.push({tipe: "fetch", url, h: o.headers || {}, body: o.body}); const r = sb.jawab(url); return {ok: r.s >= 200 && r.s < 300, status: r.s, json: async () => r.j, text: async () => JSON.stringify(r.j)}; },
    jawab: u => u.endsWith("/saya") ? {s: 200, j: {akun: akun}} : u.endsWith("/tugas") ? {s: 200, j: {tugas: []}} : {s: 200, j: {}}, jawabXhr: () => ({s: 201, j: {id: "m" + panggil.length}})};
  sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(readFileSync("public/inti/format.js", "utf8"), sb, {filename: "inti/format.js"}); vm.runInContext(ANTRE, sb, {filename: "inti/antre.js"});
  const asli = sb.PbAntre, bersama = asli.memori();
  sb.PbAntre = {...asli, saluran: (n, o) => asli.saluran(n, {...o, simpan: bersama})};   // satu penyimpanan memori untuk semua saluran
  sb.asli = asli; sb.bersama = bersama; sebelum?.(sb);
  return {sb, $, panggil, mulai: async () => { vm.runInContext(readFileSync("public/instansi.js", "utf8"), sb, {filename: "instansi.js"}); await tidur(80); }};
}
const foto = () => ({media: new Blob(["a"]), thumb: new Blob(["b"]), exif: null, kamera: true});
const gps = {lat: 1, lon: 2, akurasi: 5, waktu_gps: 1, zona: "Asia/Jakarta", sampel: []};
const butir = (id, akun, o = {}) => ({klien_id: id, dibuat: o.dibuat ?? Date.now(), data: {akun, tugasId: "T1", langkah: "konfirmasi", body: {klien_id: "k" + id, hasil: "api_ada"}, berkas: o.berkas ?? [foto(), foto()], gps, nama: "Kab Uji"}});
const SAL = (d, akun) => d.sb.asli.saluran("instansi:" + akun, {kirim: async () => ({s: 0, j: {}}), pemicu: false, langsung: false, simpan: d.sb.bersama});

test("unggah berkas dulu, baru isian; x-akun hanya di header kirim; id media dan blob dilepas tahan gagal", async () => {
  const d = dunia(); let isian = 0; d.sb.jawab = u => u.endsWith("/saya") ? {s: 200, j: {akun: LUAS}} : u.endsWith("/tugas") ? {s: 200, j: {tugas: []}} : u.includes("/konfirmasi/") && ++isian === 1 ? {s: 503, j: {}} : {s: 200, j: {}};
  await SAL(d, "A").masukkan(butir("b1", "A"));
  await d.mulai(); await tidur(200); const kanal = d.sb.PbAntre._registri.get("instansi:A");   // diambil sebelum SAL() menimpa registri
  const urut = d.panggil.filter(p => /media|konfirmasi/.test(p.url)).map(p => p.url.split("/").pop());
  assert.deepEqual(urut.slice(0, 3), ["media", "media", "T1"], "dua berkas dulu, lalu isian");
  assert.ok(d.panggil.filter(p => p.tipe === "xhr").every(p => p.h["x-akun"] === "A"));
  const [x] = await SAL(d, "A").daftar();
  assert.equal(x.status, "menunggu", "503 menahan butir"); assert.ok(!JSON.stringify(x).includes("x-akun"));
  assert.ok(x.data.berkas.every(b => b.mediaId && b.media === null && b.thumb === null), "id media diingat, blob dilepas");
  d.panggil.length = 0; await kanal.kirimSekarang();
  assert.equal(d.panggil.filter(p => p.tipe === "xhr").length, 0, "berkas tidak diunggah ulang");
  assert.deepEqual(JSON.parse(d.panggil.find(p => p.url.includes("/konfirmasi/")).body).media, x.data.berkas.map(b => b.mediaId));
  assert.equal(JSON.parse(d.panggil.find(p => p.url.includes("/konfirmasi/")).body).klien_id, "kb1"); assert.equal((await SAL(d, "A").daftar()).length, 0, "terkirim lalu hilang");
});

test("butir akun lain tidak pernah dikirim dengan sesi yang salah, tetap terhitung di banner", async () => {
  const d = dunia(); d.sb.localStorage.setItem("pb_instansi_akun", JSON.stringify(["A", "B"]));
  await SAL(d, "B").masukkan(butir("kB", "B", {berkas: []})); await SAL(d, "A").masukkan(butir("kA", "A", {berkas: []}));
  await d.mulai(); await tidur(200);
  const isian = d.panggil.filter(p => p.url.includes("/konfirmasi/"));
  assert.equal(isian.length, 1); assert.equal(isian[0].h["x-akun"], "A"); assert.equal(JSON.parse(isian[0].body).klien_id, "kkA");
  assert.equal((await SAL(d, "B").daftar()).length, 1, "butir B utuh"); assert.match(d.$("banner").innerHTML, /1 isian akun lain/);
});

test("antrean berumur lebih dari 7 hari dibuang saat halaman dimuat, tanpa menunggu masuk", async () => {
  const d = dunia({akun: null}); d.sb.jawab = () => ({s: 401, j: {}}); d.sb.localStorage.setItem("pb_instansi_akun", JSON.stringify(["B"]));
  await SAL(d, "B").masukkan(butir("tua", "B", {dibuat: Date.now() - 8 * 864e5})); await SAL(d, "B").masukkan(butir("baru", "B"));
  await d.mulai(); assert.equal(JSON.stringify((await SAL(d, "B").daftar()).map(x => x.klien_id)), '["baru"]');
});

test("ditolak server: tampil dengan alasan, tidak dikirim ulang, tombol Buang menghapus", async () => {
  const d = dunia(); d.sb.jawab = u => u.endsWith("/saya") ? {s: 200, j: {akun: LUAS}} : u.endsWith("/tugas") ? {s: 200, j: {tugas: []}} : {s: 422, j: {galat: "Isian tidak sah"}};
  await SAL(d, "A").masukkan(butir("x1", "A", {berkas: []})); await d.mulai(); await tidur(200);
  assert.match(d.$("banner").innerHTML, /ditolak: Isian tidak sah/); assert.match(d.$("banner").innerHTML, /data-buang="x1"/);
  const n = d.panggil.length; await d.sb.PbAntre._registri.get("instansi:A").kirimSekarang(); assert.equal(d.panggil.length, n, "butir ditolak tidak dikirim lagi");
  await d.$("banner").ls.click({target: {closest: () => ({dataset: {buang: "x1"}})}}); await tidur(50);
  assert.equal((await SAL(d, "A").daftar()).length, 0); assert.doesNotMatch(d.$("banner").innerHTML, /Buang/);
});

test("migrasi pb_instansi + pb_instansi_draf: butir akun lama dan draf selamat, basis lama dihapus sesudah tertulis", async () => {
  const log = [], lama = {pb_instansi: {antrean: [{id: "lama1", akun: "B", tugasId: "T9", langkah: "kabar", body: {klien_id: "kl"}, dibuat: Date.now() - 1000, nama: "Kab Lain", berkas: [{media: null, thumb: null, mediaId: "m7"}], gps}]},
    pb_instansi_draf: {draf: [{k: "A|T1", akun: "A", tid: "T1", sapi: "api", nilai: {tindakan: "hai"}, cek: {}, rinci: false, diubah: Date.now() - 1000}, {k: "A|T1#berkas", akun: "A", tid: "T1", diubah: Date.now() - 1000, berkas: [{f: foto().media, kamera: true}]},
      {k: "A|T0", akun: "A", tid: "T0", nilai: {}, diubah: Date.now() - 4 * 864e5}]}};
  const d = dunia({indexedDB: idbPalsu(lama, log)}); d.sb.jawab = u => u.endsWith("/saya") ? {s: 200, j: {akun: LUAS}} : u.endsWith("/tugas") ? {s: 200, j: {tugas: []}} : {s: 0, j: {}};
  await d.mulai(); await tidur(200);
  assert.equal(JSON.stringify(log.sort()), '["pb_instansi","pb_instansi_draf"]');
  const dr = d.sb.asli.saluran("instansi-draf", {kirim: async () => ({s: 0, j: {}}), pemicu: false, langsung: false, simpan: d.sb.bersama, umurMs: 3 * 864e5});
  assert.equal(JSON.stringify((await dr.daftar()).map(x => x.klien_id).sort()), '["A|T1","A|T1#berkas"]', "draf 4 hari tak ikut");
  const [b] = await SAL(d, "B").daftar(); assert.equal(b.klien_id, "lama1"); assert.equal(b.data.berkas[0].mediaId, "m7"); assert.equal(b.status, "menunggu");
  assert.ok(JSON.parse(d.sb.localStorage.getItem("pb_instansi_akun")).includes("B"));
});
