// PB-76 (F-39): segmen ukuran tabel provinsi. Mesin (gerbang registri, segmen) di public/inti/tabel.js; adaptor gempa di public/gempa/peta.js.
// Adaptor tidak bisa dimuat utuh tanpa peta, jadi bagiannya dipotong dari sumber dan dijalankan di vm dengan data halaman buatan.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const POTONG = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); assert.ok(i >= 0 && j > i, "penanda tak ditemukan: " + a); return s.slice(i, j); };
const stabil = x => JSON.parse(JSON.stringify(x));

function dunia() {
  const peta = baca("public/gempa/peta.js"), tabel = baca("public/inti/tabel.js");
  const rows = {innerHTML: ""}, panggilan = [];
  const ctx = {console, Date, Promise, setTimeout, Object, Math, Number, Set, Array, JSON, String,
    $: s => s === "#rows" ? rows : {innerHTML: "", addEventListener() {}}, bacaLokal: (k, d) => d, esc: x => String(x), fmt: n => String(n), pilM: m => `<i>M ${m}</i>`, paginasi: () => "",
    wilayahPendek: x => x, jamPendek: x => x, mTulis: m => "M " + m, KG: {tgl: () => ""}, ARSIP: 0, nanti: f => f(), renderLegenda: () => panggilan.push("legenda"),
    Peta: {aturWilayah: () => panggilan.push("warna")}, window: {}};
  const k = vm.createContext(ctx);
  vm.runInContext(tabel, k);
  vm.runInContext(POTONG(peta, "const WARNA_WIL", "const RAMP_GRID") + "\n" + POTONG(peta, "/* ---------- keadaan", "const Peta = {")
    + "\n" + POTONG(peta, "function riwayatProv", '$("#rows").addEventListener') + "\nglobalThis.__x = {S, KAT_UKURAN, ukAktif, pilihUkuran, renderDaftar, warnaWil, agregat, dalamRentang};", k);
  return {k, x: ctx.__x, rows, panggilan, ctx};
}
const reg = slug => [{id: "gempa", kemampuan: {layar: {ukuran_provinsi: slug}}}];
const kini = Date.now();
/* data halaman buatan: 3 provinsi */
const DATA = [
  {id: "a1", prov: "11", m: 5.4, mmi_maks: 4, t: kini - 36e5}, {id: "a2", prov: "11", m: 4.1, mmi_maks: 3, t: kini - 2 * 36e5}, {id: "a3", prov: "11", m: 3.2, t: kini - 3 * 36e5}, {id: "a4", prov: "11", m: 3.0, t: kini - 4 * 36e5},
  {id: "b1", prov: "32", m: 6.3, t: kini - 5 * 36e5}, {id: "b2", prov: "32", m: 3.1, t: kini - 6 * 36e5},
  {id: "c1", prov: "73", m: 4.9, mmi_maks: 2, t: kini - 7 * 36e5}, {id: "c2", prov: "73", m: 4.0, mmi_maks: 3, t: kini - 8 * 36e5}, {id: "c3", prov: "73", m: 3.5, mmi_maks: 2, t: kini - 9 * 36e5}];
function siap(slug) {
  const d = dunia(), {S, KAT_UKURAN} = d.x; S.gempa = DATA; S.tersedia = true; S.rentang = 72; S.nama = {"11": "Aceh", "32": "Jawa Barat", "73": "Sulawesi Selatan"};
  S.ukuranIzin = d.k.ukuranDiizinkan(reg(slug), "gempa", KAT_UKURAN); return d; }
const urutan = html => [...html.matchAll(/data-k="(\d+)"/g)].map(m => m[1]);

test("gerbang registri: ukuran_provinsi kosong atau tak ada = tanpa segmen dan tabel seperti semula (urut jumlah gempa)", () => {
  for (const slug of [[], undefined, "gempa"]) {
    const d = siap(slug); assert.equal(d.x.S.ukuranIzin.length, 0, JSON.stringify(slug)); d.x.renderDaftar();
    assert.ok(!/data-ukuran/.test(d.rows.innerHTML)); assert.deepEqual(urutan(d.rows.innerHTML), ["11", "73", "32"]); assert.equal(d.x.ukAktif().slug, "gempa"); }
  const d = dunia(); assert.deepEqual(stabil(d.k.ukuranDiizinkan([], "gempa", [{slug: "gempa"}])), []); assert.deepEqual(stabil(d.k.ukuranDiizinkan(null, "gempa", [{slug: "gempa"}])), []);
});
test("slug yang dinyalakan menentukan segmen, urutan katalog; slug tak dikenal diabaikan", () => {
  const d = siap(["terbesar", "gempa", "jiwa", "dirasakan"]); assert.deepEqual(stabil(d.x.S.ukuranIzin.map(u => u.slug)), ["gempa", "dirasakan", "terbesar"]);
  const e = siap(["gempa", "terbesar"]); assert.deepEqual(stabil(e.x.S.ukuranIzin.map(u => u.slug)), ["gempa", "terbesar"]);
  e.x.renderDaftar(); assert.equal((e.rows.innerHTML.match(/data-ukuran-k=/g) || []).length, 2); assert.match(e.rows.innerHTML, /data-ukuran-k="gempa" aria-pressed="true"/);
});
test("tiap ukuran dihitung dari data halaman dan menentukan urutan tabel", () => {
  const d = siap(["gempa", "dirasakan", "terbesar"]), ag = d.x.agregat(d.x.dalamRentang());
  assert.deepEqual(stabil(Object.fromEntries(Object.entries(ag).map(([k, a]) => [k, [a.n, a.mmi, a.m]]))), {"11": [4, 2, 5.4], "32": [2, 0, 6.3], "73": [3, 3, 4.9]});
  d.x.renderDaftar(); assert.deepEqual(urutan(d.rows.innerHTML), ["11", "73", "32"], "Gempa: 4, 3, 2");
  assert.equal(d.x.pilihUkuran("dirasakan"), true); assert.equal(d.x.S.ukuran, "dirasakan"); assert.deepEqual(stabil(d.x.S.urut), {k: "mmi", turun: true});
  d.x.renderDaftar(); assert.deepEqual(urutan(d.rows.innerHTML), ["73", "11", "32"], "Dirasakan: 3, 2, 0");
  assert.match(d.rows.innerHTML, /data-ukuran-k="dirasakan" aria-pressed="true"/); assert.match(d.rows.innerHTML, /data-ukuran-k="gempa" aria-pressed="false"/);
  assert.equal(d.x.pilihUkuran("terbesar"), true); d.x.renderDaftar(); assert.deepEqual(urutan(d.rows.innerHTML), ["32", "11", "73"], "Terbesar: 6,3; 5,4; 4,9");
  assert.ok(d.panggilan.includes("warna") && d.panggilan.includes("legenda"), "warna peta dan legenda ikut ukuran");
});
test("pilihUkuran menolak ukuran yang tidak dinyalakan registri dan tidak mengubah keadaan", () => {
  const d = siap(["gempa"]); assert.equal(d.x.pilihUkuran("terbesar"), false); assert.equal(d.x.pilihUkuran("jiwa"), false); assert.equal(d.x.S.ukuran, "gempa");
  const e = siap([]); assert.equal(e.x.pilihUkuran("gempa"), false);
});
test("warna peta: ambang per ukuran dari katalog, naik tegas; gempa tetap sama seperti sebelum PB-76", () => {
  const d = siap(["gempa", "dirasakan", "terbesar"]), {KAT_UKURAN, warnaWil} = d.x;
  assert.deepEqual(stabil(KAT_UKURAN[0].batas), [1, 5, 20, 50]); assert.equal(JSON.stringify(warnaWil(KAT_UKURAN[0])), JSON.stringify(["step", ["coalesce", ["feature-state", "n"], 0], "rgba(0,0,0,0)", 1, "#fbe3c0", 5, "#f4b97a", 20, "#e6803f", 50, "#c9503a"]));
  for (const u of KAT_UKURAN) { assert.equal(u.batas.length, 4); assert.equal(u.leg.length, 4); assert.ok(u.batas.every((v, i, a) => !i || v > a[i - 1]), u.slug); }
});
test("status per provinsi tanpa tingkat Siaga (K12 c)", () => {
  const peta = baca("public/gempa/peta.js"), tabel = baca("public/inti/tabel.js"), d = siap(["gempa", "dirasakan", "terbesar"]); d.x.renderDaftar();
  assert.ok(!/siaga/i.test(d.rows.innerHTML)); assert.ok(!/siaga/i.test(POTONG(peta, "const KAT_UKURAN", "const RAMP_GRID"))); assert.ok(!/siaga/i.test(tabel));
});
test("jiwa terpapar tidak dibuat tanpa data per provinsi untuk gempa terkini (katalog tidak memuatnya)", () => {
  const d = siap(["gempa", "dirasakan", "terbesar", "jiwa"]); assert.ok(!d.x.KAT_UKURAN.some(u => /jiwa/.test(u.slug))); assert.equal(d.x.S.ukuranIzin.length, 3);
});
test("unduh tabel: segmen ukuran bukan baris .tb sehingga adaptor unduh tetap hanya membaca tabel provinsi", () => {
  const d = siap(["gempa", "dirasakan", "terbesar"]); d.x.renderDaftar(); const h = d.rows.innerHTML;
  assert.ok(!/<button[^>]*data-ukuran-k[^>]*class="tb/.test(h)); assert.ok(!/class="tb[^"]*"[^>]*data-ukuran-k/.test(h));
  assert.equal((h.match(/class="tb kepala"/g) || []).length, 1); assert.equal((h.match(/<button class="tb" data-k=/g) || []).length, 3);
});
test("registri: gempa punya kunci ukuran_provinsi berupa daftar (nilai diatur sesi induk)", () => {
  const g = JSON.parse(baca("public/bencana.json")).bencana.find(b => b.id === "gempa"); assert.ok(Array.isArray(g.kemampuan.layar.ukuran_provinsi));
});
