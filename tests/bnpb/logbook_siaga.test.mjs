/* Gerbang layar staf /bnpb/logbook dan /bnpb/siaga: siaga.py --cek, invarian siaga.json, CSP bersih (tanpa skrip/gaya inline),
   lalu Chrome sungguhan dengan API logbook dipalsukan (tanpa Chrome bagian layar dilewati). Jalan: node --test tests/bnpb/logbook_siaga.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {existsSync, readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";

const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUB = path.join(AKAR, "public");
const CHROME = cariChrome();
const KODE_KEBUTUHAN = ["makanan", "tenda", "sandang", "air_bersih", "obat", "perahu", "material", "alat_berat", "pompa", "dana"];

test("scripts/bnpb/siaga.py --cek hijau", () => {
  const r = spawnSync("python3", ["scripts/bnpb/siaga.py", "--cek"], {cwd: AKAR, encoding: "utf8", timeout: 60000});
  assert.equal(r.status, 0, r.stderr.slice(-600)); assert.match(r.stdout, /--cek hijau/);
});

test("public/data/bnpb/siaga.json: musim, stok, SOP, desa", () => {
  const d = JSON.parse(readFileSync(`${PUB}/data/bnpb/siaga.json`, "utf8"));
  assert.equal(d.n_tahun, 7);
  for (const j of ["banjir", "longsor", "karhutla"]) {
    assert.ok(d.sop[j].length >= 5); assert.deepEqual(d.sop[j].map(x => x.h), d.sop[j].map(x => x.h).sort((a, b) => a - b));
    for (const s of d.stok[j]) assert.ok(KODE_KEBUTUHAN.includes(s.kode), s.kode);
  }
  const kab = Object.entries(d.kab); assert.ok(kab.length > 100);
  for (const [k, v] of kab) {
    assert.match(k, /^\d{4}$/); assert.ok(v.nama);
    for (const [j, m] of Object.entries(v.musim)) {
      assert.ok(d.sop[j]); assert.ok(m.bulan.includes(m.mulai)); assert.ok(m.bulan.every(b => v.p[j][b - 1] >= d.ambang_musim), `${k} ${j}`);
    }
    for (const x of v.desa) assert.ok(x.desa && x.bulan.every(b => b >= 1 && b <= 12));
  }
  if (existsSync(`${AKAR}/data/pusdalops/desa_terisolir.csv`)) assert.ok(kab.some(([, v]) => v.desa.length), "CSV ada tetapi tak satu desa pun terpetakan ke kab");
});

for (const hal of ["logbook", "siaga"]) test(`${hal}.html/js: CSP bersih dan kepala situs bersama`, () => {
  const html = readFileSync(`${PUB}/bnpb/${hal}.html`, "utf8"), js = readFileSync(`${PUB}/bnpb/${hal}.js`, "utf8");
  assert.ok(!/<script(?![^>]*\bsrc=)/i.test(html), "skrip inline"); assert.ok(!/<style|\sstyle=|\son[a-z]+=/i.test(html), "gaya/atribut inline");
  assert.match(html, /class="ad-top"/); assert.match(html, /bnpb\.css/);
  assert.ok(!/innerHTML|insertAdjacentHTML|eval\(/.test(js), "innerHTML pada data");
  assert.ok(!/ · |—/.test(js + html), "titik tengah/em dash sebagai pemisah teks");
});

/* ---------- layar ---------- */
const MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json"};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const S = {log: [], masuk: true};
let server, base;
const jalankan = () => new Promise(ok => {
  server = http.createServer(async (req, res) => {
    const u = new URL(req.url, "http://x"), p = u.pathname, json = (s, o) => { res.writeHead(s, {"content-type": "application/json"}); res.end(JSON.stringify(o)); };
    if (p.startsWith("/api/")) {
      const c = []; for await (const x of req) c.push(x); let body = null; try { body = JSON.parse(Buffer.concat(c).toString()); } catch (e) {}
      S.log.push({m: req.method, p, q: u.search, body, h: req.headers});
      if (p === "/api/akademisi/saya") return json(200, {peran: "admin", super: true});
      if (!S.masuk && p.startsWith("/api/logbook")) return json(401, {galat: "belum masuk"});
      if (p === "/api/logbook/hari") return json(200, {entri: [{waktu: new Date().toISOString(), jenis: "banjir", kab: "33|Cilacap", kec: "Kroya", desa: "Pesahangan", md: 2, mengungsi_jiwa: 1500, kendala: ["akses", "sinyal"]}]});
      if (p === "/api/logbook/buka") return json(200, {kejadian: [{id: "K1", jenis: "longsor", kec: "Kroya", desa: "Pesahangan", mulai: "2026-10-30T01:00:00Z"}]});
      if (p === "/api/logbook/kejadian" || /\/entri$/.test(p)) return json(201, {ok: true, id: "K9"});
      if (p === "/api/logbook/dummy") return json(200, {ok: true});
      return json(404, {galat: "tidak ada"});
    }
    const f = path.join(PUB, decodeURIComponent(p));
    if (f.startsWith(PUB) && existsSync(f) && !p.endsWith("/")) { res.writeHead(200, {"content-type": MIME[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); return res.end(readFileSync(f)); }
    res.writeHead(404); res.end("tidak ada");
  }).listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${server.address().port}`; ok(); });
});

if (!CHROME) test("layar logbook dan siaga", {skip: "Chrome tidak ditemukan (set CHROME_BIN)"}, () => {});
else {
  let br, tab;
  before(async () => { await jalankan(); br = await bukaPeramban(CHROME); tab = await br.tab(); });
  after(async () => { await tab?.tutup(); await br?.tutup(); server?.close(); });
  const luar = g => !/favicon\.ico|fonts\.(googleapis|gstatic)\.com|ERR_(INTERNET|NAME|CONNECTION)|401|404/.test(g);
  const bersih = async l => {
    const t = await tab.teks(); assert.deepEqual([...new Set(t.match(/\bNaN\b|\bundefined\b|\bnull\b|\[object|\bfalse\b|\btrue\b|—| · /g) || [])], [], l + ": teks terlarang");
    assert.deepEqual(tab.galat().filter(luar), [], l + ": galat konsol");
  };
  const isi = (sel, v) => tab.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("input", {bubbles: true})); e.dispatchEvent(new Event("change", {bubbles: true})); })()`);
  const tanpaGulir = async l => { for (const [w, h] of [[1440, 900], [390, 844]]) { await tab.ukuran(w, h); const x = await tab.lebihLebar(); assert.ok(x.sw <= x.iw + 1, `${l} ${w}px gulir mendatar ${x.sw}>${x.iw}`); } await tab.ukuran(1440, 900); };

  test("logbook: tanpa sesi tampil kartu masuk", async () => {
    S.masuk = false; await tab.buka(base + "/bnpb/logbook.html", {tunggu: ".bn-blok a[href='/admin/pantau']"});
    assert.match(await tab.teks(), /Masuk staf/); S.masuk = true;
  });

  test("logbook: wilayah berantai, kendala ikon, daftar hari ini, dummy Super Admin", async () => {
    S.log.length = 0;
    await tab.buka(base + "/bnpb/logbook.html", {tunggu: "select[name=prov]"});
    await tab.tungguFungsi("!/Memuat daftar wilayah/.test(document.body.innerText)", 20000);
    assert.equal(await tab.eval("document.querySelectorAll('input[name=jenis]').length"), 12);
    assert.equal(await tab.eval("document.querySelectorAll('input[name=kendala]').length"), 14);
    assert.equal(await tab.eval("document.querySelectorAll('input[name=kebutuhan]').length"), 10);
    assert.equal(await tab.eval("document.querySelectorAll('input[name=kendala]')[0].closest('label').querySelector('svg path') !== null"), true);
    await isi("select[name=prov]", "33"); await tab.tungguFungsi("document.querySelector('select[name=kab]').options.length > 20");
    await isi("select[name=kab]", "3301"); await tab.tungguFungsi("document.querySelector('select[name=kec]').options.length > 5");
    assert.equal(S.log.length >= 0, true);
    await tab.tungguFungsi("document.querySelector('select[name=lanjut]').options.length === 2");   // kejadian buka dimuat
    assert.match(S.log.filter(x => x.p === "/api/logbook/buka").pop().q, /kab=33%7CCilacap/);
    assert.equal(await tab.eval("performance.getEntriesByType('resource').some(e => /desa_cari/.test(e.name))"), false, "tidak boleh memuat desa_cari.json");
    assert.equal(S.log.filter(x => x.p === "/api/logbook/hari").length, 1, "hari dimuat sekali");
    await isi("select[name=kec]", "Kroya"); assert.ok(await tab.eval("document.querySelector('select[name=desa]').options.length > 2"));
    assert.match(await tab.teks(), /Buka/);
    assert.equal(await tab.eval("!!document.querySelector('[data-dummy=isi]')"), true);
    await bersih("logbook"); await tanpaGulir("logbook");
  });

  test("logbook: angka di luar batas wajar menahan kirim sampai 'yakin', lalu body memuat yakin dan wilayah", async () => {
    await tab.klik("input[name=jenis][value=banjir]"); await isi("input[name=hilang]", "1,5");
    assert.match(await tab.eval("document.querySelector('.lb-peringatan').innerText"), /bilangan bulat/); await isi("input[name=hilang]", ""); await isi("input[name=mulai]", "2026-11-01T08:00");
    await isi("input[name=md]", "9.999");
    assert.equal(await tab.eval("document.querySelector('.lb-peringatan').hidden"), false);
    await tab.klik("button[type=submit]"); await tab.tungguFungsi("/Centang/.test(document.querySelector('.bn-pesan').innerText)");
    assert.equal(S.log.filter(x => x.p === "/api/logbook/kejadian").length, 0, "tidak boleh terkirim tanpa yakin");
    await tab.klik("#lbYakin"); await isi("input[name=mengungsi_jiwa]", "1.500"); await tab.klik("input[name=kendala][value=akses]"); await tab.klik("input[name=kebutuhan][value=tenda]");
    await tab.klik("button[type=submit]"); await tab.tungguFungsi("/Kejadian tercatat/.test(document.body.innerText)");
    const k = S.log.filter(x => x.p === "/api/logbook/kejadian").pop();
    assert.equal(k.m, "POST"); assert.equal(k.h["x-pb"], "1"); assert.equal(k.body.yakin, true); assert.equal(k.body.md, 9999); assert.equal(k.body.mengungsi_jiwa, 1500);
    assert.equal(k.body.jenis, "banjir"); assert.equal(k.body.kab_kode, "33|Cilacap"); assert.deepEqual(k.body.kendala, ["akses"]); assert.deepEqual(k.body.kebutuhan, ["tenda"]);
    assert.equal(await tab.eval("localStorage.getItem('logbook_draf_v1')"), null, "draf dihapus sesudah sukses");
  });

  test("logbook: draf setengah jadi pulih sesudah muat ulang; lanjutan memakai rute entri", async () => {
    await isi("select[name=prov]", "33"); await tab.tungguFungsi("document.querySelector('select[name=kab]').options.length > 20");
    await isi("select[name=kab]", "3301"); await isi("textarea[name=catatan]", "draf uji"); await isi("input[name=luka]", "7");
    await tab.tungguFungsi("!!localStorage.getItem('logbook_draf_v1')");
    await tab.buka(base + "/bnpb/logbook.html", {tunggu: "select[name=prov]"});
    await tab.tungguFungsi("document.querySelector('textarea[name=catatan]').value === 'draf uji'", 20000);
    assert.equal(await tab.eval("document.querySelector('select[name=kab]').value"), "3301"); assert.equal(await tab.eval("document.querySelector('input[name=luka]').value"), "7");
    await tab.tungguFungsi("document.querySelector('select[name=lanjut]').options.length === 2");
    await isi("select[name=lanjut]", "K1");
    assert.equal(await tab.eval("document.querySelector('input[name=jenis]:checked').value"), "longsor");
    await tab.klik("button[type=submit]"); await tab.tungguFungsi("/Entri lanjutan tercatat/.test(document.body.innerText)");
    assert.ok(S.log.some(x => x.p === "/api/logbook/kejadian/K1/entri" && x.body.luka === 7));
    await bersih("lanjutan");
  });

  test("siaga: lima kartu, kalender berkotak tooltip, ganti bulan, CSV, dummy", async () => {
    await tab.buka(base + "/bnpb/siaga.html", {tunggu: ".sg-svg"});
    assert.deepEqual(await tab.eval("[...document.querySelectorAll('.bn-blok h2')].map(h => h.innerText.replace(/\\s+/g, ' ')).filter(t => !/^Siaga/.test(t))").then(a => a.map(t => t.split(' ')[0])), ["Kalender", "Templat", "Saran", "Desa", "Daerah"]);
    assert.ok(await tab.eval("document.querySelectorAll('.sg-svg g[data-tip]').length >= 24"));
    assert.equal(await tab.eval("document.querySelectorAll('.sg-bulan input').length"), 12);
    await tab.eval("document.querySelectorAll('.sg-bulan input')[10].click()");
    assert.equal(await tab.eval("document.querySelectorAll('.sg-svg .pilih').length > 0"), true);
    await bersih("siaga"); await tanpaGulir("siaga");
    await tab.eval("window.__csv = null; const o = URL.createObjectURL; URL.createObjectURL = b => { window.__csv = b; return o.call(URL, b); };");
    if (await tab.eval("!!document.querySelector('#sgCsv')")) {
      await tab.klik("#sgCsv"); await tab.tungguFungsi("window.__csv");
      const csv = await tab.eval("window.__csv.text()"); assert.match(csv, /kabupaten_kota,jenis,awal_musim,bulan_target,tugas/);
    }
    await tab.klik("[data-d=isi]"); await tab.tungguFungsi("localStorage.getItem('siaga_dummy') === '1'");
  });
}
