/* Asap layar /bnpb/saham bagian "Konsesi dan saham" di Chrome nyata: server statis + stub API (CSP asli src/bnpb.js).
   1) harga 401: titik panas tetap lengkap, harga "belum tersedia dari penyedia", detail memuat analisa tanpa harga.
   2) dummy Super Admin: harga, grafik dua sumbu, analisa, "Data contoh", 390 px tanpa gulir mendatar, konsol bersih. Tanpa Chrome: dilewati.
   Jalan: node --test tests/bnpb/saham_layar.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, statSync} from "node:fs";
import path from "node:path";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {KONSESI} from "../../public/bnpb/saham_contoh.js";

const CSP = readFileSync(new URL("../../src/bnpb.js", import.meta.url), "utf8").match(/export const CSP = "([^"]+)"/)[1];
const PUB = path.resolve(new URL("../../public", import.meta.url).pathname), CHROME = cariChrome();
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|40[13]|assets\.stockbit/.test(g);

test("layar /bnpb/saham: konsesi tanpa harga, lalu dummy lengkap", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    const js = (o, s = 200) => { r.writeHead(s, {"content-type": "application/json"}); r.end(JSON.stringify(o)); };
    if (u === "/api/akademisi/saya") return js({super: true});
    if (u === "/api/saham/konsesi") return js(KONSESI);
    if (u.startsWith("/api/saham/")) return js({ok: false, kode: "akses_belum_dibuka", pesan: "belum"}, 403);
    const f = path.join(PUB, u === "/bnpb/saham" ? "/bnpb/saham.html" : u);
    if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); r.end(readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
  try {
    for (const [w, hh] of [[1440, 900], [390, 844]]) {
      await t.ukuran(w, hh); await t.buka(asal + "/bnpb/saham", {tunggu: '[data-panel="konsesi"] tbody tr'});
      assert.equal(await t.eval("document.querySelectorAll('[data-panel=konsesi] tr[data-kode]').length"), 5);
      assert.equal(await t.eval("document.querySelector('[data-panel=konsesi] tr[data-kode] td').textContent"), "AAAA", "urut titik 30 hari");
      await t.tungguFungsi("/belum tersedia dari penyedia/.test(document.querySelector('tr[data-kode=AAAA] [data-harga]').textContent)");
      await t.eval("document.querySelector('tr[data-kode=DDDD]').scrollIntoView()");
      await t.tungguFungsi("/di luar IDX/.test(document.querySelector('tr[data-kode=DDDD] [data-harga]').textContent)");
      await t.eval("document.querySelector('tr[data-kode=AAAA]').click()");
      await t.tungguFungsi("/Harga saham belum tersedia/.test(document.querySelector('.sh-detail').innerText) && document.querySelector('.sh-detail svg.sh-ganda')");
      assert.equal(await t.eval("/Keterkaitan, bukan sebab; titik panas di konsesi bukan bukti pelanggaran/.test(document.querySelector('.sh-detail').innerText)"), true);
      /* dummy */
      await t.eval("document.querySelector('[data-dummy=isi]').click()");
      await t.tungguFungsi("[...document.querySelectorAll('[data-harga]')].some(x => /^Rp /.test(x.textContent))");
      await t.eval("document.querySelector('tr[data-kode=AAAA]').click()");
      await t.tungguFungsi("document.querySelector('.sh-detail .sh-hline') && /Korelasi Spearman antara titik minggu ini/.test(document.querySelector('.sh-detail').innerText)");
      assert.equal(await t.eval("/Data contoh/.test(document.querySelector('[data-panel=konsesi]').innerText)"), true);
      await t.eval("document.querySelector('tr[data-kode=EEEE]').click()");
      await t.tungguFungsi("/sampel terlalu kecil untuk disimpulkan/.test(document.querySelector('.sh-detail').innerText)");
      assert.equal(await t.eval("/\\b(NaN|undefined|null)\\b|\\[object/.test(document.querySelector('[data-panel=konsesi]').innerText)"), false, `teks bocor @${w}`);
      const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw} @${w}`);
      assert.deepEqual(t.galat().filter(bukanSisi), [], `konsol @${w}`);
    }
  } finally { await t.tutup(); await br.tutup(); srv.close(); }
});
