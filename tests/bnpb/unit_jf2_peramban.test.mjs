/* RU-107 JF-2 di Chrome nyata: /bnpb/unit/jf?s=jf-2 dengan unit/formasi_jf.json keluaran nyata jf2.py (data repo, tanpa cache data/raw; stub /api/unit/*,
   CSP asli src/bnpb.js). Sel tanpa volume = "belum ada data" (bukan 0); kolom usulan = Math.ceil; ubah norma menghitung ulang; filter provinsi;
   1440 dan 390 px tanpa gulir mendatar dan tanpa galat konsol. Tanpa Chrome: dilewati. Jalan: node --test tests/bnpb/unit_jf2_peramban.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, statSync} from "node:fs";
import {spawnSync} from "node:child_process";
import path from "node:path";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {petaSitus} from "./_peta.mjs";

const AKAR = path.resolve(new URL("../..", import.meta.url).pathname);
const CSP = readFileSync(path.join(AKAR, "src/bnpb.js"), "utf8").match(/export const CSP = "([^"]+)"/)[1];
const PUB = path.join(AKAR, "public"), CHROME = cariChrome();
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|status of (401|404)/.test(g);
const id1 = x => x.toLocaleString("id-ID", {maximumFractionDigits: 1});
const ceil = x => Math.ceil(x - 1e-9);

test("JF-2 kebutuhan formasi di peramban: null belum ada data, usulan = ceil, norma dihitung ulang, filter provinsi", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const r = spawnSync("python3", ["-I", "-c", "import sys,json;sys.path.insert(0,'scripts/bnpb');from unit import jf2;print(json.dumps(jf2.jalan()['formasi_jf'],ensure_ascii=False))"], {cwd: AKAR, encoding: "utf8", maxBuffer: 1 << 26});
  assert.equal(r.status, 0, r.stderr);
  const kini = new Date().toISOString(), B = {...JSON.parse(r.stdout), dibuat: kini, basi_jam: 1080};
  const kab = B.data.kab, PROV = "32";
  const di = kab.filter(k => k[0].slice(0, 2) === PROV);
  assert.ok(di.length > 5, "provinsi uji punya kab");
  di[0][2] = di[0][3] = di[0][4] = null;   // satu kab tanpa volume sama sekali: harus tampil belum ada data, bukan 0
  const JAM = B.data.jam_efektif.nilai;
  const hit = (n0, n1) => { const per = {}; for (const k of kab) { const v = [k[2] == null ? null : k[2] * n0, k[3] == null ? null : k[3] * n1].filter(x => x != null); if (v.length) per[k[0]] = v.reduce((a, b) => a + b, 0) / JAM; } return per; };
  const nasional = per => Object.values(per).reduce((a, b) => a + b, 0);
  const srv = http.createServer((q, s) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    const js = (o, c = 200) => { s.writeHead(c, {"content-type": "application/json"}); s.end(JSON.stringify(o)); };
    if (u === "/api/peta-situs") return js(petaSitus());
    if (u === "/api/unit/indeks") return js({dibuat: kini, berkas: [{nama: "formasi_jf", sistem: "JF-2", dibuat: kini, basi_jam: 1080, ok: true, galat: null, diunggah: kini, basi: false}]});
    if (u === "/api/unit/data/formasi_jf") return js(B);
    if (u.startsWith("/api/")) return js({galat: "belum"}, 404);
    const f = path.join(PUB, /^\/bnpb\/unit\/[a-z]{2,4}$/.test(u) ? "/bnpb/unit/unit.html" : u);
    if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { s.writeHead(404); return s.end(); }
    s.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); s.end(readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
  const isi = (id, v) => t.eval(`(() => { const e = document.getElementById(${JSON.stringify(id)}); e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event(e.tagName === "SELECT" ? "change" : "input", {bubbles: true})); return true; })()`);
  const dd = () => t.eval("[...document.querySelectorAll('#jf2-alat dd')].map(d => d.textContent)");
  const baris = () => t.eval("[...document.querySelectorAll('#jf2-alat tbody tr')].map(tr => [...tr.children].map(c => c.textContent))");
  try {
    for (const [w, hh] of [[1440, 900], [390, 844]]) {
      await t.ukuran(w, hh);
      await t.buka(asal + "/bnpb/unit/jf?s=jf-2", {tunggu: "#jf2-alat"});
      await isi("jf2-prov", "");   // pastikan sinkron dengan keadaan awal
      const n0 = B.data.norma.find(n => n.kegiatan === "kaji_cepat").jam, n1 = B.data.norma.find(n => n.kegiatan === "renkon").jam;
      const idx = B.data.norma.map(n => n.kegiatan);
      await t.tungguFungsi(`document.querySelector('#jf2-alat dd').textContent !== 'belum ada data'`);
      assert.equal((await dd())[0], id1(nasional(hit(n0, n1))), "kebutuhan nasional 1 desimal, dari norma bawaan");
      assert.match(await t.eval("document.querySelector('#jf2-alat label[for=jf2-je]').textContent"), /bawaan 1\.250/);
      // filter provinsi: tiap baris = satu kab; kolom usulan = ceil kebutuhan penuh; kab tanpa volume = belum ada data
      await isi("jf2-prov", PROV);
      await t.tungguFungsi(`document.querySelectorAll('#jf2-alat tbody tr').length === ${di.length}`);
      const per = hit(n0, n1), rows = await baris();
      assert.equal(rows.length, di.length);
      di.forEach((k, i) => {
        const hr = rows[i], v = per[k[0]];
        if (v == null) { assert.deepEqual(hr.slice(1), ["belum ada data", "belum ada data", "belum ada data", "belum ada data"], "tanpa volume: bukan 0"); return; }
        assert.equal(hr[3], id1(v)); assert.equal(hr[4], ceil(v).toLocaleString("id-ID"), `usulan = ceil ${v}`);
      });
      assert.ok(rows.some(x => x[1] === "belum ada data"), "ada baris belum ada data");
      // ubah norma kaji cepat: hitung ulang (norma lain tetap)
      await isi("jf2-n" + idx.indexOf("kaji_cepat"), 50);
      await t.tungguFungsi(`document.querySelector('#jf2-alat tbody tr:nth-child(2) td:nth-child(4)').textContent === ${JSON.stringify(id1(hit(50, n1)[di[1][0]]))}`);
      await isi("jf2-prov", "");
      await t.tungguFungsi(`document.querySelectorAll('#jf2-alat tbody tr').length > ${di.length}`);
      assert.equal((await dd())[0], id1(nasional(hit(50, n1))));
      // norma dikosongkan semua + volume tersisa: kosong bukan 0
      await isi("jf2-n" + idx.indexOf("kaji_cepat"), ""); await isi("jf2-n" + idx.indexOf("renkon"), "");
      await t.tungguFungsi(`document.querySelector('#jf2-alat dd').textContent === 'belum ada data'`);
      const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw} @${w}`);
      assert.deepEqual(t.galat().filter(bukanSisi), [], `konsol @${w}`);
      assert.equal(await t.eval("/\\b(NaN|undefined)\\b|·/.test(document.querySelector('main').innerText)"), false);
    }
  } finally { await br.tutup?.(); srv.close(); }
});
