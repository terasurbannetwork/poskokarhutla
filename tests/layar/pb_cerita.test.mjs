// PB-54a (F-28): kartu bukti model bersama di public/inti/cerita.js (galat B05, pendorong B05, metode C22), diuji dengan skrip
// asli format.js + kartu.js + gerbang.js + cerita.js di satu konteks vm dan gerbang tampil asli public/data/gerbang/*.json.
import {test} from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync, readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const baca = p => readFileSync(`${AKAR}/${p}`, "utf8");
const ctx = vm.createContext({window: {}, console, document: {querySelector: () => null, addEventListener() {}}});
for (const f of ["format", "kartu", "gerbang", "cerita"]) vm.runInContext(baca(`public/inti/${f}.js`), ctx, {filename: `${f}.js`});
const C = vm.runInContext("Cerita", ctx), G = vm.runInContext("Gerbang", ctx);
const GERBANG = Object.fromEntries(readdirSync(`${AKAR}/public/data/gerbang`).filter(f => f.endsWith(".json")).map(f => [f.slice(0, -5), JSON.parse(baca(`public/data/gerbang/${f}`)).keluaran]));
const PIL = "Hipotesis, belum lolos uji";
// kata terlarang dicek di teks tampil DAN di semua title serta data-tip (singkatan seperti BMKG, MAE adalah nama, bukan huruf kapital gaya)
const TERLARANG = /\baman\b|·|Sumber:/;
const teksDanTitle = h => [h.replace(/<[^>]*>/g, " "), ...[...h.matchAll(/(?:title|data-tip)="([^"]*)"/g)].map(m => m[1])].join(" \n ");
const kepala = h => h.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)[1].replace(/<svg[\s\S]*?<\/svg>/, "");
const tip = h => [...h.matchAll(/data-tip="([^"]*)"/g)].map(m => m[1]);

test("galat untuk tiap berkas gerbang asli: satu baris per keluaran, kepala nama seksi, belum lolos = berpil hipotesis", () => {
  assert.ok(Object.keys(GERBANG).length >= 5);
  for (const [id, peta] of Object.entries(GERBANG)) {
    const h = C.galat(peta, {sumber: `public/data/gerbang/${id}.json`}), K = Object.keys(peta);
    assert.ok(h.startsWith('<article class="ex ex-std" data-kp="1">'), id);
    assert.equal(kepala(h), "Galat model", id);
    assert.equal((h.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr[ >]/g) || []).length, K.length, id);
    for (const k of K) if (!G.boleh(peta, k)) assert.ok(h.includes(esc(peta[k].alasan)) && h.includes(PIL), `${id}.${k}`);
    assert.ok(!h.includes("<footer") && !h.includes('class="hl"'), `${id}: tanpa kaki dan tanpa kalimat temuan`);
    assert.ok(!TERLARANG.test(teksDanTitle(h)), `${id}: kata terlarang`);
    assert.ok(!/<h3[^>]*title=/.test(h) && h.includes(`title="Gerbang tampil public/data/gerbang, public/data/gerbang/${id}.json">Status</th>`), `${id}: sumber di kepala kolom Status`);
    assert.ok(!/<td[^>]*><span class="ex-ey"/.test(h), `${id}: pil sel memakai .pl, bukan .ex-ey`);
  }
});

test("angka skor kecil tidak dibulatkan jadi 0, kosong tertulis belum terukur, batang hanya untuk yang kedua skornya terukur", () => {
  const h = C.galat(GERBANG.longsor);
  assert.ok(h.includes("<td>0,0304</td>") && h.includes("<td>-0,0001</td>") && h.includes("<td>-0,0004 sampai 0,0003</td>") && h.includes("<td>18.615</td>"), h.slice(0, 600));
  const p = C.galat(GERBANG.pesisir);
  assert.ok(p.includes("<td>belum terukur</td>") && !/<td>0<\/td>/.test(p) && !p.includes("cr-bt"), "pesisir tanpa skor: tanpa batang, tanpa nol");
  assert.equal(tip(h).length, 2 * Object.keys(GERBANG.longsor).length);
  for (const t of tip(h)) assert.ok(t.startsWith("&lt;b&gt;") && t.includes("Arah: makin kecil makin baik") && !t.includes("<"), t);
});

test("gagal-tertutup: gerbang tak terbaca atau kunci tak ada tetap tampil berpil, bukan hilang dan bukan nol", () => {
  for (const peta of [{}, null, undefined, "rusak"]) {
    const h = C.galat(peta, {keluaran: ["longsor_peluang_kejadian"], nama: {longsor_peluang_kejadian: "Peluang longsor"}});
    assert.ok(h.includes("Peluang longsor") && h.includes(PIL) && h.includes("belum terukur") && !/<td>0<\/td>/.test(h));
  }
  assert.equal(C.galat({}), "");
});

test("entri asli yang diloloskan: status Lolos uji, tanpa pil hipotesis", () => {
  const e = {...GERBANG.cuaca.hujan_50mm_lead1, boleh_tampil: true, alasan: "selisih > 0 dan batas bawah selang > 0"};
  const h = C.galat({hujan_50mm_lead1: e});
  assert.ok(h.includes(`<span class="pl" style="--w:var(--ok)" title="${esc(e.alasan)}">Lolos uji</span>`) && !h.includes(PIL) && !h.includes("ex-ey"));
});

test("pendorong: batang bertooltip, pil hipotesis di kepala bila keluaran belum lolos, teks di-escape", () => {
  const B = [{nama: "DC 200 sampai 300", nilai: 2.72, tip: "rasio laju terhadap kelas acuan"}, {nama: "<img src=x onerror=1>", nilai: 1.4}, {nama: "kosong", nilai: null}];
  const h = C.pendorong(B, {satuan: "kali", peta: GERBANG.longsor, keluaran: "longsor_peluang_kejadian"});
  assert.equal(kepala(h), "Pendorong");
  assert.ok(h.includes(PIL) && !h.includes("<img") && tip(h).length === 2 && h.includes('--k:0.0;--p:100.0"'));
  assert.ok(!C.pendorong(B, {}).includes(PIL));
  assert.equal(C.pendorong([]), "");
});

test("metode: urutan bab C22, batasan wajib ada, kepala nama seksi", () => {
  const h = C.metode("Metode peluang longsor", {singkatnya: "Peluang per kab-hari.", contoh: "Contoh dari data hari ini.", alur: "Hujan ke peluang."});
  const lb = [...h.matchAll(/class="pl"[^>]*>([^<]*)</g)].map(m => m[1]);
  assert.deepEqual(lb, ["Singkatnya", "Alur", "Contoh hitung", "Batasan"]);
  assert.ok(h.includes("Batasan belum ditulis.") && kepala(h) === "Metode peluang longsor");
  assert.ok(C.metode("Metode", {batasan: "x"}, {peta: {}, keluaran: "apa_saja"}).includes(PIL));
});

test("komponen tanpa handler klik dan tanpa literal warna baru; cerita lama tetap jalan", () => {
  const js = baca("public/inti/cerita.js"), blok = js.slice(js.indexOf("F-28 (PB-54a)"));
  assert.ok(!/addEventListener|onclick|#[0-9a-f]{3,8}\b|rgba?\(/i.test(blok), "blok F-28");
  const css = baca("public/inti/cerita.css"), cb = css.slice(css.indexOf("F-28"));
  assert.ok(cb.length > 100 && !/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|font-size:\s*\d/i.test(cb), "css F-28");
  C.daftar("uji", () => ({judul: "x", baris: [["#000", "Status", "isi"]], sumber: "s"}));
  assert.ok(C.kartu("uji").includes('class="cr"'));
});

test("satuan tampil: kolom Ukuran dan satuan sesudah skor dari metrik gerbang; tanpa satuan untuk ukuran tak bersatuan", () => {
  const h = C.galat(GERBANG.udara, {keluaran: ["mos_pm25_bmkg"]});
  assert.ok(h.includes(">Ukuran</th>") && h.includes(`<td>${esc(GERBANG.udara.mos_pm25_bmkg.metrik)}</td>`), "kolom Ukuran");
  assert.ok(h.includes("<td>10,8 µg/m³</td>") && h.includes(">9,75 µg/m³</td>") && h.includes("<td>-1 µg/m³</td>"), h.slice(h.indexOf("<tbody>"), h.indexOf("</tbody>")));
  assert.ok(tip(h).every(t => t.includes("µg/m³")));
  assert.ok(C.galat(GERBANG.longsor).includes("<td>0,0304</td>"), "Brier tanpa satuan");
  assert.ok(C.galat(GERBANG.pesisir).includes("<td>belum terukur</td>") && !C.galat(GERBANG.pesisir).includes("belum terukur m"), "kosong tanpa satuan");
});

test("tiga angka bermakna di semua besaran, pemisah ribuan id-ID", () => {
  assert.equal(C._skor(1234.5), "1.230");
  assert.equal(C._skor(123.45), "123");
  assert.equal(C._skor(98765), "98.800");
  const e = {...GERBANG.udara.mos_pm25_bmkg, skor_model: 1234.5};
  assert.ok(C.galat({x: e}).includes("<td>1.230 µg/m³</td>"));
});

test("skor negatif tidak kehilangan tanda: batang dari garis nol ke kiri, tooltip menjelaskan", () => {
  const e = {...GERBANG.longsor.longsor_peluang_kejadian, skor_model: -0.4, skor_pembanding: 0.6};
  const h = C.galat({x: e}), t = tip(h);
  assert.ok(h.includes('class="cr-nol" style="--k:40.0"'), "garis nol di 40%");
  assert.ok(h.includes('class="md" style="--k:0.0;--p:40.0"') && h.includes('class="pb" style="--k:40.0;--p:60.0"'), "lebar dari nol");
  assert.ok(t[0].includes("Model: -0,4") && t[0].includes("Nilai negatif") && !t[1].includes("Nilai negatif"));
  assert.ok(!C.galat(GERBANG.longsor).includes("cr-nol"), "tanpa negatif tanpa garis nol");
  const p = C.pendorong([{nama: "a", nilai: -1}, {nama: "b", nilai: 3}]);
  assert.ok(p.includes('class="cr-nol" style="--k:25.0"') && p.includes("Nilai negatif"));
});

test("n kecil (di bawah 30): title baris bertanda dan selang 95% di samping selisih", () => {
  const h = C.galat(GERBANG.banjir), e = GERBANG.banjir.kerusakan;
  assert.ok(e.n < 30, "data asli banjir kerusakan n = 4");
  assert.ok(h.includes(`<tr title="${esc(e.metrik)}, n kecil: 4 kasus uji">`), h.slice(h.indexOf("<tbody>"), h.indexOf("<tbody>") + 300));
  assert.ok(h.includes("<td>0,439 (selang 95% -0,694 sampai 1,57)</td>") && h.includes("<td>4, n kecil</td>"));
  const besar = h.slice(h.indexOf("Brier eskalasi") - 200);
  assert.ok(!/n kecil/.test(besar.slice(0, besar.indexOf("</tr>"))), "n 398 tanpa tanda");
});

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c])); }
