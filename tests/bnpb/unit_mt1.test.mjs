/* RU-094 MT-1 penyusun usulan Dana Bersama di peramban (public/bnpb/unit/mt1.js). Fungsi murni di vm dan dicocokkan dengan mt1.py (usulan satu keluaran,
   batas Maksimal N); berkas masukan = keluaran nyata mt1.py (Juklak 4/2025 dan 2/2026). Chrome nyata: /bnpb/unit/mt memilih pemohon, kegiatan, kab; skor pra-telaah,
   RAB, tanda di atas batas, usulan dua keluaran ditolak, tanpa permintaan selain GET. Jalan: node --test tests/bnpb/unit_mt1.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, statSync} from "node:fs";
import {spawnSync} from "node:child_process";
import path from "node:path";
import vm from "node:vm";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {petaSitus} from "./_peta.mjs";

const AKAR = path.resolve(new URL("../..", import.meta.url).pathname), PUB = path.join(AKAR, "public"), CHROME = cariChrome();
const baca = p => readFileSync(path.join(AKAR, p), "utf8");
const ctx = {window: {}, Date, Intl, Number, String, Array, Math, Object, isNaN, Set};
vm.createContext(ctx);
vm.runInContext(baca("public/bnpb/unit/mt1.js"), ctx);
const M = ctx.window.UnitMt1;
const py = (kode) => { const p = spawnSync("python3", ["-I", "-c", kode], {cwd: AKAR, encoding: "utf8"}); assert.equal(p.status, 0, p.stderr); return JSON.parse(p.stdout); };
const BERKAS = py(`
import sys, json; sys.path.insert(0, "scripts/bnpb/unit")
import mt1, rapor
b = {"dibuat": "2026-11-26T01:00:00Z", "basi_jam": 1080, **mt1.jalan()["dana_bersama_katalog"]}
rapor.periksa_berkas(b); print(json.dumps(b))`);
const CSP = baca("src/bnpb.js").match(/export const CSP = "([^"]+)"/)[1];
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|status of (401|404)/.test(g);

test("periksaUsulan sama dengan mt1.py: satu kode, satu keluaran", () => {
  const kasus = [["02.01.09", ["Normalisasi sungai"]], ["02.01.09", ["a", "b"]], [["02.01.09", "02.01.10"], ["x"]], ["02.02.01", ["x"]], ["02.01.01", []], ["02.01.01", ["  "]], ["02.01.12", ["x"]], [[], ["x"]]];
  const hasilPy = py(`
import sys, json; sys.path.insert(0, "scripts/bnpb/unit")
import mt1
print(json.dumps([mt1.periksa_usulan(*k) for k in json.loads(${JSON.stringify(JSON.stringify(kasus))})]))`);
  assert.deepEqual(kasus.map(k => [...M.periksaUsulan(...k)]), hasilPy);
  assert.equal(M.periksaUsulan("02.01.09", ["Normalisasi sungai"]).length, 0);
});

test("lampau sama dengan mt1.py tandai: hanya batas berperan, jumlah kosong tidak dihitung 0", () => {
  const kom = {batas: [{nilai: 7, teks: "Maksimal 7 (tujuh) bulan", peran: "volume"}, {nilai: 3, teks: "Maksimal 3 (tiga) paket", peran: null}]};
  const kasus = [[100, 8], [100, 7], [100, null], [null, 99], [999, 7]];
  const hasilPy = py(`
import sys, json; sys.path.insert(0, "scripts/bnpb/unit")
import mt1
k = json.loads(${JSON.stringify(JSON.stringify(kom))})
print(json.dumps([mt1.tandai(k, *x) for x in json.loads(${JSON.stringify(JSON.stringify(kasus))})]))`);
  assert.deepEqual(kasus.map(k => [...M.lampau(kom, ...k)]), hasilPy);
  assert.deepEqual([...M.lampau(kom, 1, 8)], ["Maksimal 7 (tujuh) bulan"]);
});

test("skor: butir yang belum bisa dinilai tidak dihitung 0; RAB hanya dari baris terisi lengkap", () => {
  const lurus = x => JSON.parse(JSON.stringify(x));
  assert.deepEqual(lurus(M.skor({rpbd: true, kuartil: true, spm: false})), {nilai: 2, dari: 3, belum: []});
  const s = M.skor({rpbd: false, kuartil: null, spm: true}); assert.equal(s.nilai, 1); assert.equal(s.dari, 2); assert.deepEqual([...s.belum], ["kab di kuartil atas risiko"]);
  const wajib = {sifat: "Pokok", batas: []}, opsi = {sifat: "Opsional", batas: [{nilai: 5, teks: "Maksimal 5 (lima) kali", peran: "volume"}]};
  const a = M.baris(wajib, {kuantitas: 2, volume: 3, harga: 1000}), b = M.baris(wajib, {kuantitas: 2, volume: 3}), c = M.baris(opsi, {kuantitas: 1, volume: 6, harga: 10});
  assert.equal(a.sub, 6000); assert.equal(b.sub, null); assert.equal(b.kurang_pokok, true); assert.equal(c.di_atas.length, 1); assert.equal(c.kurang_pokok, false);
  const t = M.total([a, b, c]); assert.equal(t.jumlah, 6060); assert.equal(t.terisi, 2); assert.equal(t.dari, 3); assert.equal(t.kurang_pokok, 1); assert.equal(t.di_atas, 1);
  assert.equal(M.rupiah(0), "Rp0"); assert.equal(M.rupiah(null), null); assert.equal(M.angkaId("1.250,5"), 1250.5); assert.equal(M.angkaId(""), null); assert.equal(M.angkaId("abc"), null);
  for (const x of ["2.5", "1.25", "1.2345", "12.50", "1,2,3", "-3", "1e3"]) assert.equal(M.angkaId(x), null, `${x} bukan angka Indonesia sah`);
  assert.equal(M.angkaId("1.250"), 1250); assert.equal(M.angkaId("2,5"), 2.5); assert.equal(M.angkaId("1.234.567,89"), 1234567.89); assert.equal(M.angkaId("0"), 0);
});

test("mt1.js: tanpa permintaan tulis ke server, tanpa innerHTML selain ikon rapor.js, tanpa titik tengah", () => {
  const js = baca("public/bnpb/unit/mt1.js");
  assert.doesNotMatch(js, /method:\s*["']?(POST|PUT|PATCH|DELETE)|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/i);
  assert.deepEqual(js.split("\n").filter(b => b.includes("innerHTML")).map(b => /R\.svg\(k\)/.test(b)), [true]);
  assert.doesNotMatch(js, /·|\baman\b/i);
  assert.doesNotMatch(js, /ex-std|kartu\(/, "merender lewat UnitRapor, tidak terdaftar sebagai layar kartu sendiri");
});

test("MT-1 di Chrome: pemohon, kegiatan, kab, skor, RAB, tanda di atas batas, dua keluaran ditolak, tanpa POST", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const lain = [], iso = ms => new Date(ms).toISOString();
  const srv = http.createServer((q, s) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    if (q.method !== "GET") lain.push(q.method + " " + u);
    const js = (o, c = 200) => { s.writeHead(c, {"content-type": "application/json"}); s.end(JSON.stringify(o)); };
    if (u === "/api/peta-situs") return js(petaSitus());
    if (u === "/api/unit/indeks") return js({dibuat: iso(Date.now()), berkas: [{nama: "dana_bersama_katalog", sistem: "MT-1", dibuat: BERKAS.dibuat, basi_jam: 1080, ok: true, galat: null, diunggah: iso(Date.now())}]});
    if (u === "/api/unit/data/dana_bersama_katalog") return js(BERKAS);
    if (u === "/api/unit/data/mitigasi_prioritas") return js({data: {kab: [{kab: "1105", kuartil_atas: true}]}});
    if (u === "/api/unit/data/rpbd") return js({data: {pemda: [{kode: "1105", status: "berlaku", url: "https://contoh.id/rpb.pdf"}]}});
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
      await t.buka(asal + "/bnpb/unit/mt", {tunggu: "#mt1-keg"});
      assert.equal(await t.eval("document.querySelectorAll('#mt1-keg option').length"), 12, "pilih + 11 kegiatan");
      assert.equal(await t.eval("document.querySelectorAll('#mt1-pem option').length"), 3);
      await t.pilih("#mt1-pem", "kabkota"); await t.pilih("#mt1-keg", "02.01.01");
      await t.tungguFungsi("/ESMS\\): rendah\\./.test(document.querySelector('#mt1-penyusun').innerText)");
      assert.equal(await t.eval("document.querySelectorAll('.un-mt1-tabel tbody tr').length"), 1, "02.01.01 kab/kota: satu komponen");
      await t.eval("(() => { const i = document.querySelector('.un-mt1-kel input'); i.value = '1 kegiatan sosialisasi'; i.dispatchEvent(new Event('input', {bubbles: true})); })()");
      await t.tungguFungsi("document.querySelector('.un-mt1-tabel tbody tr [data-sub]').textContent === 'belum lengkap'");
      assert.match(await t.eval("document.querySelector('#mt1-penyusun').innerText"), /Skor pra-telaah 0 dari 2 butir yang bisa dinilai/, "kab belum dipilih: butir risiko belum bisa dinilai, bukan 0 dari 3");
      assert.match(await t.eval("document.querySelector('#mt1-penyusun').innerText"), /terisi 0 dari 1 komponen: belum ada;/, "total kosong bukan Rp0");
      await t.eval("(() => { const i = document.querySelector('.un-mt1-tabel [data-k=\"volume\"]'); i.value = '2.5'; i.dispatchEvent(new Event('input', {bubbles: true})); })()");
      assert.match(await t.eval("document.querySelector('.un-mt1-rab').previousElementSibling.textContent"), /pakai koma untuk desimal/);
      assert.equal(await t.eval("document.querySelector('.un-mt1-tabel [data-k=\"volume\"]').getAttribute('aria-invalid')"), "true");
      await t.pilih("#mt1-kab", "1105");
      await t.tungguFungsi("document.getElementById('mt1-rpb').checked");
      assert.equal(await t.eval("document.getElementById('mt1-taut').value"), "https://contoh.id/rpb.pdf");
      assert.match(await t.eval("document.querySelector('#mt1-penyusun').innerText"), /Skor pra-telaah 2 dari 3 butir yang bisa dinilai/);
      assert.match(await t.eval("document.querySelector('#mt1-penyusun').innerText"), /bukan Indeks Risiko Bencana Indonesia \(IRBI\) resmi/);
      for (const [k, v] of [["kuantitas", "50"], ["volume", "2"], ["harga", "1.000"]]) await t.eval(`(() => { const i = document.querySelector('.un-mt1-tabel [data-k="${k}"]'); i.value = "${v}"; i.dispatchEvent(new Event('input', {bubbles: true})); })()`);
      await t.tungguFungsi("document.querySelector('.un-mt1-tabel tbody tr [data-sub]').textContent === 'Rp100.000'");
      assert.match(await t.eval("document.querySelector('.un-mt1-rab').nextElementSibling?.textContent || document.querySelector('#mt1-penyusun').innerText"), /Rencana anggaran biaya \(RAB\) terisi 1 dari 1 komponen: Rp100\.000/);
      assert.equal(await t.eval("document.querySelector('[data-mt1=pdf]').disabled"), false);
      await t.klik("[data-mt1=kel]");
      await t.eval("(() => { const i = document.querySelectorAll('.un-mt1-kel input')[1]; i.value = 'keluaran kedua'; i.dispatchEvent(new Event('input', {bubbles: true})); })()");
      await t.tungguFungsi("!document.querySelector('#mt1-penyusun .bn-pesan.galat:not([hidden])') === false");
      assert.match(await t.eval("document.querySelector('#mt1-penyusun .bn-pesan.galat:not([hidden])').textContent"), /hanya untuk satu keluaran/);
      assert.equal(await t.eval("document.querySelector('[data-mt1=xlsx]').disabled"), true, "dua keluaran: ekspor mati");
      // batas tertulis: 02.01.11 K/L, honor narasumber maksimal 5 kali (volume)
      await t.pilih("#mt1-pem", "kl"); await t.pilih("#mt1-keg", "02.01.11");
      await t.tungguFungsi("document.querySelectorAll('.un-mt1-tabel tbody tr').length > 10");
      const i = await t.eval("[...document.querySelectorAll('.un-mt1-tabel tbody tr')].findIndex(r => /Maksimal 5 \\(lima\\) kali Rapat koordinasi/.test(r.innerText))");
      assert.ok(i >= 0, "baris dengan batas ada");
      await t.eval(`(() => { const r = document.querySelectorAll('.un-mt1-tabel tbody tr')[${i}]; for (const [k, v] of [["volume", "6"], ["kuantitas", "1"], ["harga", "10"]]) { const e = r.querySelector('[data-k="' + k + '"]'); e.value = v; e.dispatchEvent(new Event('input', {bubbles: true})); } })()`);
      await t.tungguFungsi(`!document.querySelectorAll('.un-mt1-tabel tbody tr')[${i}].querySelector('[data-atas]').hidden`);
      assert.match(await t.eval(`document.querySelectorAll('.un-mt1-tabel tbody tr')[${i}].querySelector('[data-atas]').textContent`), /Di atas batas tertulis: Maksimal 5 \(lima\) kali/);
      const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw} @${w}`);
      assert.deepEqual(t.galat().filter(bukanSisi), [], `konsol @${w}`);
      assert.equal(await t.eval("/\\b(NaN|undefined|null)\\b|\\[object|·/.test(document.querySelector('main').innerText)"), false);
    }
    assert.deepEqual(lain, [], "tidak ada permintaan selain GET");
  } finally { await t.tutup?.(); await br.tutup?.(); srv.close(); }
});
