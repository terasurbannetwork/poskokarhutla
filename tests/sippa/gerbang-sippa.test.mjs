/* SP-014: gerbang larangan teks dan angka SIPPA (PRD §9.12.2, RU §2.8 butir 1-6 dan 8), tanpa basis data.
   Butir 6 (handler INP per handler) menyusul di SP-055. Tiap aturan punya fixture pelanggaran: gerbang yang tidak pernah bisa merah tidak dihitung. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, statSync, existsSync} from "node:fs";
import {join, relative} from "node:path";

const AKAR = new URL("../../", import.meta.url).pathname;

function berkasDi(dir, hasil = []) {
  if (!existsSync(dir)) return hasil;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    statSync(p).isDirectory() ? berkasDi(p, hasil) : hasil.push(p);
  }
  return hasil;
}
/* cakupan RU §2.8: public/pipa/**, templat laporan (bila ada), src/sippa*.js */
const sumber = () => [
  ...berkasDi(join(AKAR, "public/pipa")),
  ...berkasDi(join(AKAR, "data/sippa/templat")),
  ...(existsSync(join(AKAR, "src")) ? readdirSync(join(AKAR, "src")).filter(n => /^sippa.*\.js$/.test(n)).map(n => join(AKAR, "src", n)) : []),
];
const TEKS = /\.(js|css|html|md|txt)$/;
const rel = p => relative(AKAR, p);

/* aturan: (jalur, isi) -> daftar pesan pelanggaran; jalur memungkinkan aturan per berkas */
const ATURAN = {
  "1 tanpa 'terbukti'": (j, t) => /terbukti/i.test(t) ? [`${j}: kata "terbukti" (keputusan 50)`] : [],
  "2 tanpa em dash dan titik tengah": (j, t) => /[—·]/.test(t) ? [`${j}: em dash U+2014 atau titik tengah U+00B7`] : [],
  "3 'titik api' bukan untuk data satelit": (j, t) => /titik api/i.test(t) ? [`${j}: "titik api" (pakai "titik panas")`] : [],
  "4 tanpa toFixed( (pakai fmt)": (j, t) => /toFixed\(/.test(t) ? [`${j}: toFixed( di teks tampil`] : [],
  "5 tanpa CDN dan import map": (j, t) => /https?:\/\/cdn|unpkg|jsdelivr|cdnjs|importmap/i.test(t) ? [`${j}: URL CDN atau import map sebaris (CSP script-src 'self')`] : [],
  "8 batas kedalaman satu definisi": (j, t) => {
    const p = [];
    const def = (t.match(/dalam_maks_m\s*:/g) || []).length;
    const hitung = /(^|\/)hitung\.js$/.test(j);
    if (def > 0 && !hitung) p.push(`${j}: definisi dalam_maks_m di luar hitung.js`);
    if (def > 1) p.push(`${j}: dalam_maks_m didefinisikan ${def} kali`);
    if (!hitung && /(kedalaman|lance|dalam_m)[^\n]*(>=?|<=?)\s*5(\.\d+)?\b(?!\d*\s*(km|bar))/i.test(t)) p.push(`${j}: batas kedalaman 5 m ditulis ulang (pakai KONST.dalam_maks_m)`);
    return p;
  },
};
const jalankan = (aturan, j, t) => aturan(j, t);

for (const [nama, aturan] of Object.entries(ATURAN)) {
  test(`gerbang SIPPA butir ${nama}: kode P0 bersih`, () => {
    const pelanggar = sumber().filter(p => TEKS.test(p)).flatMap(p => jalankan(aturan, rel(p), readFileSync(p, "utf8")));
    assert.deepEqual(pelanggar, [], `${pelanggar.length} pelanggaran: ${pelanggar.join("; ")}`);
  });
}

test("gerbang SIPPA butir 8: KONST.dalam_maks_m = 5 tepat satu definisi di hitung.js", () => {
  const t = readFileSync(join(AKAR, "public/pipa/hitung.js"), "utf8");
  assert.equal((t.match(/dalam_maks_m\s*:\s*5\b/g) || []).length, 1, "KONST.dalam_maks_m: 5 harus tepat satu di hitung.js");
});

test("gerbang SIPPA butir 6 RU: tidak ada berkas data (json, csv, geojson) di public/pipa", () => {
  const data = berkasDi(join(AKAR, "public/pipa")).filter(p => /\.(json|csv|geojson)$/i.test(p)).map(rel);
  assert.deepEqual(data, [], `${data.length} berkas data di public/pipa (terbit tanpa sesi): ${data.join(", ")}`);
});

test("gerbang SIPPA: ikon.js tanpa warna tertanam (satu warna currentColor, DS §2.8)", () => {
  const t = readFileSync(join(AKAR, "public/pipa/ikon.js"), "utf8");
  assert.doesNotMatch(t, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i, "warna tertanam di ikon.js");
});

/* ---------- uji penolakan: tiap aturan wajib merah pada fixture pelanggaran ---------- */
const PELANGGARAN = {
  "1 tanpa 'terbukti'": "const s = 'Model ini terbukti benar';",
  "2 tanpa em dash dan titik tengah": "const s = 'Air — jalan';",
  "3 'titik api' bukan untuk data satelit": "const s = 'Jumlah titik api hari ini';",
  "4 tanpa toFixed( (pakai fmt)": "el.textContent = x.toFixed(2);",
  "5 tanpa CDN dan import map": "<script src=\"https://cdn.jsdelivr.net/npm/x.js\"></script>",
  "8 batas kedalaman satu definisi": "const MAKS = {dalam_maks_m: 5};\nif (kedalaman > 5) tolak();",
};
const BERSIH = "const s = 'Titik panas'; el.textContent = fmt(1.5); const KONST = {a: 1}; if (n < 5) x();";

for (const [nama, aturan] of Object.entries(ATURAN)) {
  test(`gerbang SIPPA penolakan butir ${nama}: fixture pelanggaran merah, fixture bersih hijau`, () => {
    assert.ok(PELANGGARAN[nama], `butir ${nama} tanpa fixture pelanggaran`);
    assert.ok(jalankan(aturan, "fixture/layar_x.js", PELANGGARAN[nama]).length > 0, `butir ${nama} lolos pada kode yang melanggar: gerbang tidak pernah merah`);
    assert.deepEqual(jalankan(aturan, "fixture/layar_x.js", BERSIH), [], `butir ${nama} menolak kode bersih`);
  });
}

test("gerbang SIPPA penolakan butir 8: definisi kedua dalam_maks_m di berkas lain ditolak, di hitung.js sekali boleh", () => {
  const a = ATURAN["8 batas kedalaman satu definisi"];
  assert.equal(jalankan(a, "public/pipa/hitung.js", "KONST = {dalam_maks_m: 5}").length, 0);
  assert.ok(jalankan(a, "public/pipa/hitung.js", "{dalam_maks_m: 5, dalam_maks_m: 5}").length > 0);
  assert.ok(jalankan(a, "public/pipa/layar_peta.js", "const k = {dalam_maks_m: 5}").length > 0);
});

test("gerbang SIPPA penolakan butir 6 RU: berkas data di public/pipa terdeteksi oleh pola yang dipakai", () => {
  for (const n of ["x.json", "x.CSV", "peta/y.geojson"]) assert.match(n, /\.(json|csv|geojson)$/i);
  assert.doesNotMatch("ikon.js", /\.(json|csv|geojson)$/i);
});

/* ================= SP-055: gerbang lengkap (RU §2.6 INP per handler, §2.7 warna tertanam, §2.8 butir 7, 9, 10, zona berpola) ================= */
const {periksaBerkasInp, periksaInnerHtml, periksaHandler, ekstrakHandler, hapusPanggilanBalik} = await import("./gerbang_analisis.mjs");
const dirPipa = join(AKAR, "public/pipa");
const layarJs = () => readdirSync(dirPipa).filter(n => /^layar_.*\.js$/.test(n));
const jsPipa = () => readdirSync(dirPipa).filter(n => /\.js$/.test(n) && !/^(ikon|uji_pilot|uji_pilot_spek|studio_mesin|studio_pekerja)\.js$/.test(n));
const bacaPipa = n => readFileSync(join(dirPipa, n), "utf8");
/* pengecualian per handler: "berkas:nama_handler" -> alasan >= 15 huruf (per berkas ditolak). Kosong saat ini. */
const PENGECUALIAN_INP = {};

test("INP RU §2.6 butir 1 sampai 4: tiap handler click, input, change, keydown di layar_*.js memanggil kerja berat hanya lewat nanti(, mengubah chrome sebelum nanti(, dan tanpa addSource atau addLayer", () => {
  const pelanggar = layarJs().flatMap(n => periksaBerkasInp(n, bacaPipa(n), PENGECUALIAN_INP));
  assert.deepEqual(pelanggar, [], `${pelanggar.length} pelanggaran INP: ${pelanggar.join("; ")}`);
});
test("INP: pengecualian hanya per handler (berkas:nama) dengan alasan >= 15 huruf; pengecualian per berkas ditolak", () => {
  for (const [k, alasan] of Object.entries(PENGECUALIAN_INP)) { assert.match(k, /^layar_\w+\.js:[\w@]+$/, `pengecualian ${k} harus berkas:handler`); assert.ok(String(alasan).replace(/[^\p{L}]/gu, "").length >= 15, `alasan ${k} terlalu pendek`); }
});
test("INP penolakan: handler yang memanggil gambar( langsung, memanggil nanti( sebelum mengubah aria-pressed, atau memasang addLayer ditolak; handler benar dan fungsi async tidak", () => {
  const t = x => periksaBerkasInp("layar_x.js", x);
  assert.match(t(`function gambarTabel() {}\nakar.addEventListener("click", e => { st.hal = 1; gambarTabel(); });`)[0], /kerja berat dipanggil langsung di handler \(gambarTabel\)/);
  assert.match(t(`function lihat() { gambarPeta(); }\nakar.addEventListener("click", e => { lihat(); });`)[0], /gambarPeta/, "satu tingkat fungsi bernama diperluas");
  assert.match(t(`akar.addEventListener("click", e => { nanti(f); b.setAttribute("aria-pressed", "true"); });`)[0], /sebelum chrome/);
  assert.match(t(`akar.addEventListener("change", e => { peta.addLayer({id: "x"}); });`).join(" | "), /addSource atau addLayer/);
  assert.match(t(`el.addEventListener("keydown", e => { setData(x); });`)[0], /setData/);
  assert.deepEqual(t(`akar.addEventListener("click", e => { b.setAttribute("aria-pressed", "true"); nanti(gambarTabel); });`), []);
  assert.deepEqual(t(`akar.addEventListener("click", e => { b.setAttribute("aria-pressed", "true"); jadwalkan(gambarTabel); });`), []);
  assert.deepEqual(t(`async function muat() { gambar(); }\nakar.addEventListener("click", e => { muat(); });`), [], "fungsi async: kerja sesudah await bukan di jalur paint");
  assert.deepEqual(t(`akar.addEventListener("click", e => { konfirmasi("a", "b", () => { gambarTabel(); }); });`), [], "panggilan balik tidak berjalan saat handler berjalan");
  assert.deepEqual(t(`akar.addEventListener("scroll", e => { gambarTabel(); });`), [], "peristiwa di luar keempat yang diatur RU");
  assert.equal(ekstrakHandler(`a.addEventListener("click", tutup, {signal});\nfunction tutup() { gambarX(); }`)[0].nama, "tutup", "handler bernama dirujuk ke definisinya");
  assert.equal(hapusPanggilanBalik("a(() => { b(); }); c();").includes("b()"), false); assert.ok(hapusPanggilanBalik("a(() => { b(); }); c();").includes("c()"));
  assert.equal(periksaHandler({nama: "h", badan: "{ gambar(); }"}).length, 1);
});

test("RU §2.8 butir 7: penyisipan innerHTML, outerHTML, insertAdjacentHTML di public/pipa tidak membawa data mentah (hanya literal, esc(, fmt(, atau pembangun *Html)", () => {
  const pelanggar = jsPipa().flatMap(n => periksaInnerHtml(n, bacaPipa(n)));
  assert.deepEqual(pelanggar, [], `${pelanggar.length} penyisipan mentah: ${pelanggar.join("; ")}`);
});
test("RU §2.8 butir 7 penolakan: data mentah dalam templat ditolak, esc, fmt, pembangun *Html, konstanta, kondisi, dan pernyataan aman beralasan lolos", () => {
  const t = x => periksaInnerHtml("layar_x.js", x);
  assert.equal(t("el.innerHTML = `<b>${x.nama}</b>`;").length, 1); assert.match(t("el.innerHTML = `<b>${x.nama}</b>`;")[0], /\$\{\.\.\.x\.nama\.\.\.\}/);
  assert.equal(t("el.insertAdjacentHTML('beforeend', `<i>${a.b.c}</i>`);").length, 1);
  assert.equal(t("el.outerHTML = `<p>${d.catatan}</p>`;").length, 1);
  assert.equal(t("el.innerHTML = rows.map(r => `<li>${r.nama}</li>`).join('');").length, 1, "templat di dalam map dianalisis");
  assert.equal(t("el.innerHTML = `<a title=\"${y.judul}\">x</a>`;").length, 1, "atribut juga");
  for (const aman of ["el.innerHTML = `<b>${esc(x.nama)}</b>`;", "el.innerHTML = `<b>${fmt(x.n)} ${x.n > 1 ? 'a' : 'b'}</b>`;", "el.innerHTML = tabelHtml(x.rows);", "el.innerHTML = `${kartuAngka(x.h)}`;",
    "el.innerHTML = `<td>${TEKS[x.k]}</td>`;", "el.innerHTML = '<p>statis</p>';", "el.innerHTML = `${/* aman: x.k hanya dibaca untuk pilihan kelas, teksnya enum internal */ x.k}`;", "el.innerHTML = rows.map(r => `<li>${esc(r.nama)}</li>`).join('');",
    "el.innerHTML = `<b>${lolos(x.nama)}</b>`;", "el.textContent = x.nama;"]) assert.deepEqual(t(aman), [], aman);
  assert.equal(t("el.innerHTML = `${/* aman: pendek */ x.k}`;").length, 1, "alasan pernyataan aman kurang dari 15 huruf ditolak");
});

test("RU §2.8 butir 9: tanpa teks '100%' sebagai probabilitas di public/pipa (lebar CSS 100% dan angka persen lain boleh)", () => {
  const R = /(?:probabilitas|peluang|pasti|kemungkinan)[^.\n]{0,40}100\s?%|100\s?%[^.\n]{0,40}(?:probabilitas|peluang|pasti|kemungkinan)/i;
  const pelanggar = jsPipa().filter(n => R.test(bacaPipa(n)));
  assert.deepEqual(pelanggar, [], `100% sebagai probabilitas di: ${pelanggar.join(", ")}`);
  assert.match("Peluang gelar 100%", R); assert.match("100% pasti terjadi", R); assert.doesNotMatch("lebar 100% layar", R); assert.doesNotMatch("Probabilitas 87%", R);
});

test("RU §2.8 butir 10: nama perusahaan konsesi tidak muncul di public/pipa, templat, dan data/sippa/keluaran", () => {
  const NAMA = /\b(?:PT|CV)\.?\s+[A-Z][A-Za-z.&-]{2,}/;
  const berkas = [...jsPipa().map(n => ["public/pipa/" + n, bacaPipa(n)]), ...readdirSync(dirPipa).filter(n => n.endsWith(".css")).map(n => ["public/pipa/" + n, bacaPipa(n)]),
    ...(existsSync(join(AKAR, "data/sippa/keluaran")) ? readdirSync(join(AKAR, "data/sippa/keluaran")).filter(n => n.endsWith(".json")).map(n => ["data/sippa/keluaran/" + n, readFileSync(join(AKAR, "data/sippa/keluaran", n), "utf8")]) : [])];
  const pelanggar = berkas.filter(([, t]) => NAMA.test(t)).map(([n, t]) => `${n}: ${NAMA.exec(t)[0]}`);
  assert.deepEqual(pelanggar, [], `nama perusahaan: ${pelanggar.join("; ")}`);
  assert.match("PT Sawit Makmur", NAMA); assert.match("CV. Hutan Lestari", NAMA); assert.doesNotMatch("PT-102 tekanan", NAMA); assert.doesNotMatch("PT 102", NAMA);
});

/* RU §2.7 "tanpa warna tertanam": #hex, rgb(, hsl( di public/pipa/*.css dan string gaya *.js selain var(--...) dan currentColor.
   Putih dan hitam netral (#fff, #000) dipakai sebagai ujung color-mix dan teks di atas gradien tema, sama dengan admin.css; selain itu nol. */
const WARNA = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g, NETRAL = new Set(["#fff", "#000", "#ffffff", "#000000"]);
const hitungWarna = t => (t.match(WARNA) || []).filter(m => !NETRAL.has(m.toLowerCase())).length;
const WARNA_PENGECUALIAN = {   // per berkas, alasan >= 15 huruf
  "adegan.js": "warna material WebGL three.js bukan gaya CSS dan tidak bisa membaca var(--token)",
  "layar_peta.js": "paint MapLibre tidak membaca var(--token); hex setara token zona (DS 2.1.4, keputusan 52) dengan pola dan huruf sebagai pembawa makna",
  "uji_pilot.css": "halaman mandiri uji pilot di luar cangkang /pipa dengan tema sendiri",
  "uji_pilot.js": "halaman mandiri uji pilot di luar cangkang /pipa dengan tema sendiri",
  "uji_pilot_warna.css": "halaman mandiri uji pilot di luar cangkang /pipa dengan tema sendiri",
  "laporan_pdf.js": "warna dokumen PDF dari tema.json, bukan token layar (DS 2.1.2)",
};
const WARNA_UTANG = {"pipa.css": 31};   // jumlah maksimum per berkas yang boleh tersisa; hanya boleh menyusut. pipa.css terkunci ?v= (src/admin_halaman.js) sehingga dibersihkan bersama kenaikan versi.
test("RU §2.7 tanpa warna tertanam: berkas CSS dan JS di public/pipa bersih, atau terdaftar sebagai pengecualian beralasan, atau utang yang tidak boleh bertambah", () => {
  const g = [];
  for (const n of readdirSync(dirPipa).filter(n => /\.(css|js)$/.test(n) && n !== "ikon.js")) {
    const k = hitungWarna(bacaPipa(n)); if (!k || n in WARNA_PENGECUALIAN) continue;
    const batas = WARNA_UTANG[n] ?? 0; if (k > batas) g.push(`${n}: ${k} warna tertanam (batas ${batas})`);
  }
  assert.deepEqual(g, [], `${g.length} berkas melanggar: ${g.join("; ")}`);
  for (const [n, a] of Object.entries(WARNA_PENGECUALIAN)) assert.ok(a.replace(/[^\p{L}]/gu, "").length >= 15 && existsSync(join(dirPipa, n)), `pengecualian ${n} tanpa alasan atau berkas tak ada`);
  for (const [n, k] of Object.entries(WARNA_UTANG)) assert.ok(hitungWarna(bacaPipa(n)) <= k, `utang ${n} naik di atas ${k}`);
});
test("RU §2.7 penolakan: hex, rgb(, hsl( ditolak; var(--x), currentColor, #fff, #000 lolos; fallback var(--x,#hex) ditolak", () => {
  for (const salah of ["a{color:#0b2545}", "a{background:rgb(1 2 3)}", "a{color:hsl(10 20% 30%)}", "a{color:var(--ok,#20a04e)}", "x.style.color = '#ff0000';", "a{color:rgba(0,0,0,.5)}"]) assert.ok(hitungWarna(salah) > 0, salah);
  for (const baik of ["a{color:var(--ink)}", "a{fill:currentColor}", "a{color:#fff}", "a{box-shadow:0 0 0 color-mix(in srgb,var(--ink) 15%,#000)}"]) assert.equal(hitungWarna(baik), 0, baik);
});
test("RU §2.7 utang warna: pipa.css, layar_peta.css, layar_studio.css, layar_hitung.css, adegan.css, dan semua layar_*.css lain bersih kecuali utang terdaftar", () => {
  for (const n of readdirSync(dirPipa).filter(n => /^(layar_|adegan).*\.css$/.test(n))) assert.equal(hitungWarna(bacaPipa(n)), 0, `${n} punya warna tertanam`);
});

test("DT §8.2 dan RU §2.7: lapisan zona layar_peta.js memasang huruf (symbol dengan text-field) dan pola isi (gambar zona-*), tidak hanya warna", () => {
  const t = bacaPipa("layar_peta.js");
  assert.match(t, /id: "kompleks-huruf", type: "symbol"/); assert.match(t, /"text-field": \["get", kunci\]/); assert.match(t, /id: "kompleks-pola"/); assert.match(t, /peta\.addImage\(`zona-\$\{z\}`/);
  assert.match(t, /for \(const z of ZONA\)/); assert.match(t, /data-lapisan="huruf"/, "huruf zona punya sakelar tetapi menyala secara bawaan");
  assert.match(t, /sakelar|setLayoutProperty/, "sakelar peta lewat setLayoutProperty");
});
