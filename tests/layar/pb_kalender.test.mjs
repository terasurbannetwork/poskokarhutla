// PB-79 (D15): mesin public/inti/kalender.js (grid, tingkat warna, jangkauan, callback) + adaptor kalender gempa (jumlah per tanggal WIB dari data 720 jam, S.gempa30).
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const tunggu = () => new Promise(r => setTimeout(r, 15));
const json = o => JSON.parse(JSON.stringify(o));
const wib = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10), hari = i => wib(Date.now() - i * 864e5);

/* DOM mini: <dialog> dengan innerHTML, pendengar klik, showModal/close */
function dunia() {
  const dengar = {}, dlg = {innerHTML: "", open: false, style: {p: {}, setProperty(k, v) { this.p[k] = v; }, removeProperty(k) { delete this.p[k]; }}, addEventListener: (n, f) => { dengar[n] = f; },
    showModal() { this.open = true; }, close() { this.open = false; dengar.close?.(); }};
  const win = {}; win.window = win;
  const ctx = vm.createContext({window: win, console, setTimeout, Date, Promise, Number, Math, Object, String, document: {createElement: () => dlg, body: {appendChild() {}}}});
  vm.runInContext(baca("public/inti/kalender.js"), ctx); return {K: win.Kalender, dlg, dengar};
}
const klik = (dengar, sel, data = {}, disabled = false) => dengar.click({target: {closest: s => s === sel ? {dataset: data, disabled} : null}});

test("grid: hari pertama Senin, jumlah hari bulan", () => {
  const {K} = dunia(), g = b => json(K.model.grid(b));
  assert.deepEqual(g("2026-11"), {geser: 6, hari: 30}, "1 Nov 2026 = Minggu, kolom ke-7");
  assert.deepEqual(g("2026-06"), {geser: 0, hari: 30}, "1 Jun 2026 = Senin");
  assert.deepEqual(g("2028-02"), {geser: 1, hari: 29});
  assert.equal(K.model.bulanLain("2026-01", -1), "2025-12"); assert.equal(K.model.bulanLain("2026-12", 1), "2027-01");
});
test("tingkat warna 0..5 makin pekat makin banyak; nol dan kosong = 0", () => {
  const {K} = dunia(), t = v => K.model.tingkat(v, 100);
  assert.deepEqual([undefined, 0, 1, 5, 15, 30, 50, 100].map(t), [0, 0, 1, 2, 3, 4, 5, 5]);
  assert.equal(K.model.tingkat(3, 0), 5, "maks 0 tidak membagi nol");
});
test("teratas: n hari terbanyak yang bisa dibuka, nol dibuang", () => {
  const {K} = dunia(); assert.deepEqual(json(K.model.teratas({"2026-11-01": 5, "2026-11-02": 9, "2026-11-03": 0, "2026-11-04": 7}, t => t !== "2026-11-02", 2)), ["2026-11-04", "2026-11-01"]);
});
test("buka: dialog dibuka dulu dengan teks memuat, lalu grid; hari mendatang redup, di luar jangkauan disabled, pilih memanggil callback", async () => {
  const {K, dlg, dengar} = dunia(), pilih = []; let lepas; const muat = new Promise(r => lepas = r);
  K.buka({hariIni: "2026-11-16", terpilih: "2026-11-10", warna: "#8a6d4e", satuan: "gempa", ket: "Keterangan uji", terbanyak: {judul: "Terbanyak 30 hari", n: 2}, awal: "2026-10-18",
    muat: () => muat, bisa: t => t >= "2026-10-18", pilih: t => pilih.push(t)});
  assert.equal(dlg.open, true); assert.match(dlg.innerHTML, /Memuat jumlah gempa/); assert.match(dlg.innerHTML, /Pilih tanggal/); assert.equal(dlg.style.p["--kal-w"], "#8a6d4e");
  lepas({jumlah: {"2026-11-01": 4, "2026-11-10": 20, "2026-11-12": 0, "2026-11-15": 10}}); await tunggu();
  assert.match(dlg.innerHTML, /November 2026/); assert.match(dlg.innerHTML, /Keterangan uji/);
  assert.match(dlg.innerHTML, /<span class="kal-h nanti">17<\/span>/, "hari mendatang redup, bukan tombol");
  assert.match(dlg.innerHTML, /class="kal-h lv5 pilih" data-t="2026-11-10"/, "terpilih bergaris tepi, tingkat pekat");
  assert.match(dlg.innerHTML, /class="kal-h lv0" data-t="2026-11-12"/, "hari 0 gempa tetap bisa dipilih");
  assert.match(dlg.innerHTML, /class="kal-h lv5" data-t="2026-11-15"/);
  assert.match(dlg.innerHTML, /<span>Terbanyak 30 hari<\/span><button type="button" data-t="2026-11-10">10 Nov <b>20<\/b><\/button><button type="button" data-t="2026-11-15">15 Nov/);
  assert.match(dlg.innerHTML, /data-geser="1" aria-label="Bulan berikutnya" disabled/, "tidak bisa melewati bulan ini");
  klik(dengar, "[data-geser]", {geser: "-1"}); await tunggu();
  assert.match(dlg.innerHTML, /Oktober 2026/); assert.match(dlg.innerHTML, /data-t="2026-10-17"[^>]* disabled/); assert.doesNotMatch(dlg.innerHTML, /data-t="2026-10-18"[^>]* disabled/);
  assert.match(dlg.innerHTML, /data-geser="-1" aria-label="Bulan sebelumnya" disabled/, "tidak bisa mundur sebelum bulan awal");
  klik(dengar, "[data-t]", {t: "2026-10-17"}, true); await tunggu(); assert.deepEqual(pilih, [], "tombol disabled tidak memilih"); assert.equal(dlg.open, true);
  klik(dengar, "[data-t]", {t: "2026-10-20"}); await tunggu(); assert.deepEqual(pilih, ["2026-10-20"]); assert.equal(dlg.open, false, "dialog menutup sesudah memilih");
});
test("buka: muat gagal = kalender kosong, bukan galat", async () => {
  const {K, dlg} = dunia(); K.buka({hariIni: "2026-11-16", muat: async () => { throw new Error("x"); }}); await tunggu(); assert.match(dlg.innerHTML, /kal-grid/);
});
test("kalender.css: tingkat warna dari --kal-w lewat color-mix, tanpa literal warna", () => {
  const c = baca("public/inti/kalender.css").replace(/\/\*[\s\S]*?\*\//g, ""); assert.match(c, /\.kal-h\.lv3\{background:color-mix\(in oklch,var\(--kal-w\)/);
  assert.doesNotMatch(c.replace(/--[\w-]+\s*:[^;}]*/g, ""), /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/i);
});

/* ---------- adaptor gempa ---------- */
function gempa(gempaData, {gagal = false} = {}) {
  const win = {}; win.window = win; const diminta = [], S = {gempa: [], gempa30: null};
  const ctx = vm.createContext({window: win, console, setTimeout, setInterval() {}, Date, Promise, Number, Object, Math, Set, S,
    document: {querySelector: () => null, getElementById: () => ({}), createElement: () => ({style: {}})},
    PilihTanggal: {pasang: a => { win.adaptor = a; }, gambar() {}, lepas() {}}, nanti: f => setTimeout(f, 0), muatJSON: async () => ({}),
    Peta: {segarkan() {}}, renderDaftar() {}, renderPita() {}, renderLegenda() {}, renderRentang() {},
    fetch: async u => { diminta.push(u); return gagal ? {ok: false} : {ok: true, json: async () => ({dibuat: "2026-11-16T03:00:00Z", gempa: gempaData})}; }});
  vm.runInContext(baca("public/gempa/tanggal.js"), ctx); return {A: win.adaptor, S, diminta};
}
const waktu = jam => new Date(Date.now() - jam * 36e5).toISOString();
test("adaptor gempa: jumlah per tanggal WIB dari data 720 jam, 30 hari terisi (hari kosong = 0), diminta sekali, S.gempa30 terisi", async () => {
  const d = [{waktu: waktu(1)}, {waktu: waktu(2)}, {waktu: waktu(24 * 10)}, {waktu: waktu(24 * 10 + 1)}, {waktu: waktu(24 * 10 + 2)}];
  const {A, S, diminta} = gempa(d); assert.ok(A.kalender, "adaptor menyerahkan konfigurasi kalender");
  const j1 = (await A.kalender.muat()).jumlah, j2 = (await A.kalender.muat()).jumlah;
  assert.equal(diminta.length, 1); assert.match(diminta[0], /\/api\/gempa\/terbaru\?jam=720/); assert.equal(S.gempa30.length, 5);
  assert.equal(Object.keys(j1).length, 30); assert.equal(Object.values(j1).reduce((a, b) => a + b, 0), 5); assert.deepEqual(json(j1), json(j2));
  assert.equal(j1[hari(5)], 0, "hari tanpa gempa = 0 (data sah)");
  const per = {}; for (const g of d) { const t = wib(Date.parse(g.waktu)); per[t] = (per[t] || 0) + 1; }
  for (const t of Object.keys(per)) assert.equal(j1[t], per[t], t);
});
test("adaptor gempa: yang bisa dibuka = 30 hari terakhir (hari 0 gempa ikut), di luar itu dan mendatang tidak", async () => {
  const {A} = gempa([{waktu: waktu(1)}]); await A.kalender.muat();
  assert.equal(A.kalender.bisa(hari(0)), true); assert.equal(A.kalender.bisa(hari(29)), true); assert.equal(A.kalender.bisa(hari(30)), false); assert.equal(A.kalender.bisa(hari(-1)), false);
  assert.equal(A.kalender.awal, hari(29)); assert.match(A.kalender.ket, /30 hari terakhir/); assert.match(A.kalender.ket, /BMKG, USGS/); assert.equal(A.kalender.terbanyak.n, 6);
});
test("adaptor gempa: muat 720 jam gagal = kalender jatuh ke 7 hari dari S.gempa, bukan galat", async () => {
  const {A, S} = gempa([], {gagal: true}); S.gempa = [{t: Date.now() - 36e5}];
  const j = (await A.kalender.muat()).jumlah; assert.equal(j[hari(0)], 1); assert.equal(A.kalender.bisa(hari(6)), true); assert.equal(A.kalender.bisa(hari(7)), false);
});
test("peta gempa: tanggal lama memakai S.gempa30, tanggal baru tetap S.gempa; muatData tidak menyentuh S.gempa30", () => {
  const src = baca("public/gempa/peta.js"), ambil = n => src.split(/\r?\n/).find(l => l.startsWith("const " + n + " ="));
  const tua = hari(12), baru = hari(1);
  const S = {gempa: [{id: "b", t: Date.now() - 864e5}], gempa30: [{id: "b", t: Date.now() - 864e5}, {id: "t", t: Date.now() - 12 * 864e5}], rentang: 24, tanggal: null};
  const ctx = vm.createContext({S, Date}); vm.runInContext(ambil("tglWIB") + "\n" + ambil("dataGempa") + "\n" + ambil("dalamRentang") + "\nglobalThis.dalam = dalamRentang;", ctx);
  S.tanggal = tua; assert.deepEqual(json(ctx.dalam().map(g => g.id)), ["t"]); S.tanggal = baru; assert.deepEqual(json(ctx.dalam().map(g => g.id)), ["b"]);
  S.gempa30 = null; S.tanggal = tua; assert.deepEqual(json(ctx.dalam().map(g => g.id)), [], "tanpa data 30 hari tidak jatuh galat");
  assert.doesNotMatch(baca("public/gempa/mulai.js"), /gempa30/, "muatData tidak menimpa S.gempa30");
  assert.ok(src.includes("dataGempa().map((g, i)") && src.includes("dataGempa()[i]"), "titik peta dan kartu memakai sumber yang sama");
});
