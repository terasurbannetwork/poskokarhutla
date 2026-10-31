/* Uji layar /direktori di peramban nyata (Chrome headless, tests/bnpb/_peramban.mjs): tiap tab utama terbuka tanpa pengecualian JS,
   kartu atau panel benar-benar tergambar, Wilayah menampilkan kesiapan berlabel hasil uji balik, dan lebar ponsel tidak menggulung ke samping.
   Data: pakar sintetis di berkas ini + data contoh halaman sendiri (dataContoh, sama dengan tombol dummy). Data direktori asli tidak boleh
   masuk repo publik ini, jadi tidak ada fixture dari R2. Tanpa Chrome = dilewati dengan pesan jelas. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {extname, join, normalize} from "node:path";
import {fileURLToPath} from "node:url";
import {bukaPeramban, cariChrome} from "../bnpb/_peramban.mjs";

const PUB = fileURLToPath(new URL("../../public/", import.meta.url));
const MIME = {".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp"};
const RUMPUN = ["banjir", "longsor", "gempa", "karhutla"];
const INDUK = {diperbarui: "2026-10-31", sumber: "uji", rumpun: RUMPUN,
  orang: Array.from({length: 24}, (_, i) => [`A${9000 + i}`, `Pakar Uji ${i + 1}`, i % 2 ? "Universitas Contoh Timur" : "Institut Contoh Barat", [RUMPUN[i % 4]], 10 + i, 50 + i, 900 + i * 10, "", ["Topik uji"], "", "", "", "", "", ""])};
const KAMPUS = {"Universitas Contoh Timur": {prov: "53"}, "Institut Contoh Barat": {prov: "32"}};
/* kesiapan satu kab NTT, dengan hasil uji balik belum lulus: layar wajib berlabel Hipotesis */
const WILAYAH = {diperbarui: "2026-10-31", prov: {}, kab: [{prov: "53", kab: "Kabupaten Kupang", fasilitas: {rs: 2, rs_tt: 150, puskesmas: 20}}],
  kesiapan: {jumlah: 1, baris: {"53|kupang": {prov: "53", kab: "Kabupaten Kupang", nama_rk: "Kupang", skor: 30, risiko: 40, kesenjangan: 35, kuadran: "prioritas", peringkat: 1, peringkat_prov: 1, jumlah_prov: 1,
    komp: {fiskal: 20, faskes: 30, lembaga: 10, pakar: 60}, kebutuhan: 80, butuh: {miskin: 90, pangan: 70}, nilai: {}}},
    uji: {dari: 2015, sampai: 2025, n: 474, lulus: false, lolos: [], ukuran: {mati: "meninggal", dampak: "terdampak", rusak: "rusak"},
      korelasi: {skor: {mati: {r: -0.017, t: -0.4}, dampak: {r: -0.01, t: -0.2}, rusak: {r: -0.016, t: -0.3}}, kesenjangan: {mati: {r: 0.1, t: 2.2}, dampak: {r: 0.05, t: 1.1}, rusak: {r: 0.147, t: 3.2}}},
      kuadran: {prioritas: {n: 136, mati: 0.096, rusak: 2.06}, aman: {n: 123, mati: 0.058, rusak: 1.3}}}}};
let data = {wilayah_daya: WILAYAH};

let server, asal, P, T;
const tanpaChrome = !cariChrome();
if (tanpaChrome) test("uji layar direktori DILEWATI: Chrome tidak ditemukan", {skip: "tidak ada Chrome/Chromium (set CHROME_BIN)"}, () => {});
else {
  before(async () => {
    server = createServer(async (q, r) => {
      const u = decodeURIComponent(q.url.split("?")[0]), json = d => { r.writeHead(d ? 200 : 404, {"content-type": "application/json"}); r.end(d ? JSON.stringify(d) : "{}"); };
      if (u === "/api/akademisi") return json(INDUK);
      if (u === "/api/akademisi/kampus") return json(KAMPUS);
      if (u.startsWith("/api/akademisi/data/")) return json(data[u.slice(20)]);
      if (u.startsWith("/api/")) return json(null);
      const f = normalize(join(PUB, u === "/" || u === "/direktori" ? "akademisi.html" : u));
      if (!f.startsWith(PUB)) { r.writeHead(403); return r.end(); }
      try { const b = await readFile(f); r.writeHead(200, {"content-type": MIME[extname(f)] || "application/octet-stream"}); r.end(b); } catch (e) { r.writeHead(404); r.end(); }
    });
    await new Promise(ok => server.listen(0, "127.0.0.1", ok)); asal = `http://127.0.0.1:${server.address().port}`;
    P = await bukaPeramban(); T = await P.tab(); await T.ukuran(1280, 900);
    /* data contoh dari halaman sendiri, lalu disajikan sebagai /api/akademisi/data/<nama> */
    await T.buka(asal + "/akademisi.html", {tunggu: "article"});
    data = {...JSON.parse(await T.eval("JSON.stringify(window.__akContoh())")), wilayah_daya: WILAYAH};
  });
  after(async () => { await T?.tutup(); await P?.tutup(); server?.close(); });

  /* galat yang wajar di server uji: aset di luar halaman (logo, peta dasar, data situs lain) boleh 404; pengecualian JS dan konsol error tidak */
  /* WebGL: Chrome headless tanpa GPU tidak bisa membuat konteks peta MapLibre; itu batas lingkungan uji, bukan galat halaman */
  const galatJs = () => T.galat().filter(g => !/^log\(network\)/.test(g) && !/Failed to load resource/.test(g) && !/WebGL context/.test(g));

  test("tab Pakar: kartu pakar tergambar tanpa galat JS", async () => {
    await T.buka(asal + "/akademisi.html?tampil=pakar", {tunggu: "#akS"});
    await T.klik('#akS [data-v=""]');   /* saringan bawaan SINTA; pakar sintetis tidak ber-SINTA */
    await T.tungguFungsi(`/Pakar Uji 1\\b/.test(document.body.innerText)`);
    assert.deepEqual(galatJs(), []);
  });

  for (const [tampil, cek] of [["lembaga&sub=daftar", /BPBD Provinsi Riau/], ["inovasi", null], ["sistem_data", null], ["pendanaan", null], ["pustaka", null], ["berita", null]]) {
    test(`tab ${tampil}: terbuka dan tergambar tanpa galat JS`, async () => {
      await T.buka(`${asal}/akademisi.html?tampil=${tampil}`, {tunggu: ".ak-panel, article"});
      await T.tungguFungsi(`document.querySelectorAll("article, .ak-panel").length > 0`);
      if (cek) await T.tungguFungsi(`${cek}.test(document.body.innerText)`);
      assert.deepEqual(galatJs(), [], `galat di tab ${tampil}`);
    });
  }

  test("Wilayah NTT: kesiapan dan peta kesenjangan berlabel Hipotesis selama uji balik belum lulus", async () => {
    await T.buka(`${asal}/akademisi.html?tampil=wilayah&wilayah=53`, {tunggu: ".ak-ks-uji"});
    const t = await T.eval(`[...document.querySelectorAll(".ak-ks-uji")].map(e => e.innerText).join(" | ")`);
    assert.match(t, /^Hipotesis\b/); assert.match(t, /474 kab\/kota/); assert.doesNotMatch(t, /Teruji/);
    assert.deepEqual(galatJs(), []);
  });

  test("lebar ponsel 390 px: Pakar dan Wilayah tidak menggulung ke samping", async () => {
    await T.ukuran(390, 844);
    for (const u of ["?tampil=pakar", "?tampil=wilayah&wilayah=53"]) {
      await T.buka(asal + "/akademisi.html" + u, {tunggu: "article, .ak-panel"});
      const {sw, iw} = await T.lebihLebar(); assert.ok(sw <= iw + 1, `${u}: lebar halaman ${sw} > layar ${iw}`);
    }
    await T.ukuran(1280, 900);
  });
}
