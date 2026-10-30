/* KM-A11: gerbang larangan teks dan aset Kemitraan (RU §2.8), statis, tanpa basis data. Meniru tests/sippa/gerbang-sippa.test.mjs.
   Cakupan: public/kemitraan.* , public/kemitraan/** , src/kemitraan*.js. Berkas yang belum ada = dilewati (tanpa galat);
   begitu muncul langsung dihakimi. Tiap aturan punya fixture pelanggaran di tests/kemitraan/fixtures/langgar/ yang
   WAJIB membuat aturannya merah: gerbang yang tidak pernah bisa merah tidak dihitung.
   ponytail: pemindai innerHTML berbasis teks (bukan AST); langit-langitnya: `innerHTML = a + b` (gabung string non-templat) tidak diperiksa. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";
import vm from "node:vm";

const AKAR = new URL("../../", import.meta.url).pathname;
const LANGGAR = join(AKAR, "tests/kemitraan/fixtures/langgar");
const fx = (n) => readFileSync(join(LANGGAR, n), "utf8");
const rel = (p) => relative(AKAR, p);
const TEKS = /\.(js|css|html|md|txt)$/;
// host CDN yang boleh: pustaka ekspor daftar pendek (xlsx/docx/jspdf), sama seperti /akademisi (DS §4, DT §522)
export const CDN_EKSPOR = ["cdnjs.cloudflare.com", "cdn.jsdelivr.net"];

function berkasDi(dir, hasil = []) {
  if (!existsSync(dir)) return hasil;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    statSync(p).isDirectory() ? berkasDi(p, hasil) : hasil.push(p);
  }
  return hasil;
}
const sumber = () => [
  ...readdirSync(join(AKAR, "public")).filter((n) => /^kemitraan\.[\w.]+$/.test(n)).map((n) => join(AKAR, "public", n)),
  ...berkasDi(join(AKAR, "public/kemitraan")),
  ...readdirSync(join(AKAR, "src")).filter((n) => /^kemitraan.*\.js$/.test(n)).map((n) => join(AKAR, "src", n)),
].filter((p) => TEKS.test(p));

/* ---------- pemindai innerHTML: kumpulkan isi tiap ${...} yang ikut masuk ke HTML ---------- */
function lewatString(t, i) { // i di kutip pembuka; kembalikan indeks sesudah kutip penutup
  const q = t[i];
  for (i++; i < t.length && t[i] !== q; i++) if (t[i] === "\\") i++;
  return i + 1;
}
function templat(t, i, out) { // i sesudah backtick pembuka
  for (; i < t.length; i++) {
    if (t[i] === "\\") i++;
    else if (t[i] === "`") return i + 1;
    else if (t[i] === "$" && t[i + 1] === "{") i = ekspr(t, i + 2, out) - 1;
  }
  return i;
}
function ekspr(t, i, out) { // i sesudah "${"; kembalikan indeks sesudah "}" penutup
  const awal = i, anak = [];
  let dalam = 0, bertemplat = false;
  for (; i < t.length; i++) {
    const c = t[i];
    if (c === "`") { bertemplat = true; i = templat(t, i + 1, anak) - 1; }
    else if (c === '"' || c === "'") i = lewatString(t, i) - 1;
    else if (c === "{") dalam++;
    else if (c === "}") { if (dalam === 0) break; dalam--; }
  }
  out.push(...anak);
  if (!bertemplat) out.push({ teks: t.slice(awal, i).trim(), pos: awal }); // ekspresi berisi templat dinilai lewat anaknya saja
  return i + 1;
}
const AMAN = [
  /(^|[^\w$.])esc\(/,                       // esc(x) di mana pun dalam ekspresi
  /^[\w$.]*([hH]tml|ikon)\([^]*\)$/,        // builder HTML: kosongHtml(), ikon(), barisHtml(...)
  /^[\w$.]*[hH]tml$/,                       // variabel HTML jadi: ${isiHtml}
  /^(fmt|angka|Number)\(/,                  // angka terformat
  /^[^?]+\?\s*(["'][^"']*["']|``)\s*:\s*(["'][^"']*["']|``)$/, // ternari dua literal
  /^["'][^"']*["']$/,                       // literal
];
export function innerHtmlTakAman(t) {
  const hasil = [];
  for (const m of t.matchAll(/(innerHTML\s*\+?=|insertAdjacentHTML\s*\([^,]+,)/g)) {
    const out = [];
    let dalam = 0;
    for (let i = m.index + m[0].length; i < t.length; i++) {
      const c = t[i];
      if (c === "`") i = templat(t, i + 1, out) - 1;
      else if (c === '"' || c === "'") i = lewatString(t, i) - 1;
      else if ("([{".includes(c)) dalam++;
      else if (")]}".includes(c)) { if (--dalam < 0) break; }
      else if (c === ";" && dalam === 0) break;
    }
    for (const e of out) if (!AMAN.some((r) => r.test(e.teks))) hasil.push({ baris: t.slice(0, e.pos).split("\n").length, teks: e.teks });
  }
  return hasil;
}

/* ---------- literal objek RUMPUN dan perbandingan konst ---------- */
function literal(t, pola) {
  const m = pola.exec(t);
  if (!m) return null;
  let i = m.index + m[0].length - 1, dalam = 0, j = i;
  for (; j < t.length; j++) {
    if (t[j] === '"' || t[j] === "'") j = lewatString(t, j) - 1;
    else if (t[j] === "{") dalam++;
    else if (t[j] === "}" && --dalam === 0) break;
  }
  return vm.runInNewContext("(" + t.slice(i, j + 1) + ")");
}
export const rumpunAk = (t) => literal(t, /\bRUMPUN\s*=\s*\{/);
export const rumpunKm = (t) => literal(t, /\bRUMPUN\s*[:=]\s*\{/);
export function bedaRumpun(km, ak) {
  if (!km) return ["KM.RUMPUN bukan literal objek; tulis literalnya (salinan RUMPUN akademisi.js) supaya gerbang bisa membandingkan"];
  if (!ak) return ["RUMPUN di akademisi.js tidak terbaca"];
  const p = [];
  for (const k of new Set([...Object.keys(km), ...Object.keys(ak)])) {
    if (JSON.stringify(km[k]) !== JSON.stringify(ak[k])) p.push(`rumpun "${k}": KM ${JSON.stringify(km[k])} != akademisi ${JSON.stringify(ak[k])}`);
  }
  return p;
}
export function bedaKonst(teksJs, objPy) {
  const m = teksJs.match(/const KM_KONST = (\{[\s\S]*?\n\});\n/);
  if (!m) return ["konst.js: blok 'const KM_KONST = {...};' tidak ditemukan"];
  const js = JSON.parse(m[1]), p = [];
  for (const k of new Set([...Object.keys(js), ...Object.keys(objPy)])) {
    if (JSON.stringify(js[k]) !== JSON.stringify(objPy[k])) p.push(`${k}: konst.js ${JSON.stringify(js[k])?.slice(0, 40)} != konst.py ${JSON.stringify(objPy[k])?.slice(0, 40)}`);
  }
  return p;
}

/* ---------- aturan berbasis teks: (jalur, isi) -> pesan[] ---------- */
const ATURAN = {
  "1 tanpa 'terbukti'": { fx: "terbukti.js",
    cek: (j, t) => /terbukti/i.test(t) ? [`${j}: kata "terbukti"; klaim model tidak boleh memakainya (pakai "konsisten dengan")`] : [] },
  "2 tanpa em dash": { fx: "em-dash.js",
    cek: (j, t) => t.includes("—") ? [`${j}: em dash U+2014; ganti dengan titik, koma, atau titik dua`] : [] },
  "3 tanpa toFixed( di layar": { fx: "tofixed.js",
    cek: (j, t) => /toFixed\(/.test(t) ? [`${j}: toFixed( membulatkan tanpa pemisah ribuan lokal; pakai angka()/fmt()`] : [] },
  "4a tanpa skrip inline": { fx: "inline-skrip.html",
    cek: (j, t) => [
      ...[...t.matchAll(/<script\b([^>]*)>/gi)].filter((m) => !/\bsrc\s*=/.test(m[1])).map(() => `${j}: <script> tanpa src; CSP script-src 'self' memblokirnya, pindahkan ke berkas .js`),
      ...(/\son[a-z]+\s*=\s*["']|javascript:/i.test(t) ? [`${j}: atribut on*= atau javascript: inline; pasang handler lewat addEventListener`] : []),
    ] },
  "4b tanpa gaya inline (html)": { fx: "inline-gaya.html",
    cek: (j, t) => /<style\b|\sstyle\s*=\s*["']/i.test(t) ? [`${j}: <style> atau style= inline; pakai kelas .km-* di kemitraan.css`] : [] },
  "4c tanpa gaya inline (templat JS)": { fx: "inline-gaya.js",
    cek: (j, t) => /<style\b|[\s"'`]style\s*=\s*\\?["']|setAttribute\(\s*["']style["']/.test(t) ? [`${j}: style= dalam string JS; pakai kelas .km-w-<kunci> (DS §2)`] : [] },
  "5 tanpa innerHTML ${} tanpa esc(": { fx: "innerhtml.js",
    cek: (j, t) => innerHtmlTakAman(t).map((e) => `${j}:${e.baris}: innerHTML menyisipkan \${${e.teks.slice(0, 50)}} tanpa esc( (XSS); bungkus esc( atau pakai builder *Html(`) },
  "6 tanpa CDN di luar daftar ekspor": { fx: "cdn.html",
    cek: (j, t) => [...t.matchAll(/(?:<script[^>]*\ssrc|<link[^>]*\shref|\bfrom\s|\bimport\(\s*|@import\s+(?:url\()?|url\()\s*=?\s*["']?(https?:)?\/\/([\w.-]+)/gi)]
      .filter((m) => !CDN_EKSPOR.includes(m[2].toLowerCase()))
      .map((m) => `${j}: sumber luar ${m[2]} di luar daftar ekspor (${CDN_EKSPOR.join(", ")}); salin lokal ke public/kemitraan/`) },
};

for (const [nama, { cek }] of Object.entries(ATURAN)) {
  test(`gerbang KM aturan ${nama}: kode bersih`, () => {
    const pelanggar = sumber().flatMap((p) => cek(rel(p), readFileSync(p, "utf8")));
    assert.deepEqual(pelanggar, [], `${pelanggar.length} pelanggaran: ${pelanggar.join("; ")}`);
  });
  test(`gerbang KM penolakan aturan ${nama}: fixture pelanggaran merah`, () => {
    const p = cek(`fixtures/langgar/${ATURAN[nama].fx}`, fx(ATURAN[nama].fx));
    assert.ok(p.length >= 1, `aturan "${nama}" tidak menolak ${ATURAN[nama].fx}: gerbang lepas`);
  });
}

test("gerbang KM: fixture bersih.js lolos semua aturan teks (tanpa positif palsu)", () => {
  const t = fx("bersih.js");
  const p = Object.values(ATURAN).flatMap(({ cek }) => cek("bersih.js", t));
  assert.deepEqual(p, [], p.join("; "));
});

test("gerbang KM aturan 5: pelanggaran menyebut baris dan ekspresi (nama, judul, tapi bukan esc/builder)", () => {
  const p = innerHtmlTakAman(fx("innerhtml.js"));
  assert.deepEqual(p.map((e) => e.teks).sort(), ["d.judul", "nama"], JSON.stringify(p));
});

test("gerbang KM aturan 6: host ekspor yang sah lolos, host lain ditolak", () => {
  const sah = `<script src="https://cdn.jsdelivr.net/npm/xlsx.js"></script>`;
  assert.deepEqual(ATURAN["6 tanpa CDN di luar daftar ekspor"].cek("x.html", sah), []);
  assert.equal(ATURAN["6 tanpa CDN di luar daftar ekspor"].cek("x.html", `@import url(https://fonts.googleapis.com/css)`).length, 1);
  assert.equal(ATURAN["6 tanpa CDN di luar daftar ekspor"].cek("x.js", `import("https://esm.sh/x")`).length, 1);
});

/* ---------- aturan 7: KM.RUMPUN = RUMPUN akademisi.js ---------- */
const AKADEMISI = () => readFileSync(join(AKAR, "public/akademisi.js"), "utf8");
test("gerbang KM aturan 7: RUMPUN akademisi.js terbaca dan tidak kosong (penemuan hidup)", () => {
  assert.ok(Object.keys(rumpunAk(AKADEMISI()) || {}).length >= 10, "RUMPUN akademisi.js tidak terbaca atau < 10 rumpun");
});
test("gerbang KM aturan 7: KM.RUMPUN (public/kemitraan/inti.js) sama dengan RUMPUN akademisi.js", () => {
  const inti = join(AKAR, "public/kemitraan/inti.js");
  if (!existsSync(inti)) return;  // KM-A10 belum ada
  const t = readFileSync(inti, "utf8");
  if (!/\bRUMPUN\b/.test(t)) return assert.fail("public/kemitraan/inti.js tidak mendefinisikan KM.RUMPUN (DS §4)");
  const p = bedaRumpun(rumpunKm(t), rumpunAk(AKADEMISI()));
  assert.deepEqual(p, [], p.join("; "));
});
test("gerbang KM penolakan aturan 7: fixture rumpun beda merah, rumpun sama hijau", () => {
  const p = bedaRumpun(rumpunKm(fx("rumpun-km.js")), rumpunAk(fx("rumpun-ak.js")));
  assert.equal(p.length, 1);
  assert.match(p[0], /rumpun "banjir": KM .*#000000.* != akademisi .*#1c7ed6/);
  assert.deepEqual(bedaRumpun(rumpunAk(fx("rumpun-ak.js")), rumpunAk(fx("rumpun-ak.js"))), []);
  assert.equal(bedaRumpun(null, {}).length, 1);
});

/* ---------- aturan 8: konst.js = konst.py ---------- */
const JSON_PY = () => JSON.parse(execFileSync("python3", ["-I", join(AKAR, "scripts/kemitraan/konst.py"), "--json"], { encoding: "utf8" }));
test("gerbang KM aturan 8: konst.js sama dengan konst.py", () => {
  const p = bedaKonst(readFileSync(join(AKAR, "public/kemitraan/konst.js"), "utf8"), JSON_PY());
  assert.deepEqual(p, [], `${p.length} beda: ${p.slice(0, 5).join("; ")}; jalankan ulang pembangkit konst.js dari konst.py`);
});
test("gerbang KM penolakan aturan 8: fixture konst_beda.js merah, konst.js asli hijau", () => {
  const py = JSON_PY();
  const p = bedaKonst(fx("konst_beda.js"), py);
  assert.ok(p.some((s) => /^KM_MAKS_POSTING: konst\.js 25000 != konst\.py 20000/.test(s)), p.join("; "));
  assert.deepEqual(bedaKonst(readFileSync(join(AKAR, "public/kemitraan/konst.js"), "utf8"), py), []);
});

test("gerbang KM: cakupan sumber menemukan berkas nyata (bukan daftar kosong)", () => {
  const s = sumber().map(rel);
  assert.ok(s.includes("public/kemitraan/konst.js"), `sumber() tidak melihat public/kemitraan/konst.js; ${s.length} berkas ditemukan`);
});
