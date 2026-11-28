/* RU-081 WIL-3 tombol draf kaji cepat dan ekspor PDF (public/bnpb/meja_draf.js + public/bnpb/meja.js). Murni: susun() dan kodeKab() atas jawaban bentuk rute
   GET /api/meja/kaji_cepat/draf (src/meja.js); kosong tidak jadi 0, tanpa kata aman. Chrome nyata: petugas berkode membuka meja kaji_cepat, menekan Draf kaji cepat,
   panel berlabel saran, rute dipanggil dengan kode kab dari nama, Unduh PDF tanpa galat, tanpa permintaan selain GET. Jalan: node --test tests/bnpb/meja_draf.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, statSync} from "node:fs";
import path from "node:path";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {petaSitus} from "./_peta.mjs";
import {kodeKab, susun} from "../../public/bnpb/meja_draf.js";
import {spekPublik} from "../../src/meja_spek.js";

const AKAR = path.resolve(new URL("../..", import.meta.url).pathname), PUB = path.join(AKAR, "public"), CHROME = cariChrome();
const baca = p => readFileSync(path.join(AKAR, p), "utf8");
const WIL = JSON.parse(baca("public/data/bnpb/wilayah.json")).kab;
const CSP = baca("src/bnpb.js").match(/export const CSP = "([^"]+)"/)[1];
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|status of (401|404)/.test(g);
const DRAF = {kab: "6204", label: "saran", catatan: "Draf untuk rapat koordinasi; yang menetapkan status adalah kepala daerah setelah kaji cepat.",
  penduduk: {total: 140000, terpapar: {banjir: {jiwa_sedang_plus: 52000, rentan_sedang_plus: 9000, jiwa_tinggi: 12000, rentan_tinggi: 2100}, gempa: {jiwa_sedang_plus: 140000, rentan_sedang_plus: 25000, jiwa_tinggi: 0, rentan_tinggi: 0}}},
  saran_status: [{jenis: "banjir", saran: "Siaga Darurat", alasan: "sinyal curah hujan", basi: false, tanggal_sinyal: "2026-11-24"}],
  sk_terkini: [{nomor: "188/12/2026", jenis: "Banjir", status: "Siaga Darurat", mulai: "2026-01-05", berakhir: "2026-01-20", hari: 15}],
  perkiraan_masa: {banjir: {median_hari: 14, n: 2}}, kejadian_terkini: [{jenis: "banjir", tempat: "Kec. Jenamas", mulai: "2026-11-20", terakhir: "2026-11-24", hari: 5, status: "berjalan", puncak: null}],
  sumber_ada: {terpapar: true, saran_status: true, status_darurat: true, laphar: true}};

test("kodeKab: prov dan nama persis, ganda atau tak ada = null (tidak ditebak)", () => {
  assert.equal(kodeKab("62", "Barito Selatan", WIL), "6204"); assert.equal(kodeKab("62", " barito selatan ", WIL), "6204");
  assert.equal(kodeKab("61", "Barito Selatan", WIL), null); assert.equal(kodeKab("62", "Tak Ada", WIL), null); assert.equal(kodeKab("62", "", WIL), null); assert.equal(kodeKab(null, "Barito Selatan", WIL), null);
  assert.equal(kodeKab("62", "A", [{kode: "6201", prov: "62", nama: "A"}, {kode: "6202", prov: "62", nama: "a"}]), null);
});

test("susun: angka apa adanya, bagian tanpa isi punya alasan (bukan 0, bukan 'aman'), sumber hilang ditulis", () => {
  const r = susun(DRAF), per = Object.fromEntries(r.bagian.map(b => [b.id, b]));
  assert.equal(r.label, "saran"); assert.deepEqual(r.bagian.map(b => b.id), ["penduduk", "saran", "sk", "masa", "kejadian"]);
  assert.deepEqual(per.penduduk.baris[0], ["Penduduk kabupaten", "140.000 jiwa"]); assert.match(per.penduduk.baris[1][1], /terpapar sedang ke atas 52\.000 jiwa; rentan sedang ke atas 9\.000 jiwa; terpapar tinggi 12\.000 jiwa/);
  assert.match(per.penduduk.baris[2][1], /terpapar tinggi 0 jiwa/, "nol sungguhan dari berkas tetap 0");
  assert.equal(susun({...DRAF, sk_terkini: [{jenis: "banjir", status: "siaga_darurat", nomor: "1"}], kejadian_terkini: [{jenis: "banjir", tempat: "x", status: "sudah_selesai"}]}).bagian[2].baris[0][0], "Banjir, Siaga darurat");
  assert.match(susun({...DRAF, kejadian_terkini: [{jenis: "banjir", tempat: "x", status: "sudah_selesai"}]}).bagian[4].baris[0][1], /, sudah selesai$/);
  assert.match(per.saran.baris[0][1], /Siaga Darurat\. sinyal curah hujan, sinyal 24 Nov 2026/);
  assert.match(per.masa.baris[0][1], /median 14 hari dari 2 SK sejenis di provinsi ini; contoh sedikit/);
  const k = susun({...DRAF, penduduk: null, saran_status: [], sk_terkini: [], perkiraan_masa: {}, kejadian_terkini: [], sumber_ada: {terpapar: false, saran_status: false, status_darurat: false, laphar: false}});
  for (const b of k.bagian) { assert.equal(b.baris.length, 0); assert.match(b.kosong, /belum|tidak ada/); }
  assert.match(k.bagian[0].kosong, /belum terbaca/); assert.match(susun({...DRAF, saran_status: []}).bagian[1].kosong, /belum ada sinyal.*bukan tanda keadaan baik-baik saja/);
  assert.match(susun({...DRAF, perkiraan_masa: {longsor: null}}).bagian[3].baris[0][1], /belum ada SK sejenis/);
  assert.match(JSON.stringify(susun(null)), /belum/, "jawaban kosong tidak melempar");
  assert.doesNotMatch(JSON.stringify([r, k]), /\baman\b|·/i);
});

test("meja_draf.js dan meja.js: draf hanya lewat GET, panel dibangun dengan textContent", () => {
  const js = baca("public/bnpb/meja_draf.js");
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|method:\s*["']?(POST|PUT|PATCH|DELETE)|localStorage/);
  assert.match(baca("public/bnpb/meja.js"), /api\("GET", `\/api\/meja\/kaji_cepat\/draf\?kab=\$\{kab\}`\)/);
});

test("meja kaji_cepat di Chrome: tombol Draf kaji cepat, panel saran, Unduh PDF, tanpa POST", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const lain = [], dipanggil = [];
  const srv = http.createServer((q, s) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    if (q.method !== "GET") lain.push(q.method + " " + u);
    const js = (o, c = 200) => { s.writeHead(c, {"content-type": "application/json"}); s.end(JSON.stringify(o)); };
    if (u === "/api/peta-situs") return js(petaSitus());
    if (u === "/api/meja/spek") return js(spekPublik());
    if (u === "/api/meja/saya") return js({peran: "petugas", petugas: {nama: "Petugas Uji", prov: "62", kab: "Barito Selatan", meja: ["kaji_cepat"]}});
    if (u === "/api/meja/catatan") return js({catatan: []});
    if (u === "/api/meja/kaji_cepat/draf") { dipanggil.push(q.url); return js(DRAF); }
    if (u.startsWith("/api/")) return js({galat: "belum"}, 404);
    const f = path.join(PUB, u === "/meja" ? "/bnpb/meja.html" : u);
    if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { s.writeHead(404); return s.end(); }
    s.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); s.end(readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
  try {
    for (const [w, hh] of [[1440, 900], [390, 844]]) {
      await t.ukuran(w, hh);
      await t.buka(asal + "/meja#k=" + "a".repeat(26), {tunggu: "[data-draf]"});
      await t.klik("[data-draf]");
      await t.tunggu("#mjDrafPanel");
      assert.deepEqual(dipanggil.slice(-1), ["/api/meja/kaji_cepat/draf?kab=6204"], "kode kab dari prov dan nama");
      const teks = await t.eval("document.getElementById('mjDrafPanel').innerText");
      assert.match(teks, /Saran, bukan penetapan/); assert.match(teks, /Draf kaji cepat, Barito Selatan/); assert.match(teks, /140\.000/); assert.match(teks, /188\/12\/2026/); assert.doesNotMatch(teks, /\baman\b/i);
      await t.klik("[data-draf-pdf]");
      await t.tungguFungsi("!document.querySelector('[data-draf-pdf]').disabled", 20000);
      assert.doesNotMatch(await t.eval("document.querySelector('.mj-pesan')?.textContent || ''"), /gagal/i, "PDF draf berhasil dibuat");
      await t.klik("[data-draf-tutup]");
      assert.equal(await t.eval("document.getElementById('mjDrafPanel')"), null);
      const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw} @${w}`);
      assert.deepEqual(t.galat().filter(bukanSisi), [], `konsol @${w}`);
    }
    assert.deepEqual(lain, [], "tidak ada permintaan selain GET");
  } finally { await t.tutup?.(); await br.tutup?.(); srv.close(); }
});
