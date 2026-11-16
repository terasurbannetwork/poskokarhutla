// PB-74 (F-37): mesin public/inti/profil_kab.js (gerbang registri, kode kab, muat malas profil_wilayah) + sambungan di public/gempa/mulai.js.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");

/* dokumen palsu: <script> yang disisipkan langsung "dimuat" dan mendefinisikan ProfilWilayah palsu yang mencatat kode */
function dunia({daftar, fetchGagal = false, skripGagal = false, sudahAda = false} = {}) {
  const win = {}; win.window = win; const dibuka = [], disisip = [];
  const ctx = {window: win, console, Promise, setTimeout, URL};
  ctx.document = {currentScript: {src: "http://x/inti/profil_kab.js"}, head: {appendChild: s => { disisip.push(s.src);
    setTimeout(() => { if (skripGagal) return s.onerror(); vm.runInContext("var ProfilWilayah = {buka: k => globalThis.__dibuka.push(k)};", k); s.onload(); }, 0); }}, createElement: () => ({})};
  ctx.__dibuka = dibuka; ctx.globalThis = ctx;
  if (daftar !== undefined || fetchGagal) ctx.fetch = async () => fetchGagal ? {ok: false, status: 500} : {ok: true, json: async () => ({bencana: daftar})};
  const k = vm.createContext(ctx); if (sudahAda) vm.runInContext("var ProfilWilayah = {buka: k => globalThis.__dibuka.push(k)};", k);
  vm.runInContext(baca("public/inti/profil_kab.js"), k); return {P: win.ProfilKab, dibuka, disisip};
}
const reg = (id, ok) => ({id, kemampuan: {layar: {profil_kab: ok}}});

test("kode4: id kab, id desa, dan kode BPS jadi 4 digit; selain itu null", () => {
  const {kode4} = dunia().P.model;
  assert.equal(kode4("11.01"), "1101"); assert.equal(kode4("11.01.01.2001"), "1101"); assert.equal(kode4("3171"), "3171"); assert.equal(kode4("3171010001"), "3171");
  for (const x of [null, undefined, "", "11", "ab.cd", "Aceh Selatan", "1"]) assert.equal(kode4(x), null, String(x));
});
test("gerbang registri: hanya profil_kab === true pada id itu; karhutla dan banjir tidak lewat mesin ini", () => {
  const {izinReg} = dunia().P.model;
  assert.equal(izinReg([reg("gempa", true)], "gempa"), true); assert.equal(izinReg([reg("gempa", false)], "gempa"), false);
  assert.equal(izinReg([{id: "gempa", kemampuan: {}}], "gempa"), false); assert.equal(izinReg([reg("gempa", "ya")], "gempa"), false);
  assert.equal(izinReg([reg("karhutla", true), reg("banjir", true)], "karhutla"), false); assert.equal(izinReg([reg("banjir", true)], "banjir"), false);
  assert.equal(izinReg([], "gempa"), false); assert.equal(izinReg(null, "gempa"), false);
});
test("buka: registri menyala memuat profil_wilayah malas dan memanggil buka dengan kode kab yang benar", async () => {
  const d = dunia({daftar: [reg("gempa", true)]}); d.P.pasang("gempa");
  assert.equal(d.disisip.length, 0, "belum ada muat sebelum dibutuhkan");
  assert.equal(await d.P.buka("11.01"), true); assert.deepEqual(d.dibuka, ["1101"]); assert.equal(d.disisip.length, 1); assert.match(d.disisip[0], /\/inti\/profil_wilayah\.js$/);
  assert.equal(await d.P.buka("33.74.05.1001"), true); assert.deepEqual(d.dibuka, ["1101", "3374"]); assert.equal(d.disisip.length, 1, "dimuat sekali");
});
test("buka: ProfilWilayah sudah ada (halaman memuatnya) tidak dimuat ulang", async () => {
  const d = dunia({daftar: [reg("gempa", true)], sudahAda: true}); d.P.pasang("gempa"); assert.equal(await d.P.buka("1101"), true); assert.equal(d.disisip.length, 0); assert.deepEqual(d.dibuka, ["1101"]);
});
test("buka: registri mati, id tak terdaftar, profil_kab false, kode buruk, atau skrip gagal = tidak membuka dan tidak memuat", async () => {
  for (const o of [{fetchGagal: true}, {daftar: []}, {daftar: [reg("gempa", false)]}, {}]) {
    const d = dunia(o); d.P.pasang("gempa"); assert.equal(await d.P.buka("11.01"), false, JSON.stringify(o)); assert.equal(d.disisip.length, 0); assert.equal(d.dibuka.length, 0); }
  const e = dunia({daftar: [reg("gempa", true)]}); e.P.pasang("gempa"); assert.equal(await e.P.buka("Aceh"), false); assert.equal(e.disisip.length, 0);
  const f = dunia({daftar: [reg("gempa", true)], skripGagal: true}); f.P.pasang("gempa"); assert.equal(await f.P.buka("11.01"), false);
  const g = dunia({daftar: [reg("gempa", true)]}); assert.equal(await g.P.buka("11.01"), false, "tanpa pasang(id) tidak membuka");
});
test("adaptor gempa: hasil cari kab dan desa membuka profil lewat mesin; lokasi gempa tidak", () => {
  const m = baca("public/gempa/mulai.js");
  assert.match(m, /inti\/profil_kab\.js/); assert.match(m, /pasang\("gempa"\)/); assert.match(m, /h\.t !== "kab" && h\.t !== "desa"/);
  assert.match(m, /S\.hasilLuas = hasil/); assert.match(m, /bukaProfilKab\(h\)/);
});
test("registri: gempa punya kunci profil_kab (nilai diatur sesi induk)", () => {
  const g = JSON.parse(baca("public/bencana.json")).bencana.find(b => b.id === "gempa");
  assert.equal(typeof g.kemampuan.layar.profil_kab, "boolean");
});
