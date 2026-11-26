/* RU-052 PD-3 layar penyusun pesan (public/bnpb/unit/pd3.js). Murni di vm dengan data nyata terpapar.json, siaga.json, risiko_hvc.json:
   pencocokan kab menurut nama di provinsi yang sama (ganda atau tak ada = kosong, tidak ditebak), kelas bahaya dari ambang, jiwa terpapar
   h[bahaya][0], sumber daya. Chrome nyata: /bnpb/unit/pd memilih peringatan, enam baris di kotak pesan, salin dan unduh PNG, tanpa
   permintaan selain GET, 1440 dan 390 px, tanpa galat konsol. Tanpa Chrome: bagian peramban dilewati. Jalan: node --test tests/bnpb/unit_pd3_layar.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, statSync} from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {petaSitus} from "./_peta.mjs";
import {pesanStandar} from "../../public/ews_tindakan.js";

const AKAR = path.resolve(new URL("../..", import.meta.url).pathname), PUB = path.join(AKAR, "public"), CHROME = cariChrome();
const baca = p => readFileSync(path.join(AKAR, p), "utf8");
const D = {terpapar: JSON.parse(baca("public/data/bnpb/terpapar.json")), siaga: JSON.parse(baca("public/data/bnpb/siaga.json")), risiko: JSON.parse(baca("public/data/bnpb/risiko_hvc.json"))};
D.kab = Object.entries(D.risiko.kab).map(([kode, v]) => ({kode, nama: v.nama}));
const ctx = {window: {}, Date, Intl, Number, String, Array, Math, Object, isNaN};
vm.createContext(ctx);
vm.runInContext(baca("public/bnpb/unit/pd3.js"), ctx);
const P = ctx.window.UnitPd3;
const CSP = baca("src/bnpb.js").match(/export const CSP = "([^"]+)"/)[1];
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|status of (401|404)/.test(g);
const kini = Date.now(), iso = ms => new Date(ms).toISOString();
const PERINGATAN = [
  {kunci: "a", jenis: "banjir", tingkat: "Awas", prov: "13", kab: "Agam", judul: "x", teks: "y", sumber: "Deteksi Centurisk97", dibuat: iso(kini - 36e5), berlaku_hingga: iso(kini + 12 * 36e5)},
  {kunci: "b", jenis: "karhutla", tingkat: "Siaga", prov: "93", kab: "Merauke", judul: "x", teks: "y", sumber: "Deteksi Centurisk97", dibuat: iso(kini - 36e5), berlaku_hingga: iso(kini + 12 * 36e5)},
  {kunci: "c", jenis: "gempa", tingkat: "Waspada", prov: "11", kab: "Tak Ada Kabupaten Ini", judul: "x", teks: "y", sumber: "BMKG", dibuat: iso(kini - 36e5), berlaku_hingga: iso(kini + 12 * 36e5)}];

test("kodeKab: cocok menurut nama di provinsi yang sama, Kab. dan Kota dibedakan, ganda atau tak ada = null", () => {
  assert.equal(P.kodeKab({prov: "13", kab: "Agam"}, D.kab), D.kab.find(k => k.nama === "Kab. Agam").kode);
  assert.equal(P.kodeKab({prov: "13", kab: "Kota Padang"}, D.kab), D.kab.find(k => k.nama === "Kota Padang").kode);
  assert.equal(P.kodeKab({prov: "13", kab: "Padang"}, D.kab), null, "tanpa Kota tidak ditebak");
  assert.equal(P.kodeKab({prov: "12", kab: "Agam"}, D.kab), null, "provinsi lain");
  assert.equal(P.kodeKab({prov: "13", kab: ""}, D.kab), null); assert.equal(P.kodeKab({prov: "13"}, D.kab), null); assert.equal(P.kodeKab(null, D.kab), null);
  const ganda = [{kode: "1301", nama: "Kab. Agam"}, {kode: "1302", nama: "Kabupaten Agam"}];
  assert.equal(P.kodeKab({prov: "13", kab: "Agam"}, ganda), null, "dua kab bernama sama");
  for (const p of PERINGATAN.slice(0, 2)) assert.ok(P.kodeKab(p, D.kab), `${p.kab} harus cocok`);
});

test("kelasBahaya memakai ambang terpapar.json: batas inklusif di ambang sedang, eksklusif di ambang tinggi", () => {
  const a = D.terpapar.ambang;
  assert.deepEqual([0.329, 0.33, 0.66, 0.661].map(v => P.kelasBahaya(v, a)), ["rendah", "sedang", "sedang", "tinggi"]);
  assert.equal(P.kelasBahaya(null, a), null); assert.equal(P.kelasBahaya(0.5, null), null); assert.equal(P.kelasBahaya(NaN, a), null);
});

test("konteks dari data nyata: jiwa terpapar = h[bahaya][0], kelas dari H kab, sumber daya dari siaga; jenis tanpa data kosong, bukan 0", () => {
  const k = P.konteks(PERINGATAN[0], D), h = D.terpapar.kab[k.kode].h.banjir[0];
  assert.equal(k.jiwa_terpapar, h); assert.ok(["rendah", "sedang", "tinggi"].includes(k.kelas_bahaya));
  assert.match(k.sumber_daya, /stok yang disarankan .*; stok tersedia belum ada data$/);
  const g = P.konteks({jenis: "gempa", tingkat: "Waspada", prov: "13", kab: "Agam"}, D);   // gempa ada di terpapar
  assert.equal(typeof g.jiwa_terpapar, "number");
  const tsu = P.konteks({jenis: "tsunami", tingkat: "Siaga", prov: "13", kab: "Agam"}, D);   // tidak ada di terpapar maupun H
  assert.equal(tsu.jiwa_terpapar, null); assert.equal(tsu.kelas_bahaya, null);
  const tak = P.konteks(PERINGATAN[2], D);
  assert.equal(JSON.stringify([tak.kode, tak.jiwa_terpapar, tak.kelas_bahaya, tak.sumber_daya]), "[null,null,null,null]");
  assert.deepEqual(JSON.parse(JSON.stringify(P.konteks(PERINGATAN[0], {}))), {kode: null, turunan: null, kelas_bahaya: null, jiwa_terpapar: null, sumber_daya: null}, "berkas konteks tak terbaca");
  const jumlah = P.sumberDaya("banjir", "x", {kab: {x: {desa: []}}, stok: {banjir: [{nama: "Tenda"}]}, ada_terisolir: true});
  assert.equal(jumlah, "stok yang disarankan tenda; tidak ada desa langganan terisolir tercatat; stok tersedia belum ada data");
  assert.match(P.sumberDaya("banjir", "x", {kab: {x: {desa: [1, 2]}}, stok: {}, ada_terisolir: true}), /^2 desa langganan terisolir tercatat/);
  assert.equal(P.sumberDaya("banjir", "x", {kab: {x: {desa: []}}, stok: {}, ada_terisolir: false}), null, "tanpa data terisolir tidak menulis tidak ada");
});

test("pesan enam baris dari konteks nyata; unsur kosong tertulis belum ada data; tanpa kata aman", () => {
  for (const p of PERINGATAN) {
    const k = P.konteks(p, D), t = pesanStandar(p, {turunan: k.turunan, kelas_bahaya: k.kelas_bahaya, jiwa_terpapar: k.jiwa_terpapar, sumber_daya: k.sumber_daya}).split("\n");
    assert.equal(t.length, 6); assert.doesNotMatch(t.join("\n"), /\baman\b|·/i);
    if (!k.kode) for (const i of [2, 3, 5]) assert.match(t[i], /belum ada data$/);
  }
});

test("pd3.js: tanpa POST, tanpa innerHTML, tanpa fungsi kirim; PD-3 terdaftar tayang dari /api/peringatan/aktif", () => {
  const js = baca("public/bnpb/unit/pd3.js");
  assert.doesNotMatch(js, /method:\s*["']?(POST|PUT|PATCH|DELETE)|XMLHttpRequest|sendBeacon|navigator\.share/i);
  assert.equal((js.match(/fetch\(/g) || []).length, 1, "satu helper GET");
  assert.deepEqual(js.split("\n").filter(b => b.includes("innerHTML")).map(b => /R\.svg\(k\)/.test(b)), [true], "innerHTML hanya untuk ikon tetap rapor.js");
  vm.runInContext(baca("public/bnpb/unit/katalog.js"), ctx);
  const s = ctx.window.UnitKatalog.SISTEM.find(x => x.id === "PD-3");
  assert.equal(s.publik, "/api/peringatan/aktif"); assert.equal(s.skrip, "public/bnpb/unit/pd3.js");
});

test("PD-3 di Chrome: pilih peringatan, enam baris, salin, unduh PNG, tanpa POST", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const post = [];
  const srv = http.createServer((q, s) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    if (q.method !== "GET") post.push(q.method + " " + u);
    const js = (o, c = 200) => { s.writeHead(c, {"content-type": "application/json"}); s.end(JSON.stringify(o)); };
    if (u === "/api/peta-situs") return js(petaSitus());
    if (u === "/api/unit/indeks") return js({dibuat: iso(kini), berkas: []});
    if (u === "/api/peringatan/aktif") return js({kini: iso(kini), n: 3, total: 59, per_tingkat: {Awas: 1, Siaga: 1, Waspada: 1}, terpotong: true, peringatan: PERINGATAN});
    if (u.startsWith("/api/")) return js({galat: "belum"}, 404);
    const f = path.join(PUB, /^\/bnpb\/unit\/[a-z]{2,4}$/.test(u) ? "/bnpb/unit/unit.html" : u);
    if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { s.writeHead(404); return s.end(); }
    s.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); s.end(readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
  try {
    for (const [w, hh] of [[1440, 900], [390, 844]]) {
      await t.ukuran(w, hh);
      await t.buka(asal + "/bnpb/unit/pd", {tunggu: "#pd3-pilih"});
      assert.equal(await t.eval("document.querySelectorAll('#pd3-pilih option').length"), 4, "pilih + 3 peringatan");
      assert.equal(await t.eval("document.querySelector('#pd3-pesan .hl').textContent"), "59", "angka peringatan aktif = total API, bukan panjang daftar");
      assert.equal(await t.eval("document.querySelector('#pd3-pesan .ex-bd button[disabled]') !== null"), true, "tombol mati sebelum memilih");
      await t.pilih("#pd3-pilih", "0");
      await t.tungguFungsi("document.getElementById('pd3-teks').value.split('\\n').length === 6");
      const teks = await t.eval("document.getElementById('pd3-teks').value");
      assert.match(teks, /^Jenis potensi bencana: Banjir.*Agam/); assert.match(teks, /Tingkatan: Awas, warna merah/); assert.doesNotMatch(teks, /\baman\b/i);
      assert.match(teks, /Potensi jiwa terpapar: [\d.]+ jiwa/); assert.match(teks, /Daya rusak \(kelas bahaya\): (rendah|sedang|tinggi)/);
      assert.match(await t.eval("document.querySelector('#pd3-pesan .un-g dl').innerText"), /Agam/);
      await t.pilih("#pd3-pilih", "2");
      await t.tungguFungsi("/Tidak bisa dicocokkan|tidak bisa dicocokkan/.test(document.querySelector('#pd3-pesan .un-g-cat:last-child, #pd3-pesan [role=status]:last-child').textContent)");
      const kosong = await t.eval("document.getElementById('pd3-teks').value.split('\\n')");
      for (const i of [2, 3, 5]) assert.match(kosong[i], /belum ada data$/);
      await t.pilih("#pd3-pilih", "1");
      await t.tungguFungsi("/Merauke/.test(document.getElementById('pd3-teks').value)");
      await t.eval("[...document.querySelectorAll('#pd3-pesan button')].find(b => /Salin/.test(b.textContent)).click()");
      await t.tungguFungsi("/disalin|ditolak/.test(document.querySelector('#pd3-pesan [role=status]:last-child').textContent)");
      await t.eval("[...document.querySelectorAll('#pd3-pesan button')].find(b => /PNG/.test(b.textContent)).click()");
      await t.tungguFungsi("/PNG diunduh|gagal/.test(document.querySelector('#pd3-pesan [role=status]:last-child').textContent)");
      assert.match(await t.eval("document.querySelector('#pd3-pesan [role=status]:last-child').textContent"), /Kartu PNG diunduh/);
      const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw} @${w}`);
      assert.deepEqual(t.galat().filter(bukanSisi), [], `konsol @${w}`);
      assert.equal(await t.eval("/\\b(NaN|undefined|null)\\b|\\[object|·/.test(document.querySelector('main').innerText)"), false);
    }
    assert.deepEqual(post, [], "tidak ada yang dikirim ke server");
  } finally { await t.tutup?.(); await br.tutup?.(); srv.close(); }
});
