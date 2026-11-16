// PB-72 (F-35): mesin brief pimpinan public/inti/brief.js + adaptor gempa public/gempa/brief.js.
// Skrip klasik dimuat lewat vm dengan DOM tiruan. Yang diperiksa: dua halaman, angka sama dengan masukan, tanpa "Siaga" pada status
// provinsi gempa, "belum tersedia" untuk data kosong, dan gerbang registri (brief false = tombol tidak dipasang).
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");

function dunia(reg, {gempa = [], tersedia = true} = {}) {
  const dipasang = [];
  const ref = {parentNode: {insertBefore: (b) => dipasang.push(b)}};
  const dok = {documentElement: {classList: {add() {}, remove() {}}}, body: {appendChild() {}},
    querySelector: q => q.includes("laporan") ? ref : null, getElementById: () => null,
    createElement: () => ({set innerHTML(v) { this.firstChild = {html: v}; }})};
  const g = {document: dok, console, Date, Math, Number, Intl, JSON, Promise, setTimeout, addEventListener() {}, removeEventListener() {}, print() {},
    fetch: async () => ({ok: !!reg, json: async () => reg}),
    S: {tersedia, gempa, dibuat: "2026-11-16T03:00:00Z", nama: {JABAR: "Jawa Barat", SULTENG: "Sulawesi Tengah"}},
    fmt: n => Number(n).toLocaleString("id-ID"), mTulis: m => "M " + Number(m).toFixed(1).replace(".", ","),
    wilayahPendek: t => String(t || "").replace(/^Pusat gempa\s*/, ""), waktuGempa: iso => "WIB " + String(iso).slice(0, 16),
    ROMAWI: ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"], NamaWil: {siap: async () => null}, Sus: {_daftar: null}};
  g.window = g; const c = vm.createContext(g);
  vm.runInContext(baca("public/inti/brief.js"), c); vm.runInContext(baca("public/gempa/brief.js"), c);
  return {g, dipasang};
}
const SKRG = Date.now(), H = 36e5;
const G = [
  {id: "a", m: 6.1, t: SKRG - 2 * H, waktu: "2026-11-16T01:00", wilayah: "Pusat gempa 20 km Barat Daya Cianjur", prov: "JABAR", mmi_maks: 5, tsunami: {kode: 0}},
  {id: "b", m: 5.2, t: SKRG - 30 * H, waktu: "2026-11-15T01:00", wilayah: "Pusat gempa 40 km Timur Palu", prov: "SULTENG", mmi_maks: 0},
  {id: "c", m: 5.5, t: SKRG - 50 * H, waktu: "2026-11-14T01:00", wilayah: "Pusat gempa 80 km Selatan Garut", prov: "JABAR", mmi_maks: 3, tsunami: {kode: 1}},
  {id: "d", m: 4.1, t: SKRG - 3 * H, waktu: "2026-11-16T00:00", wilayah: "Pusat gempa kecil", prov: "JABAR", mmi_maks: 2}];
const halaman = h => (h.match(/<section class="bf-hal">/g) || []).length;
const teks = h => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("brief gempa: dua halaman, angka sama dengan masukan, tanpa Siaga di status provinsi", () => {
  const {g} = dunia(null, {gempa: G});
  const d = g.Brief.gempa.bangun(G, {kejadian: null, cutoff: "WIB X", sekarang: SKRG, nama: k => g.S.nama[k] || k});
  const h = g.Brief.model.html(d), t = teks(h);
  assert.equal(halaman(h), 2);
  assert.deepEqual(JSON.parse(JSON.stringify(d.kpi.map(q => q.v))), ["3", "M 6,1", "3", "1"]);   // M5+ 7 hari = a,b,c; dirasakan = a,c,d; tsunami = c
  assert.deepEqual(JSON.parse(JSON.stringify(d.tabel1.baris)), [["Jawa Barat", "2", "M 6,1", "2"], ["Sulawesi Tengah", "1", "M 5,2", "0"]]);
  assert.equal(d.tabel2.baris.length, 3); assert.equal(d.tabel2.baris[0][2], "M 6,1");
  assert.ok(t.includes("Jawa Barat") && t.includes("Data per WIB X"));
  assert.ok(!/siaga/i.test(t), "tingkat Siaga tidak boleh muncul");
  assert.ok(!t.includes("·"));
});
test("brief: data kosong tertulis 'belum tersedia', bukan nol", () => {
  const {g} = dunia(null);
  const d = g.Brief.gempa.bangun([], {kejadian: null, cutoff: null, sekarang: SKRG, nama: k => k});
  const h = g.Brief.model.html(d), t = teks(h);
  assert.equal(halaman(h), 2);
  assert.ok(t.includes("Data per belum tersedia"));
  assert.ok(t.includes("Gempa terkuat belum tersedia"), t);
  assert.ok(t.includes("IV. Kejadian gempa aktif belum tersedia"));
  assert.equal(g.Brief.model.html(null).length > 0, true);
  assert.ok(teks(g.Brief.model.html({kpi: [{l: "X", v: null}, {l: "Y", v: ""}, {l: "Z", v: NaN}]})).split("belum tersedia").length > 3);
});
test("brief: kejadian aktif dipakai bila sudah dimuat, nilai disaring", () => {
  const {g} = dunia(null);
  const d = g.Brief.gempa.bangun(G, {kejadian: [{kode: "G1", aktif: true, m: 6.1, nama: "Cianjur", jumlah: 4}, {kode: "G0", aktif: false, m: 7, nama: "X", jumlah: 1}], cutoff: "c", sekarang: SKRG, nama: k => k});
  assert.deepEqual(JSON.parse(JSON.stringify(d.daftar.item)), ["G1: M 6,1, Cianjur, 3 susulan tercatat"]);
});
test("brief: HTML disaring (tanpa injeksi)", () => {
  const {g} = dunia(null);
  assert.ok(!g.Brief.model.html({nama: "<img onerror=x>", kpi: [{l: "<b>", v: "<script>"}]}).includes("<img"));
});
test("gerbang registri: hanya kemampuan.layar.brief true yang memasang tombol", async () => {
  const mati = {bencana: [{id: "gempa", kemampuan: {layar: {brief: false}}}]}, hidup = {bencana: [{id: "gempa", kemampuan: {layar: {brief: true}}}]};
  assert.equal(dunia(null).g.Brief.model.diizinkan(mati, "gempa"), false);
  assert.equal(dunia(null).g.Brief.model.diizinkan(hidup, "gempa"), true);
  assert.equal(dunia(null).g.Brief.model.diizinkan(hidup, "banjir"), false);
  assert.equal(dunia(null).g.Brief.model.diizinkan(null, "gempa"), false);
  for (const [reg, harap] of [[mati, 0], [null, 0], [hidup, 1]]) {
    const d = dunia(reg); await new Promise(r => setTimeout(r, 20));
    assert.equal(d.dipasang.length, harap, JSON.stringify(reg));
  }
});
test("kode mesin menyebut kemampuan dan brief (gerbang bencana)", () => {
  const s = baca("public/inti/brief.js"); assert.ok(s.includes("kemampuan") && s.includes("brief"));
});
test("baris tabel melebihi halaman dipotong dengan catatan 'dan N lain'", () => {
  const {g} = dunia(null), M = g.Brief.model, n = M.MAKS.tabel1 + 5;
  const t = {judul: "T", kolom: ["A", "B"], baris: Array.from({length: n}, (_, k) => ["Prov " + k, k]), satuan: "provinsi"};
  const h = teks(M.tabel(t, M.MAKS.tabel1));
  assert.equal((M.tabel(t, M.MAKS.tabel1).match(/<tr>/g) || []).length, M.MAKS.tabel1 + 1);   // +1 baris kepala
  assert.ok(h.includes("dan 5 provinsi lain")); assert.ok(h.includes("Prov " + (M.MAKS.tabel1 - 1))); assert.ok(!h.includes("Prov " + M.MAKS.tabel1 + " "));
  assert.ok(!teks(M.tabel({...t, baris: t.baris.slice(0, 3)}, M.MAKS.tabel1)).includes(" lain"));   // yang muat tidak diberi catatan
  const hl = M.html({tabel1: t, tabel2: t, daftar: {item: Array.from({length: M.MAKS.daftar + 2}, (_, k) => "butir " + k)}});
  assert.equal(halaman(hl), 2); assert.ok(teks(hl).includes("dan 2 butir lain"));
});
test("cetak: menunggu data siap lalu mencetak; bila tak siap, tidak mencetak dan tombol memberi pesan", async () => {
  const {g} = dunia(null); let siap = false, dicetak = 0, data = 0;
  g.print = () => dicetak++;
  const tb = {innerHTML: "ikon", title: "Unduh", textContent: "", disabled: false};
  g.document.querySelector = q => q === "[data-brief]" ? tb : null;
  g.document.getElementById = () => null; g.document.createElement = () => ({}); g.document.body.appendChild = () => {};
  g.Brief.tema({id: "gempa", siap: () => siap, data: async () => (data++, {nama: "Gempa"})});
  const p = g.Brief.cetak(); await new Promise(r => setTimeout(r, 20));
  assert.equal(tb.textContent, "Menyiapkan…"); assert.equal(tb.disabled, true); assert.equal(dicetak, 0);
  siap = true; await p; await new Promise(r => setTimeout(r, 80));
  assert.equal(data, 1); assert.equal(dicetak, 1); assert.equal(tb.innerHTML, "ikon"); assert.equal(tb.disabled, false);
  siap = false; assert.equal(await g.Brief.model.tungguSiap(200), false);
});
