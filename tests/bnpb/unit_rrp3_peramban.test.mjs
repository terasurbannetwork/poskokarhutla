/* RU-054 RRP-3 kalkulator Jitupasna di Chrome nyata: /bnpb/unit/rrp dengan unit/ikk.json keluaran nyata ikk.py (stub /api/unit/*,
   CSP asli src/bnpb.js). Isian kosong = belum ada data (bukan 0); kasus J1 memberi Rp60.500 juta, Rp28.200 juta, dan berindeks dari IKK kab;
   huntap 50 + stimulan 90 > 120 ditandai; unit pecahan ditolak; tidak ada permintaan POST. 1440 dan 390 px, tanpa galat konsol dan gulir mendatar.
   Tanpa Chrome: dilewati. Jalan: node --test tests/bnpb/unit_rrp3_peramban.test.mjs */
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

test("RRP-3 kalkulator di peramban: J1, ganda, isian liar, tanpa POST", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const r = spawnSync("python3", ["-I", "-c", "import sys,json;sys.path.insert(0,'scripts/bnpb');from unit import ikk;print(json.dumps(ikk.jalan()['ikk'],ensure_ascii=False))"], {cwd: AKAR, encoding: "utf8"});
  assert.equal(r.status, 0, r.stderr);
  const kini = new Date().toISOString(), IKK = {...JSON.parse(r.stdout), dibuat: kini, basi_jam: 1080};
  const kab = Object.keys(IKK.data.kab).find(k => IKK.data.kab[k] != null);
  const post = [];
  const srv = http.createServer((q, s) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    if (q.method !== "GET") post.push(q.method + " " + u);
    const js = (o, c = 200) => { s.writeHead(c, {"content-type": "application/json"}); s.end(JSON.stringify(o)); };
    if (u === "/api/peta-situs") return js(petaSitus());
    if (u === "/api/unit/indeks") return js({dibuat: kini, berkas: [{nama: "ikk", sistem: "RRP-3", dibuat: kini, basi_jam: 1080, ok: true, galat: null, diunggah: kini, basi: false}]});
    if (u === "/api/unit/data/ikk") return js(IKK);
    if (u.startsWith("/api/")) return js({galat: "belum"}, 404);
    const f = path.join(PUB, /^\/bnpb\/unit\/[a-z]{2,4}$/.test(u) ? "/bnpb/unit/unit.html" : u);
    if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { s.writeHead(404); return s.end(); }
    s.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); s.end(readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
  const isi = (id, v) => t.eval(`(() => { const e = document.getElementById(${JSON.stringify(id)}); e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event(e.tagName === "SELECT" ? "change" : "input", {bubbles: true})); return true; })()`);
  const dd = () => t.eval("[...document.querySelectorAll('#rrp3-alat dd')].map(d => d.textContent)");
  try {
    for (const [w, hh] of [[1440, 900], [390, 844]]) {
      await t.ukuran(w, hh);
      await t.buka(asal + "/bnpb/unit/rrp", {tunggu: "#rrp3-alat"});
      assert.ok((await dd()).every(x => x === "belum ada data"), "isian kosong bukan 0");
      assert.equal(await t.eval("document.getElementById('rrp3-s-RB').value"), "60", "satuan bawaan dari tarif Jam Aturan");
      await isi("rrp3-kab", kab);
      for (const [tg, u, hr] of [["RB", 120, 150], ["RS", 300, 75], ["RR", 800, 25]]) { await isi("rrp3-u-" + tg, u); await isi("rrp3-h-" + tg, hr); }
      let v = await dd();
      assert.equal(v[0], "Rp60.500 juta"); assert.equal(v[1], "Rp28.200 juta");
      const harap = (28200 * IKK.data.kab[kab] / 100).toLocaleString("id-ID", {maximumFractionDigits: 2});
      assert.equal(v[2], `Rp${harap} juta`); assert.match(v[3], /IKK kab\/kota/);
      await isi("rrp3-huntap", 50); await isi("rrp3-stim", 90); await isi("rrp3-rb", 120);
      v = await dd(); assert.match(v[4], /^periksa hitung ganda: 140 melebihi 120/);
      assert.equal(await t.eval("document.querySelector('#rrp3-alat .un-aksi button').disabled"), false, "Unduh CSV aktif");
      await isi("rrp3-u-RS", "2.5");
      assert.match(await t.eval("document.querySelector('#rrp3-alat .bn-pesan').textContent"), /bilangan bulat/);
      assert.ok((await dd()).every(x => x === "belum ada data"), "isian liar ditolak sebelum hitung");
      assert.ok(await t.eval("!!document.getElementById('rrp3-ikk')"), "kartu IKK BPS tampil");
      const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw} @${w}`);
      assert.deepEqual(t.galat().filter(bukanSisi), [], `konsol @${w}`);
      assert.equal(await t.eval("/\\b(NaN|undefined)\\b|·/.test(document.querySelector('main').innerText)"), false);
    }
    assert.deepEqual(post, [], "tidak ada yang dikirim ke server");
  } finally { await br.tutup?.(); srv.close(); }
});
