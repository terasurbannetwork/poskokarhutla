/* RU-030 MB-6 perender kartu rapor Ruang Unit (public/bnpb/unit/rapor.js) pada fixture R2 yang skemanya diperiksa rapor.py --cek.
   Perender dijalankan sungguhan di vm bersama public/inti/format.js (fmt, esc asli), bukan tiruan. Cangkang /bnpb/unit menyusul di RU-020. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const baca = p => readFileSync(AKAR + p, "utf8");
const ctx = {window: {}, Date, Intl, Number, String, Array, Math, Object, isNaN};
vm.createContext(ctx);
vm.runInContext(baca("public/inti/format.js") + "\n;globalThis.esc = esc; globalThis.fmt = fmt;", ctx);
vm.runInContext(baca("public/bnpb/unit/rapor.js"), ctx);
const R = ctx.window.UnitRapor;
const B = JSON.parse(baca("tests/bnpb/fixtures/unit/r2/contoh.json"));
const SEGAR = Date.parse(B.dibuat) + 3600e3, BASI = Date.parse(B.dibuat) + 49 * 3600e3;
const salin = x => JSON.parse(JSON.stringify(x));
const kepala = h => h.slice(0, h.indexOf("</header>"));
const tag = (h, re) => [...h.matchAll(re)].map(m => m[0]);

test("rapor.py --cek hijau (skema kartu dan fixture R2)", () => {
  const r = spawnSync("python3", ["-I", "scripts/bnpb/unit/rapor.py", "--cek"], {cwd: AKAR, encoding: "utf8"});
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("pil label sumber selalu ada, kata persis DS 11.4", () => {
  for (const k of B.kartu) {
    const h = kepala(R.html(k, B, SEGAR));
    for (const l of k.label) assert.ok(h.includes(R.LABEL[l][0]), `${k.id}: pil ${l} hilang`);
    assert.match(h, /class="bn-pil un-lbl /, `${k.id}: tanpa pil label`);
  }
  const k = B.kartu[0], h = kepala(R.html(k, B, SEGAR));
  assert.match(h, /Angka resmi/); assert.match(h, /Hitungan kita/);
  assert.match(h, /un-asumsi[^>]*>[\s\S]*?Asumsi</, "aturan berasumsi harus memunculkan pil Asumsi");
});

test("kepala = nama seksi berikon: tanpa .hl, judul apa adanya", () => {
  for (const k of B.kartu) {
    const h = kepala(R.html(k, B, SEGAR));
    assert.doesNotMatch(h, /class="hl"/, `${k.id}: kepala tidak boleh memuat .hl`);
    assert.match(h, new RegExp(`<h3 id="${k.id}-j"><svg[^]*?</svg>${k.judul}</h3>`), `${k.id}: h3 = ikon + nama seksi`);
  }
});

test(".hl hanya pada angka dari `angka`; tiap .hl dan sel angka membawa data-sumber dan title", () => {
  const k = B.kartu[0], h = R.html(k, B, SEGAR);
  const hl = tag(h, /<span class="hl"[^>]*>[^<]*<\/span>/g);
  assert.equal(hl.length, k.angka.filter(a => a.nilai != null).length, "jumlah .hl = angka bernilai");
  assert.deepEqual(hl.map(x => x.replace(/^[^]*>([^<]*)<\/span>$/, "$1")), k.angka.filter(a => a.nilai != null).map(a => ctx.fmt(a.nilai)));
  const sel = [...hl, ...tag(h, /<td class="n[^"]*"[^>]*>/g)];
  assert.ok(sel.length > hl.length, "fixture harus punya sel angka");
  for (const s of sel) {
    assert.match(s, /data-sumber="[^"]+"/, `tanpa data-sumber: ${s}`);
    assert.match(s, /title="[^"]+"/, `tanpa title: ${s}`);
  }
  assert.match(h, /title="[^"]*Pasal: tanpa pasal \(asumsi\)[^"]*"/, "ambang tanpa pasal tampil asumsi di title");
});

test("kosong tidak pernah 0: indikator tanpa masukan tampil belum ada data", () => {
  const k = B.kartu[0], h = R.html(k, B, SEGAR);
  const kosongAngka = k.angka.filter(a => a.nilai == null).length;
  const kosongSel = k.baris.reduce((n, b) => n + k.kolom.filter(c => c.angka && b[c.k] == null).length, 0);
  assert.ok(kosongAngka && kosongSel, "fixture harus memuat angka kosong");
  assert.equal((h.match(/belum ada data/g) || []).length, kosongAngka + kosongSel);
  // 0 sungguhan tetap 0 (Direktorat A n_dataset 0), angka id-ID
  assert.match(h, /data-label="Dataset"[^>]*>0<\/td>/);
  assert.match(h, />1\.234<\/td>/); assert.match(h, />40,5<\/td>/);
  // kartu tanpa angka dan tanpa baris: keadaan kosong, bukan tabel nol
  const h2 = R.html(B.kartu[1], B, SEGAR);
  assert.match(h2, /class="ad-kosong"[^>]*>[^]*Belum ada data\./);
  assert.doesNotMatch(h2, /<table|class="hl"/);
  const k3 = salin(k); k3.baris = [];
  assert.match(R.html(k3, B, SEGAR), /Belum ada data\./);
});

test("pil tanggal: per tanggal saat segar, basi sejak saat lewat basi_jam, spanduk muncul", () => {
  const segar = R.html(B.kartu[0], B, SEGAR), basi = R.html(B.kartu[0], B, BASI);
  assert.match(segar, /un-per"[^>]*>[^]*?per 26 Nov 2026</); assert.doesNotMatch(segar, /ad-spanduk/);
  assert.match(basi, /un-per un-basi"[^>]*>[^]*?basi sejak 28 Nov 2026</); assert.match(basi, /ad-spanduk/);
  assert.doesNotMatch(R.html(B.kartu[0], {...B, basi_jam: null}, BASI), /basi sejak/, "statis tidak pernah basi");
});

test("tanpa titik tengah, tanpa kata aman, tanpa kaki sumber, teks data di-escape", () => {
  for (const k of B.kartu) for (const t of [SEGAR, BASI]) {
    const h = R.html(k, B, t);
    assert.doesNotMatch(h, /·/); assert.doesNotMatch(h, /\baman\b/i);
    assert.doesNotMatch(h, /Sumber: |ex-ft/);
  }
  const k = salin(B.kartu[0]);
  k.judul = '<img src=x onerror=alert(1)>'; k.baris[0].produsen = '"><script>x</script>'; k.sumber = ['a"b'];
  const h = R.html(k, B, SEGAR);
  assert.doesNotMatch(h, /<img|<script/); assert.match(h, /&lt;img/); assert.match(h, /data-sumber="a&quot;b"/);
});

test("tabel: wadah region berlabel judul, kepala kolom scope dan title definisi", () => {
  const k = B.kartu[0], h = R.html(k, B, SEGAR);
  assert.match(h, new RegExp(`role="region" tabindex="0" aria-labelledby="${k.id}-j"`));
  for (const c of k.kolom) assert.ok(h.includes(`<th scope="col"${c.title ? ` title="${c.title}"` : ""}>${c.label}</th>`), `kepala ${c.k}`);
  assert.equal(tag(h, /<th scope="row"/g).length, k.baris.length);
});

test("ikon yang diizinkan rapor.py semuanya ada di perender", () => {
  const py = baca("scripts/bnpb/unit/rapor.py").match(/^IKON = \(([^)]*)\)/m)[1].match(/"([a-z]+)"/g).map(s => s.slice(1, -1));
  for (const i of py) assert.ok(R.IKON[i], `ikon ${i} tidak ada di rapor.js`);
});
