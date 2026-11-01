/* Cek asap layar /bnpb/perencanaan di Chrome nyata: server statis memetakan /bnpb/perencanaan ke perencanaan.html dengan CSP yang sama dengan src/bnpb.js.
   Klik tab, beralih daftar, pilih jenis, konsol bersih, 390 dan 1440 px tanpa gulir mendatar halaman. Tanpa Chrome: dilewati.
   Jalan: node --test tests/bnpb/perencanaan_layar.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, statSync} from "node:fs";
import path from "node:path";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";

/* CSP dibaca dari src/bnpb.js (mengimpornya langsung memicu siklus impor worker) */
const CSP = readFileSync(new URL("../../src/bnpb.js", import.meta.url), "utf8").match(/export const CSP = "([^"]+)"/)[1];
const PUB = path.resolve(new URL("../../public", import.meta.url).pathname), CHROME = cariChrome();
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)/.test(g);

test("layar /bnpb/perencanaan: tiga tab, daftar, jenis, konsol bersih, tanpa gulir mendatar", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const srv = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split("?")[0]); if (u === "/bnpb/perencanaan") u = "/bnpb/perencanaan.html";
    const f = path.join(PUB, u);
    if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); r.end(readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
  try {
    for (const [w, hh] of [[1440, 900], [390, 844]]) {
      await t.ukuran(w, hh); await t.buka(asal + "/bnpb/perencanaan", {tunggu: ".pr-tabel"});
      const ok = (js, pesan) => t.eval(js).then(v => assert.ok(v, `${pesan} @${w}`));
      await ok("document.querySelectorAll('.pr-tabel tbody tr').length === 51", "51 kab");
      await ok("/Beban laporan, bukan peringkat risiko/.test(document.body.innerText)", "label beban laporan");
      await ok("/Per 100 ribu penduduk/.test(document.body.innerText) && /Per 100 km²/.test(document.body.innerText)", "kolom pembanding");
      await t.klik(".pr-nama"); await t.tunggu(".pr-rinci"); await ok("/Selang tanpa koreksi perbandingan berganda/.test(document.querySelector('.pr-rinci').innerText)", "rincian kab + label selang");
      await t.klikTeks(".pr-pilih", "^Khusus bencana alam"); await t.tungguFungsi("document.querySelectorAll('.pr-tabel tbody tr').length !== 51");
      await t.klik('[data-k="kalender"]'); await t.tunggu(".pr-kal");
      await ok("/Pola laporan, bukan musim fisik; belum diuji balik/.test(document.body.innerText)", "label kalender");
      await ok("document.querySelectorAll('.pr-kal tbody tr').length >= 5 && document.querySelectorAll('.pr-seg.jenis .pr-pilih').length >= 5", "matriks dan jenis");
      await t.klikTeks(".pr-pilih", "^Karhutla$"); await t.tungguFungsi("/Sumatera Selatan/.test(document.querySelector('.pr-kal').innerText) && !/DKI Jakarta/.test(document.querySelector('.pr-kal').innerText)");
      await t.klik('[data-k="stok"]'); await t.tunggu(".pr-prov");
      await ok("/Frekuensi kejadian, BUKAN jumlah barang; bias seleksi/.test(document.body.innerText) && /Ekstrapolasi tidak andal/.test(document.body.innerText)", "label stok");
      await t.eval("document.querySelector('.pr-prov').open = true"); await t.tunggu(".pr-prov table");
      await ok("/Selang Wilson 95%/.test(document.querySelector('.pr-prov').innerText)", "rincian stok");
      assert.equal(await t.eval("/\\b(NaN|undefined|null)\\b|\\[object|·|Pantau Bencana/.test(document.body.innerText)"), false, `teks bocor @${w}`);
      const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar halaman ${sw} > ${iw} @${w}`);
      assert.deepEqual(t.galat().filter(bukanSisi), [], `konsol @${w}`);
    }
  } finally { await t.tutup(); await br.tutup(); srv.close(); }
});
