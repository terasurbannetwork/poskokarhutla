/* RU-047 KPOD-3 kartu cakupan Laphar (public/bnpb/unit/kpod3.js + rapor.js asli di vm, data nyata public/data/laphar_riwayat.json).
   Hari terurai, hari bolong, hari tertinggal dari berkas; tertinggal lebih dari 1 hari menyalakan pil basi; tanpa bolong tidak ada tabel nol;
   berkas rusak tidak menghasilkan kartu; skema lolos rapor.py; tanpa titik tengah dan tanpa kata aman. Jalan: node --test tests/bnpb/unit_kpod3.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import vm from "node:vm";
import http from "node:http";
import {existsSync, statSync} from "node:fs";
import path from "node:path";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {petaSitus} from "./_peta.mjs";
import {fileURLToPath} from "node:url";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const baca = p => readFileSync(AKAR + p, "utf8");
const ctx = {window: {}, Date, Intl, Number, String, Array, Math, Object, isNaN, Set};
vm.createContext(ctx);
vm.runInContext(baca("public/inti/format.js") + "\n;globalThis.esc = esc; globalThis.fmt = fmt;", ctx);
vm.runInContext(baca("public/bnpb/unit/rapor.js"), ctx);
vm.runInContext(baca("public/bnpb/unit/kpod3.js"), ctx);
const R = ctx.window.UnitRapor, K = ctx.window.UnitKpod3;
/* potongan cakupan berkas nyata 29 Okt 2026, dibekukan: uji memeriksa tanggal persis dan tidak boleh ikut berubah saat pipeline memperbarui berkas */
const RIWAYAT = {cakupan: {"mulai": "2026-01-01", "sampai": "2026-10-28", "hari": 294, "tanpa_pdf": ["2026-09-21", "2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06", "2026-10-17", "2026-10-19", "2026-10-29"]}};
const NYATA = JSON.parse(baca("public/data/laphar_riwayat.json"));
const WIB = d => Date.parse(d + "T05:00:00Z");   // pukul 12.00 WIB hari d
const salin = x => JSON.parse(JSON.stringify(x));
const angka = (k, id) => k.angka.find(a => a.k === id).nilai;
const kepala = h => h.slice(0, h.indexOf("</header>"));

test("bentuk berkas nyata terbaca kartu; angka dari cakupan beku: hari terurai, bolong di dalam rentang, tanpa PDF sesudah sampai", () => {
  assert.ok(K.bangun(NYATA), "berkas nyata sekarang menghasilkan kartu"); assert.ok(K.per(NYATA));
  const c = RIWAYAT.cakupan, k = K.bangun(RIWAYAT, WIB(c.sampai));
  assert.equal(angka(k, "hari"), c.hari);
  const dalam = c.tanpa_pdf.filter(d => d >= c.mulai && d <= c.sampai);
  assert.equal(angka(k, "bolong"), dalam.length);
  assert.equal(angka(k, "sesudah"), c.tanpa_pdf.length - dalam.length);
  assert.ok(dalam.length > 0 && angka(k, "sesudah") > 0, "berkas nyata punya bolong dan hari sesudah sampai");
  assert.equal(k.baris.length, c.tanpa_pdf.length);
  assert.match(k.angka[0].label, /1 Jan 2026 sampai 28 Okt 2026/);
  assert.equal(k.baris.filter(b => /^bolong/.test(b.letak)).length, dalam.length);
});

test("tertinggal lebih dari 1 hari menyalakan pil basi; 0 atau 1 hari tidak", () => {
  const c = RIWAYAT.cakupan, per = K.per(RIWAYAT), k = K.bangun(RIWAYAT);
  const sehari = WIB("2026-10-29"), duaHari = WIB("2026-10-30");   // sampai = 2026-10-28
  assert.equal(angka(K.bangun(RIWAYAT, WIB(c.sampai)), "tertinggal"), 0);
  assert.equal(angka(K.bangun(RIWAYAT, sehari), "tertinggal"), 1);
  assert.equal(angka(K.bangun(RIWAYAT, duaHari), "tertinggal"), 2);
  assert.doesNotMatch(R.html(k, per, sehari), /un-basi|ad-spanduk/, "tertinggal 1 hari belum basi");
  const basi = R.html(k, per, duaHari);
  assert.match(basi, /un-per un-basi/); assert.match(basi, /basi sejak 30 Okt 2026/); assert.match(basi, /ad-spanduk/);
  assert.match(R.html(k, per, WIB(c.sampai)), /per 28 Okt 2026/);
  assert.equal(angka(K.bangun(RIWAYAT, WIB("2026-10-01")), "tertinggal"), 0, "tanggal sampai di masa depan tidak jadi angka negatif");
  // batas WIB: 23.59 WIB hari sampai+1 masih 1 hari, 00.01 WIB hari sampai+2 sudah 2
  assert.equal(angka(K.bangun(RIWAYAT, Date.parse("2026-10-29T16:59:00Z")), "tertinggal"), 1);
  assert.equal(angka(K.bangun(RIWAYAT, Date.parse("2026-10-29T17:01:00Z")), "tertinggal"), 2);
  assert.doesNotMatch(R.html(k, per, Date.parse("2026-10-29T16:59:00Z")), /un-basi/);
  assert.match(R.html(k, per, Date.parse("2026-10-29T17:01:00Z")), /un-basi/);
});

test("tanpa hari tanpa PDF: tanpa tabel, angka nol sungguhan; berkas tanpa cakupan: tidak ada kartu", () => {
  const r = salin(RIWAYAT); r.cakupan.tanpa_pdf = [];
  const k = K.bangun(r, WIB(r.cakupan.sampai)), h = R.html(k, K.per(r), WIB(r.cakupan.sampai));
  assert.equal(angka(k, "bolong"), 0); assert.equal(k.kolom.length, 0); assert.doesNotMatch(h, /<table|Belum ada data/);
  for (const rusak of [null, {}, {cakupan: {}}, {cakupan: {sampai: "kemarin", hari: 3}}, {cakupan: {sampai: "2026-10-28", hari: "3"}}, {cakupan: {sampai: "2026-02-31", hari: 3}}]) {
    assert.equal(K.bangun(rusak), null); assert.equal(K.per(rusak), null);
  }
  const s = salin(RIWAYAT); s.cakupan.tanpa_pdf = ["2026-10-01", "2026-10-01", "salah", "2026-13-40", 7];
  assert.equal(K.bangun(s).baris.length, 1, "duplikat dan tanggal rusak dibuang");
});

test("skema lolos rapor.py, teks tanpa titik tengah dan kata aman, tautan dan unduh tidak ada", () => {
  const k = K.bangun(RIWAYAT, WIB("2026-11-26")), h = R.html(k, K.per(RIWAYAT), WIB("2026-11-26"));
  const p = spawnSync("python3", ["-I", "-c", `import json,sys;sys.path.insert(0,'scripts/bnpb/unit');import rapor;k=json.load(sys.stdin);k.pop('aturan');rapor.kartu(aturan=(),**k);print('ok')`],
    {cwd: AKAR, input: JSON.stringify(k), encoding: "utf8"});
  assert.equal(p.status, 0, p.stderr); assert.match(p.stdout, /ok/);
  assert.doesNotMatch(h, /·|\baman\b/i); assert.doesNotMatch(h, /Sumber: |ex-ft/);
  assert.doesNotMatch(kepala(h), /class="hl"/); assert.match(kepala(h), /<h3 id="kpod3-laphar-j"><svg[^]*?<\/svg>Cakupan laporan harian \(Laphar\) terurai<\/h3>/);
  assert.match(h, /data-label="Tanggal tanpa PDF"/);
  assert.match(h, /Hitungan kita/);
});

test("katalog: KPOD-3 tayang dari JSON publik laphar_riwayat, skrip kpod3.js ada", () => {
  vm.runInContext(baca("public/bnpb/unit/katalog.js"), ctx);
  const s = ctx.window.UnitKatalog.SISTEM.find(x => x.id === "KPOD-3");
  assert.equal(s.publik, "/data/laphar_riwayat.json"); assert.equal(s.skrip, "public/bnpb/unit/kpod3.js"); assert.equal(s.berkas, null);
  assert.doesNotMatch(baca("public/bnpb/unit/kpod3.js"), /fetch\(|innerHTML|XMLHttpRequest/);
});

const BEKU = {cakupan: {mulai: "2026-01-01", sampai: "2026-10-28", hari: 294, tanpa_pdf: ["2026-02-03", "2026-09-21", "2026-10-01", "2026-10-29"]}};
test("KPOD-3 di Chrome: tab Laphar terurai di /bnpb/unit/kpod, pil basi dari berkas beku, 1440 dan 390 px", {skip: cariChrome() ? false : "Chrome tidak ada"}, async () => {
  const PUB = path.join(AKAR, "public"), CSP = baca("src/bnpb.js").match(/export const CSP = "([^"]+)"/)[1];
  const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml"};
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    const js = (o, c = 200) => { r.writeHead(c, {"content-type": "application/json"}); r.end(JSON.stringify(o)); };
    if (u === "/api/peta-situs") return js(petaSitus());
    if (u === "/api/unit/indeks") return js({dibuat: new Date().toISOString(), berkas: []});
    if (u.startsWith("/api/")) return js({galat: "belum"}, 404);
    if (u === "/data/laphar_riwayat.json") return js(BEKU);   // beku: tertinggal jauh dari hari ini, tidak ikut berubah saat pipeline memperbarui berkas nyata
    const f = path.join(PUB, /^\/bnpb\/unit\/[a-z]{2,4}$/.test(u) ? "/bnpb/unit/unit.html" : u);
    if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); r.end(readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const br = await bukaPeramban(), t = await br.tab(), asal = `http://127.0.0.1:${srv.address().port}`;
  const sisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|status of (401|404)/.test(g);
  try {
    for (const [w, hh] of [[1440, 900], [390, 844]]) {
      await t.ukuran(w, hh);
      await t.buka(asal + "/bnpb/unit/kpod?s=kpod-3", {tunggu: "#kpod3-laphar"});
      assert.equal(await t.eval("document.querySelector('[role=tab][aria-selected=true]').dataset.tab"), "KPOD-3");
      const c = BEKU.cakupan, bolong = c.tanpa_pdf.filter(d => d >= c.mulai && d <= c.sampai).length;
      assert.equal(await t.eval("document.querySelector('#kpod3-laphar .un-ringkas dd').textContent"), String(c.hari));
      assert.equal(await t.eval("document.querySelectorAll('#kpod3-laphar .un-ringkas dd')[1].textContent"), String(bolong));
      assert.match(await t.eval("document.querySelector('#kpod3-laphar .un-per').textContent"), /basi sejak/, "berkas beku tertinggal lebih dari 1 hari");
      assert.equal(await t.eval("document.querySelectorAll('#kpod3-laphar tbody tr').length"), c.tanpa_pdf.length);
      const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw} @${w}`);
      assert.deepEqual(t.galat().filter(sisi), [], `konsol @${w}`);
      assert.equal(await t.eval("/\\b(NaN|undefined|null)\\b|\\[object|·/.test(document.querySelector('main').innerText)"), false);
    }
  } finally { await t.tutup?.(); await br.tutup?.(); srv.close(); }
});
