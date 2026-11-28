/* PK-2/PK-3/PK-5 di Chrome nyata: /bnpb/dalops dengan server statis + stub /api/dalops/* dan prakiraan beku (prediksi.json, lalu.json) relatif ke hari ini.
   Memeriksa: Dalops tidak lagi membaca /banjir/data/status.json (K4), seksi "Prakiraan dan kejadian" (ubin, tabel, tanggal, saringan), kepala kartu = nama seksi,
   tanpa kata aman atau salah alarm, 1440 dan 390 px tanpa gulir mendatar, tanpa galat konsol. WebGL headless gagal: peta ditulis "gagal dimuat" dan itu sah.
   Tanpa Chrome: dilewati. UJI_TANGKAP=<folder> menyimpan tangkapan layar PNG. Jalan: node --test tests/bnpb/dalops_prakiraan_peramban.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, statSync, writeFileSync, mkdirSync} from "node:fs";
import path from "node:path";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {petaSitus} from "./_peta.mjs";

const CSP = readFileSync(new URL("../../src/bnpb.js", import.meta.url), "utf8").match(/export const CSP = "([^"]+)"/)[1];
const PUB = path.resolve(new URL("../../public", import.meta.url).pathname), CHROME = cariChrome();
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|openfreemap|status of (401|404|500)|WebGL|maplibre/i.test(g);
const TANGKAP = process.env.UJI_TANGKAP;
const wib = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);

test("Dalops: seksi Prakiraan dan kejadian dari prediksi.json, tanpa status.json", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  const kini = Date.now(), hariIni = wib(kini), kemarin = wib(kini - 864e5), lusa = wib(kini - 2 * 864e5), minta = [];
  const KAB = [["1101", "Aceh Selatan"], ["1102", "Aceh Tenggara"], ["1103", "Aceh Timur"]];
  const pred = {versi: 1, dibuat: hariIni, kode: {BNJ: {kol: ["lv", "ps"], hari: [1, 2, 3].map(n => wib(kini + n * 864e5))}, LSR: {kol: ["lv", "ps"], hari: [1, 2, 3].map(n => wib(kini + n * 864e5))}},
    kab: KAB.map(([id, n], i) => ({id, nama: "Kab. " + n, prov: "11", pn: "Aceh", jiwa: 1000 * (3 - i), geo: "11|" + n, BNJ: [[i === 0 ? 3 : 0, 0.2], [0, 0], [0, 0]], LSR: [[0, 0], [0, 0], [0, 0]]}))};
  const lalu = {dibuat: hariIni, hari: {[kemarin]: {BNJ: {kol: ["lv", "ps"], kab: {1101: [3, 0.3], 1102: [0, 0], 1103: [2, 0.2]}}}, [lusa]: {BNJ: {kol: ["lv", "ps"], kab: {1101: [2, 0.3], 1102: [2, 0], 1103: [0, 0]}}}}};
  const kej = (id, kab, mulai) => ({id, prov: "Aceh", prov_kode: "11", kab: ["Kab. " + kab], kab_kode: ["11|" + kab], mulai, pertama: mulai, terakhir: mulai, kk: null, jiwa: null, mengungsi: null, rumah_terendam: null, tinggi_cm: null, surut: false, kondisi: ""});
  const dalops = {hari: hariIni, kejadian: [kej("KJ-1", "Aceh Selatan", kemarin), kej("KJ-2", "Aceh Tenggara", kemarin)]};
  const lapor = {laporan: [{tiket: "LA-261126-01", jenis: "banjir", tingkat: "bpbd", kab: "11.03", lat: 4.6, lon: 97.8, waktu: kini - 864e5, status: "baru", periksa: null}]};
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]); minta.push(q.url);
    const js = (o, s = 200) => { r.writeHead(s, {"content-type": "application/json"}); r.end(JSON.stringify(o)); };
    if (u === "/api/peta-situs") return js(petaSitus());
    if (u === "/api/dalops/banjir") return js(dalops);
    if (u === "/api/dalops/lapor") return js(lapor);
    if (u === "/prediksi/data/prediksi.json") return js(pred);
    if (u === "/prediksi/data/lalu.json") return js(lalu);
    if (u.startsWith("/api/")) return js({galat: "tidak ada"}, 404);
    const f = path.join(PUB, u === "/bnpb/dalops" ? "/bnpb/dalops.html" : u);
    if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); r.end(readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
  const tangkap = async nama => { if (!TANGKAP) return; mkdirSync(TANGKAP, {recursive: true});   // tangkapan seksi Prakiraan dan kejadian saja
    const r = await t.eval(`(() => { const b = document.getElementById("pk-banjir").getBoundingClientRect(); return {x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height, scale: 1}; })()`);
    const {data} = await t.kirim("Page.captureScreenshot", {format: "png", captureBeyondViewport: true, clip: r}); writeFileSync(path.join(TANGKAP, nama + ".png"), Buffer.from(data, "base64")); };
  const angka = k => t.eval(`document.querySelector("#pk-banjir .pk-ubin-${k} b").textContent`);
  try {
    await t.ukuran(1440, 900);
    await t.buka(asal + "/bnpb/dalops#banjir", {tunggu: "#pk-banjir .pk-ubin-grid"});
    assert.equal(await t.eval(`document.querySelector("#pk-banjir h3").textContent.trim()`), "Prakiraan dan kejadian", "kepala kartu = nama seksi");
    await t.tungguFungsi(`[...document.querySelectorAll(".dl-seksi *")].some(e => /^Prakiraan dan kejadian$/.test(e.innerText))`);
    await t.klikTeks(".dl-seksi *", "^Prakiraan dan kejadian$"); await t.tungguFungsi(`document.getElementById("pk-banjir").offsetWidth > 0`);   // seksi = tab di puncak halaman
    assert.equal(await t.eval(`document.querySelectorAll("#pk-banjir .pk-tgl-btn").length`), 2, "dua tanggal tersimpan dalam tujuh hari");
    assert.equal(await t.eval(`document.querySelector("#pk-banjir .pk-tgl-btn[aria-pressed=true]").dataset.tgl`), kemarin, "tanggal bawaan = yang terbaru (kemarin)");
    /* kemarin: 1101 Siaga+kejadian = Kena; 1103 Siaga+laporan BPBD = Kena; 1102 Normal+kejadian = Luput */
    assert.deepEqual([await angka("kena"), await angka("luput"), await angka("belum"), await angka("tenang")], ["2", "1", "0", "0"]);
    assert.equal(await t.eval(`document.querySelectorAll("#pk-banjir tr.pk-baris").length`), 3, "tabel bawaan = Kena dan Luput");
    assert.match(await t.eval(`document.querySelector("#pk-banjir tr.pk-baris").innerText`), /Aceh Selatan.*Awas.*Mulai/s);
    /* saring ubin Luput: satu baris; klik lagi melepas */
    await t.klik("#pk-banjir .pk-ubin-luput"); await t.tungguFungsi(`document.querySelectorAll("#pk-banjir tr.pk-baris").length === 1`);
    assert.match(await t.eval(`document.querySelector("#pk-banjir tr.pk-baris").innerText`), /Aceh Tenggara/);
    await t.klik("#pk-banjir .pk-ubin-luput"); await t.tungguFungsi(`document.querySelectorAll("#pk-banjir tr.pk-baris").length === 3`);
    /* ganti tanggal ke dua hari lalu: 1101 dan 1102 Siaga, kejadian kemarin masih dalam jendela satu hari = Kena; 1103 Normal + laporan = Luput */
    await t.klik(`#pk-banjir .pk-tgl-btn[data-tgl="${lusa}"]`);
    await t.tungguFungsi(`document.querySelector("#pk-banjir .pk-tgl-btn[aria-pressed=true]").dataset.tgl === "${lusa}" && /Aceh Tenggara/.test(document.querySelectorAll("#pk-banjir tr.pk-baris")[1]?.innerText || "")`);
    assert.match(await t.eval(`document.querySelectorAll("#pk-banjir tr.pk-baris")[1].innerText`), /Aceh Tenggara.*Siaga.*Kena/s);
    assert.match(await t.eval(`document.querySelectorAll("#pk-banjir tr.pk-baris")[2].innerText`), /Aceh Timur.*Normal.*Luput/s);
    await tangkap("dalops-prakiraan-1440");
    /* K4: tabel prakiraan Dalops tidak lagi membaca status.json; kata terlarang tidak muncul di seksi */
    assert.ok(!minta.some(m => /^\/banjir\/data\/status\.json/.test(m)), "tidak ada permintaan ke status.json: " + minta.filter(m => /^\/banjir\/data\/status\.json/.test(m)));
    assert.ok(minta.some(m => /^\/prediksi\/data\/prediksi\.json/.test(m)) && minta.some(m => /^\/api\/dalops\/lapor\?jenis=banjir&sejak=\d{4}-\d\d-\d\d/.test(m)));
    const teks = await t.eval(`document.getElementById("pk-banjir").innerText`);
    assert.doesNotMatch(teks, /\baman\b|salah alarm|·/i);
    await t.ukuran(390, 800); await t.tungguFungsi(`innerWidth <= 400`);
    const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw + 1, `gulir mendatar di 390 px: ${sw} > ${iw}`);
    await tangkap("dalops-prakiraan-390");
    assert.deepEqual(t.galat().filter(bukanSisi), [], "tanpa galat konsol");
  } finally { await t.tutup(); await br.tutup(); srv.close(); }
});
