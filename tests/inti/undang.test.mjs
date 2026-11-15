/* Undang rekan (PM-11). Jalankan: node --test tests/inti/undang.test.mjs. DOM tiruan minimal (repo tanpa jsdom), fetch tiruan. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const SRC = readFileSync(new URL("../../public/inti/undang.js", import.meta.url), "utf8");
const PESAN = readFileSync(new URL("../../public/inti/pesan.js", import.meta.url), "utf8");

class El {
  constructor(t) { this.tag = t; this.anak = []; this.att = {}; this.ev = {}; this._t = ""; this.disabled = false; this.value = ""; this.hidden = false; }
  setAttribute(k, v) { this.att[k] = v; } append(...x) { for (const a of x) this.anak.push(typeof a === "string" ? Object.assign(new El("#t"), {_t: a}) : a); }
  replaceChildren(...x) { this.anak = []; this.append(...x); }
  set textContent(v) { this.anak = []; this._t = String(v); } get textContent() { return this._t + this.anak.map(a => a.textContent).join(""); }
  set className(v) { this.att.class = v; } get className() { return this.att.class || ""; }
  addEventListener(n, f) { this.ev[n] = f; } click() { return this.ev.click && this.ev.click({currentTarget: this}); } focus() {}
  querySelectorAll(t) { const o = []; const w = e => { for (const a of e.anak) { if (a.tag === t) o.push(a); w(a); } }; w(this); return o; }
  cari(f) { const o = []; const w = e => { for (const a of e.anak) { if (f(a)) o.push(a); w(a); } }; w(this); return o; }
}
function dunia(rute, tanpaPesan) {
  const panggilan = [];
  const document = {createElement: t => new El(t), createElementNS: (n, t) => new El(t)};
  const fetch = async (url, o) => { panggilan.push({url, o}); const r = rute(url, o || {}); await null; return {status: r.s, json: async () => r.j, headers: {get: k => (r.h || {})[k] ?? null}}; };
  const ctx = {document, fetch, location: {pathname: "/instansi"}, console: {}, globalThis: null}; ctx.window = ctx; ctx.globalThis = ctx;
  if (!tanpaPesan) vm.runInNewContext(PESAN, ctx);
  vm.runInNewContext(SRC, ctx);
  return {ctx, panggilan, wadah: new El("div")};
}
const tunda = () => new Promise(r => setTimeout(r, 5));
const ADA = {undangan: [{id: "u1", nama: "Sari", wa: "0812****34", status: "terkirim", habis: 1800000000000, milikku: true}, {id: "u2", nama: "Budi", wa: "0813****99", status: "diterima", habis: 1800000000000, milikku: true}, {id: "u3", nama: "Rina", wa: "0814****11", status: "habis", habis: 1, milikku: true}], boleh_cabut_semua: false};

test("pemetaan status ke pil dan jalur", () => {
  const {ctx} = dunia(() => ({s: 404, j: {}}));
  const U = ctx.UndangRekan;
  assert.equal(U.pilStatus("terkirim").join(), "Terkirim,kuning"); assert.equal(U.pilStatus("diterima").join(), "Diterima,hijau");
  assert.equal(U.pilStatus("habis").join(), "Kedaluwarsa,abu"); assert.equal(U.jalur("kontak"), "Kontak"); assert.equal(U.jalur("tinjau"), "Ditinjau");
});
test("kalimat galat: 409, 429 dengan retry-after, putus", () => {
  const U = dunia(() => ({s: 404, j: {}})).ctx.UndangRekan;
  assert.equal(U.galat(409), "Nomor ini sudah anggota atau sudah diundang.");
  assert.equal(U.galat(429, "30"), "Terlalu sering. Coba lagi 30 detik lagi."); assert.equal(U.galat(429, "600"), "Terlalu sering. Coba lagi 10 menit lagi.");
  assert.equal(U.galat(429, null), "Terlalu sering. Coba lagi nanti."); assert.equal(U.galat(0), "Tidak ada koneksi.");
  assert.equal(U.galat(403, null, {galat: "Ditolak."}), "Ditolak."); assert.equal(U.galat(500), "Gagal. Coba lagi.");
});
test("pasang: tabel undangan, cabut hanya untuk terkirim yang boleh, POST membawa x-pb, klik ganda satu kiriman", async () => {
  const w = dunia((url, o) => url.startsWith("/api/masuk/undang?") ? {s: 200, j: ADA} : url === "/api/masuk/undang" && o.method === "POST" ? {s: 201, j: {ok: true}} : {s: 403, j: {}});
  w.ctx.UndangRekan.pasang(w.wadah, {akunId: "0123456789abcdef"}); await tunda();
  const teks = w.wadah.textContent;
  for (const k of ["Undang rekan", "Terkirim", "Diterima", "Kedaluwarsa", "xxxxxx**34"]) assert.ok(teks.includes(k), k);
  assert.equal(w.wadah.cari(e => e.tag === "button" && /Cabut undangan/.test(e.att["aria-label"] || "")).length, 1);
  const form = w.wadah.cari(e => e.tag === "form")[0], [wa] = w.wadah.cari(e => e.tag === "input");
  wa.value = "081234567890";
  const kirim = () => form.ev.submit({preventDefault() {}});
  await Promise.all([kirim(), kirim()]); await tunda();
  const post = w.panggilan.filter(p => p.o.method === "POST");
  assert.equal(post.length, 1); assert.equal(post[0].o.headers["x-pb"], "1"); assert.equal(post[0].o.headers["content-type"], "application/json");
  assert.equal(JSON.parse(post[0].o.body).akun_id, "0123456789abcdef"); assert.equal(wa.value, "");
});
test("anggota 403 menyembunyikan bagian; galat 409 tampil manusiawi", async () => {
  const w = dunia((url, o) => url.startsWith("/api/masuk/undang") && o.method !== "POST" ? {s: 200, j: {undangan: [], boleh_cabut_semua: false}} : o.method === "POST" ? {s: 409, j: {galat: "x"}} : {s: 403, j: {}});
  w.ctx.UndangRekan.pasang(w.wadah, {}); await tunda();
  assert.match(w.wadah.textContent, /Belum ada undangan/);
  const [wa] = w.wadah.cari(e => e.tag === "input"); wa.value = "081234567890";
  await w.wadah.cari(e => e.tag === "form")[0].ev.submit({preventDefault() {}});
  assert.match(w.wadah.textContent, /sudah anggota atau sudah diundang/);
});
test("sumber: tanpa innerHTML/inline/console/huruf kapital semua/titik tengah", () => {
  assert.doesNotMatch(SRC, /innerHTML|insertAdjacentHTML|outerHTML|console\.|setAttribute\("style"|onclick=/);
  assert.doesNotMatch(SRC, /·/); assert.doesNotMatch(SRC, /setInterval/);
  assert.doesNotMatch(readFileSync(new URL("../../public/inti/undang.css", import.meta.url), "utf8"), /font-size:\s*[\d.]+px|text-transform:\s*uppercase|·/);
});

const ANG = {anggota: [{id: "a1", nama: "Dewi", wa: "0815****22", jalur: "kontak", terakhir_masuk: 0, status: "aktif"}]};
const ruteAnggota = (url, o) => url.startsWith("/api/masuk/undang") && o.method !== "POST" ? {s: 200, j: {undangan: [], boleh_cabut_semua: false}}
  : url.startsWith("/api/masuk/anggota/tinjau") ? {s: 200, j: {anggota: [{id: "t1", nama: "Joko", wa: "0816****33"}]}}
  : url.startsWith("/api/masuk/anggota/cabut/") ? {s: 200, j: {sesi_lama_masih_hidup: true}}
  : url.startsWith("/api/masuk/anggota/putus/") ? {s: 200, j: {}}
  : url.startsWith("/api/masuk/anggota") ? {s: 200, j: ANG} : {s: 404, j: {}};
const tb = (w, re) => w.wadah.cari(e => e.tag === "button" && re.test(e.textContent + (e.att["aria-label"] || "")));
const posts = w => w.panggilan.filter(p => p.o.method === "POST");

test("sumber: tanpa confirm() bawaan", () => { assert.doesNotMatch(SRC, /confirm\(/); });
test("cabut anggota: konfirmasi dalam halaman, tekan cabut belum POST, Ya satu POST, Batal nol POST", async () => {
  const w = dunia(ruteAnggota); w.ctx.UndangRekan.pasang(w.wadah, {}); await tunda();
  tb(w, /Cabut anggota Dewi/)[0].ev.click({currentTarget: new El("button")});
  assert.equal(posts(w).length, 0); assert.match(w.wadah.textContent, /tidak bisa lagi masuk ke akun ini/);
  tb(w, /^Batal$/)[0].ev.click(); assert.equal(posts(w).length, 0); assert.doesNotMatch(w.wadah.textContent, /tidak bisa lagi masuk/);
  tb(w, /Cabut anggota Dewi/)[0].ev.click({currentTarget: new El("button")});
  const ya = tb(w, /^Ya, cabut$/)[0]; ya.ev.click(); ya.ev.click(); await tunda();
  assert.equal(posts(w).length, 1);
  tb(w, /Putuskan semua sesi/)[0].ev.click({currentTarget: new El("button")});
  assert.match(w.wadah.textContent, /termasuk kamu, harus masuk ulang/); assert.equal(posts(w).length, 1);
});
test("hanya satu konfirmasi terbuka; Escape membatalkan; Setujui tanpa konfirmasi, Tolak dengan", async () => {
  const w = dunia(ruteAnggota); w.ctx.UndangRekan.pasang(w.wadah, {}); await tunda();
  tb(w, /Cabut anggota Dewi/)[0].ev.click({currentTarget: new El("button")});
  tb(w, /^Tolak$/)[0].ev.click({currentTarget: new El("button")});
  assert.equal(tb(w, /^Batal$/).length, 1); assert.match(w.wadah.textContent, /Tolak permohonan Joko/);
  w.wadah.cari(e => e.ev.keydown)[0].ev.keydown({key: "Escape"}); assert.equal(tb(w, /^Batal$/).length, 0); assert.equal(posts(w).length, 0);
  tb(w, /^Setujui$/)[0].ev.click(); await tunda(); assert.equal(posts(w).length, 1);
});
test("401: satu kalimat ajakan masuk dengan tautan ke /masuk?ke=", async () => {
  const w = dunia(() => ({s: 401, j: {}})); w.ctx.UndangRekan.pasang(w.wadah, {}); await tunda();
  assert.match(w.wadah.textContent, /Masuk dengan nomor WhatsApp/);
  assert.equal(w.wadah.cari(e => e.tag === "a")[0].att.href, "/masuk?ke=%2Finstansi");
  assert.equal(w.wadah.cari(e => e.tag === "form").length, 0);
});

test("tanpa pesan.js: pasang melempar galat yang jelas; nomor tersamar x, tanggal dan menunggu dari modul", async () => {
  const w0 = dunia(() => ({s: 404, j: {}}), true);
  assert.throws(() => w0.ctx.UndangRekan.pasang(w0.wadah, {}), /pesan\.js/);
  const w = dunia(ruteAnggota); w.ctx.UndangRekan.pasang(w.wadah, {}); await tunda();
  const t = w.wadah.textContent;
  assert.ok(t.includes("Menunggu pemeriksaan")); assert.ok(!t.includes("Menunggu persetujuan")); assert.ok(t.includes("xxxxxx**22"));
  assert.doesNotMatch(t, /[•·]/);
  const w2 = dunia((url) => url.startsWith("/api/masuk/undang") ? {s: 200, j: ADA} : {s: 403, j: {}}); w2.ctx.UndangRekan.pasang(w2.wadah, {}); await tunda();
  assert.ok(w2.wadah.textContent.includes("15 Jan 2027"));   // 1800000000000 ms
});
