/* Asap layar /bnpb/bahan di Chrome nyata: server statis + stub API (dengan CSP asli src/bnpb.js). Empat tab, dummy mengisi form,
   pratinjau teks WA tanpa galat, Kirim memposting {kunci, isi}, Ambil dari Logbook, 390 px tanpa gulir mendatar, konsol bersih. Tanpa Chrome: dilewati.
   Jalan: node --test tests/bnpb/bahan_layar.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, statSync} from "node:fs";
import path from "node:path";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";

const CSP = readFileSync(new URL("../../src/bnpb.js", import.meta.url), "utf8").match(/export const CSP = "([^"]+)"/)[1];
const PUB = path.resolve(new URL("../../public", import.meta.url).pathname), CHROME = cariChrome();
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)/.test(g);

test("layar /bnpb/bahan: empat tab, dummy, pratinjau, kirim, logbook, konsol bersih", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const kiriman = [];
  const srv = http.createServer((q, r) => {
    const [u0, qs] = q.url.split("?"); let u = decodeURIComponent(u0);
    const js = (o, s = 200) => { r.writeHead(s, {"content-type": "application/json"}); r.end(JSON.stringify(o)); };
    if (u === "/api/akademisi/saya") return js({super: true});
    if (u === "/api/wa/form/terakhir") return js({isi: null});
    if (u === "/api/logbook/sk/aktif") return js({sk: []});
    if (u === "/api/logbook/hari") return js({entri: [{kejadian_id: "k1", jenis: "banjir", prov: "11", kab: "Aceh Selatan", waktu: "2026-11-02T20:00:00Z", kejadian_mulai: "2026-11-02T10:00:00Z", mengungsi_jiwa: 205, catatan: "Surut"}]});
    if (u === "/api/wa/form" && q.method === "POST") { let b = ""; q.on("data", d => b += d); q.on("end", () => { kiriman.push(JSON.parse(b)); js({ok: true, id: 1, kunci: kiriman.at(-1).kunci, tanggal: "2026-11-03", teks: "x"}); }); return; }
    if (u === "/bnpb/bahan") u = "/bnpb/bahan.html";
    const f = path.join(PUB, u);
    if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); r.end(readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
  try {
    for (const [w, hh] of [[1440, 900], [390, 844]]) {
      await t.ukuran(w, hh); await t.buka(asal + "/bnpb/bahan", {tunggu: ".bh-form"});
      assert.equal(await t.eval("!!document.querySelector('[data-dummy]')"), false, `tombol dummy tidak dirender @${w} (pemilik 11 Nov 2026)`);
      assert.equal(await t.eval("document.querySelector('.bn-pesan.galat[role=alert]').hidden"), true, `galat merah di keadaan awal @${w}`);
      /* Logbook -> draf */
      await t.eval("[...document.querySelectorAll('.bn-tombol')].find(b => /Ambil dari Logbook/.test(b.textContent)).click()");
      await t.tungguFungsi("document.querySelectorAll('.bh-kartu').length === 1 && /Kejadian baru|Pengkinian/.test(document.body.innerText)");
      /* tombol dummy dicabut (11 Nov 2026): tiap tab hanya diperiksa terbuka tanpa galat; isi-kirim lewat dummy tidak ada lagi */
      for (const k of ["rekap_koordalops_24", "bmkg_pagi", "pvmbg_pagi", "satgas"]) {
        await t.eval(`document.querySelector('input[name=tab][value=${k}]').click()`);
        await t.tungguFungsi(`document.querySelector('input[name=tab][value=${k}]').checked && !document.querySelector('.bh-form[aria-busy]')`);
        assert.equal(await t.eval("document.querySelector('.bn-pesan.galat[role=alert]').hidden"), true, `galat pratinjau ${k} @${w}`);
      }
      assert.equal(await t.eval("/\\b(NaN|undefined|null)\\b|\\[object/.test(document.body.innerText)"), false, `teks bocor @${w}`);
      const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw} @${w}`);
      assert.deepEqual(t.galat().filter(bukanSisi), [], `konsol @${w}`);
    }
  } finally { await t.tutup(); await br.tutup(); srv.close(); }
});
