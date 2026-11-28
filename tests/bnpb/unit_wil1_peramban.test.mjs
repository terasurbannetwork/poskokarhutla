/* RU-079 Meja Wilayah di Chrome nyata: halaman /bnpb/unit/wil memuat unit.html + wil1.js asli, berkas dari wil1.py (data repo hari ini, dibekukan lewat python),
   stub /api/unit/*. Pemilih direktorat dan tipe berganti seketika; tipe tanpa sumber segar tampil "belum ada data" dengan alasan, bukan nol. 1440 dan 390 px.
   Tanpa Chrome: dilewati. Jalan: node --test tests/bnpb/unit_wil1_peramban.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, statSync} from "node:fs";
import {spawnSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {petaSitus} from "./_peta.mjs";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const CSP = readFileSync(AKAR + "src/bnpb.js", "utf8").match(/export const CSP = "([^"]+)"/)[1];
const PUB = path.join(AKAR, "public"), CHROME = cariChrome();
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|status of (401|404|500)/.test(g);

test("Meja Wilayah: pemilih direktorat dan tipe, tipe tanpa data beralasan, tanpa galat konsol", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const p = spawnSync("python3", ["-I", "-c", "import sys,json,datetime;sys.path.insert(0,'scripts/bnpb/unit');import wil1;b=wil1.jalan(datetime.datetime(2026,11,26,3,0,tzinfo=datetime.timezone.utc))['meja_wilayah'];print(json.dumps({'dibuat':'2026-11-26T03:00:00Z','basi_jam':48,**b}))"], {cwd: AKAR, encoding: "utf8", maxBuffer: 1 << 26});
  assert.equal(p.status, 0, p.stderr);
  const berkas = JSON.parse(p.stdout), kini = new Date().toISOString();
  berkas.dibuat = kini;   // pil basi tidak ikut diuji di sini
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    const js = (o, s = 200) => { r.writeHead(s, {"content-type": "application/json"}); r.end(JSON.stringify(o)); };
    if (u === "/api/peta-situs") return js(petaSitus());
    if (u === "/api/unit/indeks") return js({dibuat: kini, berkas: [{nama: "meja_wilayah", sistem: "WIL-1", dibuat: kini, basi_jam: 48, ok: true, galat: null, diunggah: kini, basi: false}]});
    if (u === "/api/unit/data/meja_wilayah") return js(berkas);
    const f = path.join(PUB, u === "/bnpb/unit" ? "/bnpb/unit/index.html" : /^\/bnpb\/unit\/[a-z]{2,4}$/.test(u) ? "/bnpb/unit/unit.html" : u);
    if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); r.end(readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
  try {
    for (const [w, hh] of [[1440, 900], [390, 844]]) {
      await t.ukuran(w, hh);
      await t.buka(asal + "/bnpb/unit/wil", {tunggu: ".un-wil-pemilih"});
      assert.equal(await t.eval("document.querySelectorAll('.un-wil-pemilih .ad-tabs').length"), 2, "dua deretan pil");
      assert.deepEqual(await t.eval("[...document.querySelectorAll('.un-wil-pemilih .ad-tabs')[0].children].map(b => b.textContent)"), ["Wilayah I", "Wilayah II", "Wilayah III", "Semua"]);
      assert.equal(await t.eval("document.querySelectorAll('.un-wil-pemilih .ad-tabs')[1].children.length"), 5);
      assert.ok(await t.eval("!!document.querySelector('#wil1-ringkas')"), "kartu ringkas");
      const t5 = berkas.data.tipe["5"].tersedia, n5 = berkas.data.direktorat.wil1.butir.concat(berkas.data.direktorat.wil2.butir, berkas.data.direktorat.wil3.butir).filter(b => b.tipe === 5).length;
      assert.equal(t5, true, "tipe 5 dihitung dari data repo hari ini");
      assert.equal(await t.eval("document.querySelector('[data-tipe=\"5\"]').getAttribute('aria-pressed')"), "true", "tipe pertama yang punya butir dipilih");
      assert.equal(await t.eval("document.querySelectorAll('#wil1-antrean tbody tr').length"), n5);
      /* klik direktorat: pil berganti seketika, kartu tersusun ulang tanpa ambil data */
      await t.eval("document.querySelector('[data-dit=\"wil1\"]').click()");
      assert.equal(await t.eval("document.querySelector('[data-dit=\"wil1\"]').getAttribute('aria-pressed')"), "true");
      assert.equal(await t.eval("document.querySelectorAll('#wil1-antrean tbody tr').length"), berkas.data.direktorat.wil1.butir.filter(b => b.tipe === 5).length);
      /* tipe tanpa sumber segar: belum ada data dan alasannya, bukan angka nol */
      await t.eval("document.querySelector('[data-tipe=\"1\"]').click()");
      assert.match(await t.eval("document.querySelector('.un-wil-antre').innerText"), /belum ada data/i);
      assert.match(await t.eval("document.querySelector('.un-wil-antre .ad-kosong').innerText"), /Belum ada data: /);
      assert.equal(await t.eval("document.querySelectorAll('#wil1-antrean tbody tr').length"), 0);
      const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw} @${w}`);
      assert.deepEqual(t.galat().filter(bukanSisi), [], `konsol @${w}`);
      assert.equal(await t.eval("/·|\\baman\\b|\\bundefined\\b|\\[object|\\bNaN\\b/i.test(document.querySelector('main').innerText)"), false);
    }
  } finally { await t.tutup(); await br.tutup(); srv.close(); }
});
