/* RU-088 PD-1 kartu dan unduhan 4-bulanan (public/bnpb/unit/pd1.js + rapor.js asli di vm). Berkas masukan DIBANGUN oleh scripts/prediksi/rapor_peringatan.py
   (bangun() atas dunia tiruan, tanpa D1 dan tanpa jaringan), jadi bentuk yang diuji adalah bentuk keluaran sungguhan. Jalan: node --test tests/bnpb/unit_pd1.test.mjs */
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
const ctx = {window: {}, Date, Intl, Number, String, Array, Math, Object, isNaN, Set, JSON};
vm.createContext(ctx);
vm.runInContext(baca("public/inti/format.js") + "\n;globalThis.esc = esc; globalThis.fmt = fmt;", ctx);
vm.runInContext(baca("public/bnpb/unit/rapor.js"), ctx);
vm.runInContext(baca("public/bnpb/unit/pd1.js"), ctx);
const R = ctx.window.UnitRapor, P = ctx.window.UnitPd1;

const PY = `
import sys, json
sys.path.insert(0, "scripts/prediksi"); sys.path.insert(0, "scripts/bnpb/unit")
import rapor_peringatan as rp, rapor
from datetime import date, datetime, timedelta
ms = lambda y, m, d, j=12: int(datetime(y, m, d, j, tzinfo=rp.WIB).timestamp() * 1000)
eps, kej, d0 = [], set(), date(2026, 5, 1)
for i in range(32):
    m = d0 + timedelta(days=5 * i)
    eps.append({"kab": "3201", "jenis": "banjir", "tingkat": "Waspada", "mulai": ms(m.year, m.month, m.day), "akhir": ms(m.year, m.month, m.day, 20)})
    if i < 12: kej.add(m)
for j in range(4): kej.add(d0 + timedelta(days=200 + 10 * j))
h = rp.nilai(eps, {("3201", "banjir"): kej}, date(2026, 4, 1), date(2027, 12, 31), date(2026, 4, 1))
kt = [rp.kartu_sumber("dibi", "DIBI", h, (2026, 2)), rp.kartu_sumber("dibi", "DIBI", h, (2026, 3))]
b = rapor.berkas(kt, [{"nama": "x", "url": "repo:x", "diambil": "2026-11-26", "lisensi": "x"}])
b["data"] = {"umpan_bpbd": "menunggu (U11)", "periode": [
  {"sumber": "dibi", "periode": rp.nama_periode((2026, 2)), "dinilai": True, "baris": rp.baris_periode(h, (2026, 2)), "dari": "2026-05-01", "sampai": "2026-08-31"},
  {"sumber": "dibi", "periode": rp.nama_periode((2026, 3)), "dinilai": True, "baris": rp.baris_periode(h, (2026, 3)), "dari": "2026-09-01", "sampai": "2026-12-31"},
  {"sumber": "logbook", "periode": rp.nama_periode((2026, 3)), "dinilai": False, "alasan": "di luar jendela kejadian sumber ini"}]}
b = {"dibuat": "2026-11-26T01:00:00Z", "basi_jam": 48, **b}
rapor.periksa_berkas(b)
print(json.dumps(b))
`;
const p = spawnSync("python3", ["-I", "-c", PY], {cwd: AKAR, encoding: "utf8"});
assert.equal(p.status, 0, p.stderr);
const BERKAS = JSON.parse(p.stdout);

test("pd1.py --cek dan rapor_peringatan.py --cek hijau", () => {
  for (const a of [["-I", "scripts/bnpb/unit/pd1.py", "--cek"], ["-I", "scripts/prediksi/rapor_peringatan.py", "--cek"]]) {
    const r = spawnSync("python3", a, {cwd: AKAR, encoding: "utf8"}); assert.equal(r.status, 0, r.stderr);
  }
});

test("hanya periode yang dinilai ditawarkan; teks memuat angka berkas apa adanya", () => {
  const ps = [...P.periode(BERKAS.data)]; assert.deepEqual(ps, ["Mei-Agustus 2026", "September-Desember 2026"]);
  const t = P.teks(BERKAS.data, ps[0]);
  assert.match(t, /Laporan 4-bulanan peringatan dini/);
  assert.match(t, /Banjir \| Waspada \| 12 \| 13 \| tidak dihitung per tingkat \| tidak dihitung per tingkat \| 0,52 \| belum teruji \| /, "per tingkat: terlewat dan POD tidak didefinisikan, bukan belum cukup data");
  assert.match(t, /Banjir \| Semua tingkat \| 12 \| 13 \| 0 \| 1,00 \| 0,52 \| /, "angka persis dari rapor_peringatan.py, dua desimal");
  assert.match(t, /POD \(peluang terdeteksi\) \| FAR \(rasio peringatan palsu\)/); assert.match(t, /POD \(probability of detection, peluang terdeteksi\)/);
  assert.match(P.teks({periode: [{sumber: "dibi", periode: "P", dinilai: true, baris: [{jenis: "Banjir", tingkat: "Semua tingkat", hit: 1, palsu: 0, terlewat: 0, pod: null, far: null, vonis: null}]}]}, "P"), /Semua tingkat \| 1 \| 0 \| 0 \| belum cukup data \| belum cukup data/);
  assert.match(t, /Palsu adalah episode peringatan tanpa kejadian tercatat/);
  assert.match(t, /Umpan balik BPBD: menunggu \(U11\)/);
  assert.doesNotMatch(t, /·|\baman\b/i);
  assert.equal(P.teks(BERKAS.data, "Januari sampai April 2026"), null, "periode tak dinilai tidak punya teks");
});

test("kosong tidak pernah jadi 0: berkas tanpa data atau rusak tidak menghasilkan teks", () => {
  for (const x of [null, {}, {periode: [{dinilai: false}]}]) assert.equal(P.periode(x).length, 0);
  assert.equal(P.teks({periode: []}, "x"), null);
  const t = P.teks({periode: [{sumber: "dibi", periode: "P", dinilai: true, baris: [{jenis: "Banjir", tingkat: "Awas", hit: 1, palsu: 0, terlewat: null, pod: null, far: null, vonis: null}]}]}, "P");
  assert.match(t, /Banjir \| Awas \| 1 \| 0 \| tidak dihitung per tingkat \| tidak dihitung per tingkat \| belum cukup data \| belum cukup data \| -/);
  const ts = P.teks({tsunami: {alasan: "tidak ada jenis kejadian tsunami"}, periode: [{sumber: "dibi", periode: "P", dinilai: true, baris: []}]}, "P");
  assert.match(ts, /Tsunami: tidak dinilai, tidak ada jenis kejadian tsunami\./);
});

test("kartu berkas tersusun lewat UnitRapor: kepala nama seksi, tanpa kaki Sumber", () => {
  const k = BERKAS.kartu[0], h = R.html(k, BERKAS, Date.parse(BERKAS.dibuat) + 36e5);
  assert.match(h, /Rapor peringatan dini, kejadian DIBI/);
  assert.doesNotMatch(h, /class="ex-ft"|Sumber: /);
});

const CSP = baca("src/bnpb.js").match(/export const CSP = "([^"]+)"/)[1], PUB = path.join(AKAR, "public"), CHROME = cariChrome();
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|status of (401|404)/.test(g);

test("PD-1 di Chrome: kartu dari berkas, pilih periode, unduh teks tanpa POST dan tanpa galat konsol", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const lain = [], iso = ms => new Date(ms).toISOString();
  const srv = http.createServer((q, s) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    if (q.method !== "GET") lain.push(q.method + " " + u);
    const js = (o, c = 200) => { s.writeHead(c, {"content-type": "application/json"}); s.end(JSON.stringify(o)); };
    if (u === "/api/peta-situs") return js(petaSitus());
    if (u === "/api/unit/indeks") return js({dibuat: iso(Date.now()), berkas: [{nama: "rapor_peringatan", sistem: "PD-1", dibuat: BERKAS.dibuat, basi_jam: 48, ok: true, galat: null, diunggah: iso(Date.now())}]});
    if (u === "/api/unit/data/rapor_peringatan") return js(BERKAS);
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
      await t.buka(asal + "/bnpb/unit/pd", {tunggu: "[data-unduh-pd1]"});
      assert.match(await t.eval("document.querySelector('main').innerText"), /Rapor peringatan dini, kejadian DIBI/);
      assert.equal(await t.eval("document.querySelectorAll('[data-periode]').length"), 2);
      assert.equal(await t.eval("[...document.querySelectorAll('[data-periode]')].map(b => b.getAttribute('aria-pressed')).join()"), "false,true");
      const kartuTampil = () => t.eval("[...document.querySelectorAll('main .ex-ey')].map(e => e.textContent).filter(x => /^Periode/.test(x)).join('|')");
      assert.equal(await kartuTampil(), "Periode September-Desember 2026", "hanya kartu periode terpilih");
      await t.klik("[data-periode]");   // tab pertama: Mei-Agustus
      assert.equal(await kartuTampil(), "Periode Mei-Agustus 2026", "tab periode mengganti kartu yang tampil");
      await t.klik("[data-unduh-pd1]");
      const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw} @${w}`);
      assert.deepEqual(t.galat().filter(bukanSisi), [], `konsol @${w}`);
    }
    assert.deepEqual(lain, []);
  } finally { await t.tutup?.(); await br.tutup?.(); srv.close(); }
});
